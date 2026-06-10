<template>
  <div class="layout-container">
    <Sidebar :isCollapsed="isCollapsed" />
    <div class="main-container">
      <Header :isCollapsed="isCollapsed" @toggle="toggleSidebar" />
      <div class="content-wrapper">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'

const isCollapsed = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}
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
  background: #FFF0F3;
}
</style>
