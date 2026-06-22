<template>
  <div class="inspiration-container">
    <div class="page-header">
      <div class="page-title">
        <h2>灵感库</h2>
        <span class="data-count">共 {{ total }} 条灵感</span>
      </div>
      <div class="page-actions">
        <PermissionButton permission="inspiration:create" type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon> 新增灵感
        </PermissionButton>
      </div>
    </div>

    <!-- 类型切换 Tab -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="inspiration-tabs">
      <el-tab-pane label="周边制品灵感" name="product" />
      <el-tab-pane label="工艺灵感" name="craft" />
    </el-tabs>

    <!-- 筛选区域 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="品类" class="filter-item">
              <el-select v-model="filterForm.category_tag_ids" placeholder="选择品类" clearable filterable style="width:100%">
                <el-option v-for="cat in categoryOptions" :key="cat.id" :label="cat.tag_name" :value="cat.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="工艺" class="filter-item">
              <el-select v-model="filterForm.craft_tag_ids" placeholder="选择工艺" clearable filterable style="width:100%">
                <el-option v-for="craft in craftOptions" :key="craft.id" :label="craft.tag_name" :value="craft.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="来源平台" class="filter-item">
              <el-select v-model="filterForm.source_type" placeholder="选择平台" clearable filterable style="width:100%">
                <el-option label="小红书" value="小红书" />
                <el-option label="淘宝" value="淘宝" />
                <el-option label="1688" value="1688" />
                <el-option label="站酷" value="站酷" />
                <el-option label="微博" value="微博" />
                <el-option label="抖音" value="抖音" />
                <el-option label="Pinterest" value="pinterest" />
                <el-option label="Instagram" value="instagram" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="采用状态" class="filter-item">
              <el-select v-model="filterForm.collection_status" placeholder="选择状态" clearable style="width:100%">
                <el-option label="已采用" value="applied" />
                <el-option label="已收藏" value="collected" />
                <el-option label="未收藏" value="uncollected" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="24" :lg="18">
            <el-form-item label="关键词" class="filter-item">
              <el-input v-model="filterForm.keyword" placeholder="搜索标题、描述等" clearable style="width:240px">
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-button type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 卡片网格 -->
    <div v-loading="loading" class="inspiration-grid">
      <el-empty v-if="!loading && !tableData.length" description="暂无数据" />
      <div v-for="item in tableData" :key="item.id" class="inspiration-card" @click="handleJump(item)">
        <div class="card-image">
          <el-image v-if="item.cover_image" :src="item.cover_image" fit="cover" :preview-src-list="getImageList(item.images)" preview-teleported />
          <div v-else class="no-image"><el-icon :size="32"><Picture /></el-icon><span>暂无截图</span></div>
          <div class="type-badge">
            <el-tag size="small" :type="activeTab==='craft'?'warning':'primary'">{{ activeTab==='craft'?'工艺':'制品' }}</el-tag>
          </div>
          <div class="source-badge">
            <el-tag size="small" type="info">{{ getSourceLabel(item.source_type) }}</el-tag>
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
        <div class="card-actions" v-if="canEdit">
          <el-button link type="primary" size="small" @click.stop="handleEdit(item)">编辑</el-button>
          <el-button link type="primary" size="small" @click.stop="handleJump(item)">跳转链接</el-button>
        </div>
      </div>
    </div>

    <div v-if="total>0" class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :page-sizes="[12,24,36,48]" :total="total" layout="total,sizes,prev,pager,next" @size-change="handleSizeChange" @current-change="handlePageChange" />
    </div>

    <InspirationFormDialog v-model="formDialogVisible" :mode="formMode" :inspiration-data="currentInspiration" :inspiration-type="activeTab" @success="handleFormSuccess" />
    <InspirationDetailDialog v-model="detailDialogVisible" :inspiration="currentInspiration" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Refresh, Plus, Picture, Star, FolderOpened, Clock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getTagsByType } from '@/api/tags'
import { getInspirations } from '@/api/inspirations'
import PermissionButton from '@/components/common/PermissionButton.vue'
import InspirationFormDialog from '@/components/inspiration/InspirationFormDialog.vue'
import InspirationDetailDialog from '@/components/inspiration/InspirationDetailDialog.vue'

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('inspiration:edit') || userStore.hasPermission('inspiration:create'))

const activeTab = ref('product')
const filterForm = reactive({ keyword: '', category_tag_ids: null, craft_tag_ids: null, source_type: null, collection_status: null })
const categoryOptions = ref([]), craftOptions = ref([])
const loading = ref(false), tableData = ref([]), total = ref(0)
const pagination = reactive({ page: 1, pageSize: 24 })
const formDialogVisible = ref(false), detailDialogVisible = ref(false), formMode = ref('add'), currentInspiration = ref(null)

async function loadOptions() {
  try {
    const [catR, craftR] = await Promise.all([getTagsByType('category'), getTagsByType('craft')])
    categoryOptions.value = catR.data?.list || catR.data || []
    craftOptions.value = craftR.data?.list || craftR.data || []
  } catch(e) { console.error(e) }
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page, pageSize: pagination.pageSize,
      inspiration_type: activeTab.value,
      keyword: filterForm.keyword || undefined,
      source_type: filterForm.source_type || undefined,
      collection_status: filterForm.collection_status || undefined,
      category_tag_ids: filterForm.category_tag_ids || undefined,
      craft_tag_ids: filterForm.craft_tag_ids || undefined
    }
    const res = await getInspirations(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch(e) { console.error(e) }
  finally { loading.value = false }
}

function handleTabChange() { pagination.page = 1; loadData() }
function handleFilter() { pagination.page = 1; loadData() }
function handleReset() { filterForm.keyword=''; filterForm.category_tag_ids=null; filterForm.craft_tag_ids=null; filterForm.source_type=null; filterForm.collection_status=null; pagination.page=1; loadData() }
function handleSizeChange(s) { pagination.pageSize=s; pagination.page=1; loadData() }
function handlePageChange(p) { pagination.page=p; loadData() }
function handleAdd() { formMode.value='add'; currentInspiration.value=null; formDialogVisible.value=true }
function handleEdit(item) { formMode.value='edit'; currentInspiration.value={...item}; formDialogVisible.value=true }
function handleJump(item) {
  if (item.source_url||item.link) window.open(item.source_url||item.link,'_blank')
  else ElMessage.warning('暂无原始链接')
}
function handleFormSuccess() { loadData() }

function getImageList(images) {
  if (!images) return []
  try { const p = typeof images==='string'?JSON.parse(images):images; return Array.isArray(p)?p:[] } catch { return [] }
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
  // 从品类详情页跳转携带的筛选
  if (route.query.category_tag_ids) {
    filterForm.category_tag_ids = String(route.query.category_tag_ids)
  }
  loadOptions(); loadData()
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
.card-content { padding:14px; flex:1; display:flex; flex-direction:column; }
.card-title { font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.card-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
.more-tags { font-size:12px; color:#A8A29E; line-height:24px; }
.card-value { font-size:13px; color:#A8A29E; line-height:1.5; flex:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:8px; }
.card-stats { display:flex; gap:12px; font-size:12px; color:#A8A29E; margin-bottom:4px; }
.card-stats span { display:flex; align-items:center; gap:2px; }
.card-time { display:flex; align-items:center; gap:4px; font-size:12px; color:#A8A29E; }
.card-actions { display:flex; justify-content:center; gap:16px; padding:10px 14px; border-top:1px solid var(--bg-primary); background:var(--card-bg); }
.pagination-wrapper { display:flex; justify-content:flex-end; margin-top:20px; }
@media (max-width:768px) { .inspiration-grid { grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); } }
</style>