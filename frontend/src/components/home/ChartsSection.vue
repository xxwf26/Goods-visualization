<template>
  <div class="charts-container">
    <el-row :gutter="16">
      <!-- IP分布饼图 -->
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>IP分布</span>
              <el-tag size="small" type="info">按数量占比</el-tag>
            </div>
          </template>
          <div ref="ipChartRef" class="chart-wrapper"></div>
        </el-card>
      </el-col>

      <!-- 品类分布柱状图 -->
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>品类分布</span>
              <el-tag size="small" type="info">按项目数量</el-tag>
            </div>
          </template>
          <div ref="categoryChartRef" class="chart-wrapper"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  ipData: {
    type: Array,
    default: () => []
  },
  categoryData: {
    type: Array,
    default: () => []
  }
})

const ipChartRef = ref(null)
const categoryChartRef = ref(null)
let ipChart = null
let categoryChart = null

// 默认IP数据
const defaultIpData = [
  { name: '原神', value: 35 },
  { name: '明日方舟', value: 25 },
  { name: '崩坏星穹铁道', value: 18 },
  { name: '蔚蓝档案', value: 12 },
  { name: '其他', value: 10 }
]

// 默认品类数据
const defaultCategoryData = [
  { name: '手办', count: 156 },
  { name: '立牌', count: 89 },
  { name: '挂件', count: 67 },
  { name: '海报', count: 45 },
  { name: '抱枕', count: 38 },
  { name: '徽章', value: 32 }
]

// 初始化IP分布饼图
function initIpChart() {
  if (!ipChartRef.value) return

  ipChart = echarts.init(ipChartRef.value)

  const chartData = props.ipData.length > 0 ? props.ipData : defaultIpData

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        color: '#606266'
      }
    },
    color: ['#FF6B9D', '#FF8DB5', '#FFB8D0', '#FFD4E0', '#FF9EC1', '#FF7DAF', '#FFB0C8', '#FFC8D8'],
    series: [
      {
        name: 'IP分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
      }
    ]
  }

  ipChart.setOption(option)
}

// 初始化品类分布柱状图
function initCategoryChart() {
  if (!categoryChartRef.value) return

  categoryChart = echarts.init(categoryChartRef.value)

  const chartData = props.categoryData.length > 0 ? props.categoryData : defaultCategoryData
  const categories = chartData.map(item => item.name)
  const values = chartData.map(item => item.count || item.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: '#606266',
        interval: 0,
        rotate: 0,
        fontSize: 12
      },
      axisLine: {
        lineStyle: {
          color: '#dcdfe6'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#606266'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: '项目数量',
        type: 'bar',
        barWidth: '50%',
        data: values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FF8DB5' },
            { offset: 1, color: '#FF6B9D' }
          ]),
          borderRadius: [6, 6, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#FFB8D0' },
              { offset: 1, color: '#FF8DB5' }
            ])
          }
        }
      }
    ]
  }

  categoryChart.setOption(option)
}

// 响应窗口变化
function handleResize() {
  ipChart?.resize()
  categoryChart?.resize()
}

onMounted(() => {
  initIpChart()
  initCategoryChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  ipChart?.dispose()
  categoryChart?.dispose()
})

// 监听数据变化
watch(() => props.ipData, initIpChart, { deep: true })
watch(() => props.categoryData, initCategoryChart, { deep: true })
</script>

<style scoped>
.charts-container {
  margin-bottom: 24px;
}

.chart-card {
  height: 100%;
  border-radius: 16px !important;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #4A3340;
}

.chart-wrapper {
  width: 100%;
  height: 300px;
}
</style>
