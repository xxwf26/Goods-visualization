<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="700px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="90px" class="record-form">
      <el-divider content-position="left">基本信息</el-divider>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="单品" prop="product_name">
            <el-input v-model="formData.product_name" placeholder="请输入单品名称" maxlength="200" show-word-limit />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="品类">
            <el-input v-model="formData.category" placeholder="如 纸制品" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="IP">
            <el-input v-model="formData.ip" placeholder="如 闪耀暖暖" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="供应商">
            <el-input v-model="formData.supplier_name" placeholder="请输入供应商" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="项目">
            <el-input v-model="formData.project_name" placeholder="请输入项目名称" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="图片">
            <el-input v-model="formData.image" placeholder="图片URL或上传路径" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">生产数据</el-divider>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="打样(天)">
            <el-input-number v-model="formData.sample_days" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="大货(天)">
            <el-input-number v-model="formData.mass_production_days" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="款式">
            <el-input-number v-model="formData.style_count" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单款数量">
            <el-input-number v-model="formData.single_quantity" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="总数量">
            <el-input-number v-model="formData.total_quantity" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">费用信息</el-divider>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="设计费">
            <el-input-number v-model="formData.design_fee" :min="0" :precision="2" :controls="false" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="打样费">
            <el-input-number v-model="formData.sample_fee" :min="0" :precision="2" :controls="false" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="其他费用">
            <el-input-number v-model="formData.other_fee" :min="0" :precision="2" :controls="false" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单价" prop="unit_price">
            <el-input-number v-model="formData.unit_price" :min="0" :precision="2" :controls="false" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="总价">
            <el-input-number v-model="formData.total_price" :min="0" :precision="2" :controls="false" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">其他信息</el-divider>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="生产信息">
            <el-input v-model="formData.production_info" type="textarea" :rows="2" placeholder="生产信息" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注1">
            <el-input v-model="formData.remark1" type="textarea" :rows="2" placeholder="备注1" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注2">
            <el-input v-model="formData.remark2" type="textarea" :rows="2" placeholder="备注2" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { createPriceRecord, updatePriceRecord } from '@/api/priceRecords'

const props = defineProps({
  modelValue: Boolean,
  mode: { type: String, default: 'add' },
  recordData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])
const formRef = ref(null)
const submitting = ref(false)
const dialogTitle = computed(() => props.mode === 'add' ? '新增价格记录' : '编辑价格记录')

const formData = reactive({
  product_name: '', category: '', supplier_name: '', ip: '', image: '',
  project_name: '', sample_days: null, mass_production_days: null,
  style_count: null, single_quantity: null, design_fee: null,
  sample_fee: null, unit_price: null, total_quantity: null,
  other_fee: null, total_price: null, production_info: '',
  remark1: '', remark2: ''
})

const formRules = {
  product_name: [{ required: true, message: '请输入单品名称', trigger: 'blur' }]
}

watch(() => props.recordData, (newData) => {
  if (newData) {
    Object.keys(formData).forEach(key => {
      if (newData[key] !== undefined) formData[key] = newData[key]
    })
  } else { resetForm() }
}, { immediate: true })

watch(() => props.modelValue, (visible) => {
  if (!visible) resetForm()
})

function resetForm() {
  Object.keys(formData).forEach(key => {
    if (['product_name', 'category', 'supplier_name', 'ip', 'image', 'project_name', 'production_info', 'remark1', 'remark2'].includes(key)) {
      formData[key] = ''
    } else {
      formData[key] = null
    }
  })
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }

  submitting.value = true
  try {
    if (props.mode === 'add') {
      await createPriceRecord({ ...formData })
    } else {
      await updatePriceRecord(props.recordData.id, { ...formData })
    }
    ElMessage.success(props.mode === 'add' ? '新增成功' : '修改成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.record-form { padding-right: 20px; }
:deep(.el-divider--horizontal) { margin: 16px 0; }
:deep(.el-divider__text) { font-size: 13px; font-weight: 500; color: #606266; }
</style>