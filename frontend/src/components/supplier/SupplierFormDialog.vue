<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="700px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="supplier-form"
    >
      <el-divider content-position="left">基础信息</el-divider>

      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="供应商名称" prop="name">
            <el-input
              v-model="formData.name"
              placeholder="请输入供应商名称"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="合作状态" prop="status">
            <el-select v-model="formData.status" style="width: 100%">
              <el-option label="合作中" value="active" />
              <el-option label="暂停合作" value="paused" />
              <el-option label="已终止" value="terminated" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="合同类型" prop="contractType">
            <el-select v-model="formData.contractType" style="width: 100%">
              <el-option label="框架合同" value="framework" />
              <el-option label="单项目合同" value="project" />
              <el-option label="长期合作" value="longterm" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="风险等级" prop="riskLevel">
            <el-select v-model="formData.riskLevel" style="width: 100%">
              <el-option label="低风险" value="low" />
              <el-option label="中风险" value="medium" />
              <el-option label="高风险" value="high" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="主观评分" prop="score">
            <div class="score-input">
              <el-rate v-model="formData.score" allow-half />
              <span class="score-label">{{ formData.score.toFixed(1) }}分</span>
            </div>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="优势品类" prop="advantageCategories">
            <el-select
              v-model="formData.advantageCategories"
              multiple
              filterable
              placeholder="选择或输入优势品类"
              style="width: 100%"
            >
              <el-option
                v-for="cat in categoryOptions"
                :key="cat"
                :label="cat"
                :value="cat"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">联系方式</el-divider>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="联系人" prop="contact.person">
            <el-input v-model="formData.contact.person" placeholder="请输入联系人" />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="联系电话" prop="contact.phone">
            <el-input v-model="formData.contact.phone" placeholder="请输入联系电话" />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="电子邮箱" prop="contact.email">
            <el-input v-model="formData.contact.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="公司地址" prop="contact.address">
            <el-input v-model="formData.contact.address" placeholder="请输入公司地址" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">其他信息</el-divider>

      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="案例文件">
            <div class="case-files-section">
              <el-upload
                ref="uploadRef"
                :action="uploadUrl"
                :headers="uploadHeaders"
                :accept="'.pdf'"
                :limit="5"
                :on-success="handleFileUploadSuccess"
                :on-error="handleFileUploadError"
                :before-upload="beforeFileUpload"
                :file-list="caseFileList"
                list-type="text"
              >
                <el-button type="primary" plain size="small">
                  <el-icon><Upload /></el-icon> 上传PDF
                </el-button>
                <template #tip>
                  <div class="el-upload__tip">支持PDF文件，单个不超过10MB，最多5个</div>
                </template>
              </el-upload>
            </div>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="风险备注">
            <el-input
              v-model="formData.remark"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="请输入风险备注信息"
            />
          </el-form-item>
        </el-col>
      </el-row>
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
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { createSupplier, updateSupplier } from '@/api/suppliers'
import { getTagsByType } from '@/api/tags'
import request from '@/utils/request'

const props = defineProps({
  modelValue: Boolean,
  mode: {
    type: String,
    default: 'add'
  },
  supplierData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const uploading = ref(false)
const submitting = ref(false)

const dialogTitle = computed(() => props.mode === 'add' ? '新增供应商' : '编辑供应商')

const categoryOptions = ref([])

// 上传配置
const uploadUrl = computed(() => {
  return `${request.defaults.baseURL || ''}/upload/file`
})

const uploadHeaders = computed(() => {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

// 已上传的案例文件列表（展示用）
const caseFileList = ref([])

// 加载品类选项
async function loadCategoryOptions() {
  try {
    const res = await getTagsByType('category')
    categoryOptions.value = (res.data?.list || res.data || []).map(t => t.tag_name)
  } catch (error) {
    console.error('加载品类选项失败:', error)
  }
}

onMounted(() => {
  loadCategoryOptions()
})

// 表单数据
const formData = reactive({
  name: '',
  status: 'active',
  contractType: 'framework',
  riskLevel: 'low',
  score: 4,
  advantageCategories: [],
  contact: {
    person: '',
    phone: '',
    email: '',
    address: ''
  },
  remark: '',
  caseFiles: [] // 案例PDF文件paths数组
})

// 校验规则
const formRules = {
  name: [
    { required: true, message: '请输入供应商名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择合作状态', trigger: 'change' }
  ],
  contractType: [
    { required: true, message: '请选择合同类型', trigger: 'change' }
  ],
  'contact.person': [
    { required: true, message: '请输入联系人', trigger: 'blur' }
  ],
  'contact.phone': [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/, message: '请输入正确的电话号码', trigger: 'blur' }
  ]
}

// 监听数据变化
watch(() => props.supplierData, (newData) => {
  if (newData) {
    const existing = {
      name: newData.supplier_name || '',
      status: newData.cooperation_status || 'active',
      contractType: newData.contract_type || 'framework',
      riskLevel: newData.riskLevel || 'low',
      score: newData.rating || 4,
      advantageCategories: newData.advantage_categories ? newData.advantage_categories.split(',') : [],
      contact: {
        person: newData.contact_person || '',
        phone: newData.contact_phone || '',
        email: newData.contact_email || '',
        address: newData.address || ''
      },
      remark: newData.risk_notes || newData.remark || '',
      caseFiles: []
    }

    // 解析已有的案例文件
    if (newData.case_files) {
      try {
        const parsed = typeof newData.case_files === 'string' ? JSON.parse(newData.case_files) : newData.case_files
        existing.caseFiles = Array.isArray(parsed) ? parsed : []
      } catch {
        existing.caseFiles = []
      }
    }

    Object.assign(formData, existing)

    // 同步展示文件列表
    caseFileList.value = existing.caseFiles.map(url => ({
      name: decodeURIComponent(url.split('/').pop() || 'case.pdf'),
      url: url
    }))
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
  formData.name = ''
  formData.status = 'active'
  formData.contractType = 'framework'
  formData.riskLevel = 'low'
  formData.score = 4
  formData.advantageCategories = []
  formData.contact = { person: '', phone: '', email: '', address: '' }
  formData.remark = ''
  formData.caseFiles = []
  caseFileList.value = []
  formRef.value?.clearValidate()
}

// PDF文件上传
function beforeFileUpload(file) {
  const isPDF = file.type === 'application/pdf'
  if (!isPDF) {
    ElMessage.error('只能上传PDF文件')
    return false
  }
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB')
    return false
  }
  return true
}

function handleFileUploadSuccess(response, file) {
  if (response.code === 200) {
    const url = response.data.url
    formData.caseFiles.push(url)
    ElMessage.success(`${file.name} 上传成功`)
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

function handleFileUploadError(error) {
  console.error('上传失败:', error)
  ElMessage.error('文件上传失败')
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
      supplier_name: formData.name,
      supplier_short_name: formData.name,
      contact_person: formData.contact.person,
      contact_phone: formData.contact.phone,
      contact_email: formData.contact.email,
      address: formData.contact.address,
      contract_type: formData.contractType,
      cooperation_status: formData.status,
      rating: formData.score,
      advantage_categories: formData.advantageCategories.join(','),
      risk_notes: formData.remark,
      remark: formData.remark,
      case_files: formData.caseFiles.length > 0 ? JSON.stringify(formData.caseFiles) : null
    }

    if (props.mode === 'add') {
      await createSupplier(apiData)
    } else {
      await updateSupplier(props.supplierData.id, apiData)
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
.supplier-form {
  padding-right: 20px;
}

.score-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.score-label {
  color: #e6a23c;
  font-weight: 500;
}

:deep(.el-divider--horizontal) {
  margin: 16px 0;
}

:deep(.el-divider__text) {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}
</style>
