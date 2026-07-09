<template>
  <div class="logs-container">
    <div class="page-header">
      <div class="page-title">
        <h2>操作日志</h2>
        <span class="data-count">共 {{ total }} 条记录</span>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="模块">
          <el-select v-model="filterForm.module" placeholder="全部模块" clearable filterable style="width:150px">
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="filterForm.username" placeholder="用户名" clearable style="width:140px" />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width:110px">
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            style="width:240px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="操作/URL/参数" clearable style="width:160px" @keyup.enter="handleFilter" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleFilter">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="create_time" label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column prop="username" label="操作人" width="110">
          <template #default="{ row }">{{ row.username || '-' }}</template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="110">
          <template #default="{ row }"><el-tag size="small" effect="plain">{{ row.module || '-' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="operation" label="操作" width="130" show-overflow-tooltip />
        <el-table-column label="方法" width="80" align="center">
          <template #default="{ row }"><el-tag size="small" :type="methodType(row.method)">{{ row.method }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="url" label="接口" min-width="200" show-overflow-tooltip />
        <el-table-column label="结果" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '成功' : '失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="130" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showDetail(row)">查看</el-button>
            <el-button
              v-if="canUndo(row)"
              link type="warning" size="small" :loading="undoingId === row.id"
              @click="handleUndo(row)"
            >回撤</el-button>
            <el-tag v-else-if="row.undone" size="small" type="info">已回撤</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="操作详情" width="560px">
      <el-descriptions v-if="current" :column="1" border size="small">
        <el-descriptions-item label="时间">{{ formatTime(current.create_time) }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ current.username || '-' }}（ID {{ current.user_id ?? '-' }}）</el-descriptions-item>
        <el-descriptions-item label="模块">{{ current.module }}</el-descriptions-item>
        <el-descriptions-item label="操作">{{ current.operation }}</el-descriptions-item>
        <el-descriptions-item label="请求">{{ current.method }} {{ current.url }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{ current.ip || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结果">
          <el-tag size="small" :type="current.status === 1 ? 'success' : 'danger'">{{ current.status === 1 ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="current.error_msg" label="错误">{{ current.error_msg }}</el-descriptions-item>
        <el-descriptions-item label="参数">
          <pre class="params-pre">{{ prettyParams(current.params) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLogs, getLogModules, undoLog } from '@/api/logs'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const moduleOptions = ref([])
const dateRange = ref(null)
const detailVisible = ref(false)
const current = ref(null)
const undoingId = ref(null)

const filterForm = reactive({ module: null, username: '', status: null, keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20 })

async function loadModules() {
  try {
    const res = await getLogModules()
    moduleOptions.value = res.data || []
  } catch (e) { console.error(e) }
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      module: filterForm.module || undefined,
      username: filterForm.username || undefined,
      status: filterForm.status !== null ? filterForm.status : undefined,
      keyword: filterForm.keyword || undefined,
      start_date: dateRange.value?.[0] || undefined,
      end_date: dateRange.value?.[1] || undefined
    }
    const res = await getLogs(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function handleFilter() { pagination.page = 1; loadData() }
function handleReset() {
  filterForm.module = null; filterForm.username = ''; filterForm.status = null; filterForm.keyword = ''
  dateRange.value = null; pagination.page = 1; loadData()
}
function handleSizeChange(s) { pagination.pageSize = s; pagination.page = 1; loadData() }
function handlePageChange(p) { pagination.page = p; loadData() }

function showDetail(row) { current.value = row; detailVisible.value = true }

// 可回撤：成功的 POST/PUT/PATCH/DELETE，且记录了资源定位，且未回撤
function canUndo(row) {
  if (row.undone || row.status !== 1) return false
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(row.method)) return false
  return !!(row.resource_table && row.resource_id)
}

async function handleUndo(row) {
  try {
    await ElMessageBox.confirm(
      `确定回撤该操作吗？\n${row.operation}（${row.method} ${row.url}）\n回撤将按逆操作还原数据，可能覆盖其后的改动。`,
      '操作回撤',
      { confirmButtonText: '确定回撤', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return /* 用户取消 */ }
  undoingId.value = row.id
  try {
    const res = await undoLog(row.id)
    if (res.code === 200) {
      ElMessage.success(res.message || '回撤成功')
      loadData()
    } else {
      ElMessage.error(res.message || '回撤失败')
    }
  } catch (e) {
    ElMessage.error('回撤失败：' + (e?.message || '请重试'))
  } finally {
    undoingId.value = null
  }
}

function methodType(m) {
  return ({ POST: 'success', PUT: 'warning', PATCH: 'warning', DELETE: 'danger' })[m] || 'info'
}
function formatTime(t) {
  if (!t) return '-'
  // 后端返回东八区字符串(YYYY-MM-DD HH:mm:ss)，new Date 按本地时区解析即为正确时间
  const d = new Date(t)
  if (isNaN(d)) return String(t).replace('T', ' ').slice(0, 19)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function prettyParams(p) {
  if (!p) return '(无)'
  try { return JSON.stringify(JSON.parse(p), null, 2) } catch { return p }
}

onMounted(() => { loadModules(); loadData() })
</script>

<style scoped>
.logs-container { padding: 20px; background: var(--bg-primary); min-height: calc(100vh - 60px); }
.page-header { margin-bottom: 16px; }
.page-title { display: flex; align-items: baseline; gap: 12px; }
.page-title h2 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
.data-count { color: #A8A29E; font-size: 14px; }
.filter-card { margin-bottom: 16px; border-radius: 16px !important; }
.table-card { border-radius: 16px !important; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
.params-pre { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 12px; max-height: 240px; overflow: auto; }
</style>
