<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="760px"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="loadTrash"
  >
    <div v-loading="loading">
      <el-empty v-if="!loading && !list.length" description="回收站为空" />
      <el-table v-else :data="list" size="small" style="width:100%">
        <el-table-column
          v-for="col in columns"
          :key="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :align="col.align || 'left'"
        >
          <template #default="{ row }">
            <el-tag v-if="col.tag" size="small" :type="col.tagType || 'info'">{{ col.format ? col.format(row) : (row[col.prop] || '-') }}</el-tag>
            <span v-else-if="col.format" v-html="col.format(row)"></span>
            <span v-else>{{ row[col.prop] || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="删除时间" width="150">
          <template #default="{ row }">{{ formatDateTime(row.update_time) }}</template>
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
import { formatDateTime } from '@/utils/format'

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '回收站' },
  // 列定义：[{ prop, label, width?, minWidth?, align?, tag?, tagType?, format?(row)=>string }]
  columns: { type: Array, default: () => [] },
  // 三个 API 回调：(params) => Promise
  fetchTrash: { type: Function, required: true },
  restore: { type: Function, required: true },
  purge: { type: Function, required: true },
  // 标题字段名，用于彻底删除确认弹窗的展示文案
  labelField: { type: String, default: 'title' },
  labelFallback: { type: String, default: '无标题' }
})
const emit = defineEmits(['update:modelValue', 'changed'])

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

async function loadTrash() {
  loading.value = true
  try {
    const res = await props.fetchTrash({ page: page.value, pageSize })
    list.value = (res.data?.list || []).map(x => ({ ...x, _busy: false }))
    total.value = res.data?.pagination?.total || 0
  } catch { list.value = [] }
  finally { loading.value = false }
}

async function handleRestore(row) {
  row._busy = true
  try {
    const res = await props.restore(row.id)
    if (res.code === 200) { ElMessage.success('已恢复'); emit('changed'); await loadTrash() }
    else ElMessage.error(res.message || '恢复失败')
  } catch { ElMessage.error('恢复失败') }
  finally { row._busy = false }
}

async function handlePurge(row) {
  try {
    const label = row[props.labelField] || props.labelFallback
    await ElMessageBox.confirm(
      `确定彻底删除「${label}」吗？此操作不可恢复！`,
      '彻底删除', { confirmButtonText: '彻底删除', cancelButtonText: '取消', type: 'warning' }
    )
    row._busy = true
    const res = await props.purge(row.id)
    if (res.code === 200) { ElMessage.success('已彻底删除'); await loadTrash() }
    else ElMessage.error(res.message || '删除失败')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  } finally { row._busy = false }
}
</script>

<style scoped>
.trash-pager { display: flex; justify-content: center; margin-top: 14px; }
</style>
