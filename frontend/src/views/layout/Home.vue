<template>
  <div class="home-container">
    <!-- 欢迎信息栏 -->
    <div class="welcome-bar">
      <div class="welcome-text">
        <h2>你好，{{ userInfo?.nickname || userInfo?.username || '用户' }}</h2>
        <p>欢迎回到周边可视化管理系统</p>
      </div>
      <div class="welcome-date">
        <span class="date">{{ currentDate }}</span>
        <span class="weekday">{{ weekday }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <template v-if="loading">
      <SkeletonLoader />
    </template>

    <!-- 主内容 -->
    <template v-else>
      <!-- 统计卡片 -->
      <StatsCards :stats="statsData" />

      <!-- 搜索和快捷入口 -->
      <QuickAccess />

      <!-- 可视化图表 -->
      <ChartsSection
        :ip-data="ipData"
        :category-data="categoryData"
      />

      <!-- 榜单模块 -->
      <RankingSection
        :supplier-ranking="supplierRanking"
        :category-ranking="categoryRanking"
      />

      <!-- 动态更新 -->
      <RecentUpdates />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { request } from '@/api'
import { getPriceStats } from '@/api/price'
import { getSuppliers } from '@/api/suppliers'
import StatsCards from '@/components/home/StatsCards.vue'
import ChartsSection from '@/components/home/ChartsSection.vue'
import RankingSection from '@/components/home/RankingSection.vue'
import RecentUpdates from '@/components/home/RecentUpdates.vue'
import QuickAccess from '@/components/home/QuickAccess.vue'
import SkeletonLoader from '@/components/home/SkeletonLoader.vue'

const userStore = useUserStore()

// 加载状态
const loading = ref(true)

// 用户信息
const userInfo = computed(() => userStore.userInfo)

// 统计数据
const statsData = ref({
  projectCount: 0,
  goodsCount: 0,
  supplierCount: 0,
  totalAmount: 0
})

// 图表数据
const ipData = ref([])
const categoryData = ref([])

// 榜单数据
const supplierRanking = ref([])
const categoryRanking = ref([])

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

const weekday = computed(() => {
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weeks[new Date().getDay()]
})

// 加载数据
async function loadDashboardData() {
  loading.value = true
  try {
    const [dashboardRes, priceRes, supplierRes] = await Promise.allSettled([
      request.get('/statistics/dashboard'),
      getPriceStats(),
      getSuppliers({ page: 1, pageSize: 10 })
    ])

    // 处理仪表盘数据
    if (dashboardRes.status === 'fulfilled' && dashboardRes.value?.data) {
      const dash = dashboardRes.value.data
      statsData.value = {
        projectCount: dash.projects?.total || 0,
        goodsCount: dash.projects?.total_goods || 0,
        supplierCount: dash.suppliers?.total || 0,
        totalAmount: dash.projects?.total_amount || 0
      }
    }

    // 价格统计 → IP/品类分布图表
    if (priceRes.status === 'fulfilled' && priceRes.value?.data) {
      const priceData = priceRes.value.data
      if (priceData.by_ip?.length) {
        ipData.value = priceData.by_ip.map(item => ({ name: item.tag_name, value: item.project_count }))
      }
      if (priceData.by_category?.length) {
        categoryData.value = priceData.by_category.map(item => ({ name: item.tag_name, count: item.project_count }))
        categoryRanking.value = priceData.by_category.slice(0, 10).map((item, i) => ({
          id: i + 1, name: item.tag_name, count: item.project_count
        }))
      }
    }

    // 供应商排行 → 从供应商 API 获取
    if (supplierRes.status === 'fulfilled' && supplierRes.value?.data?.list) {
      const list = supplierRes.value.data.list
        .sort((a, b) => (b.cooperation_project_count || 0) - (a.cooperation_project_count || 0))
      supplierRanking.value = list.slice(0, 10).map((s, i) => ({
        id: i + 1,
        name: s.supplier_name,
        description: `${s.cooperation_project_count || 0}个项目 · ¥${Number(s.cooperation_total_amount || 0).toLocaleString()}`,
        goodsCount: s.cooperation_project_count || 0
      }))
    }

    // 兜底数据（API 都失败时使用）
    if (!ipData.value.length) {
      ipData.value = [{ name: '暂无数据', value: 1 }]
    }
    if (!categoryData.value.length) {
      categoryData.value = [{ name: '暂无数据', count: 0 }]
    }
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.home-container {
  padding: 20px;
  background: #FFF0F3;
  min-height: calc(100vh - 60px);
}

.welcome-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px 28px;
  background: linear-gradient(135deg, #FFB8D0 0%, #FF8DB5 50%, #FF6B9D 100%);
  border-radius: 18px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(255, 107, 157, 0.2);
}

.welcome-text h2 {
  font-size: 24px;
  margin: 0 0 6px;
  font-weight: 700;
}

.welcome-text p {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
}

.welcome-date {
  text-align: right;
}

.welcome-date .date {
  display: block;
  font-size: 16px;
  font-weight: 500;
}

.welcome-date .weekday {
  font-size: 13px;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .home-container {
    padding: 12px;
  }

  .welcome-bar {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .welcome-date {
    text-align: center;
  }
}
</style>
