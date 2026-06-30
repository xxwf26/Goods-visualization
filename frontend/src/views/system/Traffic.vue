<template>
  <div class="traffic-container">
    <div class="page-header">
      <div class="page-title">
        <h2>流量监控</h2>
        <span class="page-desc">统计系统流量，用于评估云服务器带宽需求</span>
      </div>
      <el-button type="primary" :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
    </div>

    <el-row :gutter="16" class="stats-cards">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-value">{{ stats.总请求数 || 0 }}</div>
          <div class="stat-label">总请求数</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-value">{{ stats.总出站 || '0 MB' }}</div>
          <div class="stat-label">总出站流量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card highlight">
          <div class="stat-value">{{ stats.日均出站流量 || '0 MB' }}</div>
          <div class="stat-label">日均出站流量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-value">{{ stats.统计天数 || 0 }} 天</div>
          <div class="stat-label">已统计天数</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 每日流量 -->
      <el-col :xs="24" :lg="14">
        <el-card class="data-card">
          <template #header><span>每日流量明细</span></template>
          <el-table :data="stats.每日明细 || []" stripe size="small" max-height="360">
            <el-table-column prop="日期" label="日期" width="120" />
            <el-table-column prop="请求数" label="请求数" width="100" align="right" />
            <el-table-column prop="出站" label="出站流量" align="right" />
          </el-table>
        </el-card>
      </el-col>

      <!-- 接口流量Top10 -->
      <el-col :xs="24" :lg="10">
        <el-card class="data-card">
          <template #header><span>接口流量 Top10</span></template>
          <el-table :data="stats.接口流量Top10 || []" stripe size="small" max-height="360">
            <el-table-column prop="endpoint" label="接口路径" show-overflow-tooltip />
            <el-table-column prop="requests" label="请求数" width="80" align="right" />
            <el-table-column prop="traffic" label="流量" width="90" align="right" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="info-card">
      <template #header><span>带宽选型建议</span></template>
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="运行开始">{{ stats.运行开始 || '-' }}</el-descriptions-item>
        <el-descriptions-item label="峰值单次请求">{{ stats.峰值单次请求 || '-' }}</el-descriptions-item>
        <el-descriptions-item label="选型参考">
          根据上方"日均出站流量"对照：<br>
          · 日均 &lt; 100MB → 1-3 Mbps 带宽够用<br>
          · 日均 100MB~1GB → 3-5 Mbps<br>
          · 日均 1~5GB → 5-10 Mbps<br>
          · 日均 &gt; 5GB → 建议图片走 OSS/CDN，ECS 只跑 API<br>
          建议累计统计 3-7 天后再决定。图片流量占比大时优先考虑 OSS。
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const stats = ref({})

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/traffic-stats')
    if (res.code === 200) stats.value = res.data || {}
    else ElMessage.error(res.message || '加载失败')
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.traffic-container { padding: 20px; background: var(--bg-primary, #FDFBFF); min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title h2 { margin: 0; font-size: 22px; font-weight: 700; color: #1E293B; }
.page-desc { color: #94A3B8; font-size: 13px; margin-left: 12px; }

.stats-cards { margin-bottom: 16px; }
.stat-card {
  background: #fff; border-radius: 14px; padding: 20px; text-align: center;
  box-shadow: 0 2px 12px rgba(167,139,250,0.06); margin-bottom: 12px;
  border: 1px solid #EDE9FE;
}
.stat-card.highlight { background: linear-gradient(135deg, #8B5CF6, #A78BFA); border-color: #8B5CF6; }
.stat-card.highlight .stat-value, .stat-card.highlight .stat-label { color: #fff; }
.stat-value { font-size: 24px; font-weight: 800; color: #1E293B; }
.stat-label { font-size: 13px; color: #94A3B8; margin-top: 6px; }

.data-card { margin-bottom: 16px; border-radius: 14px !important; }
.info-card { border-radius: 14px !important; }
</style>
