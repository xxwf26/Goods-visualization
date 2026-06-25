<template>
  <div class="quick-access">
    <!-- 全局搜索框（内嵌大搜索，跨模块实时检索） -->
    <div class="search-section">
      <el-card class="search-card">
        <el-input
          v-model="keyword"
          placeholder="搜索项目、价格、供应商、灵感、品类…"
          size="large"
          :prefix-icon="Search"
          clearable
          @focus="showSearchTips = true"
          @keydown="onKeydown"
        >
          <template #append>
            <span class="search-kbd">Ctrl K 全局唤起</span>
          </template>
        </el-input>

        <!-- 无输入时：热门搜索 -->
        <div v-if="showSearchTips && !keyword.trim()" class="search-tips">
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

        <!-- 有输入时：实时结果直接铺在主页 -->
        <div v-if="keyword.trim()" ref="resultsRef" class="search-results-inline" v-loading="loading">
          <SearchResults
            :data="data"
            :visible-groups="visibleGroups"
            :active-index="activeIndex"
            :keyword="keyword"
            :show-empty="showEmpty"
            :flat-index-of="flatIndexOf"
            @select="go"
            @select-group="goList"
            @hover="activeIndex = $event"
          />
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

    <SearchDetailDialogs ref="detailRef" />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Link, Plus, Goods, Folder, Shop, Upload, User, TrendCharts } from '@element-plus/icons-vue'
import { hasPermission } from '@/utils/permission'
import SearchResults from '@/components/common/SearchResults.vue'
import SearchDetailDialogs from '@/components/common/SearchDetailDialogs.vue'
import { useGlobalSearch } from '@/composables/useGlobalSearch'

const router = useRouter()

const showSearchTips = ref(false)
const resultsRef = ref(null)
const detailRef = ref(null)

const {
  keyword, loading, data, activeIndex,
  visibleGroups, showEmpty, flatIndexOf,
  moveActive, go, goList, activateCurrent
} = useGlobalSearch({
  onOpenDetail: (type, id) => detailRef.value?.open(type, id)
})

// 热门搜索标签（本司真实高频词）
const hotSearchTags = [
  '恋与深空',
  '暖暖',
  '吧唧',
  '亚克力立牌',
  '镭射票',
  '明信片'
]

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault(); moveActive(1); scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault(); moveActive(-1); scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault(); activateCurrent()
  }
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = resultsRef.value?.querySelector('.active')
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

// 快捷搜索：点热门标签直接填入并触发检索
function quickSearch(tag) {
  keyword.value = tag
}

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

.search-results-inline {
  margin-top: 14px;
  max-height: 60vh;
  overflow-y: auto;
  border-top: 1px solid var(--border-color, #EDE9FE);
  padding-top: 14px;
}

.search-kbd {
  font-size: 12px;
  color: var(--text-secondary, #94A3B8);
  white-space: nowrap;
  padding: 0 4px;
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
