<template>
  <div class="permission-demo">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>权限系统演示</span>
          <el-tag :type="getRoleTagType(currentRole)">
            当前角色: {{ getRoleName(currentRole) }}
          </el-tag>
        </div>
      </template>

      <!-- 当前权限信息 -->
      <div class="current-permissions">
        <h3>当前用户权限</h3>
        <el-tag
          v-for="perm in userStore.permissions"
          :key="perm"
          size="small"
          class="permission-tag"
        >
          {{ perm }}
        </el-tag>
      </div>

      <el-divider />

      <!-- 权限指令演示 -->
      <div class="demo-section">
        <h3>1. v-permission 指令演示</h3>
        <p class="desc">权限不满足时隐藏元素</p>

        <div class="demo-buttons">
          <el-button v-permission="'goods:create'" type="primary">
            新增灵感
          </el-button>
          <el-button v-permission="'goods:delete'" type="danger">
            删除
          </el-button>
          <el-button v-permission="'user:manage'" type="warning">
            用户管理
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- v-if-permission 指令演示 -->
      <div class="demo-section">
        <h3>2. v-if-permission 指令演示</h3>
        <p class="desc">权限不满足时不渲染元素（DOM 中完全移除）</p>

        <div class="demo-buttons">
          <el-button v-if-permission="'goods:edit'" type="primary">
            编辑
          </el-button>
          <span v-if-permission="'goods:edit'" class="inline-tip">
            (v-if-permission 示例)
          </span>
        </div>
      </div>

      <el-divider />

      <!-- v-hasPermission 指令演示 -->
      <div class="demo-section">
        <h3>3. v-hasPermission 指令演示</h3>
        <p class="desc">权限不满足时禁用按钮</p>

        <div class="demo-buttons">
          <el-button v-hasPermission="'goods:delete'" type="danger">
            可删除
          </el-button>
          <el-button v-hasPermission="'goods:delete'" type="danger" disabled>
            禁用状态演示
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- PermissionButton 组件演示 -->
      <div class="demo-section">
        <h3>4. PermissionButton 组件演示</h3>
        <p class="desc">带权限控制的按钮组件</p>

        <div class="demo-buttons">
          <PermissionButton permission="goods:create" type="primary">
            新增灵感
          </PermissionButton>
          <PermissionButton permission="goods:edit" type="success">
            编辑灵感
          </PermissionButton>
          <PermissionButton permission="goods:delete" type="danger">
            删除
          </PermissionButton>
          <PermissionButton permission="goods:import" type="warning">
            批量导入
          </PermissionButton>
          <PermissionButton permission="user:manage" type="info">
            用户管理
          </PermissionButton>
        </div>
      </div>

      <el-divider />

      <!-- 脚本中权限判断演示 -->
      <div class="demo-section">
        <h3>5. 脚本中权限判断</h3>
        <p class="desc">在逻辑中使用 hasPermission 函数</p>

        <div class="demo-buttons">
          <el-button @click="checkPermission('goods:create')">
            检查 goods:create
          </el-button>
          <el-button @click="checkPermission('goods:delete')">
            检查 goods:delete
          </el-button>
          <el-button @click="checkPermission('user:manage')">
            检查 user:manage
          </el-button>
        </div>
        <p class="check-result" v-if="checkResult">
          结果: <el-tag :type="checkResult.has ? 'success' : 'danger'">
            {{ checkResult.has ? '有' : '无' }}
          </el-tag>
          权限
        </p>
      </div>

      <el-divider />

      <!-- 权限分组演示 -->
      <div class="demo-section">
        <h3>6. 三级权限体系 - 完整对比</h3>
        <p class="desc">不同角色对应的权限能力</p>

        <el-table :data="permissionTableData" border style="width: 100%">
          <el-table-column prop="feature" label="功能" width="180" />
          <el-table-column prop="viewer" label="普通用户" align="center">
            <template #default="{ row }">
              <el-tag :type="row.viewer ? 'success' : 'info'" size="small">
                {{ row.viewer ? '✓' : '✗' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="editor" label="编辑用户" align="center">
            <template #default="{ row }">
              <el-tag :type="row.editor ? 'success' : 'info'" size="small">
                {{ row.editor ? '✓' : '✗' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="admin" label="管理员" align="center">
            <template #default="{ row }">
              <el-tag :type="row.admin ? 'success' : 'info'" size="small">
                {{ row.admin ? '✓' : '✗' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-divider />

      <!-- 切换角色测试 -->
      <div class="demo-section">
        <h3>7. 角色切换测试</h3>
        <p class="desc">切换角色查看权限变化</p>

        <div class="demo-buttons">
          <el-button-group>
            <el-button
              :type="currentRole === 'viewer' ? 'primary' : ''"
              @click="switchRole('viewer')"
            >
              普通用户
            </el-button>
            <el-button
              :type="currentRole === 'editor' ? 'primary' : ''"
              @click="switchRole('editor')"
            >
              编辑用户
            </el-button>
            <el-button
              :type="currentRole === 'admin' ? 'primary' : ''"
              @click="switchRole('admin')"
            >
              管理员
            </el-button>
          </el-button-group>
        </div>
      </div>
    </el-card>

    <!-- 表格操作栏权限示例 -->
    <el-card class="mt-16">
      <template #header>
        <span>表格操作栏权限示例</span>
      </template>

      <el-table :data="tableData" border>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="price" label="价格" />
        <el-table-column prop="supplier" label="供应商" />
        <el-table-column label="操作" width="300">
          <template #default="{ row }">
            <!-- 查看按钮 - 所有人可见 -->
            <el-button size="small" @click="handleView(row)">查看</el-button>

            <!-- 编辑按钮 - 编辑和管理员可见 -->
            <el-button
              v-permission="'goods:edit'"
              size="small"
              type="primary"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>

            <!-- 上传截图 - 编辑和管理员可见 -->
            <el-button
              v-permission="'goods:editScreenshot'"
              size="small"
              type="warning"
              @click="handleUpload(row)"
            >
              上传截图
            </el-button>

            <!-- 删除按钮 - 仅管理员可见 -->
            <el-button
              v-permission="'goods:delete'"
              size="small"
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 弹窗表单权限示例 -->
    <el-card class="mt-16">
      <template #header>
        <span>弹窗表单权限示例</span>
      </template>

      <el-form :model="form" label-width="120px">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input
            v-model="form.price"
            :disabled="!hasPermission('goods:editPrice')"
          />
          <span v-if="!hasPermission('goods:editPrice')" class="permission-tip">
            (无权修改价格)
          </span>
        </el-form-item>
        <el-form-item label="供应商">
          <el-input
            v-model="form.supplier"
            disabled
          />
          <span class="permission-tip">
            (无权修改供应商)
          </span>
        </el-form-item>
        <el-form-item label="标签">
          <el-input
            v-model="form.tag"
            :disabled="!hasPermission('goods:editTag')"
          />
          <span v-if="!hasPermission('goods:editTag')" class="permission-tip">
            (无权编辑标签)
          </span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :disabled="!hasPermission('goods:editRemark')"
          />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { PERMISSION_ROLES, PERMISSION_ROLE_NAMES } from '@/constants/permission'
import { hasPermission } from '@/utils/permission'
import { ElMessage } from 'element-plus'
import PermissionButton from '@/components/common/PermissionButton.vue'

const userStore = useUserStore()

// 当前角色
const currentRole = computed(() => userStore.role || 'viewer')

// 权限检查结果
const checkResult = ref(null)

// 表格数据
const tableData = ref([
  { id: 1, name: '周边商品A', price: 99.00, supplier: '供应商A' },
  { id: 2, name: '周边商品B', price: 199.00, supplier: '供应商B' }
])

// 表单数据
const form = reactive({
  name: '周边商品示例',
  price: 99.00,
  supplier: '默认供应商',
  tag: '潮流,限量',
  remark: '备注信息'
})

// 权限表格数据
const permissionTableData = [
  { feature: '查看商品', viewer: true, editor: true, admin: true },
  { feature: '搜索/筛选', viewer: true, editor: true, admin: true },
  { feature: '新增灵感', viewer: false, editor: true, admin: true },
  { feature: '编辑标签', viewer: false, editor: true, admin: true },
  { feature: '上传截图', viewer: false, editor: true, admin: true },
  { feature: '修改备注', viewer: false, editor: true, admin: true },
  { feature: '修改价格', viewer: false, editor: false, admin: true },
  { feature: '修改供应商', viewer: false, editor: false, admin: true },
  { feature: '删除数据', viewer: false, editor: false, admin: true },
  { feature: '批量导入', viewer: false, editor: false, admin: true },
  { feature: '用户管理', viewer: false, editor: false, admin: true },
  { feature: '标签管理', viewer: false, editor: false, admin: true }
]

// 获取角色名称
function getRoleName(role) {
  return PERMISSION_ROLE_NAMES[role] || role
}

// 获取角色标签类型
function getRoleTagType(role) {
  const types = {
    viewer: 'info',
    editor: 'warning',
    admin: 'danger'
  }
  return types[role] || 'info'
}

// 检查权限
function checkPermission(permission) {
  const has = hasPermission(permission)
  checkResult.value = { permission, has }
  ElMessage.info(`权限 ${permission}: ${has ? '有' : '无'}`)
}

// 切换角色
function switchRole(role) {
  userStore.initPermissionsByRole(role)
  ElMessage.success(`已切换到 ${getRoleName(role)}`)
}

// 表格操作
function handleView(row) {
  ElMessage.info(`查看: ${row.name}`)
}

function handleEdit(row) {
  ElMessage.info(`编辑: ${row.name}`)
}

function handleUpload(row) {
  ElMessage.info(`上传截图: ${row.name}`)
}

function handleDelete(row) {
  ElMessage.warning(`删除: ${row.name}`)
}
</script>

<style scoped>
.permission-demo {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-permissions {
  margin-bottom: 16px;
}

.current-permissions h3 {
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

.permission-tag {
  margin: 4px;
}

.demo-section {
  margin-bottom: 16px;
}

.demo-section h3 {
  margin-bottom: 8px;
  font-size: 15px;
  color: #303133;
}

.demo-section .desc {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}

.demo-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.check-result {
  margin-top: 12px;
  font-size: 14px;
}

.inline-tip {
  color: #909399;
  font-size: 13px;
  align-self: center;
}

.permission-tip {
  display: block;
  color: #e6a23c;
  font-size: 12px;
  margin-top: 4px;
}

.mt-16 {
  margin-top: 16px;
}
</style>
