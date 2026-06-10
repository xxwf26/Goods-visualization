<template>
  <div class="filter-container">
    <el-form :inline="true" :model="filterForm" class="filter-form">
      <slot />
      <el-form-item>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon> 重置
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const filterForm = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleSearch = () => {
  emit('search', { ...props.modelValue })
}

const handleReset = () => {
  const resetData = {}
  Object.keys(props.modelValue).forEach(key => {
    resetData[key] = ''
  })
  emit('update:modelValue', resetData)
  emit('reset')
}
</script>

<style scoped>
.filter-container {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
