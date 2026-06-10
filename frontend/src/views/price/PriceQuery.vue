<template>
  <div class="price-query-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>历史价格查询</h2>
      <p class="page-desc">基于历史项目数据，查询相似规格的采购参考价格</p>
    </div>

    <!-- 查询条件 -->
    <el-card class="query-card">
      <el-form :model="queryForm" inline label-width="80px">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="品类">
              <el-select
                v-model="queryForm.category_tag_ids"
                placeholder="选择品类"
                clearable
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="cat in categoryOptions"
                  :key="cat.id"
                  :label="cat.tag_name"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="工艺">
              <el-select
                v-model="queryForm.craft_tag_ids"
                placeholder="选择工艺"
                clearable
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="craft in craftOptions"
                  :key="craft.id"
                  :label="craft.tag_name"
                  :value="craft.id"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="数量">
              <el-input-number v-model="queryForm.quantity" :min="1" placeholder="目标数量" style="width: 100%" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="尺寸">
              <el-input v-model="queryForm.product_size" placeholder="如 10x15cm" clearable style="width: 100%" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="供应商">
              <el-select
                v-model="queryForm.supplier_id"
                placeholder="选择供应商"
                clearable
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="supplier in supplierOptions"
                  :key="supplier.id"
                  :label="supplier.supplier_name"
                  :value="supplier.id"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="queryForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="24" :md="24" :lg="24">
            <el-form-item label="相近数量">
              <el-radio-group v-model="queryForm.quantity_tolerance">
                <el-radio :label="0.1">±10%</el-radio>
                <el-radio :label="0.2">±20%</el-radio>
                <el-radio :label="0.3">±30%</el-radio>
                <el-radio :label="0.5">±50%</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="query-actions">
          <el-button type="primary" :icon="Search" @click="handleQuery" :loading="loading">
            查询
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 查询结果（始终显示，只要搜索过） -->
    <div v-if="hasSearched" class="results-area">
      <!-- 价格统计 -->
      <div class="stats-section">
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon price-high"><el-icon><Top /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">¥{{ (priceStats.max_price || 0).toFixed(2) }}</div>
                <div class="stat-label">历史最高价</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon price-low"><el-icon><Bottom /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">¥{{ (priceStats.min_price || 0).toFixed(2) }}</div>
                <div class="stat-label">历史最低价</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon price-avg"><el-icon><TrendCharts /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">¥{{ (priceStats.avg_price || 0).toFixed(2) }}</div>
                <div class="stat-label">平均价格</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon match-count"><el-icon><Document /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ priceStats.total_count || 0 }}</div>
                <div class="stat-label">匹配记录数</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 相近数量单价参考 -->
      <el-card class="result-card">
        <template #header>
          <div class="section-header">
            <span><el-icon><Guide /></el-icon> 相近数量单价参考</span>
            <span class="desc" v-if="queryForm.quantity">数量范围: {{ quantityRangeText }}</span>
          </div>
        </template>
        <el-table v-if="similarPrices.length" :data="similarPrices" stripe border size="small">
          <el-table-column prop="quantity" label="历史数量" width="100" align="right" />
          <el-table-column label="单价(元)" width="100" align="right">
            <template #default="{ row }"><span class="price-text">¥{{ Number(row.unit_price).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column label="总金额" width="120" align="right">
            <template #default="{ row }">¥{{ Number(row.total_amount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="craft_names" label="工艺" show-overflow-tooltip />
          <el-table-column prop="category_names" label="品类" show-overflow-tooltip />
          <el-table-column prop="supplier_name" label="供应商" show-overflow-tooltip />
          <el-table-column prop="project_name" label="关联项目" show-overflow-tooltip />
          <el-table-column prop="create_time" label="成交时间" width="120" />
        </el-table>
        <el-empty v-else description="未指定数量，无法计算相近数量" :image-size="60" />
      </el-card>

      <!-- 跨供应商价格对比（仅管理员可见） -->
      <el-card v-if="isAdmin" class="result-card">
        <template #header>
          <div class="section-header">
            <span><el-icon><DataLine /></el-icon> 跨供应商价格对比</span>
            <span class="desc">按平均单价排序（越低越有优势）</span>
          </div>
        </template>
        <el-table v-if="supplierComparison.length" :data="supplierComparison" stripe border size="small">
          <el-table-column type="index" label="排名" width="60" align="center" />
          <el-table-column prop="supplier_name" label="供应商" />
          <el-table-column label="平均单价" width="110" align="right">
            <template #default="{ row }"><span class="highlight-price">¥{{ Number(row.avg_price).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column label="价格优势" width="150">
            <template #default="{ row }">
              <div class="advantage-bar">
                <div class="bar-fill" :style="{ width: Number(row.advantage) + '%', background: Number(row.advantage) >= 20 ? '#7ECFC0' : Number(row.advantage) >= 10 ? '#FFD166' : '#FFB8D0' }" />
                <span class="bar-text">{{ Number(row.advantage).toFixed(0) }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="样本数" width="80" align="center">
            <template #default="{ row }"><el-tag size="small">{{ row.project_count }}次</el-tag></template>
          </el-table-column>
          <el-table-column label="价格区间" width="180" align="center">
            <template #default="{ row }">
              <span class="price-range">¥{{ Number(row.min_price).toFixed(2) }} - ¥{{ Number(row.max_price).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无可对比的供应商数据" :image-size="60" />
      </el-card>

      <!-- 历史项目明细 -->
      <el-card class="result-card">
        <template #header>
          <div class="section-header">
            <span><el-icon><List /></el-icon> 历史项目明细</span>
            <span class="desc">共 {{ recentProjects.length }} 条匹配记录</span>
          </div>
        </template>
        <el-table v-if="recentProjects.length" v-loading="loading" :data="recentProjects" stripe border>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="project_name" label="项目名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="product_name" label="产品名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="category_names" label="品类" width="100" />
          <el-table-column prop="craft_names" label="工艺" width="100" />
          <el-table-column prop="quantity" label="数量" width="80" align="right" />
          <el-table-column prop="product_size" label="尺寸" width="100" />
          <el-table-column prop="supplier_name" label="供应商" width="140" show-overflow-tooltip />
          <el-table-column label="单价" width="90" align="right">
            <template #default="{ row }"><span class="price-text">¥{{ Number(row.unit_price).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column label="总金额" width="110" align="right">
            <template #default="{ row }"><span class="total-text">¥{{ Number(row.total_amount).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column prop="create_time" label="成交时间" width="120">
            <template #default="{ row }">{{ formatDate(row.create_time) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无匹配的历史项目" :image-size="60" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  Search, Refresh, Top, Bottom, TrendCharts, Document,
  Guide, DataLine, List
} from '@element-plus/icons-vue'
import { getTagsByType, getSuppliers } from '@/api'
import { queryPrice } from '@/api/price'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.role === 'admin' || userStore.role === 'super_admin')

// 查询表单
const queryForm = reactive({
  category_tag_ids: null,
  craft_tag_ids: null,
  quantity: null,
  product_size: '',
  supplier_id: null,
  dateRange: null,
  quantity_tolerance: 0.2
})

// 选项数据
const categoryOptions = ref([])
const craftOptions = ref([])
const supplierOptions = ref([])

// 状态
const loading = ref(false)
const hasSearched = ref(false)

// 统计数据
const priceStats = ref({
  max_price: 0,
  min_price: 0,
  avg_price: 0,
  total_count: 0
})

// 相近数量单价
const similarPrices = ref([])

// 跨供应商对比
const supplierComparison = ref([])

// 最近项目明细
const recentProjects = ref([])

// 数量范围文本
const quantityRangeText = computed(() => {
  if (!queryForm.quantity) return '--'
  const range = queryForm.quantity * queryForm.quantity_tolerance
  const min = queryForm.quantity - range
  const max = queryForm.quantity + range
  return `${Math.round(min)} - ${Math.round(max)}`
})

// 加载选项数据
async function loadOptions() {
  try {
    const [catRes, craftRes, supplierRes] = await Promise.all([
      getTagsByType('category'),
      getTagsByType('craft'),
      getSuppliers({ page: 1, pageSize: 100 })
    ])

    categoryOptions.value = catRes.data?.list || catRes.data || []
    craftOptions.value = craftRes.data?.list || craftRes.data || []
    supplierOptions.value = supplierRes.data?.list || []
  } catch (error) {
    console.error('加载选项失败:', error)
  }
}

// 查询
async function handleQuery() {
  loading.value = true
  hasSearched.value = true

  try {
    const params = {
      category_tag_ids: queryForm.category_tag_ids || undefined,
      craft_tag_ids: queryForm.craft_tag_ids || undefined,
      quantity: queryForm.quantity || undefined,
      product_size: queryForm.product_size || undefined,
      supplier_id: queryForm.supplier_id || undefined,
      quantity_tolerance: queryForm.quantity_tolerance,
      start_date: queryForm.dateRange?.[0] || undefined,
      end_date: queryForm.dateRange?.[1] || undefined
    }

    const res = await queryPrice(params)
    const data = res.data || {}

    // 更新统计数据
    priceStats.value = data.stats || {}

    // 更新相近数量单价
    similarPrices.value = data.similar_quantity || []

    // 更新供应商对比
    supplierComparison.value = data.supplier_comparison || []

    // 更新最近项目
    recentProjects.value = data.recent_projects || []
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    loading.value = false
  }
}

// 重置
function handleReset() {
  queryForm.category_tag_ids = null
  queryForm.craft_tag_ids = null
  queryForm.quantity = null
  queryForm.product_size = ''
  queryForm.supplier_id = null
  queryForm.dateRange = null
  queryForm.quantity_tolerance = 0.2
  hasSearched.value = false
  
  priceStats.value = {}
  similarPrices.value = []
  supplierComparison.value = []
  recentProjects.value = []
}

function formatDate(date) {
  if (!date) return '-'
  return date.split('T')[0]
}

function getAdvantageColor(advantage) {
  if (advantage >= 20) return '#67c23a'
  if (advantage >= 10) return '#e6a23c'
  return '#909399'
}

onMounted(() => {
  loadOptions()
})
</script>

<style scoped>
.price-query-container {
  padding: 20px;
  background: #FFF0F3;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #4A3340;
}

.page-desc {
  margin: 0;
  color: #A0808C;
  font-size: 14px;
}

.query-card {
  margin-bottom: 16px;
  border-radius: 16px !important;
}

.query-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #FFD4E0;
}

.stats-section {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 18px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(255, 107, 157, 0.06);
  margin-bottom: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  font-size: 22px;
  color: #fff;
}

.stat-icon.price-high { background: linear-gradient(135deg, #EF476F, #FF6B9D); }
.stat-icon.price-low { background: linear-gradient(135deg, #7ECFC0, #5BB8A8); }
.stat-icon.price-avg { background: linear-gradient(135deg, #FF6B9D, #FF8DB5); }
.stat-icon.match-count { background: linear-gradient(135deg, #FFB8D0, #FF8DB5); }

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: #4A3340;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #A0808C;
  margin-top: 2px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header span:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #4A3340;
}

.section-header .desc {
  font-size: 13px;
  color: #A0808C;
  font-weight: normal;
}

.similar-section,
.comparison-section,
.detail-section {
  margin-bottom: 16px;
  border-radius: 16px !important;
}

.price-text { color: #FF6B9D; font-weight: 600; }
.total-text { color: #E84878; font-weight: 600; }
.highlight-price { color: #FF6B9D; font-weight: 700; font-size: 15px; }

.advantage-bar {
  position: relative;
  height: 20px;
  background: #FFF0F3;
  border-radius: 6px;
  overflow: hidden;
}

.bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}

.bar-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #4A3340;
}

.price-range { font-size: 12px; color: #A0808C; }
.empty-state { margin-top: 60px; }

@media (max-width: 768px) {
  .price-query-container { padding: 12px; }
}
</style>
