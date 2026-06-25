<template>
  <div class="price-query-container">
    <div class="page-header">
      <h2>历史价格查询</h2>
      <p class="page-desc">基于周边价格登记数据，查询历史采购参考价格</p>
    </div>

    <el-tabs v-model="activeTab" class="query-tabs">
      <!-- ============ Tab1: 价格查询 ============ -->
      <el-tab-pane label="价格查询" name="query">
        <!-- 查询条件 -->
        <el-card class="query-card">
          <el-form :model="queryForm" inline label-width="70px">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="品类">
                  <el-select v-model="queryForm.category" placeholder="选择品类" clearable filterable style="width:100%">
                    <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="供应商">
                  <el-select v-model="queryForm.supplier_name" placeholder="选择供应商" clearable filterable style="width:100%">
                    <el-option v-for="s in supplierOptions" :key="s" :label="s" :value="s" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="IP">
                  <el-select v-model="queryForm.ip" placeholder="选择IP" clearable style="width:100%">
                    <el-option v-for="ip in ipOptions" :key="ip" :label="ip" :value="ip" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="项目">
                  <el-select v-model="queryForm.project_name" placeholder="选择项目" clearable filterable style="width:100%">
                    <el-option v-for="p in projectOptions" :key="p" :label="p" :value="p" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="单价区间">
                  <el-input-number v-model="queryForm.min_price" :min="0" :precision="2" placeholder="最低" style="width:42%" />
                  <span class="sep">-</span>
                  <el-input-number v-model="queryForm.max_price" :min="0" :precision="2" placeholder="最高" style="width:42%" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="数量区间">
                  <el-input-number v-model="queryForm.min_qty" :min="0" placeholder="最少" style="width:42%" />
                  <span class="sep">-</span>
                  <el-input-number v-model="queryForm.max_qty" :min="0" placeholder="最多" style="width:42%" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <div class="query-actions">
                  <el-button type="primary" :icon="Search" @click="handleQuery" :loading="loading">查询</el-button>
                  <el-button :icon="Refresh" @click="handleReset">重置</el-button>
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <!-- 查询结果 -->
        <div v-if="hasSearched" class="results-area">
          <!-- 价格统计 -->
          <div class="stats-section">
            <el-row :gutter="16">
              <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-high"><el-icon><Top /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ money(stats.max_price) }}</div><div class="stat-label">历史最高价</div></div></div></el-col>
              <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-low"><el-icon><Bottom /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ money(stats.min_price) }}</div><div class="stat-label">历史最低价</div></div></div></el-col>
              <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-avg"><el-icon><TrendCharts /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ money(stats.avg_price) }}</div><div class="stat-label">平均价格</div></div></div></el-col>
              <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon match-count"><el-icon><Document /></el-icon></div><div class="stat-content"><div class="stat-value">{{ stats.total_count || 0 }}</div><div class="stat-label">匹配记录数</div></div></div></el-col>
            </el-row>
          </div>

          <!-- 供应商价格对比 -->
          <el-card v-if="supplierCompare.length" class="result-card">
            <template #header><div class="section-header"><span><el-icon><DataLine /></el-icon> 跨供应商价格对比</span></div></template>
            <el-table :data="supplierCompare" stripe border size="small">
              <el-table-column type="index" label="排名" width="60" />
              <el-table-column prop="supplier_name" label="供应商" />
              <el-table-column label="平均单价" width="110" align="right">
                <template #default="{ row }"><span class="highlight-price">¥{{ money(row.avg_price) }}</span></template>
              </el-table-column>
              <el-table-column label="最低价" width="100" align="right">
                <template #default="{ row }">¥{{ money(row.min_price) }}</template>
              </el-table-column>
              <el-table-column label="最高价" width="100" align="right">
                <template #default="{ row }">¥{{ money(row.max_price) }}</template>
              </el-table-column>
              <el-table-column label="样本数" width="80" align="center">
                <template #default="{ row }"><el-tag size="small">{{ row.record_count }}条</el-tag></template>
              </el-table-column>
            </el-table>
          </el-card>

          <!-- 价格记录明细 -->
          <el-card class="result-card">
            <template #header><div class="section-header"><span><el-icon><List /></el-icon> 价格记录明细</span><span class="desc">共 {{ records.length }} 条</span></div></template>
            <el-table v-if="records.length" v-loading="loading" :data="records" stripe border>
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="product_name" label="单品" min-width="150" show-overflow-tooltip />
              <el-table-column prop="category" label="品类" width="100" />
              <el-table-column prop="supplier_name" label="供应商" width="130" show-overflow-tooltip />
              <el-table-column prop="ip" label="IP" width="90" />
              <el-table-column prop="project_name" label="项目" min-width="130" show-overflow-tooltip />
              <el-table-column label="单价" width="90" align="right">
                <template #default="{ row }"><span class="price-text">¥{{ money(row.unit_price) }}</span></template>
              </el-table-column>
              <el-table-column prop="total_quantity" label="总数量" width="95" align="right" />
              <el-table-column label="总价" width="110" align="right">
                <template #default="{ row }"><span class="total-text">¥{{ money(row.total_price) }}</span></template>
              </el-table-column>
              <el-table-column label="打样(天)" width="80" align="center">
                <template #default="{ row }">{{ row.sample_days ?? '-' }}</template>
              </el-table-column>
              <el-table-column label="大货(天)" width="80" align="center">
                <template #default="{ row }">{{ row.mass_production_days ?? '-' }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无匹配的价格记录" :image-size="60" />
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ============ Tab2: 报价审核 ============ -->
      <el-tab-pane label="报价审核" name="review">
        <el-card class="query-card">
          <el-form :model="reviewForm" inline label-width="80px">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="品类" required>
                  <el-select v-model="reviewForm.category" placeholder="选择品类(必填)" clearable filterable style="width:100%">
                    <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="供应商">
                  <el-select v-model="reviewForm.supplier_name" placeholder="选择供应商" clearable filterable style="width:100%">
                    <el-option v-for="s in supplierOptions" :key="s" :label="s" :value="s" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="本次数量">
                  <el-input-number v-model="reviewForm.quantity" :min="0" placeholder="数量" style="width:100%" controls-position="right" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="待审单价">
                  <el-input-number v-model="reviewForm.quote_price" :min="0" :precision="2" placeholder="供应商报价" style="width:100%" controls-position="right" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <div class="query-actions">
                  <el-button type="primary" :icon="Search" @click="handleReview" :loading="reviewLoading">审核</el-button>
                  <el-button :icon="Refresh" @click="handleReviewReset">重置</el-button>
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <div v-if="reviewSearched" class="results-area">
          <el-empty v-if="!review.range || !review.range.total_count" description="该品类暂无历史价格数据，无法审核" :image-size="60" />
          <template v-else>
            <!-- 报价裁定横幅 -->
            <el-alert
              v-if="review.verdict"
              :type="verdictType"
              :closable="false"
              show-icon
              class="verdict-alert"
            >
              <template #title>
                <span class="verdict-text">
                  待审报价 <b>¥{{ money(review.verdict.quote_price) }}</b>，历史均价 ¥{{ money(review.verdict.avg_price) }}，
                  <b>{{ verdictLabel }}</b>
                </span>
              </template>
            </el-alert>
            <el-alert
              v-else
              type="info"
              :closable="false"
              show-icon
              class="verdict-alert"
              title="未填写待审单价，以下仅展示该品类历史价格参考"
            />

            <!-- 历史价格区间 -->
            <div class="stats-section">
              <el-row :gutter="16">
                <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-high"><el-icon><Top /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ money(review.range.max_price) }}</div><div class="stat-label">历史最高价</div></div></div></el-col>
                <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-low"><el-icon><Bottom /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ money(review.range.min_price) }}</div><div class="stat-label">历史最低价</div></div></div></el-col>
                <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-avg"><el-icon><TrendCharts /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ money(review.range.avg_price) }}</div><div class="stat-label">历史均价</div></div></div></el-col>
                <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon match-count"><el-icon><Document /></el-icon></div><div class="stat-content"><div class="stat-value">{{ review.range.total_count }}</div><div class="stat-label">同品类记录</div></div></div></el-col>
              </el-row>
            </div>

            <!-- 同供应商历史 -->
            <el-card v-if="review.same_supplier" class="result-card">
              <template #header><div class="section-header"><span><el-icon><Shop /></el-icon> 同供应商历史（{{ review.same_supplier.supplier_name }}）</span></div></template>
              <el-descriptions :column="4" border size="small">
                <el-descriptions-item label="均价"><span class="highlight-price">¥{{ money(review.same_supplier.avg_price) }}</span></el-descriptions-item>
                <el-descriptions-item label="最低价">¥{{ money(review.same_supplier.min_price) }}</el-descriptions-item>
                <el-descriptions-item label="最高价">¥{{ money(review.same_supplier.max_price) }}</el-descriptions-item>
                <el-descriptions-item label="样本数">{{ review.same_supplier.record_count }} 条</el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 相近数量参考 -->
            <el-card v-if="review.similar_quantity && review.similar_quantity.length" class="result-card">
              <template #header><div class="section-header"><span><el-icon><Histogram /></el-icon> 相近数量历史单价</span><span class="desc">目标数量 {{ reviewForm.quantity }} 附近</span></div></template>
              <el-table :data="review.similar_quantity" stripe border size="small">
                <el-table-column prop="product_name" label="单品" min-width="140" show-overflow-tooltip />
                <el-table-column prop="supplier_name" label="供应商" width="130" show-overflow-tooltip />
                <el-table-column prop="project_name" label="项目" min-width="120" show-overflow-tooltip />
                <el-table-column prop="total_quantity" label="数量" width="90" align="right" />
                <el-table-column label="单价" width="90" align="right">
                  <template #default="{ row }"><span class="price-text">¥{{ money(row.unit_price) }}</span></template>
                </el-table-column>
              </el-table>
            </el-card>

            <!-- 跨供应商对比 -->
            <el-card v-if="review.supplier_comparison && review.supplier_comparison.length" class="result-card">
              <template #header><div class="section-header"><span><el-icon><DataLine /></el-icon> 同品类其他供应商报价</span></div></template>
              <el-table :data="review.supplier_comparison" stripe border size="small">
                <el-table-column type="index" label="排名" width="60" />
                <el-table-column prop="supplier_name" label="供应商" />
                <el-table-column label="平均单价" width="110" align="right">
                  <template #default="{ row }"><span class="highlight-price">¥{{ money(row.avg_price) }}</span></template>
                </el-table-column>
                <el-table-column label="最低价" width="100" align="right">
                  <template #default="{ row }">¥{{ money(row.min_price) }}</template>
                </el-table-column>
                <el-table-column label="最高价" width="100" align="right">
                  <template #default="{ row }">¥{{ money(row.max_price) }}</template>
                </el-table-column>
                <el-table-column label="样本数" width="80" align="center">
                  <template #default="{ row }"><el-tag size="small">{{ row.record_count }}条</el-tag></template>
                </el-table-column>
              </el-table>
            </el-card>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Refresh, Top, Bottom, TrendCharts, Document, DataLine, List, Shop, Histogram } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { queryPriceRecords, getPriceRecordOptions, quoteReviewPrice } from '@/api/priceRecords'

const activeTab = ref('query')

// 金额格式化（兼容字符串型 DECIMAL）
function money(v) {
  if (v === null || v === undefined || v === '') return '0.00'
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

// ===== 共享下拉选项 =====
const categoryOptions = ref([]), supplierOptions = ref([]), ipOptions = ref([]), projectOptions = ref([])
async function loadOptions() {
  try {
    const res = await getPriceRecordOptions()
    const d = res.data || {}
    categoryOptions.value = d.categories || []
    supplierOptions.value = d.suppliers || []
    ipOptions.value = d.ips || []
    projectOptions.value = d.projects || []
  } catch(e) { console.error(e) }
}

// ===== Tab1: 价格查询 =====
const queryForm = reactive({ category: null, supplier_name: null, ip: null, project_name: null, min_price: null, max_price: null, min_qty: null, max_qty: null })
const loading = ref(false), hasSearched = ref(false)
const stats = ref({ max_price: 0, min_price: 0, avg_price: 0, total_count: 0 })
const supplierCompare = ref([])
const records = ref([])

async function handleQuery() {
  loading.value = true; hasSearched.value = true
  try {
    const params = {
      category: queryForm.category || undefined,
      supplier_name: queryForm.supplier_name || undefined,
      ip: queryForm.ip || undefined,
      project_name: queryForm.project_name || undefined,
      min_price: queryForm.min_price || undefined,
      max_price: queryForm.max_price || undefined,
      min_quantity: queryForm.min_qty || undefined,
      max_quantity: queryForm.max_qty || undefined
    }
    const res = await queryPriceRecords(params)
    const data = res.data || {}
    records.value = data.records || []
    stats.value = data.stats || { max_price: 0, min_price: 0, avg_price: 0, total_count: 0 }
    supplierCompare.value = data.supplier_comparison || []
  } catch(e) { console.error(e) }
  finally { loading.value = false }
}

function handleReset() {
  Object.keys(queryForm).forEach(k => queryForm[k] = null)
  hasSearched.value = false; records.value = []; supplierCompare.value = []
}

// ===== Tab2: 报价审核 =====
const reviewForm = reactive({ category: null, supplier_name: null, quantity: null, quote_price: null })
const reviewLoading = ref(false), reviewSearched = ref(false)
const review = ref({ range: null, verdict: null, similar_quantity: [], same_supplier: null, supplier_comparison: [] })

const verdictType = computed(() => {
  const lv = review.value.verdict?.level
  return lv === 'high' ? 'error' : lv === 'low' ? 'success' : 'warning'
})
const verdictLabel = computed(() => {
  const v = review.value.verdict
  if (!v) return ''
  if (v.level === 'high') return `高于均价 ${v.diff_pct}%，建议复议`
  if (v.level === 'low') return `低于均价 ${Math.abs(v.diff_pct)}%，价格有优势`
  return `与均价基本持平（${v.diff_pct >= 0 ? '+' : ''}${v.diff_pct}%）`
})

async function handleReview() {
  if (!reviewForm.category) { ElMessage.warning('请先选择品类'); return }
  reviewLoading.value = true; reviewSearched.value = true
  try {
    const params = {
      category: reviewForm.category,
      supplier_name: reviewForm.supplier_name || undefined,
      quantity: reviewForm.quantity || undefined,
      quote_price: (reviewForm.quote_price !== null && reviewForm.quote_price !== '') ? reviewForm.quote_price : undefined
    }
    const res = await quoteReviewPrice(params)
    review.value = res.data || { range: null, verdict: null, similar_quantity: [], same_supplier: null, supplier_comparison: [] }
  } catch(e) { console.error(e) }
  finally { reviewLoading.value = false }
}

function handleReviewReset() {
  Object.keys(reviewForm).forEach(k => reviewForm[k] = null)
  reviewSearched.value = false
  review.value = { range: null, verdict: null, similar_quantity: [], same_supplier: null, supplier_comparison: [] }
}

onMounted(() => loadOptions())
</script>

<style scoped>
.price-query-container { padding:20px; background:var(--bg-primary); min-height:calc(100vh - 60px); }
.page-header { margin-bottom:12px; }
.page-header h2 { margin:0 0 8px; font-size:22px; font-weight:700; color:var(--text-primary); }
.page-desc { margin:0; color:#A8A29E; font-size:14px; }
.query-tabs :deep(.el-tabs__item) { font-size:15px; font-weight:600; }
.query-card { margin-bottom:16px; border-radius:16px!important; }
.sep { width:8%; text-align:center; color:#A8A29E; }
.query-actions { display:flex; justify-content:center; gap:16px; margin-top:8px; padding-top:12px; border-top:1px solid var(--border-color); }
.verdict-alert { margin-bottom:16px; border-radius:12px; }
.verdict-text { font-size:14px; }
.verdict-text b { font-size:15px; }
.stats-section { margin-bottom:16px; }
.stat-card { display:flex; align-items:center; padding:18px; background:#fff; border-radius:14px; box-shadow:0 2px 12px rgba(167,139,250,0.06); margin-bottom:12px; }
.stat-icon { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-right:14px; font-size:22px; color:#fff; }
.stat-icon.price-high { background:linear-gradient(135deg,var(--accent),var(--accent)); }
.stat-icon.price-low { background:linear-gradient(135deg,#7ECFC0,#5BB8A8); }
.stat-icon.price-avg { background:linear-gradient(135deg,var(--accent),var(--accent)); }
.stat-icon.match-count { background:linear-gradient(135deg,var(--border-color),var(--accent)); }
.stat-content { flex:1; }
.stat-value { font-size:22px; font-weight:800; color:var(--text-primary); line-height:1.2; }
.stat-label { font-size:13px; color:#A8A29E; margin-top:2px; }
.result-card { margin-bottom:16px; border-radius:16px!important; }
.section-header { display:flex; justify-content:space-between; align-items:center; }
.section-header span:first-child { display:flex; align-items:center; gap:8px; font-weight:600; color:var(--text-primary); }
.section-header .desc { font-size:13px; color:#A8A29E; font-weight:normal; }
.price-text { color:var(--accent); font-weight:600; }
.total-text { color:#7C3AED; font-weight:600; }
.highlight-price { color:var(--accent); font-weight:700; font-size:15px; }
</style>
