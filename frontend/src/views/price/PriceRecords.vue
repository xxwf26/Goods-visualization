<template>
  <div class="price-records-container">
    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <div class="page-title">
        <h2>历史周边价格记录库</h2>
        <span class="data-count">共 {{ total }} 条数据</span>
      </div>
      <div class="page-actions">
        <PermissionButton
          permission="goods:create"
          type="primary"
          @click="handleAdd"
        >
          新增价格记录
        </PermissionButton>
      </div>
    </div>

    <!-- 筛选区域 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-row :gutter="16">
          <!-- 1. 品类 -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="品类" class="filter-item">
              <el-select v-model="filterForm.category" placeholder="选择品类" clearable filterable style="width: 100%">
                <el-option v-for="cat in categoryOptions" :key="cat" :label="cat" :value="cat" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 2. IP -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="IP" class="filter-item">
              <el-select v-model="filterForm.ip" placeholder="选择IP" clearable filterable style="width: 100%">
                <el-option v-for="ip in ipOptions" :key="ip" :label="ip" :value="ip" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 3. 供应商 -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="供应商" class="filter-item">
              <el-select v-model="filterForm.supplier_name" placeholder="选择供应商" clearable filterable style="width: 100%">
                <el-option v-for="sup in supplierOptions" :key="sup" :label="sup" :value="sup" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 4. 单价区间 -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="单价区间" class="filter-item">
              <el-input-number v-model="filterForm.minPrice" :min="0" :precision="2" placeholder="最低" style="width: 42%" />
              <span class="range-separator">-</span>
              <el-input-number v-model="filterForm.maxPrice" :min="0" :precision="2" placeholder="最高" style="width: 42%" />
            </el-form-item>
          </el-col>

          <!-- 5. 项目 -->
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="项目" class="filter-item">
              <el-select v-model="filterForm.project_name" placeholder="选择项目" clearable filterable style="width: 100%">
                <el-option v-for="p in projectOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 6. 关键词 -->
          <el-col :xs="24" :sm="24" :md="16" :lg="18">
            <el-form-item label="关键词" class="filter-item filter-keyword">
              <el-input v-model="filterForm.keyword" placeholder="搜索单品、品类、项目、供应商等" clearable style="width: 60%">
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
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="width: 100%"
        max-height="calc(100vh - 340px)"
      >
        <el-table-column label="#" width="55" align="center">
          <template #default="{ $index }">
            {{ (pagination.page - 1) * pagination.pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <!-- 1. 单品 -->
        <el-table-column prop="product_name" label="单品" min-width="160" show-overflow-tooltip fixed />
        <!-- 2. 品类 -->
        <el-table-column prop="category" label="品类" width="100" />
        <!-- 3. 供应商 -->
        <el-table-column prop="supplier_name" label="供应商" width="140" show-overflow-tooltip />
        <!-- 4. IP -->
        <el-table-column prop="ip" label="IP" width="100" />
        <!-- 5. 图片 -->
        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.image" color="#67c23a"><PictureFilled /></el-icon>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <!-- 6. 项目 -->
        <el-table-column prop="project_name" label="项目" min-width="140" show-overflow-tooltip />
        <!-- 7. 打样（天） -->
        <el-table-column prop="sample_days" label="打样(天)" width="85" align="center">
          <template #default="{ row }"><span>{{ row.sample_days ?? '-' }}</span></template>
        </el-table-column>
        <!-- 8. 大货（天） -->
        <el-table-column prop="mass_production_days" label="大货(天)" width="85" align="center">
          <template #default="{ row }"><span>{{ row.mass_production_days ?? '-' }}</span></template>
        </el-table-column>
        <!-- 9. 款式 -->
        <el-table-column prop="style_count" label="款式" width="70" align="center">
          <template #default="{ row }"><span>{{ row.style_count ?? '-' }}</span></template>
        </el-table-column>
        <!-- 10. 单款数量 -->
        <el-table-column prop="single_quantity" label="单款数量" width="95" align="right">
          <template #default="{ row }">
            <span>{{ row.single_quantity?.toLocaleString() || '-' }}</span>
          </template>
        </el-table-column>
        <!-- 11. 设计费 -->
        <el-table-column label="设计费" width="90" align="right">
          <template #default="{ row }">
            <span v-if="row.design_fee">¥{{ Number(row.design_fee).toFixed(0) }}</span><span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 12. 打样费 -->
        <el-table-column label="打样费" width="90" align="right">
          <template #default="{ row }">
            <span v-if="row.sample_fee">¥{{ Number(row.sample_fee).toFixed(0) }}</span><span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 13. 单价 -->
        <el-table-column label="单价" width="90" align="right">
          <template #default="{ row }">
            <span v-if="row.unit_price" class="price-text">¥{{ Number(row.unit_price).toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 14. 总数量 -->
        <el-table-column prop="total_quantity" label="总数量" width="95" align="right">
          <template #default="{ row }">
            <span>{{ row.total_quantity?.toLocaleString() || '-' }}</span>
          </template>
        </el-table-column>
        <!-- 15. 其他费用 -->
        <el-table-column label="其他费用" width="90" align="right">
          <template #default="{ row }">
            <span v-if="row.other_fee">¥{{ Number(row.other_fee).toFixed(0) }}</span><span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 16. 总价 -->
        <el-table-column label="总价" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.total_price" class="total-text">¥{{ Number(row.total_price).toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <!-- 17. 生产信息 -->
        <el-table-column prop="production_info" label="生产信息" min-width="140" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.production_info || '-' }}</span></template>
        </el-table-column>
        <!-- 18. 备注1 -->
        <el-table-column prop="remark1" label="备注1" min-width="120" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.remark1 || '-' }}</span></template>
        </el-table-column>
        <!-- 19. 备注2 -->
        <el-table-column prop="remark2" label="备注2" min-width="120" show-overflow-tooltip>
          <template #default="{ row }"><span>{{ row.remark2 || '-' }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button v-permission="'goods:edit'" link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'goods:delete'" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

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
    <PriceRecordFormDialog
      v-model="formDialogVisible"
      :mode="formMode"
      :record-data="currentRecord"
      @success="handleFormSuccess"
    />

    <!-- 详情弹窗 -->
    <PriceRecordDetailDialog
      v-model="detailDialogVisible"
      :record="currentRecord"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh, PictureFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPriceRecords, deletePriceRecord } from '@/api/priceRecords'
import PermissionButton from '@/components/common/PermissionButton.vue'
import PriceRecordFormDialog from '@/components/priceRecord/PriceRecordFormDialog.vue'
import PriceRecordDetailDialog from '@/components/priceRecord/PriceRecordDetailDialog.vue'

// 筛选表单
const filterForm = reactive({
  keyword: '',
  category: null,
  ip: null,
  supplier_name: null,
  project_name: null,
  minPrice: null,
  maxPrice: null
})

// 筛选选项
const categoryOptions = ref([])
const ipOptions = ref([])
const supplierOptions = ref([])
const projectOptions = ref([])

// 表格数据
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const pagination = reactive({
  page: 1,
  pageSize: 20
})

// 弹窗状态
const formDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const formMode = ref('add')
const currentRecord = ref(null)

// 加载选项数据
async function loadOptions() {
  try {
    const res = await getPriceRecords({ page: 1, pageSize: 2000 })
    const list = res.data?.list || []
    categoryOptions.value = [...new Set(list.map(r => r.category).filter(Boolean))]
    ipOptions.value = [...new Set(list.map(r => r.ip).filter(Boolean))]
    supplierOptions.value = [...new Set(list.map(r => r.supplier_name).filter(Boolean))]
    projectOptions.value = [...new Set(list.map(r => r.project_name).filter(Boolean))]
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
      category: filterForm.category || undefined,
      ip: filterForm.ip || undefined,
      supplier_name: filterForm.supplier_name || undefined,
      project_name: filterForm.project_name || undefined,
      min_price: filterForm.minPrice || undefined,
      max_price: filterForm.maxPrice || undefined
    }

    const res = await getPriceRecords(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 筛选
function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.category = null
  filterForm.ip = null
  filterForm.supplier_name = null
  filterForm.project_name = null
  filterForm.minPrice = null
  filterForm.maxPrice = null
  pagination.page = 1
  loadData()
}

// 分页
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
function handleView(row) {
  currentRecord.value = { ...row }
  detailDialogVisible.value = true
}

function handleAdd() {
  formMode.value = 'add'
  currentRecord.value = null
  formDialogVisible.value = true
}

function handleEdit(row) {
  formMode.value = 'edit'
  currentRecord.value = { ...row }
  formDialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除该价格记录吗？', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deletePriceRecord(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

function handleFormSuccess() {
  loadData()
  loadOptions()
}

onMounted(() => {
  loadOptions()
  loadData()
})
</script>

<style scoped>
.price-records-container {
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

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.price-text { color: var(--accent); font-weight: 600; }
.total-text { color: #7C3AED; font-weight: 600; }

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