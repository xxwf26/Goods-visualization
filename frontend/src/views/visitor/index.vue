<template>
  <div class="visitor-page">
    <header class="topbar">
      <div class="brand">
        <div class="brand-logo"><el-icon><Search /></el-icon></div>
        <div class="brand-text">
          <span class="brand-name">周边灵感检索</span>
          <span class="brand-sub">Goods Visualization</span>
        </div>
      </div>
      <button class="logout-btn" @click="logout">
        <el-icon><SwitchButton /></el-icon> 退出
      </button>
    </header>

    <div class="search-section">
      <h1 class="title">想找什么周边物料？</h1>
      <p class="subtitle">输入关键词，一键检索工艺灵感、设计要求、历史价格等，点击查看详情</p>
      <div class="search-box">
        <el-icon class="search-icon"><Search /></el-icon>
        <input v-model="keyword" class="search-input" placeholder="如：拍立得、烫金、抱枕、立牌…" @input="onInput" @keydown.enter="doSearch" />
        <el-button v-if="keyword" class="clear-btn" link @click="clear"><el-icon><Close /></el-icon></el-button>
      </div>
      <div class="hot-words">
        <span class="hot-label">热门：</span>
        <el-tag v-for="w in hotWords" :key="w" class="hot-tag" effect="plain" @click="keyword=w;doSearch()">{{ w }}</el-tag>
      </div>
    </div>

    <div v-if="searched" class="result-section">
      <div v-if="loading" class="loading"><el-icon class="is-loading"><Loading /></el-icon> 检索中…</div>
      <template v-else>
        <div v-if="groups.length === 0" class="empty">没有找到「{{ searched }}」相关内容，换个关键词试试</div>
        <template v-else>
        <!-- 工作流推荐 -->
        <div class="recommend-card">
          <div class="recommend-header">
            <el-icon><MagicStick /></el-icon>
            <span>智能工作流推荐</span>
          </div>
          <div v-if="!recommendation" class="recommend-trigger">
            <p>基于「{{ searched }}」的搜索结果，AI 为你生成从设计到采购的决策建议</p>
            <el-button type="primary" size="small" :loading="recommending" @click="getRecommendation">
              <el-icon><MagicStick /></el-icon> 获取工作流推荐
            </el-button>
          </div>
          <div v-else class="recommend-content">
            <div v-if="thinkingText" class="thinking-box">
              <div class="thinking-label"><el-icon class="is-loading"><Loading /></el-icon> AI 思考中…</div>
              <div class="thinking-text">{{ thinkingText }}</div>
            </div>
            <pre v-if="recommendation" class="recommend-text">{{ recommendation }}</pre>
            <el-button link size="small" @click="recommendation = ''; thinkingText = ''">收起</el-button>
          </div>
        </div>
        </template>
        <div v-for="g in groups" :key="g.type" class="group">
          <div class="group-header">
            <span class="group-label">{{ g.label }}</span>
            <span class="group-count">共 {{ g.total }} 条</span>
          </div>
          <div class="group-items">
            <div
              v-for="it in g.items"
              :key="it.id"
              class="item"
              :class="{ clickable: canOpenDetail(g.type) }"
              @click="canOpenDetail(g.type) && openDetail(g.type, it.id)"
            >
              <div class="item-title">{{ it.title }}<el-icon v-if="canOpenDetail(g.type)" class="item-arrow"><ArrowRight /></el-icon></div>
              <div class="item-tags" v-if="g.type === 'inspiration' && it.categories">
                <el-tag v-for="c in parseCategories(it.categories)" :key="c" size="small" effect="plain" type="primary">{{ c }}</el-tag>
              </div>
              <div class="item-sub" v-if="it.subtitle">{{ it.subtitle }}</div>
            </div>
            <div v-if="g.total > g.items.length" class="item-more">仅显示前 {{ g.items.length }} 条，共 {{ g.total }} 条</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 只读详情弹窗（按类型渲染） -->
    <InspirationDetailDialog v-if="detailType==='inspiration'" v-model="detailVisible" :inspiration="currentDetail" />
    <ProjectDetailDialog v-if="detailType==='project'" v-model="detailVisible" :project="currentDetail" />
    <PriceRecordDetailDialog v-if="detailType==='price'" v-model="detailVisible" :record="currentDetail" />
    <DesignNoteDetailDialog v-if="detailType==='designNote'" v-model="detailVisible" :record="currentDetail" />
    <SupplierDetailDialog v-if="detailType==='supplier'" v-model="detailVisible" :supplier="currentDetail" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Close, Loading, ArrowRight, SwitchButton, MagicStick } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import request from '@/api/request'
import { getInspirationDetail } from '@/api/inspirations'
import { getProjectDetail } from '@/api/projects'
import { getPriceRecordDetail } from '@/api/priceRecords'
import { getSupplierDetail } from '@/api/suppliers'
import { getDesignNoteDetail } from '@/api/designNotes'
import InspirationDetailDialog from '@/components/inspiration/InspirationDetailDialog.vue'
import ProjectDetailDialog from '@/components/project/ProjectDetailDialog.vue'
import PriceRecordDetailDialog from '@/components/priceRecord/PriceRecordDetailDialog.vue'
import DesignNoteDetailDialog from '@/components/designNote/DesignNoteDetailDialog.vue'
import SupplierDetailDialog from '@/components/supplier/SupplierDetailDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')
const searched = ref('')
const loading = ref(false)
const groups = ref([])
const recommendation = ref('')
const thinkingText = ref('')
const recommending = ref(false)
let timer = null
const hotWords = ref(['拍立得', '烫金', '抱枕', '立牌', '徽章', '明信片'])

// 从系统配置加载热门词
onMounted(async () => {
  try {
    const res = await request.get('/settings/visitor_hot_words')
    if (res.code === 200 && res.data) {
      hotWords.value = String(res.data).split(',').map(s => s.trim()).filter(Boolean)
    }
  } catch {}
})

// 详情弹窗
const detailVisible = ref(false)
const detailType = ref('')
const currentDetail = ref(null)

// 哪些类型可打开详情（tag 无详情页）
const detailableTypes = ['inspiration', 'project', 'price', 'supplier', 'designNote']
function canOpenDetail(type) { return detailableTypes.includes(type) }

const categoryMap = { packaging: '包装结构', peripheral: '周边品类灵感', effect: '效果与特殊工艺', production: '印刷与生产攻略' }
function parseCategories(cats) {
  return String(cats).split(',').map(s => s.trim()).filter(Boolean).map(v => categoryMap[v] || v)
}

async function openDetail(type, id) {
  currentDetail.value = null
  detailType.value = type
  detailVisible.value = true
  try {
    const fn = { inspiration: getInspirationDetail, project: getProjectDetail, price: getPriceRecordDetail, supplier: getSupplierDetail, designNote: getDesignNoteDetail }[type]
    const res = await fn(id)
    if (res.code === 200) currentDetail.value = res.data
  } catch { /* 忽略 */ }
}

function onInput() {
  clearTimeout(timer)
  const q = keyword.value.trim()
  if (!q) { searched.value = ''; groups.value = []; return }
  timer = setTimeout(() => doSearch(), 500)
}

async function doSearch() {
  const q = keyword.value.trim()
  if (!q) return
  loading.value = true
  searched.value = q
  recommendation.value = ''
  try {
    const res = await request.get('/search', { params: { q } })
    if (res.code === 200) groups.value = res.data?.groups || []
    else groups.value = []
  } catch { groups.value = [] }
  finally { loading.value = false }
}

async function getRecommendation() {
  recommending.value = true
  recommendation.value = ''
  thinkingText.value = ''
  try {
    const token = localStorage.getItem('token')
    const resp = await fetch('/api/search/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ q: searched.value, groups: groups.value })
    })
    if (!resp.ok) { recommendation.value = '推荐生成失败，请稍后重试'; return }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'start') { thinkingText.value = '正在分析搜索结果…' }
          else if (data.type === 'thinking_start') { thinkingText.value = '' }
          else if (data.type === 'thinking') { thinkingText.value += data.delta }
          else if (data.type === 'thinking_end') { thinkingText.value = '' }
          else if (data.type === 'content') { recommendation.value += data.delta }
          else if (data.type === 'done') { thinkingText.value = '' }
          else if (data.error) { recommendation.value = '推荐生成失败：' + data.error; break }
        } catch {}
      }
    }
  } catch { recommendation.value = '推荐生成失败，请稍后重试' }
  finally { recommending.value = false; thinkingText.value = '' }
}

function clear() { keyword.value = ''; searched.value = ''; groups.value = []; recommendation.value = '' }
function logout() { userStore.logout(); router.push('/login') }
</script>

<style scoped>
.visitor-page { min-height: 100vh; background: linear-gradient(180deg, #FDFBFF 0%, #F5F3FF 100%); }

/* 顶栏 */
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 32px; background: rgba(255,255,255,0.7); backdrop-filter: blur(8px);
  border-bottom: 1px solid #EDE9FE; position: sticky; top: 0; z-index: 20;
}
.brand { display: flex; align-items: center; gap: 12px; }
.brand-logo {
  width: 38px; height: 38px; border-radius: 11px;
  background: linear-gradient(135deg, #8B5CF6, #A78BFA);
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px;
  box-shadow: 0 4px 12px rgba(139,92,246,0.3);
}
.brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.brand-name { font-size: 16px; font-weight: 700; color: #1E293B; }
.brand-sub { font-size: 11px; color: #94A3B8; letter-spacing: 0.5px; }

.logout-btn {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid #E2E8F0; background: #fff; color: #64748B;
  padding: 7px 14px; border-radius: 9px; font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.logout-btn:hover { color: #EF4444; border-color: #FECACA; background: #FEF2F2; }

/* 搜索区 */
.search-section { text-align: center; padding: 56px 20px 28px; max-width: 720px; margin: 0 auto; }
.title { font-size: 30px; font-weight: 800; color: #1E293B; margin: 0 0 12px; letter-spacing: -0.5px; }
.subtitle { font-size: 15px; color: #94A3B8; margin: 0 0 32px; }
.search-box { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 28px; padding: 8px 12px 8px 22px; box-shadow: 0 12px 32px rgba(139,92,246,0.15); border: 2px solid #EDE9FE; transition: border-color 0.2s; }
.search-box:focus-within { border-color: #A78BFA; }
.search-icon { font-size: 22px; color: #8B5CF6; }
.search-input { flex: 1; border: none; outline: none; font-size: 17px; padding: 12px 0; background: transparent; color: #1E293B; }
.search-input::placeholder { color: #94A3B8; }
.hot-words { margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
.hot-label { font-size: 13px; color: #94A3B8; }
.hot-tag { cursor: pointer; }

/* 结果区 */
.result-section { max-width: 860px; margin: 0 auto; padding: 20px 20px 60px; }
.loading { text-align: center; color: #8B5CF6; padding: 40px; }
.empty { text-align: center; color: #94A3B8; padding: 60px 0; font-size: 15px; }

/* 工作流推荐 */
.recommend-card {
  background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
  border-radius: 16px; padding: 20px 22px; margin-bottom: 20px;
  border: 1px solid #DDD6FE;
}
.recommend-header { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #7C3AED; margin-bottom: 12px; }
.recommend-trigger { text-align: center; padding: 8px 0; }
.recommend-trigger p { font-size: 13px; color: #64748B; margin: 0 0 12px; }
.recommend-content { position: relative; }
.thinking-box { margin-bottom: 10px; padding: 12px 14px; background: rgba(139,92,246,0.06); border-radius: 10px; border-left: 3px solid #A78BFA; }
.thinking-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #8B5CF6; margin-bottom: 6px; }
.thinking-text { font-size: 12px; color: #94A3B8; line-height: 1.6; white-space: pre-wrap; max-height: 120px; overflow-y: auto; }
.recommend-text {
  font-family: inherit; font-size: 14px; line-height: 1.8; color: #334155;
  white-space: pre-wrap; word-break: break-word; margin: 0; padding: 14px 16px;
  background: rgba(255,255,255,0.7); border-radius: 10px;
}
.recommend-content .el-button { position: absolute; top: 8px; right: 8px; }

.group { background: #fff; border-radius: 16px; padding: 18px 22px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(139,92,246,0.06); border: 1px solid #EDE9FE; }
.group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #F5F3FF; }
.group-label { font-size: 16px; font-weight: 700; color: #7C3AED; }
.group-count { font-size: 12px; color: #94A3B8; }
.group-items { display: flex; flex-direction: column; gap: 6px; }
.item { padding: 10px 12px; border-radius: 8px; }
.item.clickable { cursor: pointer; }
.item.clickable:hover { background: #F5F3FF; }
.item-title { font-size: 14px; font-weight: 600; color: #1E293B; display: flex; justify-content: space-between; align-items: center; }
.item-arrow { color: #CBD5E1; }
.item.clickable:hover .item-arrow { color: #8B5CF6; }
.item-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.item-sub { font-size: 12px; color: #94A3B8; margin-top: 4px; line-height: 1.5; }
.item-more { font-size: 12px; color: #CBD5E1; padding-top: 6px; }
</style>
