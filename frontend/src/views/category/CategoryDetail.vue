<template>
  <div class="category-detail-container">
    <!-- 返回按钮 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
      <div class="category-title" v-if="category">
        <h1>{{ category.tag_name }}</h1>
        <el-tag :color="category.color" effect="dark">{{ category.tag_code }}</el-tag>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-loading="loading" class="content-wrapper">
      <!-- 价格统计概览 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.project_count }}</div>
            <div class="stat-label">项目数量</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">¥{{ stats.avg_price?.toFixed(2) || '--' }}</div>
            <div class="stat-label">平均单价</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">¥{{ stats.min_price?.toFixed(2) || '--' }}</div>
            <div class="stat-label">最低单价</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">¥{{ stats.max_price?.toFixed(2) || '--' }}</div>
            <div class="stat-label">最高单价</div>
          </div>
        </el-col>
      </el-row>

      <!-- 历史项目案例 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><Folder /></el-icon>
              历史项目案例
            </span>
            <el-button type="primary" link @click="goToProjects">
              查看全部
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </template>
        
        <el-table :data="projects" stripe border size="small" v-if="projects.length">
          <el-table-column prop="project_name" label="项目名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="product_name" label="产品名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="80" align="right" />
          <el-table-column prop="unit_price" label="单价" width="90" align="right">
            <template #default="{ row }">
              <span class="price-text">¥{{ row.unit_price?.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="total_amount" label="总金额" width="110" align="right">
            <template #default="{ row }">
              <span class="total-text">¥{{ row.total_amount?.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="craft_names" label="工艺" width="120" show-overflow-tooltip />
          <el-table-column prop="supplier_name" label="供应商" width="140" show-overflow-tooltip />
          <el-table-column prop="sample_cycle" label="打样周期" width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.sample_cycle">{{ row.sample_cycle }}天</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="create_time" label="时间" width="120">
            <template #default="{ row }">
              {{ formatDate(row.create_time) }}
            </template>
          </el-table-column>
        </el-table>
        
        <el-empty v-else description="暂无历史项目" />
      </el-card>

      <!-- 外部灵感参考 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><Link /></el-icon>
              外部灵感参考
            </span>
            <el-button type="primary" link @click="goToInspiration">
              查看全部
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </template>
        
        <div class="inspiration-grid" v-if="inspirations.length">
          <div
            v-for="item in inspirations"
            :key="item.id"
            class="inspiration-card"
            @click="handleJumpInspiration(item)"
          >
            <div class="card-image">
              <el-image
                v-if="item.cover_image"
                :src="item.cover_image"
                fit="cover"
              />
              <div v-else class="no-image">
                <el-icon :size="32"><Picture /></el-icon>
              </div>
              <div class="source-badge">
                <el-tag size="small" type="info">{{ getSourceLabel(item.source_type) }}</el-tag>
              </div>
            </div>
            <div class="card-content">
              <div class="card-title">{{ item.title }}</div>
              <div class="card-tags" v-if="item.craft_names">
                <el-tag size="small" effect="plain" v-for="craft in item.craft_names.split(',').slice(0, 2)" :key="craft">
                  {{ craft }}
                </el-tag>
              </div>
              <div class="card-stats" v-if="item.like_count || item.save_count">
                <span v-if="item.like_count"><el-icon><Star /></el-icon>{{ item.like_count }}</span>
                <span v-if="item.save_count"><el-icon><FolderOpened /></el-icon>{{ item.save_count }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <el-empty v-else description="暂无外部灵感" />
      </el-card>

      <!-- 推荐供应商 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><Shop /></el-icon>
              推荐供应商
            </span>
            <el-button type="primary" link @click="goToSuppliers">
              查看全部
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </template>
        
        <el-table :data="suppliers" stripe border size="small" v-if="suppliers.length">
          <el-table-column prop="supplier_name" label="供应商名称" min-width="180" />
          <el-table-column prop="project_count" label="合作次数" width="100" align="center">
            <template #default="{ row }">
              <el-tag type="primary">{{ row.project_count }}次</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="单价区间" width="180" align="center">
            <template #default="{ row }">
              <span class="price-range">
                ¥{{ row.min_price?.toFixed(2) }} - ¥{{ row.max_price?.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="平均单价" width="110" align="right">
            <template #default="{ row }">
              <span class="highlight-price">¥{{ row.avg_price?.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="latest_time" label="最近合作" width="120">
            <template #default="{ row }">
              {{ formatDate(row.latest_time) }}
            </template>
          </el-table-column>
        </el-table>
        
        <el-empty v-else description="暂无推荐供应商" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, ArrowRight, Folder, Link, Shop, Picture, Star, FolderOpened } from '@element-plus/icons-vue'
import { getCategoryDetail } from '@/api/price'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const category = ref(null)
const stats = ref({})
const projects = ref([])
const inspirations = ref([])
const suppliers = ref([])

// 加载品类详情
async function loadCategoryDetail() {
  const categoryId = route.params.id
  if (!categoryId) return

  loading.value = true
  try {
    const res = await getCategoryDetail(categoryId)
    const data = res.data || {}
    
    category.value = data.category
    stats.value = data.stats || {}
    projects.value = data.projects || []
    inspirations.value = data.inspirations || []
    suppliers.value = data.suppliers || []
  } catch (error) {
    console.error('加载品类详情失败:', error)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function goToProjects() {
  router.push({
    path: '/projects',
    query: { category: route.params.id }
  })
}

function goToInspiration() {
  router.push({
    path: '/inspiration',
    query: { category: route.params.id }
  })
}

function goToSuppliers() {
  router.push('/suppliers')
}

function handleJumpInspiration(item) {
  if (item.source_url) {
    window.open(item.source_url, '_blank')
  }
}

function getSourceLabel(sourceType) {
  const labels = {
    '小红书': '小红书',
    '淘宝': '淘宝',
    '1688': '1688',
    '站酷': '站酷',
    '微博': '微博',
    '抖音': '抖音',
    'pinterest': 'Pinterest',
    'instagram': 'Instagram',
    'other': '其他'
  }
  return labels[sourceType] || sourceType || '其他'
}

function formatDate(date) {
  if (!date) return '-'
  return date.split('T')[0]
}

onMounted(() => {
  loadCategoryDetail()
})
</script>

<style scoped>
.category-detail-container {
  padding: 20px;
  background: #FFF0F3;
  min-height: calc(100vh - 60px);
}

.page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
.category-title { display: flex; align-items: center; gap: 12px; }
.category-title h1 { margin: 0; font-size: 26px; font-weight: 700; color: #4A3340; }
.content-wrapper { min-height: 400px; }

.stats-row { margin-bottom: 16px; }
.stat-card {
  background: #fff; border-radius: 14px; padding: 20px;
  text-align: center; box-shadow: 0 2px 12px rgba(255, 107, 157, 0.06);
}
.stat-value { font-size: 28px; font-weight: 800; color: #4A3340; margin-bottom: 8px; }
.stat-label { font-size: 14px; color: #A0808C; }

.section-card { margin-bottom: 16px; border-radius: 16px !important; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-header span { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #4A3340; }

.price-text { color: #FF6B9D; font-weight: 600; }
.total-text { color: #E84878; font-weight: 600; }
.highlight-price { color: #FF6B9D; font-weight: 700; font-size: 15px; }
.price-range { font-size: 12px; color: #A0808C; }

.inspiration-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.inspiration-card {
  background: #fff; border-radius: 14px; overflow: hidden;
  cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 10px rgba(255, 107, 157, 0.05);
}
.inspiration-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(255, 107, 157, 0.12); }
.inspiration-card .card-image { position: relative; width: 100%; height: 120px; background: #FFF5F8; }
.inspiration-card .card-image :deep(.el-image) { width: 100%; height: 100%; }
.inspiration-card .no-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #FFD4E0; }
.inspiration-card .source-badge { position: absolute; top: 8px; left: 8px; }
.inspiration-card .card-content { padding: 12px; }
.inspiration-card .card-title { font-size: 14px; font-weight: 600; color: #4A3340; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inspiration-card .card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
.inspiration-card .card-stats { display: flex; gap: 12px; font-size: 12px; color: #A0808C; }
.inspiration-card .card-stats span { display: flex; align-items: center; gap: 2px; }

@media (max-width: 768px) {
  .category-detail-container { padding: 12px; }
  .stats-row .el-col { margin-bottom: 12px; }
  .inspiration-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
}
</style>
