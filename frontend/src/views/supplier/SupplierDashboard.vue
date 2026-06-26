<template>
  <div class="dashboard-container">
    <div class="page-header">
      <div>
        <h2>供应商表现评分看板</h2>
        <p class="page-desc">基于供应商库的评分与合作统计，洞察供应商整体表现</p>
      </div>
      <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
    </div>

    <div v-loading="loading">
      <!-- KPI 概览 -->
      <el-row :gutter="16" class="kpi-row">
        <el-col :xs="12" :sm="8" :md="4"><div class="stat-card"><div class="stat-icon c1"><el-icon><Shop /></el-icon></div><div class="stat-content"><div class="stat-value">{{ summary.total }}</div><div class="stat-label">供应商总数</div></div></div></el-col>
        <el-col :xs="12" :sm="8" :md="4"><div class="stat-card"><div class="stat-icon c2"><el-icon><Star /></el-icon></div><div class="stat-content"><div class="stat-value">{{ summary.rated }}</div><div class="stat-label">已评分</div></div></div></el-col>
        <el-col :xs="12" :sm="8" :md="4"><div class="stat-card"><div class="stat-icon c3"><el-icon><TrendCharts /></el-icon></div><div class="stat-content"><div class="stat-value">{{ summary.avg_rating }}</div><div class="stat-label">平均评分</div></div></div></el-col>
        <el-col :xs="12" :sm="8" :md="4"><div class="stat-card"><div class="stat-icon c4"><el-icon><CircleCheck /></el-icon></div><div class="stat-content"><div class="stat-value">{{ summary.active_count }}</div><div class="stat-label">合作中</div></div></div></el-col>
        <el-col :xs="12" :sm="8" :md="4"><div class="stat-card"><div class="stat-icon c5"><el-icon><Money /></el-icon></div><div class="stat-content"><div class="stat-value">¥{{ wan(summary.total_amount) }}</div><div class="stat-label">累计合作金额</div></div></div></el-col>
        <el-col :xs="12" :sm="8" :md="4"><div class="stat-card"><div class="stat-icon c6"><el-icon><Document /></el-icon></div><div class="stat-content"><div class="stat-value">{{ summary.total_projects }}</div><div class="stat-label">累计合作项目</div></div></div></el-col>
      </el-row>

      <!-- 图表区 -->
      <el-row :gutter="16">
        <el-col :xs="24" :lg="10">
          <el-card class="chart-card">
            <template #header><span class="card-title"><el-icon><PieChart /></el-icon> 评分分布</span></template>
            <div ref="ratingChartRef" class="chart-box"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="14">
          <el-card class="chart-card">
            <template #header><span class="card-title"><el-icon><Histogram /></el-icon> 优势品类分布</span></template>
            <div v-if="categoryDist.length" ref="categoryChartRef" class="chart-box"></div>
            <el-empty v-else description="暂无优势品类数据" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>

      <!-- 排行榜 -->
      <el-row :gutter="16">
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header><span class="card-title"><el-icon><Trophy /></el-icon> 评分排行 Top 10</span></template>
            <el-table :data="ratingRanking" stripe size="small">
              <el-table-column type="index" label="#" width="44" />
              <el-table-column label="供应商" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.supplier_short_name || row.supplier_name }}</template>
              </el-table-column>
              <el-table-column label="评分" width="180">
                <template #default="{ row }">
                  <div class="rating-bar">
                    <el-progress :percentage="row.rating" :color="ratingColor(row.rating)" :stroke-width="10" :show-text="false" style="flex:1" />
                    <span class="rating-num">{{ row.rating }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="合作项目" width="90" align="right">
                <template #default="{ row }">{{ row.cooperation_project_count || '-' }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header><span class="card-title"><el-icon><GoldMedal /></el-icon> 合作金额排行 Top 10</span></template>
            <el-table :data="amountRanking" stripe size="small">
              <el-table-column type="index" label="#" width="44" />
              <el-table-column label="供应商" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.supplier_short_name || row.supplier_name }}</template>
              </el-table-column>
              <el-table-column label="合作金额" width="120" align="right">
                <template #default="{ row }"><span class="amt-text">¥{{ wan(row.cooperation_total_amount) }}</span></template>
              </el-table-column>
              <el-table-column label="评分" width="80" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.rating !== null" size="small" :type="ratingTagType(row.rating)">{{ row.rating }}</el-tag>
                  <span v-else class="muted">未评</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { Refresh, Shop, Star, TrendCharts, CircleCheck, Money, Document, PieChart, Histogram, Trophy, GoldMedal } from '@element-plus/icons-vue'
import { getSupplierDashboard } from '@/api/suppliers'

const loading = ref(false)
const summary = reactive({ total: 0, rated: 0, avg_rating: 0, active_count: 0, total_amount: 0, total_projects: 0 })
const ratingRanking = ref([])
const amountRanking = ref([])
const categoryDist = ref([])

const ratingChartRef = ref(null)
const categoryChartRef = ref(null)
let ratingChart = null
let categoryChart = null

// 金额转「万」展示
function wan(v) {
  const n = Number(v) || 0
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toFixed(0)
}
function ratingColor(r) {
  if (r >= 90) return '#67C23A'
  if (r >= 80) return '#A78BFA'
  if (r >= 70) return '#E6A23C'
  return '#F56C6C'
}
function ratingTagType(r) {
  if (r >= 90) return 'success'
  if (r >= 80) return ''
  if (r >= 70) return 'warning'
  return 'danger'
}

async function loadData() {
  loading.value = true
  try {
    const res = await getSupplierDashboard()
    const d = res.data || {}
    Object.assign(summary, d.summary || {})
    ratingRanking.value = d.rating_ranking || []
    amountRanking.value = d.amount_ranking || []
    categoryDist.value = d.category_distribution || []
    await nextTick()
    renderRatingChart(d.rating_distribution || {})
    renderCategoryChart(categoryDist.value)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function renderRatingChart(dist) {
  if (!ratingChartRef.value) return
  ratingChart = echarts.getInstanceByDom(ratingChartRef.value) || echarts.init(ratingChartRef.value)
  const data = [
    { name: '优秀 (≥90)', value: dist.excellent || 0, itemStyle: { color: '#67C23A' } },
    { name: '良好 (80-89)', value: dist.good || 0, itemStyle: { color: '#A78BFA' } },
    { name: '一般 (70-79)', value: dist.fair || 0, itemStyle: { color: '#E6A23C' } },
    { name: '待改进 (<70)', value: dist.poor || 0, itemStyle: { color: '#F56C6C' } },
    { name: '未评分', value: dist.unrated || 0, itemStyle: { color: '#C8C9CC' } }
  ].filter(d => d.value > 0)
  ratingChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 家 ({d}%)' },
    legend: { orient: 'vertical', right: 0, top: 'center', itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['38%', '50%'], avoidLabelOverlap: true,
      label: { show: false }, labelLine: { show: false }, data
    }]
  })
}

function renderCategoryChart(list) {
  if (!categoryChartRef.value || !list.length) return
  categoryChart = echarts.getInstanceByDom(categoryChartRef.value) || echarts.init(categoryChartRef.value)
  const sorted = [...list].sort((a, b) => a.count - b.count)
  categoryChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c} 家' },
    grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: sorted.map(c => c.category) },
    series: [{
      type: 'bar', data: sorted.map(c => c.count), barMaxWidth: 22,
      itemStyle: { color: '#A78BFA', borderRadius: [0, 6, 6, 0] },
      label: { show: true, position: 'right', formatter: '{c}' }
    }]
  })
}

function handleResize() {
  ratingChart && ratingChart.resize()
  categoryChart && categoryChart.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  ratingChart && ratingChart.dispose()
  categoryChart && categoryChart.dispose()
})
</script>

<style scoped>
.dashboard-container { padding:20px; background:var(--bg-primary); min-height:calc(100vh - 60px); }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
.page-header h2 { margin:0 0 8px; font-size:22px; font-weight:700; color:var(--text-primary); }
.page-desc { margin:0; color:#A8A29E; font-size:14px; }
.kpi-row { margin-bottom:4px; }
.stat-card { display:flex; align-items:center; padding:16px; background:#fff; border-radius:14px; box-shadow:0 2px 12px rgba(167,139,250,0.06); margin-bottom:16px; }
.stat-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-right:12px; font-size:20px; color:#fff; flex-shrink:0; }
.stat-icon.c1 { background:linear-gradient(135deg,#A78BFA,#7C3AED); }
.stat-icon.c2 { background:linear-gradient(135deg,#F6C453,#E6A23C); }
.stat-icon.c3 { background:linear-gradient(135deg,#7ECFC0,#5BB8A8); }
.stat-icon.c4 { background:linear-gradient(135deg,#67C23A,#4E9A2A); }
.stat-icon.c5 { background:linear-gradient(135deg,#F58FB4,#EC4899); }
.stat-icon.c6 { background:linear-gradient(135deg,#7AA7F5,#3B82F6); }
.stat-content { flex:1; min-width:0; }
.stat-value { font-size:20px; font-weight:800; color:var(--text-primary); line-height:1.2; white-space:nowrap; }
.stat-label { font-size:13px; color:#A8A29E; margin-top:2px; }
.chart-card { margin-bottom:16px; border-radius:16px!important; }
.card-title { display:flex; align-items:center; gap:8px; font-weight:600; color:var(--text-primary); }
.chart-box { width:100%; height:300px; }
.rating-bar { display:flex; align-items:center; gap:8px; }
.rating-num { font-weight:700; color:var(--text-primary); width:28px; text-align:right; }
.amt-text { color:#7C3AED; font-weight:700; }
.muted { color:#C8C9CC; font-size:12px; }
</style>
