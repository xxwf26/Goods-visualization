<template>
  <div class="design-note-container">
    <div class="page-header">
      <div class="page-title">
        <h2>生产/设计注意事项</h2>
        <span class="data-count">共 {{ total }} 条记录</span>
      </div>
      <div class="page-actions">
        <PermissionButton permission="project:create" type="primary" @click="handleAdd">新增注意事项</PermissionButton>
      </div>
    </div>

    <!-- 类型切换 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="note-tabs">
      <el-tab-pane label="生产注意" name="production" />
      <el-tab-pane label="设计注意" name="design" />
    </el-tabs>

    <!-- 筛选 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="品类" class="filter-item">
              <el-input v-model="filterForm.category" placeholder="品类" clearable style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="工艺" class="filter-item">
              <el-input v-model="filterForm.craft" placeholder="工艺" clearable style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="16" :lg="18">
            <el-form-item label="关键词" class="filter-item filter-keyword">
              <el-input v-model="filterForm.keyword" placeholder="搜索标题、内容" clearable style="width:60%">
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-button type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe border style="width:100%">
        <el-table-column label="#" width="55" align="center">
          <template #default="{ $index }">{{ (pagination.page-1)*pagination.pageSize+$index+1 }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip fixed />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.note_type==='design'?'warning':'primary'">{{ row.note_type==='design'?'设计注意':'生产注意' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="品类" width="100" />
        <el-table-column prop="craft" label="工艺" width="100" />
        <el-table-column prop="ip" label="IP" width="90" />
        <el-table-column label="内容" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">{{ row.content || '-' }}</template>
        </el-table-column>
        <el-table-column label="图片" width="60" align="center">
          <template #default="{ row }"><span v-if="row.images">📷</span><span v-else style="color:#c0c4cc">-</span></template>
        </el-table-column>
        <el-table-column label="附件" width="60" align="center">
          <template #default="{ row }"><span v-if="row.attachments">📎</span><span v-else style="color:#c0c4cc">-</span></template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button v-permission="'project:edit'" link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'project:delete'" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :page-sizes="[10,20,50]" :total="total" layout="total,sizes,prev,pager,next" @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
    </el-card>

    <!-- 弹窗 -->
    <DesignNoteFormDialog v-model="formDialogVisible" :mode="formMode" :record-data="currentRecord" :note-type="activeTab" @success="handleFormSuccess" />
    <DesignNoteDetailDialog v-model="detailDialogVisible" :record="currentRecord" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDesignNotes, deleteDesignNote } from '@/api/designNotes'
import PermissionButton from '@/components/common/PermissionButton.vue'
import DesignNoteFormDialog from '@/components/designNote/DesignNoteFormDialog.vue'
import DesignNoteDetailDialog from '@/components/designNote/DesignNoteDetailDialog.vue'

const activeTab = ref('production')
const filterForm = reactive({ keyword: '', category: '', craft: '' })
const loading = ref(false), tableData = ref([]), total = ref(0)
const pagination = reactive({ page:1, pageSize:20 })
const formDialogVisible = ref(false), detailDialogVisible = ref(false), formMode = ref('add'), currentRecord = ref(null)

async function loadData() {
  loading.value = true
  try {
    const p = { page:pagination.page, pageSize:pagination.pageSize, note_type:activeTab.value, keyword:filterForm.keyword||undefined, category:filterForm.category||undefined, craft:filterForm.craft||undefined }
    const r = await getDesignNotes(p)
    tableData.value = r.data?.list||[]; total.value = r.data?.pagination?.total||0
  } catch(e) { console.error(e) }
  finally { loading.value = false }
}

function handleTabChange() { pagination.page=1; loadData() }
function handleFilter() { pagination.page=1; loadData() }
function handleReset() { filterForm.keyword=''; filterForm.category=''; filterForm.craft=''; pagination.page=1; loadData() }
function handleSizeChange(s) { pagination.pageSize=s; pagination.page=1; loadData() }
function handlePageChange(p) { pagination.page=p; loadData() }
function handleView(row) { currentRecord.value={...row}; detailDialogVisible.value=true }
function handleAdd() { formMode.value='add'; currentRecord.value=null; formDialogVisible.value=true }
function handleEdit(row) { formMode.value='edit'; currentRecord.value={...row}; formDialogVisible.value=true }
async function handleDelete(row) {
  try { await ElMessageBox.confirm('确定删除？','删除确认',{confirmButtonText:'确定',cancelButtonText:'取消',type:'warning'}); await deleteDesignNote(row.id); ElMessage.success('删除成功'); loadData() }
  catch(e) { if(e!=='cancel') console.error(e) }
}
function handleFormSuccess() { loadData() }
onMounted(() => {
  const route = useRoute()
  if (route.query.keyword) filterForm.keyword = String(route.query.keyword)
  loadData()
})
</script>

<style scoped>
.design-note-container { padding:20px; background:var(--bg-primary); min-height:calc(100vh - 60px); }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.page-title { display:flex; align-items:baseline; gap:12px; }
.page-title h2 { margin:0; font-size:22px; font-weight:700; color:var(--text-primary); }
.data-count { color:#A8A29E; font-size:14px; }
.page-actions { display:flex; gap:12px; }
.note-tabs { margin-bottom:12px; }
.note-tabs :deep(.el-tabs__item) { font-size:15px; font-weight:600; }
.filter-card { margin-bottom:16px; border-radius:16px!important; }
.filter-item { width:100%; }
.filter-keyword { display:flex; align-items:center; gap:8px; }
.table-card { border-radius:16px!important; }
.pagination-wrapper { display:flex; justify-content:flex-end; margin-top:16px; }
</style>