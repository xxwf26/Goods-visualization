<template>
  <div class="recent-container">
    <el-row :gutter="16">
      <!-- 最近新增项目 -->
      <el-col :xs="24" :lg="12">
        <el-card class="recent-card">
          <template #header>
            <div class="card-header">
              <span>
                <el-icon><FolderOpened /></el-icon>
                最近新增项目
              </span>
              <el-button link type="primary" size="small" @click="$emit('more-projects')">
                更多
              </el-button>
            </div>
          </template>
          <div class="recent-list">
            <div
              v-for="item in recentProjects"
              :key="item.id"
              class="recent-item"
              @click="handleProjectClick(item)"
            >
              <div class="recent-icon" :style="{ background: item.color }">
                <el-icon><Folder /></el-icon>
              </div>
              <div class="recent-content">
                <div class="recent-title">{{ item.name }}</div>
                <div class="recent-meta">
                  <el-tag size="small" type="info">{{ item.ip }}</el-tag>
                  <span class="recent-date">{{ item.createTime }}</span>
                </div>
              </div>
              <div class="recent-action">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
            <el-empty v-if="!recentProjects.length" description="暂无数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>

      <!-- 最近新增灵感 -->
      <el-col :xs="24" :lg="12">
        <el-card class="recent-card">
          <template #header>
            <div class="card-header">
              <span>
                <el-icon><Sunny /></el-icon>
                最近新增灵感
              </span>
              <el-button link type="primary" size="small" @click="$emit('more-ideas')">
                更多
              </el-button>
            </div>
          </template>
          <div class="recent-list">
            <div
              v-for="item in recentIdeas"
              :key="item.id"
              class="recent-item"
              @click="handleIdeaClick(item)"
            >
              <div class="recent-icon inspiration" v-if="item.image">
                <el-image
                  :src="item.image"
                  fit="cover"
                  class="inspiration-image"
                />
              </div>
              <div class="recent-icon inspiration" v-else :style="{ background: item.color }">
                <el-icon><Picture /></el-icon>
              </div>
              <div class="recent-content">
                <div class="recent-title">{{ item.title }}</div>
                <div class="recent-meta">
                  <el-tag size="small" type="warning">{{ item.category }}</el-tag>
                  <span class="recent-date">{{ item.createTime }}</span>
                </div>
              </div>
              <div class="recent-action">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
            <el-empty v-if="!recentIdeas.length" description="暂无数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { FolderOpened, Folder, ArrowRight, Sunny, Picture } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getProjects } from '@/api/projects'
import { getInspirations } from '@/api/inspirations'

defineEmits(['more-projects', 'more-ideas'])

const router = useRouter()

// 最近项目数据
const recentProjects = ref([])

// 最近灵感数据
const recentIdeas = ref([])

// 加载最近数据
async function loadRecentData() {
  try {
    const [projectsRes, inspirationRes] = await Promise.allSettled([
      getProjects({ page: 1, pageSize: 5, sort_field: 'create_time', sort_order: 'DESC' }),
      getInspirations({ page: 1, pageSize: 5, sort_field: 'create_time', sort_order: 'DESC' })
    ])

    if (projectsRes.status === 'fulfilled' && projectsRes.value?.data?.list) {
      recentProjects.value = projectsRes.value.data.list.map(p => ({
        id: p.id,
        name: p.project_name,
        ip: p.ip_tag_names?.split(',')[0] || '--',
        color: '#57a1f5',
        createTime: p.create_time?.split('T')[0] || '--'
      }))
    }

    if (inspirationRes.status === 'fulfilled' && inspirationRes.value?.data?.list) {
      recentIdeas.value = inspirationRes.value.data.list.map(i => ({
        id: i.id,
        title: i.title,
        category: i.source_platform || i.source_type || '--',
        color: '#f472b6',
        image: i.cover_image || '',
        createTime: i.create_time?.split('T')[0] || '--'
      }))
    }

    // 如果API没有数据，使用兜底数据
    if (!recentProjects.value.length) {
      recentProjects.value = [
        { id: 1, name: '恋与深空2024夏季限定明信片套装', ip: '恋与深空', color: '#57a1f5', createTime: '2024-06-01' },
        { id: 2, name: '闪耀暖暖三周年镭射票珍藏套组', ip: '闪耀暖暖', color: '#ec4899', createTime: '2024-04-15' },
        { id: 3, name: '恋与制作人四周年纪念亚克力立牌', ip: '恋与制作人', color: '#f97316', createTime: '2024-03-20' },
        { id: 4, name: '无期迷途限定徽章礼盒', ip: '无期迷途', color: '#84cc16', createTime: '2024-04-25' },
        { id: 5, name: '无限暖暖官方文件夹', ip: '无限暖暖', color: '#06b6d4', createTime: '2024-04-20' }
      ]
    }

    if (!recentIdeas.value.length) {
      recentIdeas.value = [
        { id: 1, title: '珠光纸明信片效果展示', category: '明信片', color: '#f472b6', image: '', createTime: '2024-06-15' },
        { id: 2, title: '镭射票设计案例合集', category: '镭射票', color: '#818cf8', image: '', createTime: '2024-03-15' },
        { id: 3, title: '亚克力立牌工艺参考', category: '亚克力立牌', color: '#34d399', image: '', createTime: '2024-05-10' },
        { id: 4, title: '徽章柯式印刷效果', category: '吧唧', color: '#fbbf24', image: '', createTime: '2024-04-25' },
        { id: 5, title: '拍立得相框设计案例', category: '拍立得', color: '#60a5fa', image: '', createTime: '2024-06-25' }
      ]
    }
  } catch (error) {
    console.error('加载最近数据失败:', error)
  }
}

function handleProjectClick(item) {
  router.push(`/projects?id=${item.id}`)
}

function handleIdeaClick(item) {
  router.push(`/inspiration?id=${item.id}`)
}

onMounted(() => {
  loadRecentData()
})
</script>

<style scoped>
.recent-container {
  margin-bottom: 24px;
}

.recent-card {
  height: 100%;
  border-radius: 16px !important;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #4A3340;
}

.card-header span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recent-list {
  min-height: 200px;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 14px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.recent-item:hover {
  background: #FFF5F8;
}

.recent-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.recent-icon.inspiration {
  background: #FF8DB5;
}

.inspiration-image {
  width: 100%;
  height: 100%;
}

.recent-content {
  flex: 1;
  min-width: 0;
}

.recent-title {
  font-size: 14px;
  color: #4A3340;
  font-weight: 600;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recent-date {
  font-size: 12px;
  color: #A0808C;
}

.recent-action {
  color: #FFD4E0;
  margin-left: 10px;
}

.recent-item:hover .recent-action {
  color: #FF6B9D;
}
</style>
