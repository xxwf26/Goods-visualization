<template>
  <div class="permission-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        <h2>权限管理</h2>
        <span class="page-desc">管理系统用户账户、角色分配与权限配置</span>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="handleAddUser">
          新增用户
        </el-button>
      </div>
    </div>

    <!-- 用户表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small">
              {{ getRoleName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="permissions" label="权限" min-width="200">
          <template #default="{ row }">
            <div class="permissions-list">
              <el-tag
                v-for="perm in row.permissions.slice(0, 3)"
                :key="perm"
                size="small"
                effect="plain"
                type="info"
              >
                {{ getPermissionName(perm) }}
              </el-tag>
              <span v-if="row.permissions.length > 3" class="more-count">
                +{{ row.permissions.length - 3 }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLogin" label="最后登录" width="160" />
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEditUser(row)">
              编辑
            </el-button>
            <el-button link type="primary" size="small" @click="handleAssignRole(row)">
              分配角色
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="handleDeleteUser(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 用户编辑弹窗 -->
    <UserEditDialog
      v-model="userDialogVisible"
      :mode="userDialogMode"
      :user-data="currentUser"
      @success="handleUserSuccess"
    />

    <!-- 角色分配弹窗 -->
    <el-dialog
      v-model="roleDialogVisible"
      title="分配角色"
      width="500px"
    >
      <el-form :model="roleForm" label-width="80px">
        <el-form-item label="用户名">
          <span class="username-text">{{ currentUser?.username }}</span>
        </el-form-item>
        <el-form-item label="选择角色">
          <el-select v-model="roleForm.role" style="width: 100%">
            <el-option
              v-for="role in roleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="该角色权限">
          <div class="perm-hint">权限由角色自动决定（不支持单独勾选），以下为该角色拥有的权限预览：</div>
          <el-checkbox-group v-model="roleForm.permissions" disabled>
            <el-checkbox
              v-for="perm in permissionOptions"
              :key="perm.value"
              :label="perm.value"
            >
              {{ perm.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRole">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, createUser, updateUser, deleteUser } from '@/api/auth'
import { getPermissionsByRole } from '@/constants/permission'
import UserEditDialog from '@/components/permission/UserEditDialog.vue'

// 表格数据
const loading = ref(false)
const tableData = ref([])

// 弹窗状态
const userDialogVisible = ref(false)
const userDialogMode = ref('add')
const currentUser = ref(null)

const roleDialogVisible = ref(false)
const roleForm = reactive({
  role: '',
  permissions: []
})

// 角色选项
const roleOptions = [
  { label: '管理员 (admin)', value: 'admin' },
  { label: '编辑 (editor)', value: 'editor' },
  { label: '查看者 (viewer)', value: 'viewer' }
]

// 权限选项
const permissionOptions = [
  { label: '项目查看', value: 'project:view' },
  { label: '项目新增', value: 'project:create' },
  { label: '项目编辑', value: 'project:edit' },
  { label: '项目删除', value: 'project:delete' },
  { label: '项目导出', value: 'project:export' },
  { label: '标签管理', value: 'tag:create' },
  { label: '标签编辑', value: 'tag:edit' },
  { label: '标签删除', value: 'tag:delete' },
  { label: '供应商管理', value: 'supplier:create' },
  { label: '供应商编辑', value: 'supplier:edit' },
  { label: '供应商删除', value: 'supplier:delete' },
  { label: '灵感管理', value: 'inspiration:create' },
  { label: '灵感编辑', value: 'inspiration:edit' },
  { label: '灵感删除', value: 'inspiration:delete' },
  { label: '灵感上传', value: 'inspiration:upload' }
]

// 角色名称
function getRoleName(role) {
  const names = {
    admin: '管理员',
    editor: '编辑',
    viewer: '查看者'
  }
  return names[role] || role
}

function getRoleType(role) {
  const types = {
    admin: 'danger',
    editor: 'warning',
    viewer: 'info'
  }
  return types[role] || 'info'
}

function getPermissionName(perm) {
  const permObj = permissionOptions.find(p => p.value === perm)
  return permObj ? permObj.label : perm
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const res = await getUsers({ page: 1, pageSize: 100 })
    const list = res.data?.list || []
    tableData.value = list.map(user => ({
      ...user,
      permissions: user.roleCodes || []
    }))
  } catch (error) {
    console.error('加载用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 操作
function handleAddUser() {
  userDialogMode.value = 'add'
  currentUser.value = null
  userDialogVisible.value = true
}

function handleEditUser(row) {
  userDialogMode.value = 'edit'
  currentUser.value = { ...row }
  userDialogVisible.value = true
}

function handleAssignRole(row) {
  currentUser.value = row
  roleForm.role = row.role || 'viewer'
  // 权限预览随角色自动计算
  roleForm.permissions = getPermissionsByRole(roleForm.role)
  roleDialogVisible.value = true
}

// 选择角色变化时，刷新权限预览
watch(() => roleForm.role, (newRole) => {
  roleForm.permissions = getPermissionsByRole(newRole)
})

async function handleSaveRole() {
  try {
    // 后端按角色授权，仅提交 role；权限由角色自动决定
    await updateUser(currentUser.value.id, { role: roleForm.role })
    ElMessage.success('角色分配成功')
    roleDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('保存角色失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}

function handleDeleteUser(row) {
  ElMessageBox.confirm(
    `确定要删除用户「${row.username}」吗？`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deleteUser(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      console.error('删除用户失败:', error)
    }
  }).catch(() => {})
}

function handleUserSuccess() {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.permission-container {
  padding: 20px;
  background: var(--bg-primary);
  min-height: calc(100vh - 60px);
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title h2 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
.page-desc { display: block; margin-top: 4px; font-size: 13px; color: #A8A29E; }
.table-card { margin-bottom: 16px; border-radius: 16px !important; }
.permissions-list { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.more-count { font-size: 12px; color: #A8A29E; }
.username-text { font-weight: 600; color: var(--text-primary); }
</style>
