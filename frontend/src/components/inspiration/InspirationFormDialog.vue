<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="680px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="inspiration-form"
    >
      <el-row :gutter="20">
        <!-- 原始链接（放在最前面，最重要的字段） -->
        <el-col :span="24">
          <el-form-item label="🔗 链接" prop="source_url">
            <el-input v-model="formData.source_url" placeholder="粘贴小红书/淘宝/1688链接，自动抓取标题和封面" size="large" @blur="fetchMeta">
              <template #append>
                <el-button @click="openUrl" :disabled="!formData.source_url" type="primary">打开</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-col>

        <!-- 标题 -->
        <el-col :span="24">
          <el-form-item label="标题" prop="title">
            <el-input v-model="formData.title" placeholder="输入标题描述这个灵感" maxlength="100" show-word-limit />
          </el-form-item>
        </el-col>

        <!-- 来源平台（根据链接自动识别） -->
        <el-col :span="12">
          <el-form-item label="来源平台" prop="source_type">
            <el-select v-model="formData.source_type" placeholder="选择平台" filterable style="width: 100%">
              <el-option v-for="p in platformOptions" :key="p.value" :label="p.label" :value="p.value" />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 作者 -->
        <el-col :span="12">
          <el-form-item label="作者" prop="author">
            <el-input v-model="formData.author" placeholder="博主/店铺名" />
          </el-form-item>
        </el-col>

        <!-- 品类 -->
        <el-col :span="12">
          <el-form-item label="品类" prop="category_tag_ids">
            <el-select
              v-model="formData.category_tag_ids"
              placeholder="选择品类"
              filterable
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="cat in categoryOptions"
                :key="cat.id"
                :label="cat.tag_name"
                :value="String(cat.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 工艺 -->
        <el-col :span="12">
          <el-form-item label="工艺" prop="craft_tag_ids">
            <el-select
              v-model="formData.craft_tag_ids"
              placeholder="选择工艺"
              filterable
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="craft in craftOptions"
                :key="craft.id"
                :label="craft.tag_name"
                :value="String(craft.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- IP -->
        <el-col :span="12">
          <el-form-item label="IP" prop="ip_tag_ids">
            <el-select
              v-model="formData.ip_tag_ids"
              placeholder="选择IP"
              filterable
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="ip in ipOptions"
                :key="ip.id"
                :label="ip.tag_name"
                :value="String(ip.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 适用场景 -->
        <el-col :span="12">
          <el-form-item label="适用场景" prop="scene_tag_ids">
            <el-select
              v-model="formData.scene_tag_ids"
              placeholder="选择场景"
              filterable
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="scene in sceneOptions"
                :key="scene.id"
                :label="scene.tag_name"
                :value="String(scene.id)"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 是否采用 -->
        <el-col :span="12">
          <el-form-item label="是否采用" prop="is_adopted">
            <el-switch v-model="formData.is_adopted" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>

        <!-- 收藏时间 -->
        <el-col :span="12">
          <el-form-item label="收藏时间" prop="collect_time">
            <el-date-picker
              v-model="formData.collect_time"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <!-- 价值说明 -->
        <el-col :span="24">
          <el-form-item label="价值说明" prop="reference_value">
            <el-input
              v-model="formData.reference_value"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="请描述此灵感的参考价值"
            />
          </el-form-item>
        </el-col>

        <!-- 截图上传 -->
        <el-col :span="24">
          <el-form-item label="截图上传" prop="screenshot">
            <el-upload
              v-model:file-list="fileList"
              action="#"
              :auto-upload="false"
              :limit="1"
              list-type="picture"
              accept="image/*"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
            >
              <el-button type="primary" plain>
                <el-icon><Upload /></el-icon>
                点击上传截图
              </el-button>
              <template #tip>
                <div class="upload-tip">支持 JPG、PNG 格式，建议尺寸 800x600</div>
              </template>
            </el-upload>
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
import { Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { request } from '@/api'
import { getTagsByType } from '@/api/tags'
import { createInspiration, updateInspiration } from '@/api/inspirations'

const props = defineProps({
  modelValue: Boolean,
  mode: {
    type: String,
    default: 'add'
  },
  inspirationData: {
    type: Object,
    default: null
  },
  inspirationType: {
    type: String,
    default: 'product'
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const submitting = ref(false)
const fileList = ref([])

const dialogTitle = computed(() => props.mode === 'add' ? '新增灵感' : '编辑灵感')

// 来源平台选项（value 与后端校验白名单保持一致）
const platformOptions = [
  { label: '小红书', value: '小红书' },
  { label: '淘宝', value: '淘宝' },
  { label: '1688', value: '1688' },
  { label: '站酷', value: '站酷' },
  { label: '微博', value: '微博' },
  { label: '抖音', value: '抖音' },
  { label: 'Pinterest', value: 'pinterest' },
  { label: 'Instagram', value: 'instagram' },
  { label: '其他', value: 'other' }
]

// 标签选项（从真实标签体系加载，按 ID 选择）
const categoryOptions = ref([])
const craftOptions = ref([])
const ipOptions = ref([])
const sceneOptions = ref([])

async function loadTagOptions() {
  try {
    const [catR, craftR, ipR, sceneR] = await Promise.all([
      getTagsByType('category'),
      getTagsByType('craft'),
      getTagsByType('ip'),
      getTagsByType('scene')
    ])
    categoryOptions.value = catR.data?.list || catR.data || []
    craftOptions.value = craftR.data?.list || craftR.data || []
    ipOptions.value = ipR.data?.list || ipR.data || []
    sceneOptions.value = sceneR.data?.list || sceneR.data || []
  } catch (e) {
    console.error('加载标签失败', e)
  }
}

// 表单数据（字段名与后端对齐）
const formData = reactive({
  title: '',
  source_url: '',
  source_type: '',
  author: '',
  category_tag_ids: '',
  craft_tag_ids: '',
  ip_tag_ids: '',
  scene_tag_ids: '',
  is_adopted: 0,
  collect_time: '',
  reference_value: '',
  cover_image: ''
})

// 校验规则
const formRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  source_url: [{ required: true, message: '请输入链接', trigger: 'blur' }],
  source_type: [{ required: true, message: '请选择来源平台', trigger: 'change' }]
}

// 监听数据变化（编辑回填）
watch(() => props.inspirationData, (newData) => {
  if (newData) {
    resetForm()
    // 仅回填 formData 已声明的字段，避免脏字段
    Object.keys(formData).forEach(key => {
      if (newData[key] !== undefined && newData[key] !== null) {
        formData[key] = key.endsWith('_tag_ids') ? String(newData[key]) : newData[key]
      }
    })
    const cover = newData.cover_image || newData.screenshot
    if (cover) {
      formData.cover_image = cover
      fileList.value = [{ name: 'screenshot', url: cover }]
    }
  } else {
    resetForm()
  }
}, { immediate: true })

watch(() => props.modelValue, (visible) => {
  if (!visible) {
    resetForm()
  }
})

function handleFileChange(file, files) {
  fileList.value = files
  if (file.raw) {
    // 本地预览（base64），提交时作为 cover_image
    const reader = new FileReader()
    reader.onload = (e) => {
      formData.cover_image = e.target.result
    }
    reader.readAsDataURL(file.raw)
  }
}

function handleFileRemove() {
  fileList.value = []
  formData.cover_image = ''
}

function openUrl() {
  if (formData.source_url) {
    window.open(formData.source_url, '_blank')
  }
}

// 粘贴链接后自动抓取标题、封面、平台
let fetchingTimer = null
async function fetchMeta() {
  const url = formData.source_url?.trim()
  if (!url || !url.startsWith('http')) return
  // 如果已有标题，说明已手动填写，不覆盖
  if (formData.title) return

  clearTimeout(fetchingTimer)
  fetchingTimer = setTimeout(async () => {
    try {
      const res = await request.post('/inspirations/fetch-meta', { url })
      if (res.code === 200 && res.data) {
        const m = res.data
        if (m.title && !formData.title) formData.title = m.title.substring(0, 100)
        if (m.platform && !formData.source_type) formData.source_type = m.platform
        if (m.description && !formData.reference_value) formData.reference_value = m.description.substring(0, 500)
        if (m.image && !formData.cover_image) {
          formData.cover_image = m.image
          fileList.value = [{ name: 'cover', url: m.image }]
        }
        ElMessage.success('已自动抓取标题和封面')
      }
    } catch (e) { /* 抓取失败不提示，用户手动填 */ }
  }, 500)
}

function resetForm() {
  formData.title = ''
  formData.source_url = ''
  formData.source_type = ''
  formData.author = ''
  formData.category_tag_ids = ''
  formData.craft_tag_ids = ''
  formData.ip_tag_ids = ''
  formData.scene_tag_ids = ''
  formData.is_adopted = 0
  formData.collect_time = ''
  formData.reference_value = ''
  formData.cover_image = ''
  fileList.value = []
  formRef.value?.clearValidate()
}

function buildPayload() {
  return {
    title: formData.title,
    source_url: formData.source_url,
    source_type: formData.source_type,
    author: formData.author || null,
    inspiration_type: props.inspirationType || 'product',
    category_tag_ids: formData.category_tag_ids || null,
    craft_tag_ids: formData.craft_tag_ids || null,
    ip_tag_ids: formData.ip_tag_ids || null,
    scene_tag_ids: formData.scene_tag_ids || null,
    is_adopted: formData.is_adopted ? 1 : 0,
    collection_status: formData.is_adopted ? 'applied' : 'collected',
    collect_time: formData.collect_time || null,
    reference_value: formData.reference_value || null,
    // description 用于卡片列表展示，与价值说明同步
    description: formData.reference_value || null,
    cover_image: formData.cover_image || null
  }
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
    const payload = buildPayload()
    if (props.mode === 'add') {
      await createInspiration(payload)
    } else {
      const id = props.inspirationData?.id
      if (!id) throw new Error('缺少灵感 ID')
      await updateInspiration(id, payload)
    }

    ElMessage.success(props.mode === 'add' ? '新增成功' : '修改成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error?.response?.data?.message || '操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}

onMounted(loadTagOptions)
</script>

<style scoped>
.inspiration-form {
  padding-right: 20px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}
</style>
