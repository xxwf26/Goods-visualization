<template>
  <div class="table-container">
    <el-table
      v-loading="loading"
      :data="data"
      :border="border"
      :stripe="stripe"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <el-table-column v-if="showSelection" type="selection" width="55" align="center" />
      <el-table-column v-if="showIndex" type="index" label="序号" width="60" align="center" />
      <slot />
    </el-table>
  </div>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  border: {
    type: Boolean,
    default: true
  },
  stripe: {
    type: Boolean,
    default: true
  },
  showSelection: {
    type: Boolean,
    default: false
  },
  showIndex: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['selection-change', 'sort-change'])

const handleSelectionChange = (selection) => {
  emit('selection-change', selection)
}

const handleSortChange = ({ prop, order }) => {
  emit('sort-change', { prop, order })
}
</script>

<style scoped>
.table-container {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
}
</style>
