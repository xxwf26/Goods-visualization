<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="500px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名"
          :disabled="dialogMode === 'edit'"
          maxlength="30"
        />
      </el-form-item>

      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="formData.nickname" placeholder="请输入昵称" maxlength="30" />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input v-model="formData.email" placeholder="请输入邮箱" />
      </el-form-item>

      <el-form-item v-if="dialogMode === 'add'" label="初始密码" prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="请输入初始密码"
          show-password
        />
      </el-form-item>

      <el-form-item label="角色" prop="role">
        <el-select v-model="formData.role" style="width: 100%">
          <el-option label="管理员" value="admin" />
          <el-option label="编辑" value="editor" />
          <el-option label="查看者" value="viewer" />
        </el-select>
      </el-form-item>

      <el-form-item label="状态">
        <el-switch v-model="formData.status" active-value="active" inactive-value="disabled" />
        <span class="status-text">{{ formData.status === 'active' ? '启用' : '禁用' }}</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createUser, updateUser } from '@/api/auth'

const props = defineProps({
  modelValue: Boolean,
  mode: {
    type: String,
    default: 'add'
  },
  userData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const submitting = ref(false)

const dialogMode = computed(() => props.mode)
const dialogTitle = computed(() => props.mode === 'add' ? '新增用户' : '编辑用户')

const formData = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  role: 'viewer',
  status: 'active'
})

const formRules = computed(() => ({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 30, message: '长度在 3 到 30 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: dialogMode.value === 'add' ? [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ] : [],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}))

watch(() => props.userData, (newData) => {
  if (newData) {
    formData.username = newData.username || ''
    formData.nickname = newData.nickname || ''
    formData.email = newData.email || ''
    formData.role = newData.role || 'viewer'
    formData.status = newData.status || 'active'
  } else {
    resetForm()
  }
}, { immediate: true })

watch(() => props.modelValue, (visible) => {
  if (!visible) {
    resetForm()
  }
})

function resetForm() {
  formData.username = ''
  formData.nickname = ''
  formData.email = ''
  formData.password = ''
  formData.role = 'viewer'
  formData.status = 'active'
  formRef.value?.clearValidate()
}

function handleClose() {
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  submitting.value = true
  try {
    const apiData = {
      username: formData.username,
      nickname: formData.nickname,
      email: formData.email,
      role: formData.role,
      status: formData.status
    }
    if (formData.password) {
      apiData.password = formData.password
    }

    if (props.mode === 'add') {
      await createUser(apiData)
    } else {
      await updateUser(props.userData.id, apiData)
    }

    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.status-text {
  margin-left: 12px;
  color: #606266;
}
</style>
