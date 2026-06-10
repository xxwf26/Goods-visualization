<template>
  <el-dialog :model-value="modelValue" :title="dialogTitle" width="600px" :close-on-click-modal="false" @update:model-value="$emit('update:modelValue',$event)" @close="handleClose">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="formData.title" placeholder="请输入标题" maxlength="200" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="品类"><el-input v-model="formData.category" placeholder="品类" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="工艺"><el-input v-model="formData.craft" placeholder="工艺" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="IP"><el-input v-model="formData.ip" placeholder="关联IP" /></el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="内容">
        <el-input v-model="formData.content" type="textarea" :rows="5" placeholder="注意事项详细内容" />
      </el-form-item>
      <el-form-item label="图片">
        <el-input v-model="formData.images" placeholder="图片URL（JSON数组或逗号分隔）" />
      </el-form-item>
      <el-form-item label="附件">
        <el-input v-model="formData.attachments" placeholder="附件URL（JSON数组或逗号分隔）" />
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
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { createDesignNote, updateDesignNote } from '@/api/designNotes'

const props = defineProps({ modelValue:Boolean, mode:{type:String,default:'add'}, recordData:{type:Object,default:null}, noteType:{type:String,default:'production'} })
const emit = defineEmits(['update:modelValue','success'])
const formRef = ref(null), submitting = ref(false)
const dialogTitle = computed(() => props.mode==='add'?'新增注意事项':'编辑注意事项')

const formData = reactive({ title:'', content:'', category:'', craft:'', ip:'', images:'', attachments:'', remark:'' })
const rules = { title:[{required:true,message:'请输入标题',trigger:'blur'}] }

watch(()=>props.recordData,(d)=>{ if(d){ Object.keys(formData).forEach(k=>{if(d[k]!==undefined)formData[k]=d[k]}) } else resetForm() },{immediate:true})
watch(()=>props.modelValue,(v)=>{if(!v)resetForm()})

function resetForm() { formData.title=''; formData.content=''; formData.category=''; formData.craft=''; formData.ip=''; formData.images=''; formData.attachments=''; formData.remark=''; formRef.value?.clearValidate() }

async function handleSubmit() {
  if(!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const data = { ...formData, note_type: props.noteType }
    if (props.mode==='add') await createDesignNote(data)
    else await updateDesignNote(props.recordData.id, data)
    ElMessage.success(props.mode==='add'?'新增成功':'修改成功')
    emit('success'); handleClose()
  } catch(e) { console.error(e); ElMessage.error('操作失败') }
  finally { submitting.value = false }
}
function handleClose() { emit('update:modelValue',false) }
</script>