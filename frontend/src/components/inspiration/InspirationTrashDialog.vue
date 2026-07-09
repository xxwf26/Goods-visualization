<template>
  <el-dialog
    :model-value="modelValue"
    title="回收站"
    width="760px"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="loadTrash"
  >
    <div v-loading="loading">
      <el-empty v-if="!loading && !list.length" description="回收站为空" />
      <el-table v-else :data="list" size="small" style="width:100%">
        <el-table-column label="标题" min-width="220">
          <template #default="{ row }">
            <span class="trash-title">{{ row.title || '无标题' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="平台" width="90">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.source_platform || row.source_type || '其他' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收藏数" width="80" align="center">
          <template #default="{ row }">{{ formatCount(row.save_count) }}</template>
        </el-table-column>
        <el-table-column label="删除时间" width="150">
          <template #default="{ row }">{{ formatTime(row.update_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :loading="row._busy" @click="handleRestore(row)">恢复</el-button>
            <el-button link type="danger" size="small" :loading="row._busy" @click="handlePurge(row)">彻底删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > pageSize" class="trash-pager">
        <el-pagination
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="p => { page = p; loadTrash() }"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getInspirationTrash, restoreInspiration, purgeInspiration } from '@/api/inspirations'

defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'changed'])

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

async function loadTrash() {
  loading.value = true
  try {
    const res = await getInspirationTrash({ page: page.value, pageSize })
    list.value = (res.data?.list || []).map(x => ({ ...x, _busy: false }))
    total.value = res.data?.pagination?.total || 0
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}

async function handleRestore(row) {
  row._busy = true
  try {
    const res = await restoreInspiration(row.id)
    if (res.code === 200) { ElMessage.success('已恢复'); emit('changed'); await loadTrash() }
    else ElMessage.error(res.message || '恢复失败')
  } catch { ElMessage.error('恢复失败') }
  finally { row._busy = false }
}

async function handlePurge(row) {
  try {
    await ElMessageBox.confirm(
      `确定彻底删除「${row.title || '无标题'}」吗？此操作不可恢复！`,
      '彻底删除', { confirmButtonText: '彻底删除', cancelButtonText: '取消', type: 'warning' }
    )
    row._busy = true
    const res = await purgeInspiration(row.id)
    if (res.code === 200) { ElMessage.success('已彻底删除'); await loadTrash() }
    else ElMessage.error(res.message || '删除失败')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  } finally { row._busy = false }
}

// 大数格式化：10000 → 1万
function formatCount(n) {
  const v = Number(n) || 0
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(v)
}
function formatTime(t) {
  if (!t) return '-'
  return String(t).replace('T', ' ').substring(0, 16)
}
</script>

<style scoped>
.trash-title { font-size: 13px; color: #1E293B; }
.trash-pager { display: flex; justify-content: center; margin-top: 14px; }
</style>
