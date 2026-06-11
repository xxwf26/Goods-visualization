<template>
  <div class="quick-access">
    <!-- 全局搜索框 -->
    <div class="search-section">
      <el-card class="search-card">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索项目、商品、灵感..."
          size="large"
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleSearch"
          @focus="showSearchTips = true"
          @blur="handleSearchBlur"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
        <div v-if="showSearchTips && !searchKeyword" class="search-tips">
          <div class="tips-title">热门搜索</div>
          <div class="tips-list">
            <el-tag
              v-for="tag in hotSearchTags"
              :key="tag"
              class="tips-tag"
              @click="quickSearch(tag)"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 快捷入口 -->
    <div class="shortcuts-section">
      <el-card>
        <template #header>
          <div class="section-title">
            <el-icon><Link /></el-icon>
            快捷入口
          </div>
        </template>
        <div class="shortcuts-grid">
          <div
            v-for="item in shortcuts"
            :key="item.path"
            class="shortcut-item"
            @click="handleShortcutClick(item)"
          >
            <div class="shortcut-icon" :style="{ background: item.color }">
              <el-icon :size="24">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <div class="shortcut-label">{{ item.label }}</div>
            <el-tag
              v-if="item.badge"
              size="small"
              type="danger"
              class="shortcut-badge"
            >
              {{ item.badge }}
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Link, Plus, Goods, Folder, Shop, Upload, User, TrendCharts } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'

const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const showSearchTips = ref(false)

// 热门搜索标签
const hotSearchTags = [
  '原神周边',
  '明日方舟',
  '手办',
  '立牌',
  '限定版',
  '联名款'
]

// 快捷入口配置
const shortcuts = [
  {
    label: '新增项目',
    icon: Plus,
    path: '/projects',
    color: '#409eff',
    permission: 'project:create',
    badge: null
  },
  {
    label: '灵感库',
    icon: Goods,
    path: '/inspiration',
    color: '#67c23a',
    permission: 'inspiration:view',
    badge: null
  },
  {
    label: '项目管理',
    icon: Folder,
    path: '/projects',
    color: '#e6a23c',
    permission: 'project:view',
    badge: null
  },
  {
    label: '供应商管理',
    icon: Shop,
    path: '/suppliers',
    color: '#f56c6c',
    permission: 'supplier:view',
    badge: null
  },
  {
    label: '批量导入',
    icon: Upload,
    path: '/import',
    color: '#909399',
    permission: 'project:import',
    badge: null
  },
  {
    label: '用户管理',
    icon: User,
    path: '/system/permission',
    color: '#9c27b0',
    permission: 'system:user',
    badge: null
  },
  {
    label: '标签管理',
    icon: TrendCharts,
    path: '/system/tags',
    color: '#00bcd4',
    permission: 'tag:create',
    badge: null
  }
].filter(item => {
  // 根据权限过滤
  if (item.permission) {
    return hasPermission(item.permission)
  }
  return true
})

// 搜索处理
function handleSearch() {
  if (!searchKeyword.value.trim()) return
  router.push({ path: '/projects', query: { keyword: searchKeyword.value.trim() } })
}

// 搜索框失焦处理
function handleSearchBlur() {
  setTimeout(() => {
    showSearchTips.value = false
  }, 200)
}

// 快捷搜索
function quickSearch(keyword) {
  searchKeyword.value = keyword
  handleSearch()
}

// 快捷入口点击
function handleShortcutClick(item) {
  router.push(item.path)
}
</script>

<style scoped>
.search-section {
  margin-bottom: 20px;
}

.search-card {
  padding: 8px 0;
  border-radius: 16px !important;
}

.search-tips {
  padding: 12px 0 0;
}

.tips-title {
  font-size: 12px;
  color: #A8A29E;
  margin-bottom: 8px;
  font-weight: 500;
}

.tips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tips-tag {
  cursor: pointer;
  border-radius: 10px;
}

.tips-tag:hover {
  opacity: 0.8;
  background: var(--bg-primary);
}

.shortcuts-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.shortcut-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 14px;
  background: #fff;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 10px rgba(167,139,250, 0.05);
}

.shortcut-item:hover {
  background: var(--card-bg);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(167,139,250, 0.12);
}

.shortcut-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.shortcut-label {
  font-size: 13px;
  color: var(--text-primary);
  text-align: center;
  font-weight: 500;
}

.shortcut-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

@media (max-width: 768px) {
  .shortcuts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
