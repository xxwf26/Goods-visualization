<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="700px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="110px" class="project-form">
      <el-row :gutter="20">
        <!-- 1. 文本 -->
        <el-col :span="24">
          <el-form-item label="文本" prop="product_name">
            <el-input v-model="formData.product_name" placeholder="如 X6空调毯礼盒（多区服）" maxlength="200" />
          </el-form-item>
        </el-col>
        <!-- 2. IP -->
        <el-col :span="12">
          <el-form-item label="IP">
            <el-input v-model="formData.ip_tag_ids" placeholder="如 无限暖暖" />
          </el-form-item>
        </el-col>
        <!-- 3. 年份 -->
        <el-col :span="12">
          <el-form-item label="年份">
            <el-input v-model="formData.project_year" placeholder="如 2025" />
          </el-form-item>
        </el-col>
        <!-- 4. 项目 -->
        <el-col :span="12">
          <el-form-item label="项目" prop="project_name">
            <el-input v-model="formData.project_name" placeholder="如 抱枕毯礼盒" />
          </el-form-item>
        </el-col>
        <!-- 5. 相关请购需求单 -->
        <el-col :span="12">
          <el-form-item label="相关请购需求单">
            <el-input v-model="formData.purchase_order_no" placeholder="如 QGXQ2025059053" />
          </el-form-item>
        </el-col>
        <!-- 6. 项目总价 -->
        <el-col :span="12">
          <el-form-item label="项目总价">
            <el-input-number v-model="formData.total_amount" :min="0" :precision="2" :controls="false" style="width:100%" />
          </el-form-item>
        </el-col>
        <!-- 7. 投入人天 -->
        <el-col :span="12">
          <el-form-item label="投入人天">
            <el-input-number v-model="formData.person_days" :min="0" :precision="2" :controls="false" style="width:100%" />
          </el-form-item>
        </el-col>
        <!-- 8. 需求人 -->
        <el-col :span="12">
          <el-form-item label="需求人">
            <el-input v-model="formData.requester" placeholder="如 岚岚" />
          </el-form-item>
        </el-col>
        <!-- 9. 区服 -->
        <el-col :span="12">
          <el-form-item label="区服">
            <el-input v-model="formData.region" placeholder="如 国服" />
          </el-form-item>
        </el-col>
        <!-- 10. 供应商 -->
        <el-col :span="12">
          <el-form-item label="供应商">
            <el-input v-model="formData.supplier_name" placeholder="如 大玥熊" />
          </el-form-item>
        </el-col>
        <!-- 11. 开始日期 -->
        <el-col :span="12">
          <el-form-item label="开始日期">
            <el-date-picker v-model="formData.project_start_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
        </el-col>
        <!-- 12. 结束日期 -->
        <el-col :span="12">
          <el-form-item label="结束日期">
            <el-date-picker v-model="formData.project_end_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
        </el-col>
        <!-- 13. 主要负责人 -->
        <el-col :span="12">
          <el-form-item label="主要负责人">
            <el-input v-model="formData.project_leader" placeholder="如 芒狗" />
          </el-form-item>
        </el-col>
        <!-- 14. 报价单 -->
        <el-col :span="24">
          <el-form-item label="报价单">
            <!-- 已上传的缩略图列表 -->
            <div class="quotation-upload">
              <div class="thumb-list">
                <div
                  v-for="(file, idx) in quotationFiles"
                  :key="idx"
                  class="thumb-item"
                >
                  <el-image
                    :src="`/uploads/${file}`"
                    fit="cover"
                    :preview-src-list="quotationFiles.map(f => `/uploads/${f}`)"
                    :initial-index="idx"
                    preview-teleported
                    class="thumb-img"
                  />
                  <span class="thumb-delete" @click.stop="removeFile(idx)">×</span>
                </div>
                <!-- 角标 -->
                <span v-if="quotationFiles.length > 1" class="thumb-count">×{{ quotationFiles.length }}</span>
              </div>
              <!-- 上传按钮 -->
              <el-upload
                :show-file-list="false"
                :auto-upload="false"
                accept="image/*"
                multiple
                :on-change="handleFileChange"
              >
                <el-button size="small" :loading="uploading" :icon="Plus">
                  {{ quotationFiles.length ? '继续添加' : '添加报价单图片' }}
                </el-button>
              </el-upload>
              <span class="upload-tip">支持 jpg / png，可多张</span>
            </div>
          </el-form-item>
        </el-col>
        <!-- 15. 需求种类 -->
        <el-col :span="12">
          <el-form-item label="需求种类">
            <el-input v-model="formData.requirement_type" placeholder="如 新需求" />
          </el-form-item>
        </el-col>
        <!-- 16. 备注 -->
        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="备注" />
          </el-form-item>
        </el-col>
        <!-- 17. 文件存储地址 -->
        <el-col :span="24">
          <el-form-item label="文件存储地址">
            <el-input v-model="formData.file_storage" placeholder="文件路径" />
          </el-form-item>
        </el-col>
        <!-- 18. 父记录 -->
        <el-col :span="12">
          <el-form-item label="父记录">
            <el-input v-model="formData.parent_record" placeholder="父记录ID或标识" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button :type="savedFlash ? 'success' : 'primary'" :loading="submitting" @click="handleSubmit">{{ savedFlash ? '✓ 已保存' : '确定' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { createProject, updateProject } from '@/api/projects'
import request from '@/api/request'
import { usePasteUpload } from '@/composables/usePasteUpload'

const props = defineProps({
  modelValue: Boolean,
  mode: { type: String, default: 'add' },
  projectData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])
const formRef = ref(null)
const submitting = ref(false)
const savedFlash = ref(false)
const uploading = ref(false)
const dialogTitle = computed(() => props.mode === 'add' ? '新增项目' : '编辑项目')

// 报价单文件列表（filename 数组）
const quotationFiles = ref([])

const formData = reactive({
  product_name: '', ip_tag_ids: '', project_year: '',
  project_name: '', purchase_order_no: '', total_amount: null,
  person_days: null, requester: '', region: '',
  supplier_name: '', project_start_date: '', project_end_date: '',
  project_leader: '', requirement_type: '',
  remark: '', file_storage: '', parent_record: ''
})

const rules = {
  product_name: [{ required: true, message: '请输入文本（产品名称）', trigger: 'blur' }],
  project_name: [{ required: true, message: '请输入项目', trigger: 'blur' }]
}

watch(() => props.projectData, (newData) => {
  if (newData) {
    Object.keys(formData).forEach(k => {
      if (newData[k] !== undefined) formData[k] = newData[k]
    })
    // 解析已有报价单
    quotationFiles.value = newData.quotation_file
      ? String(newData.quotation_file).split(',').map(f => f.trim()).filter(Boolean)
      : []
  } else { resetForm() }
}, { immediate: true })

watch(() => props.modelValue, (v) => { if (!v) resetForm() })

function resetForm() {
  formData.product_name = ''; formData.ip_tag_ids = null; formData.project_year = ''
  formData.project_name = ''; formData.purchase_order_no = ''; formData.total_amount = null
  formData.person_days = null; formData.requester = ''; formData.region = ''
  formData.supplier_name = ''; formData.project_start_date = ''; formData.project_end_date = ''
  formData.project_leader = ''; formData.requirement_type = ''
  formData.remark = ''; formData.file_storage = ''; formData.parent_record = ''
  quotationFiles.value = []
  formRef.value?.clearValidate()
}

// el-upload on-change：选文件后立即上传
async function uploadRawFiles(rawFiles) {
  if (!rawFiles || !rawFiles.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    rawFiles.forEach(f => fd.append('files', f))
    const res = await request.post('/upload/images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const newFiles = (Array.isArray(res.data) ? res.data : [res.data]).map(r => r.filename)
    quotationFiles.value.push(...newFiles)
    ElMessage.success(`已上传 ${newFiles.length} 张`)
  } catch (e) {
    ElMessage.error('上传失败，请重试')
  } finally {
    uploading.value = false
  }
}
function handleFileChange(file, fileList) {
  const rawFiles = fileList.filter(f => f.status === 'ready').map(f => f.raw)
  uploadRawFiles(rawFiles)
}
usePasteUpload(files => uploadRawFiles(files))

function removeFile(idx) {
  quotationFiles.value.splice(idx, 1)
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const payload = {
      ...formData,
      quotation_file: quotationFiles.value.join(',') || null
    }
    if (props.mode === 'add') {
      await createProject(payload)
    } else {
      await updateProject(props.projectData.id, payload)
    }
    ElMessage.success(props.mode === 'add' ? '新增成功' : '修改成功')
    savedFlash.value = true
    setTimeout(() => { emit('success'); handleClose() }, 800)
  } catch (e) { console.error(e); ElMessage.error('操作失败') }
  finally { submitting.value = false }
}

function handleClose() { emit('update:modelValue', false) }
</script>

<style scoped>
.project-form { padding-right: 20px; }

.quotation-upload { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }

.thumb-list { position: relative; display: flex; flex-wrap: wrap; gap: 8px; }

.thumb-item {
  position: relative; width: 64px; height: 64px;
  border-radius: 8px; overflow: visible;
}

.thumb-img {
  width: 64px; height: 64px; border-radius: 8px;
  border: 1px solid #EDE9FE; display: block;
}

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