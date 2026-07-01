<template>
  <div class="visitor-page">
    <div class="topbar">
      <span class="logo">周边灵感检索</span>
      <el-button link @click="logout">退出登录</el-button>
    </div>

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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Close, Loading, ArrowRight } from '@element-plus/icons-vue'
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
let timer = null
const hotWords = ['拍立得', '烫金', '抱枕', '立牌', '徽章', '明信片']

// 详情弹窗
const detailVisible = ref(false)
const detailType = ref('')
const currentDetail = ref(null)

// 哪些类型可打开详情（tag 无详情页）
const detailableTypes = ['inspiration', 'project', 'price', 'supplier', 'designNote']
function canOpenDetail(type) { return detailableTypes.includes(type) }

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
  try {
    const res = await request.get('/search', { params: { q } })
    if (res.code === 200) groups.value = res.data?.groups || []
    else groups.value = []
  } catch { groups.value = [] }
  finally { loading.value = false }
}

function clear() { keyword.value = ''; searched.value = ''; groups.value = [] }
function logout() { userStore.logout(); router.push('/login') }
</script>

<style scoped>
.visitor-page { min-height: 100vh; background: linear-gradient(180deg, #FDFBFF 0%, #F5F3FF 100%); }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; }
.logo { font-size: 18px; font-weight: 700; color: #7C3AED; }

.search-section { text-align: center; padding: 60px 20px 30px; max-width: 720px; margin: 0 auto; }
.title { font-size: 32px; font-weight: 800; color: #1E293B; margin: 0 0 12px; }
.subtitle { font-size: 15px; color: #94A3B8; margin: 0 0 32px; }
.search-box { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 28px; padding: 8px 12px 8px 22px; box-shadow: 0 12px 32px rgba(139,92,246,0.15); border: 2px solid #EDE9FE; }
.search-icon { font-size: 22px; color: #8B5CF6; }
.search-input { flex: 1; border: none; outline: none; font-size: 17px; padding: 12px 0; background: transparent; color: #1E293B; }
.search-input::placeholder { color: #94A3B8; }
.hot-words { margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
.hot-label { font-size: 13px; color: #94A3B8; }
.hot-tag { cursor: pointer; }

.result-section { max-width: 860px; margin: 0 auto; padding: 20px 20px 60px; }
.loading { text-align: center; color: #8B5CF6; padding: 40px; }
.empty { text-align: center; color: #94A3B8; padding: 60px 0; font-size: 15px; }
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
.item-sub { font-size: 12px; color: #94A3B8; margin-top: 4px; line-height: 1.5; }
.item-more { font-size: 12px; color: #CBD5E1; padding-top: 6px; }
</style>
