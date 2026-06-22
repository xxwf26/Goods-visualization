<template>
  <div class="price-query-container">
    <div class="page-header">
      <h2>历史价格查询</h2>
      <p class="page-desc">基于周边价格登记数据，查询历史采购参考价格</p>
    </div>

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
          <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-high"><el-icon><Top /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ stats.max_price?.toFixed(2) }}</div><div class="stat-label">历史最高价</div></div></div></el-col>
          <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-low"><el-icon><Bottom /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ stats.min_price?.toFixed(2) }}</div><div class="stat-label">历史最低价</div></div></div></el-col>
          <el-col :xs="12" :sm="6"><div class="stat-card"><div class="stat-icon price-avg"><el-icon><TrendCharts /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ stats.avg_price?.toFixed(2) }}</div><div class="stat-label">平均价格</div></div></div></el-col>
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
            <template #default="{ row }"><span class="highlight-price">¥{{ Number(row.avg_price).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column label="最低价" width="100" align="right">
            <template #default="{ row }">¥{{ Number(row.min_price).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="最高价" width="100" align="right">
            <template #default="{ row }">¥{{ Number(row.max_price).toFixed(2) }}</template>
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
            <template #default="{ row }"><span class="price-text">¥{{ Number(row.unit_price).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column prop="total_quantity" label="总数量" width="95" align="right" />
          <el-table-column label="总价" width="110" align="right">
            <template #default="{ row }"><span class="total-text">¥{{ Number(row.total_price||0).toFixed(2) }}</span></template>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Refresh, Top, Bottom, TrendCharts, Document, DataLine, List } from '@element-plus/icons-vue'
import { queryPriceRecords, getPriceRecordOptions } from '@/api/priceRecords'

const queryForm = reactive({ category: null, supplier_name: null, ip: null, project_name: null, min_price: null, max_price: null, min_qty: null, max_qty: null })
const categoryOptions = ref([]), supplierOptions = ref([]), ipOptions = ref([]), projectOptions = ref([])
const loading = ref(false), hasSearched = ref(false)
const stats = ref({ max_price: 0, min_price: 0, avg_price: 0, total_count: 0 })
const supplierCompare = ref([])
const records = ref([])

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
    // 服务端全量聚合，统计准确（不再受分页条数限制）
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

onMounted(() => loadOptions())
</script>

<style scoped>
.price-query-container { padding:20px; background:var(--bg-primary); min-height:calc(100vh - 60px); }
.page-header { margin-bottom:20px; }
.page-header h2 { margin:0 0 8px; font-size:22px; font-weight:700; color:var(--text-primary); }
.page-desc { margin:0; color:#A8A29E; font-size:14px; }
.query-card { margin-bottom:16px; border-radius:16px!important; }
.sep { width:8%; text-align:center; color:#A8A29E; }
.query-actions { display:flex; justify-content:center; gap:16px; margin-top:8px; padding-top:12px; border-top:1px solid var(--border-color); }
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