<template>
  <div class="supplier-container">
    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <div class="page-title">
        <h2>供应商库</h2>
        <span class="data-count">共 {{ total }} 家供应商</span>
      </div>
      <div class="page-actions">
        <PermissionButton
          permission="supplier:delete"
          @click="trashVisible = true"
        >
          回收站
        </PermissionButton>
        <PermissionButton
          permission="supplier:create"
          type="primary"
          :icon="Plus"
          @click="handleAdd"
        >
          新增供应商
        </PermissionButton>
      </div>
    </div>

    <!-- 筛选区域 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-row :gutter="16">
          <!-- 关键词搜索 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="关键词" class="filter-item">
              <el-input
                v-model="filterForm.keyword"
                placeholder="搜索供应商名称、联系人、品类等"
                clearable
                style="width: 280px"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-button type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>

          <!-- 合同类型 -->
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="合同类型" class="filter-item">
              <el-select v-model="filterForm.contractType" placeholder="选择类型" clearable style="width: 100%">
                <el-option label="单次合同" value="project" />
                <el-option label="框架合同" value="framework" />
                <el-option label="三方合同" value="third_party" />
                <el-option label="无合同储备" value="none" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 评分等级 -->
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="评分等级" class="filter-item">
              <el-select v-model="filterForm.minScore" placeholder="最低评分" clearable style="width: 100%">
                <el-option label="90分以上" :value="90" />
                <el-option label="80分以上" :value="80" />
                <el-option label="70分以上" :value="70" />
                <el-option label="60分以上" :value="60" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 合作状态 -->
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="合作状态" class="filter-item">
              <el-select v-model="filterForm.status" placeholder="选择状态" clearable style="width: 100%">
                <el-option label="合作中" value="active" />
                <el-option label="暂停合作" value="paused" />
                <el-option label="已终止" value="terminated" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        @row-click="handleRowClick"
        style="width: 100%"
      >
        <el-table-column label="#" width="50" align="center">
          <template #default="{ $index }">
            {{ (pagination.page - 1) * pagination.pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <!-- 1. 供应商全称 -->
        <el-table-column prop="supplier_name" label="供应商全称" min-width="200" show-overflow-tooltip fixed>
          <template #default="{ row }">
            <el-link type="primary" @click.stop="handleView(row)">{{ row.supplier_name }}</el-link>
          </template>
        </el-table-column>
        <!-- 2. 供应商简称 -->
        <el-table-column prop="supplier_short_name" label="简称" width="90" />
        <!-- 3. 联系人 -->
        <el-table-column prop="contact_person" label="联系人" width="85" />
        <!-- 4. 电话 -->
        <el-table-column prop="contact_phone" label="电话" width="135" />
        <!-- 5. 邮箱 -->
        <el-table-column prop="contact_email" label="邮箱" width="180" show-overflow-tooltip />
        <!-- 6. 合同类型 -->
        <el-table-column label="合同类型" width="95" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.contract_type==='framework'?'success':row.contract_type==='third_party'?'warning':''">
              {{ row.contract_type==='framework'?'框架':row.contract_type==='third_party'?'三方':row.contract_type==='none'?'无合同':'单次' }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- 7. 主观评分（百分制） -->
        <el-table-column label="主观评分" width="85" align="center">
          <template #default="{ row }">
            <span v-if="row.rating" class="score-badge">{{ row.rating }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 8. 合作项目数 -->
        <el-table-column prop="cooperation_project_count" label="合作项目数" width="100" align="center">
          <template #default="{ row }"><span class="count-text">{{ row.cooperation_project_count || 0 }}</span></template>
        </el-table-column>
        <!-- 9. 合作总金额 -->
        <el-table-column label="合作总金额" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.cooperation_total_amount" class="amount-text">¥{{ Number(row.cooperation_total_amount).toLocaleString() }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 10. 做过的品类 -->
        <el-table-column label="做过的品类" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.category_names || row.category_tags || '-' }}</span>
          </template>
        </el-table-column>
        <!-- 11. 优势品类 -->
        <el-table-column label="优势品类" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.advantage_categories || row.main_products || '-' }}</span>
          </template>
        </el-table-column>
        <!-- 12. 风险备注 -->
        <el-table-column label="风险备注" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'risk-warn': row.risk_notes || row.remark }">{{ row.risk_notes || row.remark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="handleView(row)">
              详情
            </el-button>
            <el-button
              v-permission="'supplier:edit'"
              link
              type="primary"
              size="small"
              @click.stop="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="'admin'"
              link
              type="danger"
              size="small"
              @click.stop="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <SupplierFormDialog
      v-model="formDialogVisible"
      :mode="formMode"
      :supplier-data="currentSupplier"
      @success="handleFormSuccess"
    />

    <!-- 详情弹窗 -->
    <SupplierDetailDialog
      v-model="detailDialogVisible"
      :supplier="currentSupplier"
      @edit="handleEdit"
    />

    <TrashDialog
      v-model="trashVisible"
      title="供应商回收站"
      :columns="trashColumns"
      :fetch-trash="getSupplierTrash"
      :restore="restoreSupplier"
      :purge="purgeSupplier"
      label-field="supplier_name"
      label-fallback="未命名供应商"
      @changed="loadData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierTrash, restoreSupplier, purgeSupplier } from '@/api/suppliers'
import { getTagsByType } from '@/api/tags'
import PermissionButton from '@/components/common/PermissionButton.vue'
import SupplierFormDialog from '@/components/supplier/SupplierFormDialog.vue'
import SupplierDetailDialog from '@/components/supplier/SupplierDetailDialog.vue'
import TrashDialog from '@/components/common/TrashDialog.vue'

const trashVisible = ref(false)
const trashColumns = [
  { prop: 'supplier_name', label: '供应商', minWidth: 200 },
  { prop: 'cooperation_status', label: '合作状态', width: 100, tag: true },
  { prop: 'contact_person', label: '联系人', width: 100 }
]

// 筛选表单
const filterForm = reactive({
  keyword: '',
  contractType: null,
  minScore: null,
  status: null
})

// 筛选选项（从标签系统动态加载）
const categoryOptions = ref([])

// 表格数据
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 弹窗状态
const formDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const formMode = ref('add')
const currentSupplier = ref(null)

// 格式化金额
function formatAmount(amount) {
  if (!amount) return '0'
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1) + '万'
  }
  return amount.toLocaleString()
}

// 状态处理
function getStatusType(status) {
  const types = {
    active: 'success', paused: 'warning', terminated: 'danger', potential: 'info'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    active: '合作中', paused: '暂停', terminated: '已终止', potential: '潜在'
  }
  return texts[status] || status || '潜在'
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filterForm.keyword || undefined,
      contract_type: filterForm.contractType || undefined,
      rating: filterForm.minScore || undefined,
      cooperation_status: filterForm.status || undefined
    }

    const res = await getSuppliers(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载供应商数据失败')
  } finally {
    loading.value = false
  }
}

// 筛选操作
function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  Object.keys(filterForm).forEach(key => { filterForm[key] = null })
  filterForm.keyword = ''
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

// 操作
function handleAdd() {
  formMode.value = 'add'
  currentSupplier.value = null
  formDialogVisible.value = true
}

function handleEdit(row) {
  formMode.value = 'edit'
  currentSupplier.value = { ...row }
  detailDialogVisible.value = false
  formDialogVisible.value = true
}

function handleView(row) {
  currentSupplier.value = { ...row }
  detailDialogVisible.value = true
}

function handleRowClick(row) {
  handleView(row)
}

function handleDelete(row) {
  ElMessageBox.confirm('确定要删除该供应商吗？删除后无法恢复。', '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteSupplier(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }).catch(() => {})
}

function handleFormSuccess() {
  loadData()
}

// 加载分类选项
async function loadCategoryOptions() {
  try {
    const res = await getTagsByType('category')
    categoryOptions.value = (res.data?.list || res.data || []).map(t => t.tag_name)
  } catch (error) {
    console.error('加载品类选项失败:', error)
  }
}

onMounted(() => {
  const route = useRoute()
  // 从全局检索跳转携带的关键词
  if (route.query.keyword) {
    filterForm.keyword = String(route.query.keyword)
  }
  loadCategoryOptions()
  loadData()
})
</script>

<style scoped>
.supplier-container {
  padding: 20px;
  background: var(--bg-primary);
  min-height: calc(100vh - 60px);
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { display: flex; align-items: baseline; gap: 12px; }
.page-title h2 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
.data-count { color: #A8A29E; font-size: 14px; }
.page-actions { display: flex; gap: 12px; }
.filter-card { margin-bottom: 16px; border-radius: 16px !important; }
.filter-item { width: 100%; }
.table-card { margin-bottom: 16px; border-radius: 16px !important; }
.score-wrapper { display: flex; align-items: center; gap: 8px; }
.score-text { font-weight: 700; color: var(--accent); }
.count-text { color: var(--accent); font-weight: 600; }
.amount-text { color: #7C3AED; font-weight: 600; }
.category-tags { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.more-count { font-size: 12px; color: #A8A29E; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
