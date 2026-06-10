<template>
  <div class="rankings-container">
    <el-row :gutter="16">
      <!-- 核心供应商排行 -->
      <el-col :xs="24" :lg="12">
        <el-card class="ranking-card">
          <template #header>
            <div class="card-header">
              <span>
                <el-icon><Shop /></el-icon>
                核心供应商排行
              </span>
              <el-button link type="primary" size="small" @click="$emit('more-suppliers')">
                查看更多
              </el-button>
            </div>
          </template>
          <div class="ranking-list">
            <div
              v-for="(item, index) in supplierRanking"
              :key="item.id"
              class="ranking-item"
            >
              <div class="rank-badge" :class="getRankClass(index)">
                {{ index + 1 }}
              </div>
              <div class="rank-info">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-desc">{{ item.description }}</div>
              </div>
              <div class="rank-stats">
                <div class="rank-value">{{ item.goodsCount }}</div>
                <div class="rank-label">商品数</div>
              </div>
            </div>
            <el-empty v-if="!supplierRanking.length" description="暂无数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>

      <!-- 品类热度排行 -->
      <el-col :xs="24" :lg="12">
        <el-card class="ranking-card">
          <template #header>
            <div class="card-header">
              <span>
                <el-icon><TrendCharts /></el-icon>
                品类热度排行
              </span>
              <el-button link type="primary" size="small" @click="$emit('more-categories')">
                查看更多
              </el-button>
            </div>
          </template>
          <div class="ranking-list">
            <div
              v-for="(item, index) in categoryRanking"
              :key="item.id"
              class="ranking-item"
            >
              <div class="rank-badge" :class="getRankClass(index)">
                {{ index + 1 }}
              </div>
              <div class="rank-info">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-progress">
                  <el-progress
                    :percentage="getProgress(item.count)"
                    :stroke-width="6"
                    :show-text="false"
                    :color="getProgressColor(index)"
                  />
                </div>
              </div>
              <div class="rank-stats">
                <div class="rank-value">{{ item.count }}</div>
                <div class="rank-label">项目数</div>
              </div>
            </div>
            <el-empty v-if="!categoryRanking.length" description="暂无数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { Shop, TrendCharts } from '@element-plus/icons-vue'

const props = defineProps({
  supplierRanking: {
    type: Array,
    default: () => []
  },
  categoryRanking: {
    type: Array,
    default: () => []
  }
})

defineEmits(['more-suppliers', 'more-categories'])

// 获取排名样式
function getRankClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

// 获取进度条颜色
function getProgressColor(index) {
  const colors = ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#909399']
  return colors[index % colors.length]
}

// 计算进度百分比
function getProgress(count) {
  const list = props.categoryRanking
  if (!list.length) return 0
  const max = Math.max(...list.map(c => c.count))
  return max > 0 ? Math.round((count / max) * 100) : 0
}
</script>

<style scoped>
.rankings-container {
  margin-bottom: 24px;
}

.ranking-card {
  height: 100%;
  border-radius: 16px !important;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
}

.card-header span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4A3340;
}

.ranking-list {
  min-height: 200px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #FFF0F3;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #FFF0F3;
  color: #A0808C;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
}

.rank-badge.gold {
  background: linear-gradient(135deg, #FFB8D0, #FF8DB5);
  color: #fff;
}

.rank-badge.silver {
  background: linear-gradient(135deg, #FFD4E0, #FFB8D0);
  color: #fff;
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #FFE0E8, #FFD4E0);
  color: #FF6B9D;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 14px;
  color: #4A3340;
  font-weight: 600;
  margin-bottom: 4px;
}

.rank-desc {
  font-size: 12px;
  color: #A0808C;
}

.rank-progress {
  width: 120px;
}

.rank-stats {
  text-align: center;
  min-width: 60px;
  margin-left: 14px;
}

.rank-value {
  font-size: 18px;
  font-weight: 800;
  color: #FF6B9D;
}

.rank-label {
  font-size: 11px;
  color: #A0808C;
}
</style>
