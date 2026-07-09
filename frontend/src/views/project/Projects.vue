<template>
  <div class="projects-container">
    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <div class="page-title">
        <h2>历史项目库</h2>
        <span class="data-count">共 {{ total }} 条数据</span>
      </div>
      <div class="page-actions">
        <PermissionButton
          permission="project:export"
          type="success"
          @click="handleExport"
        >
          导出
        </PermissionButton>
        <PermissionButton
          permission="project:create"
          type="primary"
          @click="handleAdd"
        >
          新增项目
        </PermissionButton>
      </div>
    </div>

    <!-- 筛选区域 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-row :gutter="16">
          <!-- 1. IP -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="IP" class="filter-item">
              <el-select v-model="filterForm.ip" placeholder="选择IP" clearable filterable style="width:100%">
                <el-option v-for="ip in ipOptions" :key="ip" :label="ip" :value="ip" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 2. 年份 -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="年份" class="filter-item">
              <el-select v-model="filterForm.projectYear" placeholder="选择年份" clearable style="width:100%">
                <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 3. 供应商 -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="供应商" class="filter-item">
              <el-select v-model="filterForm.supplierName" placeholder="选择供应商" clearable filterable style="width:100%">
                <el-option v-for="s in supplierOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 4. 需求种类 -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="需求种类" class="filter-item">
              <el-select v-model="filterForm.requirementType" placeholder="选择需求种类" clearable style="width:100%">
                <el-option v-for="t in reqTypeOptions" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 5. 关键词搜索 -->
          <el-col :xs="24" :sm="24" :md="16" :lg="18">
            <el-form-item label="关键词" class="filter-item filter-keyword">
              <el-input v-model="filterForm.keyword" placeholder="搜索文本、项目、需求人、区服等" clearable style="width:60%">
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-button type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="width: 100%"
        max-height="calc(100vh - 340px)"
        @selection-change="handleSelectionChange"
        @row-click="handleView"
      >
        <el-table-column type="selection" width="40" fixed />
        <el-table-column label="#" width="55" align="center" fixed>
          <template #header>
            <div style="display:flex;align-items:center;gap:4px;">
              <span>#</span>
              <el-popover trigger="click" placement="bottom" :width="200">
                <template #reference>
                  <el-button link size="small" style="padding:0;"><el-icon><Setting /></el-icon></el-button>
                </template>
                <div style="font-size:13px;font-weight:600;margin-bottom:8px;">显示列</div>
                <el-checkbox v-for="key in columnKeys" :key="key" v-model="columnVisible[key]" style="display:block;margin-bottom:4px;">{{ columnLabels[key] }}</el-checkbox>
                <el-button size="small" link @click="resetColumns" style="margin-top:4px;">重置</el-button>
              </el-popover>
            </div>
          </template>
          <template #default="{ $index }">
            {{ (pagination.page - 1) * pagination.pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <!-- 1. 文本 -->
        <el-table-column prop="product_name" label="文本" min-width="160" show-overflow-tooltip fixed />
        <!-- 2. IP -->
        <el-table-column v-if="columnVisible.ip" prop="ip_tag_ids" label="IP" width="90">
          <template #default="{ row }"><span>{{ row.ip_tag_ids || '-' }}</span></template>
        </el-table-column>
        <!-- 3. 年份 -->
        <el-table-column v-if="columnVisible.year" prop="project_year" label="年份" width="65" align="center">
          <template #default="{ row }"><span>{{ row.project_year || '-' }}</span></template>
        </el-table-column>
        <!-- 4. 项目 -->
        <el-table-column v-if="columnVisible.project" prop="project_name" label="项目" min-width="130" show-overflow-tooltip />
        <!-- 5. 相关请购需求单 -->
        <el-table-column v-if="columnVisible.orderNo" prop="purchase_order_no" label="相关请购需求单" width="160" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.purchase_order_no || '-' }}</span></template>
        </el-table-column>
        <!-- 6. 项目总价 -->
        <el-table-column v-if="columnVisible.amount" label="项目总价" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.total_amount" class="price-text">¥{{ Number(row.total_amount).toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 7. 投入人天 -->
        <el-table-column v-if="columnVisible.days" label="投入人天" width="85" align="center">
          <template #default="{ row }"><span>{{ row.person_days ?? '-' }}</span></template>
        </el-table-column>
        <!-- 8. 需求人 -->
        <el-table-column v-if="columnVisible.requester" prop="requester" label="需求人" width="80" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.requester || '-' }}</span></template>
        </el-table-column>
        <!-- 9. 区服 -->
        <el-table-column v-if="columnVisible.region" prop="region" label="区服" width="70" />
        <!-- 10. 供应商 -->
        <el-table-column v-if="columnVisible.supplier" prop="supplier_name" label="供应商" width="130" show-overflow-tooltip />
        <!-- 11. 开始日期 -->
        <el-table-column v-if="columnVisible.startDate" label="开始日期" width="105">
          <template #default="{ row }">{{ formatDate(row.project_start_date) }}</template>
        </el-table-column>
        <!-- 12. 结束日期 -->
        <el-table-column v-if="columnVisible.endDate" label="结束日期" width="105">
          <template #default="{ row }">{{ formatDate(row.project_end_date) }}</template>
        </el-table-column>
        <!-- 13. 主要负责人 -->
        <el-table-column v-if="columnVisible.leader" prop="project_leader" label="主要负责人" width="110" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.project_leader || '-' }}</span></template>
        </el-table-column>
        <!-- 14. 报价单 -->
        <el-table-column v-if="columnVisible.quotation" label="报价单" width="80" align="center">
          <template #default="{ row }">
            <div v-if="getFirstImageUrl(row.quotation_file)" style="position:relative;display:inline-block;">
              <el-image
                :src="getFirstImageUrl(row.quotation_file)"
                :preview-src-list="getImageUrls(row.quotation_file)"
                preview-teleported
                fit="cover"
                style="width:48px;height:48px;border-radius:6px;cursor:pointer;display:block;"
              >
                <template #error><span style="font-size:11px;color:#ccc;">无图</span></template>
              </el-image>
              <span
                v-if="getImageUrls(row.quotation_file).length > 1"
                style="position:absolute;top:-6px;right:-6px;background:#8B5CF6;color:#fff;font-size:11px;font-weight:700;border-radius:10px;padding:1px 5px;line-height:16px;pointer-events:none;"
              >×{{ getImageUrls(row.quotation_file).length }}</span>
            </div>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <!-- 15. 需求种类 -->
        <el-table-column v-if="columnVisible.reqType" prop="requirement_type" label="需求种类" width="85" align="center">
          <template #default="{ row }"><span>{{ row.requirement_type || '-' }}</span></template>
        </el-table-column>
        <!-- 16. 备注 -->
        <el-table-column v-if="columnVisible.remark" prop="remark" label="备注" min-width="140" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.remark || '-' }}</span></template>
        </el-table-column>
        <!-- 17. 文件存储地址 -->
        <el-table-column v-if="columnVisible.fileStorage" label="文件存储地址" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.file_storage">📁</span><span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <!-- 18. 父记录 -->
        <el-table-column v-if="columnVisible.parentRecord" prop="parent_record" label="父记录" width="90" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.parent_record || '-' }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button
              v-permission="'project:edit'"
              link
              type="primary"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="'project:delete'"
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div style="padding:40px 0;color:#94A3B8;">
            <p style="font-size:15px;margin:0 0 12px;">未找到匹配的项目</p>
            <el-button size="small" @click="handleReset">清空筛选条件</el-button>
          </div>
        </template>
      </el-table>

      <!-- 批量操作栏 -->
      <transition name="el-zoom-in-bottom">
        <div v-if="selectedRows.length > 0" class="batch-bar">
          <span class="batch-count">已选 {{ selectedRows.length }} 条</span>
          <el-button v-permission="'project:delete'" type="danger" size="small" @click="handleBatchDelete">批量删除</el-button>
          <el-button v-permission="'project:export'" type="success" size="small" @click="handleExport">批量导出</el-button>
          <el-button link size="small" @click="clearSelection">取消选择</el-button>
        </div>
      </transition>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <ProjectFormDialog
      v-model="formDialogVisible"
      :mode="formMode"
      :project-data="currentProject"
      @success="handleFormSuccess"
    />

    <!-- 详情弹窗 -->
    <ProjectDetailDialog
      v-model="detailDialogVisible"
      :project="currentProject"
    />

    <!-- 图片预览 -->
    <ImagePreview
      v-model="previewVisible"
      :images="previewImages"
      :initial-index="previewIndex"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Download, Search, Refresh } from '@element-plus/icons-vue'
import { Setting } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjects, getProjectOptions, deleteProject } from '@/api/projects'
import { exportToCsv } from '@/utils/exportCsv'
import { getTagsByType, getSuppliers } from '@/api'
import PermissionButton from '@/components/common/PermissionButton.vue'
import ProjectFormDialog from '@/components/project/ProjectFormDialog.vue'
import ProjectDetailDialog from '@/components/project/ProjectDetailDialog.vue'
import ImagePreview from '@/components/common/ImagePreview.vue'

// 筛选表单
const filterForm = reactive({
  keyword: '',
  ip: null,
  projectYear: null,
  supplierName: null,
  requirementType: null
})

// 筛选选项（从数据中动态提取）
const ipOptions = ref([])
const yearOptions = ref([])
const supplierOptions = ref([])
const reqTypeOptions = ref([])

// 表格数据
const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const total = ref(0)

// 列显示控制
const columnKeys = ['ip', 'year', 'project', 'orderNo', 'amount', 'days', 'requester', 'region', 'supplier', 'startDate', 'endDate', 'leader', 'quotation', 'reqType', 'remark', 'fileStorage', 'parentRecord']
const columnLabels = { ip: 'IP', year: '年份', project: '项目', orderNo: '请购需求单', amount: '项目总价', days: '投入人天', requester: '需求人', region: '区服', supplier: '供应商', startDate: '开始日期', endDate: '结束日期', leader: '主要负责人', quotation: '报价单', reqType: '需求种类', remark: '备注', fileStorage: '文件存储', parentRecord: '父记录' }
const columnVisible = reactive({})
function initColumns() {
  const saved = localStorage.getItem('project_column_settings')
  if (saved) {
    try { Object.assign(columnVisible, JSON.parse(saved)) } catch { resetColumns() }
  } else { resetColumns() }
}
function resetColumns() {
  columnKeys.forEach(k => { columnVisible[k] = true })
}
function saveColumns() {
  localStorage.setItem('project_column_settings', JSON.stringify(columnVisible))
}
const pagination = reactive({
  page: 1,
  pageSize: 20
})

// 弹窗状态
const formDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const formMode = ref('add')
const currentProject = ref(null)

// 图片预览
const previewVisible = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)

// 加载选项数据（去重下拉，服务端提供，避免拉取整表）
async function loadOptions() {
  try {
    const res = await getProjectOptions()
    const d = res.data || {}
    ipOptions.value = d.ipTagIds || []
    yearOptions.value = d.years || []
    supplierOptions.value = d.suppliers || []
    reqTypeOptions.value = d.reqTypes || []
  } catch (error) {
    console.error('加载选项失败:', error)
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filterForm.keyword || undefined,
      ip: filterForm.ip || undefined,
      project_year: filterForm.projectYear || undefined,
      supplier_name: filterForm.supplierName || undefined,
      requirement_type: filterForm.requirementType || undefined
    }

    const res = await getProjects(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取第一张图片
function getFirstImage(images) {
  if (!images) return null
  try {
    const parsed = typeof images === 'string' ? JSON.parse(images) : images
    return Array.isArray(parsed) ? parsed[0] : null
  } catch {
    return null
  }
}

// 获取图片列表
function getImageList(images) {
  if (!images) return []
  try {
    const parsed = typeof images === 'string' ? JSON.parse(images) : images
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 状态相关
function getStatusType(status) {
  const types = {
    draft: 'info',
    reviewing: 'warning',
    approved: 'success',
    rejected: 'danger',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'info'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    draft: '草稿',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

function formatDate(date) {
  if (!date) return '-'
  return date.split(/[T ]/)[0]
}

function getImageUrls(effectImages) {
  if (!effectImages) return []
  return String(effectImages).split(',').map(f => f.trim()).filter(Boolean)
    .map(f => f.startsWith('http') ? f : `/uploads/${f}`)
}
function getFirstImageUrl(effectImages) {
  return getImageUrls(effectImages)[0] || null
}

// 筛选操作
function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.ip = null
  filterForm.projectYear = null
  filterForm.supplierName = null
  filterForm.requirementType = null
  pagination.page = 1
  loadData()
}

// 分页操作
function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function handlePageChange(page) {
  pagination.page = page
  loadData()
}

// 表格操作
const tableRef = ref(null)
function handleSelectionChange(selection) {
  selectedRows.value = selection
}
function clearSelection() {
  selectedRows.value = []
  tableRef.value?.clearSelection()
}
async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 条项目吗？删除后无法恢复。`, '批量删除', {
      confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning'
    })
    let okCount = 0
    for (const row of selectedRows.value) {
      try { await deleteProject(row.id); okCount++ } catch {}
    }
    ElMessage.success(`成功删除 ${okCount} 条`)
    selectedRows.value = []
    loadData()
  } catch (e) { /* 用户取消 */ }
}

function handleView(row) {
  currentProject.value = { ...row }
  detailDialogVisible.value = true
}

function handleAdd() {
  formMode.value = 'add'
  currentProject.value = null
  formDialogVisible.value = true
}

function handleEdit(row) {
  formMode.value = 'edit'
  currentProject.value = { ...row }
  formDialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除该项目吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteProject(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

function handlePreviewImages(row) {
  previewImages.value = getImageList(row.product_images)
  previewIndex.value = 0
  previewVisible.value = true
}

// 批量导出列定义（key 对应行字段，label 为 CSV 表头）
const exportColumns = [
  { key: 'product_name', label: '单品' },
  { key: 'project_name', label: '项目' },
  { key: 'project_year', label: '年份' },
  { key: 'ip_tag_ids', label: 'IP' },
  { key: 'supplier_name', label: '供应商' },
  { key: 'project_leader', label: '主要负责人' },
  { key: 'requester', label: '需求人' },
  { key: 'region', label: '区服' },
  { key: 'requirement_type', label: '需求种类' },
  { key: 'purchase_order_no', label: '相关请购需求单' },
  { key: 'remark', label: '备注' },
  { key: 'parent_record', label: '父记录' }
]

function handleExport() {
  if (!selectedRows.value.length) { ElMessage.warning('请选择要导出的数据'); return }
  const ts = new Date().toISOString().slice(0, 10)
  const ok = exportToCsv(`项目记录_${ts}.csv`, selectedRows.value, exportColumns)
  if (ok) ElMessage.success(`已导出 ${selectedRows.value.length} 条`)
  else ElMessage.warning('导出失败：无可用数据')
}

function handleFormSuccess() {
  loadData()
}

onMounted(() => {
  const route = useRoute()
  initColumns()
  if (route.query.keyword) {
    filterForm.keyword = String(route.query.keyword)
  }
  loadOptions()
  loadData()
})

watch(columnVisible, () => saveColumns(), { deep: true })
</script>

<style scoped>
.projects-container {
  padding: 20px;
  background: var(--bg-primary);
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.data-count {
  color: #A8A29E;
  font-size: 14px;
}

.page-actions {
  display: flex;
  gap: 12px;
}

.filter-card {
  margin-bottom: 16px;
  border-radius: 16px !important;
}

.filter-item {
  width: 100%;
}

.filter-keyword {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-separator {
  width: 10%;
  text-align: center;
  color: #A8A29E;
}

.table-card {
  margin-bottom: 16px;
  border-radius: 16px !important;
}

.image-preview {
  position: relative;
  width: 50px;
  height: 50px;
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
}

.table-image {
  width: 100%;
  height: 100%;
}

.no-image {
  color: var(--border-color);
  font-size: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.batch-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; margin-top: 8px;
  background: linear-gradient(135deg, #EDE9FE, #F5F3FF);
  border-radius: 10px; border: 1px solid #DDD6FE;
}
.batch-count { font-size: 14px; font-weight: 600; color: #7C3AED; }

.price-text { color: var(--accent); font-weight: 600; }
.total-text { color: #7C3AED; font-weight: 600; }
.style-hint { font-size: 11px; color: #A8A29E; }
.fee-detail { font-size: 11px; color: #A8A29E; line-height: 1.4; }
.fee-detail span { white-space: nowrap; }

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-actions {
    width: 100%;
  }

  .page-actions .el-button {
    flex: 1;
  }
}
</style>
