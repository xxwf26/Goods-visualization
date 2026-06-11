<template>
  <div class="stats-cards">
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :md="6" v-for="(item, index) in displayData" :key="index">
        <div class="stat-card" :style="{ '--accent-color': item.color }">
          <div class="stat-icon">
            <el-icon :size="36">
              <component :is="item.icon" />
            </el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
          <div class="stat-trend" v-if="item.trend !== null">
            <span :class="item.trend >= 0 ? 'up' : 'down'">
              {{ item.trend >= 0 ? '↑' : '↓' }} {{ Math.abs(item.trend) }}%
            </span>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Folder, Goods, Shop, Money } from '@element-plus/icons-vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({
      projectCount: 0,
      goodsCount: 0,
      supplierCount: 0,
      totalAmount: 0
    })
  }
})

// 格式化金额
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '--'
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1) + '万'
  }
  return amount.toLocaleString()
}

const displayData = computed(() => [
  {
    label: '项目总数',
    value: props.stats.projectCount || '--',
    icon: Folder,
    color: '#409eff',
    trend: null
  },
  {
    label: '单品总数',
    value: props.stats.goodsCount || '--',
    icon: Goods,
    color: '#67c23a',
    trend: null
  },
  {
    label: '供应商总数',
    value: props.stats.supplierCount || '--',
    icon: Shop,
    color: '#e6a23c',
    trend: null
  },
  {
    label: '项目总金额',
    value: formatAmount(props.stats.totalAmount),
    icon: Money,
    color: '#f56c6c',
    trend: null
  }
])
</script>

<style scoped>
.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 22px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(167,139,250, 0.06);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--accent-color);
  border-radius: 0 4px 4px 0;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(167,139,250, 0.12);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--card-bg);
  color: var(--accent-color);
  margin-right: 16px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #A8A29E;
  margin-top: 4px;
  font-weight: 500;
}

.stat-trend {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 8px;
}

.stat-trend .up {
  color: #7ECFC0;
  background: rgba(126, 207, 192, 0.1);
}

.stat-trend .down {
  color: var(--accent);
  background: rgba(239, 71, 111, 0.1);
}

@media (max-width: 768px) {
  .stat-card {
    margin-bottom: 12px;
  }
}
</style>
