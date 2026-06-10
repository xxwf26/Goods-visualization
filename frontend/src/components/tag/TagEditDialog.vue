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
      <el-form-item label="标签分类" prop="category">
        <el-select
          v-model="formData.category"
          :disabled="dialogMode === 'edit'"
          style="width: 100%"
        >
          <el-option
            v-for="cat in categoryOptions"
            :key="cat.key"
            :label="cat.name"
            :value="cat.key"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="标签名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入标签名称"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="排序" prop="order">
        <el-input-number
          v-model="formData.order"
          :min="1"
          :max="999"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="启用状态">
        <el-switch v-model="formData.enabled" />
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
import { createTag, updateTag } from '@/api/tags'

const props = defineProps({
  modelValue: Boolean,
  mode: {
    type: String,
    default: 'add'
  },
  tagData: {
    type: Object,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const submitting = ref(false)

const dialogMode = computed(() => props.mode)
const dialogTitle = computed(() => props.mode === 'add' ? '新增标签' : '编辑标签')

const categoryOptions = computed(() => props.categories)

const formData = reactive({
  category: 'ip',
  name: '',
  order: 1,
  enabled: true
})

const formRules = {
  category: [
    { required: true, message: '请选择标签分类', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  order: [
    { required: true, message: '请输入排序值', trigger: 'blur' }
  ]
}

watch(() => props.tagData, (newData) => {
  if (newData) {
    formData.category = newData.category || 'ip'
    formData.name = newData.name || ''
    formData.order = newData.order || 1
    formData.enabled = newData.enabled !== false
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
  formData.category = 'ip'
  formData.name = ''
  formData.order = 1
  formData.enabled = true
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
      tag_name: formData.name,
      tag_type: formData.category,
      sort: formData.order,
      status: formData.enabled ? 1 : 0
    }

    if (props.mode === 'add') {
      await createTag(apiData)
    } else {
      await updateTag(props.tagData.id, apiData)
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
