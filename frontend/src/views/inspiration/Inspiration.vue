<template>
  <div class="inspiration-container">
    <div class="page-header">
      <div class="page-title">
        <h2>灵感库</h2>
        <span class="data-count">共 {{ total }} 条灵感</span>
      </div>
      <div class="page-actions">
        <el-button v-if="canEdit" @click="tagManagerVisible = true">
          <el-icon><PriceTag /></el-icon> 标签管理
        </el-button>
        <el-button v-if="canEdit" :loading="checking" @click="handleCheckLinks">
          <el-icon><Link /></el-icon> 检测失效链接
        </el-button>
        <PermissionButton permission="inspiration:create" type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon> 新增灵感
        </PermissionButton>
      </div>
    </div>

    <!-- 关键词搜索 + 排序（在分栏上一行） -->
    <div class="keyword-row">
      <el-input v-model="filterForm.keyword" placeholder="搜索标题、描述等关键词" clearable style="max-width:380px" @keyup.enter="handleFilter">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
      <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      <el-select v-model="sortBy" placeholder="排序" size="default" style="width:130px;margin-left:auto;" @change="handleFilter">
        <el-option label="最新" value="create_time" />
        <el-option label="最热(浏览)" value="view_count" />
        <el-option label="点赞最多" value="like_count" />
        <el-option label="收藏最多" value="save_count" />
      </el-select>
    </div>

    <!-- 分类分栏 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="inspiration-tabs">
      <el-tab-pane label="包装结构" name="packaging" />
      <el-tab-pane label="周边品类灵感" name="peripheral" />
      <el-tab-pane label="效果与特殊工艺" name="effect" />
      <el-tab-pane label="印刷与生产攻略" name="production" />
    </el-tabs>

    <!-- 卡片网格 -->
    <div v-loading="loading" class="inspiration-grid">
      <el-empty v-if="!loading && !tableData.length" description="暂无数据" />
      <div v-for="item in tableData" :key="item.id" class="inspiration-card" @click="handleView(item)">
        <div class="card-image">
          <el-image v-if="item.cover_image" :src="toImageUrl(item.cover_image)" fit="cover" :preview-src-list="getImageUrls(item.images)" preview-teleported />
          <div v-else class="no-image"><el-icon :size="32"><Picture /></el-icon><span>暂无截图</span></div>
          <div class="type-badge">
            <el-tag size="small" type="primary">{{ tabLabelMap[item.inspiration_type] || '未分类' }}</el-tag>
          </div>
          <div class="source-badge">
            <el-tag size="small" type="info">{{ getSourceLabel(item.source_type) }}</el-tag>
          </div>
          <div v-if="item.link_status==='dead' || item.link_status==='error'" class="link-badge">
            <el-tag size="small" :type="item.link_status==='dead' ? 'danger' : 'warning'" effect="dark">
              {{ item.link_status==='dead' ? '链接已失效' : '链接无法验证' }}
            </el-tag>
          </div>
        </div>
        <div class="card-content">
          <div class="card-title">{{ item.title }}</div>
          <div class="card-tags" v-if="getDisplayTags(item).length">
            <el-tag v-for="tag in getDisplayTags(item).slice(0,3)" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
            <span v-if="getDisplayTags(item).length>3" class="more-tags">+{{ getDisplayTags(item).length-3 }}</span>
          </div>
          <div class="card-value" v-if="item.description">{{ item.description }}</div>
          <div class="card-stats">
            <span v-if="item.like_count"><el-icon><Star /></el-icon>{{ item.like_count }}</span>
            <span v-if="item.save_count"><el-icon><FolderOpened /></el-icon>{{ item.save_count }}</span>
          </div>
          <div class="card-time"><el-icon><Clock /></el-icon>{{ formatDate(item.create_time) }}</div>
        </div>
        <div class="card-actions">
          <el-button v-if="canEdit" link type="primary" size="small" @click.stop="handleEdit(item)">编辑</el-button>
          <a
            v-if="safeUrl(item.link || item.source_url) && !isSensitiveSource(item.link || item.source_url)"
            :href="safeUrl(item.link || item.source_url)"
            target="_blank"
            rel="noopener noreferrer"
            class="card-jump-link"
            @click.stop
          >跳转链接</a>
          <el-button v-else-if="!(item.link || item.source_url)" link type="primary" size="small" @click.stop="handleJump(item)">跳转链接</el-button>
          <el-button v-if="canDelete" link type="danger" size="small" @click.stop="handleDelete(item)">删除</el-button>
        </div>
      </div>
    </div>

    <div v-if="total>0" class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :page-sizes="[12,24,36,48]" :total="total" layout="total,sizes,prev,pager,next" @size-change="handleSizeChange" @current-change="handlePageChange" />
    </div>

    <InspirationFormDialog v-model="formDialogVisible" :mode="formMode" :inspiration-data="currentInspiration" :inspiration-type="activeTab" @success="handleFormSuccess" />
    <InspirationDetailDialog v-model="detailDialogVisible" :inspiration="currentInspiration" @analyzed="handleAnalyzed" @deleted="handleDeleted" />
    <InspirationTagManager v-model="tagManagerVisible" @refresh="loadData" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Refresh, Plus, Picture, Star, FolderOpened, Clock, Link, PriceTag } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getInspirations, checkInspirationLinks, getInspirationDetail, deleteInspiration } from '@/api/inspirations'
import { isSensitiveSource } from '@/utils/sourcePolicy'
import { safeUrl } from '@/utils/safeUrl'
import PermissionButton from '@/components/common/PermissionButton.vue'
import InspirationFormDialog from '@/components/inspiration/InspirationFormDialog.vue'
import InspirationDetailDialog from '@/components/inspiration/InspirationDetailDialog.vue'
import InspirationTagManager from '@/components/inspiration/InspirationTagManager.vue'

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('inspiration:edit') || userStore.hasPermission('inspiration:create'))
const canDelete = computed(() => userStore.role === 'admin' || userStore.role === 'super_admin')

const activeTab = ref('peripheral')
const sortBy = ref('create_time')
const filterForm = reactive({ keyword: '' })
const loading = ref(false), tableData = ref([]), total = ref(0)
const checking = ref(false)
const pagination = reactive({ page: 1, pageSize: 24 })
const formDialogVisible = ref(false), detailDialogVisible = ref(false), formMode = ref('add'), currentInspiration = ref(null)
const tagManagerVisible = ref(false)
let refreshTimer = null

const tabLabelMap = { packaging: '包装结构', peripheral: '周边品类灵感', effect: '效果与特殊工艺', production: '印刷与生产攻略' }

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page, pageSize: pagination.pageSize,
      inspiration_type: activeTab.value,
      keyword: filterForm.keyword || undefined,
      sort_field: sortBy.value,
      sort_order: 'DESC'
    }
    const res = await getInspirations(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch(e) { console.error(e) }
  finally { loading.value = false }
}

function handleTabChange() { pagination.page = 1; loadData() }
function handleFilter() { pagination.page = 1; loadData() }
function handleReset() { filterForm.keyword=''; pagination.page=1; loadData() }
function handleSizeChange(s) { pagination.pageSize=s; pagination.page=1; loadData() }
function handlePageChange(p) { pagination.page=p; loadData() }
function handleAdd() { formMode.value='add'; currentInspiration.value=null; formDialogVisible.value=true }
function handleEdit(item) { formMode.value='edit'; currentInspiration.value={...item}; formDialogVisible.value=true }
function handleView(item) { currentInspiration.value={...item}; detailDialogVisible.value=true }
function handleDeleted() { detailDialogVisible.value=false; loadData() }
async function handleDelete(item) {
  try {
    await ElMessageBox.confirm(
      `确定删除灵感「${item.title || '无标题'}」吗？删除后无法恢复。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await deleteInspiration(item.id)
    if (res.code === 200) { ElMessage.success('删除成功'); loadData() }
    else ElMessage.error(res.message || '删除失败')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}
async function handleAnalyzed(id) {
  // 重新拉取详情，让弹窗显示最新的 AI 分析结果
  try {
    const res = await getInspirationDetail(id)
    if (res.code === 200 && res.data) currentInspiration.value = { ...res.data }
  } catch (e) { /* 忽略，列表稍后刷新 */ }
  loadData()
}
function handleJump(item) {
  if (item.source_url||item.link) window.open(item.source_url||item.link,'_blank')
  else ElMessage.warning('暂无原始链接')
}
function handleFormSuccess() {
  loadData()
  // 新增后后台AI分析约需1分钟，延时自动刷新一次让图文显示出来
  if (formMode.value === 'add') {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => { loadData() }, 75000)
  }
}

async function handleCheckLinks() {
  try {
    await ElMessageBox.confirm(
      `将逐条访问当前「${tabLabelMap[activeTab.value]||''}」的外部链接并更新失效状态，可能需要一点时间。是否继续？`,
      '检测失效链接',
      { confirmButtonText: '开始检测', cancelButtonText: '取消', type: 'info' }
    )
  } catch { return }
  checking.value = true
  try {
    const res = await checkInspirationLinks({ inspiration_type: activeTab.value })
    const d = res.data || {}
    ElMessage({
      type: d.dead > 0 ? 'warning' : 'success',
      message: `检测完成：失效 ${d.dead||0}，无法验证 ${d.error||0}，正常 ${d.ok||0}（共 ${d.checked||0} 条）`,
      duration: 4000
    })
    loadData()
  } catch (e) {
    ElMessage.error('检测失败：' + (e?.message || '请稍后重试'))
  } finally {
    checking.value = false
  }
}

// 单个图片地址：本地文件名加 /uploads/ 前缀，http 开头直接用
function toImageUrl(v) {
  if (!v) return ''
  const s = String(v).trim()
  return s.startsWith('http') ? s : `/uploads/${s}`
}
// images 字段（逗号分隔文件名 或 JSON数组）→ 完整URL数组
function getImageUrls(images) {
  if (!images) return []
  let arr
  try {
    const p = typeof images === 'string' ? JSON.parse(images) : images
    arr = Array.isArray(p) ? p : []
  } catch {
    // 不是JSON，按逗号分隔的文件名处理
    arr = String(images).split(',').map(s => s.trim()).filter(Boolean)
  }
  return arr.map(toImageUrl)
}
function getDisplayTags(item) {
  const t = []
  if (item.categoryTagNames) t.push(...item.categoryTagNames.split(','))
  if (item.craftTagNames) t.push(...item.craftTagNames.split(','))
  return t.filter(Boolean)
}
function getSourceLabel(s) { const m={'小红书':'小红书','淘宝':'淘宝','1688':'1688','站酷':'站酷','微博':'微博','抖音':'抖音','pinterest':'Pinterest','instagram':'Instagram','other':'其他'}; return m[s]||s||'其他' }
function formatDate(d) { if(!d) return '-'; return d.split('T')[0] }

onMounted(() => {
  const route = useRoute()
  // 从全局检索/首页搜索跳转携带的关键词
  if (route.query.keyword) {
    filterForm.keyword = String(route.query.keyword)
  }
  // 携带的灵感分类
  if (route.query.inspiration_type) {
    activeTab.value = String(route.query.inspiration_type)
  }
  loadData()
})
</script>

<style scoped>
.inspiration-container { padding:20px; background:var(--bg-primary); min-height:calc(100vh - 60px); }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.page-title { display:flex; align-items:baseline; gap:12px; }
.page-title h2 { margin:0; font-size:22px; font-weight:700; color:var(--text-primary); }
.data-count { color:#A8A29E; font-size:14px; }
.page-actions { display:flex; gap:12px; }

.inspiration-tabs { margin-bottom:12px; }
.inspiration-tabs :deep(.el-tabs__header) { margin-bottom:0; }
.inspiration-tabs :deep(.el-tabs__item) { font-size:15px; font-weight:600; }

.keyword-row { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
.filter-card { margin-bottom:16px; border-radius:16px !important; }
.filter-item { width:100%; }

.inspiration-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px; min-height:300px; }
.inspiration-card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(167,139,250,0.06); transition:all 0.3s; cursor:pointer; display:flex; flex-direction:column; }
.inspiration-card:hover { transform:translateY(-5px); box-shadow:0 10px 30px rgba(167,139,250,0.15); }
.card-image { position:relative; width:100%; height:170px; background:var(--card-bg); overflow:hidden; }
.card-image :deep(.el-image) { width:100%; height:100%; }
.no-image { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--border-color); gap:8px; }
.type-badge { position:absolute; top:10px; right:10px; }
.source-badge { position:absolute; top:10px; left:10px; }
.link-badge { position:absolute; bottom:10px; left:10px; }
.card-content { padding:14px; flex:1; display:flex; flex-direction:column; }
.card-title { font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.card-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
.more-tags { font-size:12px; color:#A8A29E; line-height:24px; }
.card-value { font-size:13px; color:#A8A29E; line-height:1.5; flex:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:8px; }
.card-stats { display:flex; gap:12px; font-size:12px; color:#A8A29E; margin-bottom:4px; }
.card-stats span { display:flex; align-items:center; gap:2px; }
.card-time { display:flex; align-items:center; gap:4px; font-size:12px; color:#A8A29E; }
.card-actions { display:flex; justify-content:center; align-items:center; gap:16px; padding:10px 14px; border-top:1px solid var(--bg-primary); background:var(--card-bg); }
.card-jump-link {
  color: var(--accent, #8B5CF6); font-size: 12px; text-decoration: none; cursor: pointer;
}
.card-jump-link:hover { opacity: 0.8; }
.pagination-wrapper { display:flex; justify-content:flex-end; margin-top:20px; }
@media (max-width:768px) { .inspiration-grid { grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); } }
</style>