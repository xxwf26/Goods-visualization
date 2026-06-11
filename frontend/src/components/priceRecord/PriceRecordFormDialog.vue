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
            <div class="image-upload">
              <div class="thumb-list">
                <div v-for="(file, idx) in imageFiles" :key="idx" class="thumb-item">
                  <el-image
                    :src="`/uploads/${file}`"
                    fit="cover"
                    :preview-src-list="imageFiles.map(f => `/uploads/${f}`)"
                    :initial-index="idx"
                    preview-teleported
                    class="thumb-img"
                  />
                  <span class="thumb-delete" @click.stop="removeFile(idx)">×</span>
                </div>
                <span v-if="imageFiles.length > 1" class="thumb-count">×{{ imageFiles.length }}</span>
              </div>
              <el-upload
                :show-file-list="false"
                :auto-upload="false"
                accept="image/*"
                multiple
                :on-change="handleFileChange"
              >
                <el-button size="small" :loading="uploading" :icon="Plus">
                  {{ imageFiles.length ? '继续添加' : '添加图片' }}
                </el-button>
              </el-upload>
              <span class="upload-tip">支持 jpg / png，可多张</span>
            </div>
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
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { createPriceRecord, updatePriceRecord } from '@/api/priceRecords'
import request from '@/api/request'

const props = defineProps({
  modelValue: Boolean,
  mode: { type: String, default: 'add' },
  recordData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])
const formRef = ref(null)
const submitting = ref(false)
const uploading = ref(false)
const dialogTitle = computed(() => props.mode === 'add' ? '新增价格记录' : '编辑价格记录')

// 图片文件列表（filename 数组）
const imageFiles = ref([])

const formData = reactive({
  product_name: '', category: '', supplier_name: '', ip: '',
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
    imageFiles.value = newData.image
      ? String(newData.image).split(',').map(f => f.trim()).filter(Boolean)
      : []
  } else { resetForm() }
}, { immediate: true })

watch(() => props.modelValue, (visible) => {
  if (!visible) resetForm()
})

function resetForm() {
  Object.keys(formData).forEach(key => {
    if (['product_name', 'category', 'supplier_name', 'ip', 'project_name', 'production_info', 'remark1', 'remark2'].includes(key)) {
      formData[key] = ''
    } else {
      formData[key] = null
    }
  })
  imageFiles.value = []
  formRef.value?.clearValidate()
}

async function handleFileChange(file, fileList) {
  const rawFiles = fileList.filter(f => f.status === 'ready').map(f => f.raw)
  if (!rawFiles.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    rawFiles.forEach(f => fd.append('files', f))
    const res = await request.post('/upload/images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const newFiles = (Array.isArray(res.data) ? res.data : [res.data]).map(r => r.filename)
    imageFiles.value.push(...newFiles)
    ElMessage.success(`已上传 ${newFiles.length} 张`)
  } catch (e) {
    ElMessage.error('上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

function removeFile(idx) {
  imageFiles.value.splice(idx, 1)
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }

  submitting.value = true
  try {
    const payload = {
      ...formData,
      image: imageFiles.value.join(',') || null
    }
    if (props.mode === 'add') {
      await createPriceRecord(payload)
    } else {
      await updatePriceRecord(props.recordData.id, payload)
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

.image-upload { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.thumb-list { position: relative; display: flex; flex-wrap: wrap; gap: 8px; }
.thumb-item { position: relative; width: 64px; height: 64px; border-radius: 8px; overflow: visible; }
.thumb-img { width: 64px; height: 64px; border-radius: 8px; border: 1px solid #EDE9FE; display: block; }
.thumb-delete {
  position: absolute; top: -6px; right: -6px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #EF4444; color: #fff; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; line-height: 1; z-index: 1;
}
.thumb-delete:hover { background: #DC2626; }
.thumb-count {
  position: absolute; top: -6px; right: -6px;
  background: #8B5CF6; color: #fff; font-size: 11px;
  font-weight: 700; border-radius: 10px;
  padding: 1px 5px; line-height: 16px; pointer-events: none;
}
.upload-tip { font-size: 12px; color: #94A3B8; }
</style>