<template>
  <el-dialog :model-value="modelValue" :title="dialogTitle" width="680px" :close-on-click-modal="false" @update:model-value="$emit('update:modelValue',$event)" @close="handleClose">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="88px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="formData.title" placeholder="一句话概括注意点" maxlength="200" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="严重程度" prop="severity">
            <el-select v-model="formData.severity" style="width:100%">
              <el-option v-for="s in severityOptions" :key="s.value" :label="s.label" :value="s.value">
                <span :style="{color: s.color}">● </span>{{ s.label }}
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="适用阶段">
            <el-select v-model="formData.stage" multiple collapse-tags collapse-tags-tooltip style="width:100%" placeholder="多选">
              <el-option v-for="st in stageOptions" :key="st.value" :label="st.label" :value="st.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="品类"><el-input v-model="formData.category" placeholder="如 纸制品/亚克力" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="工艺"><el-input v-model="formData.craft" placeholder="如 烫金/丝印/模切" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="IP"><el-input v-model="formData.ip" placeholder="关联IP" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="关联项目">
            <el-select v-model="formData.project_id" filterable clearable style="width:100%" placeholder="踩坑溯源（可选）">
              <el-option v-for="p in projectOptions" :key="p.id" :label="p.product_name + (p.project_name?(' / '+p.project_name):'')" :value="p.id" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="问题描述">
        <el-input v-model="formData.content" type="textarea" :rows="3" placeholder="踩了什么坑 / 要注意什么现象" />
      </el-form-item>
      <el-form-item label="正确做法">
        <el-input v-model="formData.correct_practice" type="textarea" :rows="3" placeholder="应该怎么做 / 规范要求" />
      </el-form-item>
      <el-form-item label="配图">
        <div class="img-uploader">
          <div v-for="(f, i) in imageList" :key="i" class="img-item">
            <el-image :src="`/uploads/${f}`" fit="cover" :preview-src-list="imageList.map(x=>`/uploads/${x}`)" :initial-index="i" preview-teleported class="img-thumb" />
            <el-button link type="danger" size="small" class="img-del" @click="removeImage(i)">删</el-button>
          </div>
          <el-upload :show-file-list="false" :auto-upload="false" accept="image/*" multiple :on-change="handleUpload" class="img-add">
            <div class="img-add-box" v-loading="uploading">
              <el-icon :size="22"><Plus /></el-icon>
              <span>添加/粘贴</span>
            </div>
          </el-upload>
        </div>
        <div class="paste-tip">支持直接 Ctrl+V 粘贴截图</div>
      </el-form-item>
      <el-form-item label="附件">
        <el-input v-model="formData.attachments" placeholder="附件URL（逗号分隔）" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { createDesignNote, updateDesignNote } from '@/api/designNotes'
import request from '@/api/request'
import { usePasteUpload } from '@/composables/usePasteUpload'

const props = defineProps({ modelValue:Boolean, mode:{type:String,default:'add'}, recordData:{type:Object,default:null}, noteType:{type:String,default:'production'} })
const emit = defineEmits(['update:modelValue','success'])
const formRef = ref(null), submitting = ref(false), uploading = ref(false)
const dialogTitle = computed(() => props.mode==='add'?'新增注意事项':'编辑注意事项')

const severityOptions = [
  { value: 'fatal', label: '致命坑', color: '#EF4444' },
  { value: 'important', label: '重要', color: '#F59E0B' },
  { value: 'suggestion', label: '建议', color: '#3B82F6' }
]
const stageOptions = [
  { value: 'design', label: '设计' },
  { value: 'sample', label: '打样' },
  { value: 'mass', label: '大货' },
  { value: 'package', label: '包装' }
]
const projectOptions = ref([])

const formData = reactive({ title:'', content:'', correct_practice:'', note_type:'', severity:'important', stage:[], project_id:null, category:'', craft:'', ip:'', images:'', attachments:'', remark:'' })
const imageList = computed({ get: () => (formData.images ? formData.images.split(',').map(s=>s.trim()).filter(Boolean) : []), set: (v) => { formData.images = v.join(',') } })
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }]
}

watch(()=>props.recordData,(d)=>{ if(d){ fillForm(d) } else resetForm() },{immediate:true})
watch(()=>props.modelValue,(v)=>{if(!v)resetForm()})
watch(()=>props.noteType,(v)=>{ formData.note_type = v })

function fillForm(d) {
  Object.keys(formData).forEach(k => { if (d[k] !== undefined && k !== 'stage' && k !== 'images') formData[k] = d[k] })
  formData.stage = d.stage ? String(d.stage).split(',').map(s=>s.trim()).filter(Boolean) : []
  formData.images = d.images || ''
  if (!formData.severity) formData.severity = 'important'
  formData.note_type = d.note_type || props.noteType
}
function resetForm() {
  formData.title=''; formData.content=''; formData.correct_practice=''; formData.note_type=props.noteType
  formData.severity='important'; formData.stage=[]; formData.project_id=null
  formData.category=''; formData.craft=''; formData.ip=''; formData.images=''; formData.attachments=''; formData.remark=''
  formRef.value?.clearValidate()
}

function removeImage(i) {
  const list = [...imageList.value]
  list.splice(i, 1)
  imageList.value = list
}

async function uploadRawFiles(rawFiles) {
  if (!rawFiles || !rawFiles.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    rawFiles.forEach(f => fd.append('files', f))
    const res = await request.post('/upload/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const newFiles = (Array.isArray(res.data) ? res.data : [res.data]).map(r => r.filename).filter(Boolean)
    imageList.value = [...imageList.value, ...newFiles]
    ElMessage.success(`已上传 ${newFiles.length} 张`)
  } catch (e) { ElMessage.error('上传失败') }
  finally { uploading.value = false }
}
function handleUpload(file, fileList) {
  const rawFiles = fileList.filter(f => f.status === 'ready').map(f => f.raw)
  uploadRawFiles(rawFiles)
}
usePasteUpload(files => { if (props.modelValue) uploadRawFiles(files) })

// 拉项目简表用于关联项目下拉
async function loadProjectList() {
  try {
    const res = await request.get('/projects', { params: { page: 1, pageSize: 200 } })
    projectOptions.value = res.data?.list || []
  } catch {}
}
onMounted(loadProjectList)

async function handleSubmit() {
  if(!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const data = { ...formData, stage: formData.stage.join(','), note_type: props.noteType }
    if (props.mode==='add') await createDesignNote(data)
    else await updateDesignNote(props.recordData.id, data)
    ElMessage.success(props.mode==='add'?'新增成功':'修改成功')
    emit('success'); handleClose()
  } catch(e) { console.error(e); ElMessage.error('操作失败') }
  finally { submitting.value = false }
}
function handleClose() { emit('update:modelValue',false) }
</script>

<style scoped>
.img-uploader { display: flex; flex-wrap: wrap; gap: 8px; }
.img-item { position: relative; }
.img-thumb { width: 80px; height: 80px; border-radius: 8px; border: 1px solid #E5E7EB; display: block; }
.img-del { position: absolute; top: -8px; right: -8px; background: #fff; border-radius: 50%; padding: 0 4px; }
.img-add-box { width: 80px; height: 80px; border: 1px dashed #D1D5DB; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9CA3AF; cursor: pointer; gap: 2px; font-size: 12px; }
.img-add-box:hover { border-color: #8B5CF6; color: #8B5CF6; }
.paste-tip { font-size: 12px; color: #A8A29E; margin-top: 4px; }
</style>
