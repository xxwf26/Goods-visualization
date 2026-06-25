<template>
  <el-aside :width="isCollapsed ? '64px' : '200px'" class="sidebar">
    <div class="logo-container">
      <img v-if="!isCollapsed" src="/logo.png" alt="logo" class="logo" />
      <span v-if="!isCollapsed" class="logo-text">周边可视化</span>
      <img v-else src="/logo.png" alt="logo" class="logo-small" />
    </div>
    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapsed"
      :collapse-transition="false"
      router
      class="sidebar-menu"
    >
      <el-menu-item index="/home">
        <el-icon><HomeFilled /></el-icon>
        <template #title>首页</template>
      </el-menu-item>
      <el-menu-item index="/projects">
        <el-icon><FolderOpened /></el-icon>
        <template #title>历史项目库</template>
      </el-menu-item>
      <el-menu-item index="/price-records">
        <el-icon><Coin /></el-icon>
        <template #title>历史价格记录库</template>
      </el-menu-item>
      <el-menu-item index="/price-query">
        <el-icon><Money /></el-icon>
        <template #title>价格查询</template>
      </el-menu-item>
      <el-menu-item index="/inspiration">
        <el-icon><Sunny /></el-icon>
        <template #title>灵感库</template>
      </el-menu-item>
      <el-menu-item index="/design-notes">
        <el-icon><WarningFilled /></el-icon>
        <template #title>设计/生产注意</template>
      </el-menu-item>
      <el-menu-item index="/suppliers">
        <el-icon><Shop /></el-icon>
        <template #title>供应商库</template>
      </el-menu-item>

      <!-- 系统管理子菜单（仅管理员可见） -->
      <el-sub-menu v-if="isAdmin" index="/system">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>系统管理</span>
        </template>
        <el-menu-item index="/import">
          <el-icon><Upload /></el-icon>
          <template #title>批量导入</template>
        </el-menu-item>
        <el-menu-item index="/system/tags">
          <el-icon><Collection /></el-icon>
          <template #title>标签管理</template>
        </el-menu-item>
        <el-menu-item index="/system/permission">
          <el-icon><Lock /></el-icon>
          <template #title>权限管理</template>
        </el-menu-item>
        <el-menu-item index="/system/logs">
          <el-icon><Tickets /></el-icon>
          <template #title>操作日志</template>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>

    <!-- 主题切换 -->
    <div v-if="!isCollapsed" class="theme-toggle">
      <span class="theme-label">主题</span>
      <el-switch
        v-model="isWarm"
        size="small"
        active-text="暖金"
        inactive-text="淡紫"
        @change="toggleTheme"
      />
    </div>

    <!-- 用户权限信息 -->
    <div v-if="!isCollapsed && isLoggedIn" class="user-role-info">
      <el-tag :type="roleTagType" size="small">
        {{ roleDisplayName }}
      </el-tag>
    </div>
  </el-aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, Monitor, FolderOpened, Money, Coin, Sunny, WarningFilled, Shop, Setting, Upload, Collection, Lock, Tickets } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.role === 'admin' || userStore.role === 'super_admin')
const roleDisplayName = computed(() => userStore.roleDisplayName)
const roleTagType = computed(() => {
  const types = { viewer: 'info', editor: 'warning', admin: 'danger' }
  return types[userStore.role] || 'info'
})

// 主题切换
const currentTheme = ref(localStorage.getItem('app-theme') || 'purple')
const isWarm = computed(() => currentTheme.value === 'warm')
if (currentTheme.value === 'warm') {
  document.documentElement.classList.add('theme-warm')
}

function toggleTheme(val) {
  currentTheme.value = val ? 'warm' : 'purple'
  localStorage.setItem('app-theme', currentTheme.value)
  if (val) {
    document.documentElement.classList.add('theme-warm')
  } else {
    document.documentElement.classList.remove('theme-warm')
  }
}
</script>

<style scoped>
.sidebar {
  height: 100vh;
  background: linear-gradient(180deg, var(--sidebar-from) 0%, var(--sidebar-mid) 50%, var(--sidebar-to) 100%);
  transition: width 0.3s;
  overflow: hidden;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.logo {
  width: 32px;
  height: 32px;
  margin-right: 8px;
}

.logo-small {
  width: 28px;
  height: 28px;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 1px;
}

.sidebar-menu {
  border-right: none;
  background: transparent;
}

:deep(.el-menu) {
  background: transparent !important;
}

:deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.85) !important;
  margin: 4px 8px;
  border-radius: 10px !important;
  transition: all 0.3s;
  font-weight: 500;
}

:deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
}

:deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.25) !important;
  color: #fff !important;
  font-weight: 700;
}

:deep(.el-sub-menu__title) {
  color: rgba(255, 255, 255, 0.85) !important;
  margin: 4px 8px;
  border-radius: 10px !important;
  font-weight: 500;
}

:deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
}

:deep(.el-sub-menu .el-menu-item) {
  padding-left: 56px !important;
}

.theme-toggle {
  position: absolute;
  bottom: 55px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
}

.theme-label {
  color: rgba(255,255,255,0.7);
  font-size: 12px;
}

.theme-toggle :deep(.el-switch__label) {
  color: rgba(255,255,255,0.7) !important;
  font-size: 11px;
}

.theme-toggle :deep(.el-switch__label.is-active) {
  color: #fff !important;
}

.user-role-info {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
}
</style>