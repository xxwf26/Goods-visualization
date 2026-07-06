<template>
  <div class="layout-container">
    <Sidebar :isCollapsed="isCollapsed" />
    <div class="main-container">
      <Header :isCollapsed="isCollapsed" @toggle="toggleSidebar" />
      <div class="content-wrapper">
        <router-view />
      </div>
    </div>
    <GlobalSearch v-model:visible="searchOpen" />
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import GlobalSearch from '@/components/layout/GlobalSearch.vue'

const isCollapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebar_collapsed', String(isCollapsed.value))
}

// 全局检索面板（Ctrl/Cmd + K 唤起，Header 按钮也可打开）
const searchOpen = ref(false)
provide('openGlobalSearch', () => { searchOpen.value = true })

function onGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    searchOpen.value = true
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-wrapper {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: var(--bg-primary);
}
</style>
