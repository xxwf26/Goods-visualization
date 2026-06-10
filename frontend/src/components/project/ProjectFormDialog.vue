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
        <el-col :span="12">
          <el-form-item label="报价单">
            <el-input v-model="formData.quotation_file" placeholder="报价单文件路径" />
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
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { createProject, updateProject } from '@/api/projects'

const props = defineProps({
  modelValue: Boolean,
  mode: { type: String, default: 'add' },
  projectData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])
const formRef = ref(null)
const submitting = ref(false)
const dialogTitle = computed(() => props.mode === 'add' ? '新增项目' : '编辑项目')

const formData = reactive({
  product_name: '', ip_tag_ids: '', project_year: '',
  project_name: '', purchase_order_no: '', total_amount: null,
  person_days: null, requester: '', region: '',
  supplier_name: '', project_start_date: '', project_end_date: '',
  project_leader: '', quotation_file: '', requirement_type: '',
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
  } else { resetForm() }
}, { immediate: true })

watch(() => props.modelValue, (v) => { if (!v) resetForm() })

function resetForm() {
  formData.product_name = ''; formData.ip_tag_ids = null; formData.project_year = ''
  formData.project_name = ''; formData.purchase_order_no = ''; formData.total_amount = null
  formData.person_days = null; formData.requester = ''; formData.region = ''
  formData.supplier_name = ''; formData.project_start_date = ''; formData.project_end_date = ''
  formData.project_leader = ''; formData.quotation_file = ''; formData.requirement_type = ''
  formData.remark = ''; formData.file_storage = ''; formData.parent_record = ''
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    if (props.mode === 'add') {
      await createProject({ ...formData })
    } else {
      await updateProject(props.projectData.id, { ...formData })
    }
    ElMessage.success(props.mode === 'add' ? '新增成功' : '修改成功')
    emit('success'); handleClose()
  } catch (e) { console.error(e); ElMessage.error('操作失败') }
  finally { submitting.value = false }
}

function handleClose() { emit('update:modelValue', false) }
</script>

<style scoped>
.project-form { padding-right: 20px; }
</style>