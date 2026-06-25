<template>
  <div class="header">
    <div class="header-left">
      <el-icon class="collapse-btn" @click="toggleSidebar">
        <Fold v-if="!isCollapsed" />
        <Expand v-else />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-right">
      <div class="search-trigger" @click="openSearch">
        <el-icon><Search /></el-icon>
        <span class="search-trigger-text">搜索</span>
        <span class="search-trigger-kbd">Ctrl K</span>
      </div>
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="32" :style="{ backgroundColor: avatarColor }">
            {{ avatarText }}
          </el-avatar>
          <span class="username">{{ displayName }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Fold, Expand, ArrowDown, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle'])

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 显示名称
const displayName = computed(() => {
  return userStore.userInfo?.nickname || userStore.userInfo?.username || '用户'
})

// 头像文字（取前两个字符）
const avatarText = computed(() => {
  const name = displayName.value
  return name.slice(0, 2)
})

// 头像背景色
const avatarColor = computed(() => {
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#9c27b0', '#00bcd4']
  const name = displayName.value
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

const currentTitle = computed(() => {
  return route.meta.title || ''
})

const toggleSidebar = () => {
  emit('toggle')
}

// 打开全局检索面板（由 layout/index.vue 通过 provide 注入）
const openSearch = inject('openGlobalSearch', () => {})

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.clearUserInfo()
      router.push('/login')
    }).catch(() => {})
  } else if (command === 'profile') {
    ElMessageBox.info('个人中心功能开发中')
  }
}
</script>

<style scoped>
.header {
  height: 60px;
  background: #fff;
  box-shadow: 0 2px 16px rgba(167,139,250, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 22px;
  cursor: pointer;
  color: #A8A29E;
  transition: color 0.3s;
}

.collapse-btn:hover {
  color: var(--accent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 7px 12px;
  border-radius: 20px;
  background: var(--bg-primary);
  color: var(--text-secondary, #94A3B8);
  font-size: 13px;
  transition: all 0.3s;
}

.search-trigger:hover {
  background: var(--card-bg);
  color: var(--accent);
}

.search-trigger-kbd {
  font-size: 11px;
  border: 1px solid var(--border-color, #EDE9FE);
  border-radius: 5px;
  padding: 1px 6px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 24px;
  transition: all 0.3s;
}

.user-info:hover {
  background: var(--card-bg);
}

.username {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 14px;
}
</style>
