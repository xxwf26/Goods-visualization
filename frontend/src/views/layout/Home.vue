<template>
  <div class="home-container">
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

    <template v-if="loading">
      <SkeletonLoader />
    </template>

    <template v-else>
      <StatsCards :stats="statsData" />
      <QuickAccess />
      <ChartsSection :ip-data="ipData" :category-data="categoryData" />
      <RankingSection :supplier-ranking="supplierRanking" :category-ranking="categoryRanking" />
      <RecentUpdates />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { request } from '@/api'
import { getSuppliers } from '@/api/suppliers'
import StatsCards from '@/components/home/StatsCards.vue'
import ChartsSection from '@/components/home/ChartsSection.vue'
import RankingSection from '@/components/home/RankingSection.vue'
import RecentUpdates from '@/components/home/RecentUpdates.vue'
import QuickAccess from '@/components/home/QuickAccess.vue'
import SkeletonLoader from '@/components/home/SkeletonLoader.vue'

const userStore = useUserStore()
const loading = ref(true)
const userInfo = computed(() => userStore.userInfo)

const statsData = ref({ projectCount: 0, goodsCount: 0, supplierCount: 0, totalAmount: 0 })
const ipData = ref([]), categoryData = ref([])
const supplierRanking = ref([]), categoryRanking = ref([])

const currentDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
})
const weekday = computed(() => ['周日','周一','周二','周三','周四','周五','周六'][new Date().getDay()])

async function loadDashboardData() {
  loading.value = true
  try {
    const [dashR, supR] = await Promise.allSettled([
      request.get('/statistics/dashboard'),
      getSuppliers({ page: 1, pageSize: 50 })
    ])
    if (dashR.status === 'fulfilled' && dashR.value?.data) {
      const d = dashR.value.data
      statsData.value = { projectCount: d.projects?.total||0, goodsCount: d.price_records?.total||0, supplierCount: d.suppliers?.total||0, totalAmount: d.projects?.total_amount||0 }
      if (d.ip_distribution?.length) ipData.value = d.ip_distribution.map(i => ({ name: i.name, value: i.value }))
      if (d.category_distribution?.length) {
        categoryData.value = d.category_distribution.map(i => ({ name: i.name, count: i.count }))
        categoryRanking.value = d.category_distribution.slice(0,10).map((i,idx) => ({ id: idx+1, name: i.name, count: i.count }))
      }
    }
    if (supR.status === 'fulfilled' && supR.value?.data?.list) {
      const list = supR.value.data.list.filter(s => (s.cooperation_project_count||0)>0).sort((a,b) => (b.cooperation_project_count||0)-(a.cooperation_project_count||0))
      supplierRanking.value = list.slice(0,10).map((s,i) => ({ id: i+1, name: s.supplier_name, description: `${s.cooperation_project_count||0}个项目 · ¥${Number(s.cooperation_total_amount||0).toLocaleString()}`, goodsCount: s.cooperation_project_count||0 }))
    }
    if (!ipData.value.length) ipData.value = [{ name:'暂无数据', value:1 }]
    if (!categoryData.value.length) categoryData.value = [{ name:'暂无数据', count:0 }]
  } catch(e) { console.error(e) }
  finally { loading.value = false }
}
onMounted(() => loadDashboardData())
</script>

<style scoped>
.home-container { padding:20px; background:var(--bg-primary); min-height:calc(100vh - 60px); }

.welcome-bar {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:24px; padding:24px 28px;
  background: linear-gradient(135deg, var(--border-color) 0%, var(--accent-light) 50%, var(--accent-light) 100%);
  border-radius:18px; color:var(--welcome-text);
  box-shadow:0 2px 16px rgba(139,92,246,0.08);
}
.welcome-text h2 { font-size:24px; margin:0 0 6px; font-weight:700; }
.welcome-text p { font-size:14px; margin:0; opacity:0.75; }
.welcome-date { text-align:right; }
.welcome-date .date { display:block; font-size:16px; font-weight:500; }
.welcome-date .weekday { font-size:13px; opacity:0.7; }

@media (max-width:768px) {
  .home-container { padding:12px; }
  .welcome-bar { flex-direction:column; text-align:center; gap:12px; }
  .welcome-date { text-align:center; }
}
</style>