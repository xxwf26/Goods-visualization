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
              <el-option v-for="p in ['小红书','淘宝','1688','站酷','微博','抖音','Pinterest','Instagram','其他']" :key="p" :label="p" :value="p" />
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
          <el-form-item label="品类" prop="category">
            <el-select
              v-model="formData.category"
              placeholder="选择品类"
              filterable
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

        <!-- 工艺 -->
        <el-col :span="12">
          <el-form-item label="工艺" prop="craft">
            <el-select
              v-model="formData.craft"
              placeholder="选择工艺"
              style="width: 100%"
            >
              <el-option
                v-for="craft in craftOptions"
                :key="craft"
                :label="craft"
                :value="craft"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- IP -->
        <el-col :span="12">
          <el-form-item label="IP" prop="ip">
            <el-select
              v-model="formData.ip"
              placeholder="选择IP"
              filterable
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="ip in ipOptions"
                :key="ip"
                :label="ip"
                :value="ip"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 适用场景 -->
        <el-col :span="12">
          <el-form-item label="适用场景" prop="scene">
            <el-select
              v-model="formData.scene"
              placeholder="选择场景"
              style="width: 100%"
            >
              <el-option
                v-for="scene in sceneOptions"
                :key="scene"
                :label="scene"
                :value="scene"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 标签 -->
        <el-col :span="24">
          <el-form-item label="标签" prop="tags">
            <el-select
              v-model="formData.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="选择或输入标签"
              style="width: 100%"
            >
              <el-option
                v-for="tag in tagOptions"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 是否采用 -->
        <el-col :span="12">
          <el-form-item label="是否采用" prop="adopted">
            <el-switch v-model="formData.adopted" />
          </el-form-item>
        </el-col>

        <!-- 收藏时间 -->
        <el-col :span="12">
          <el-form-item label="收藏时间" prop="collectTime">
            <el-date-picker
              v-model="formData.collectTime"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <!-- 价值说明 -->
        <el-col :span="24">
          <el-form-item label="价值说明" prop="valueDescription">
            <el-input
              v-model="formData.valueDescription"
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
import { ref, reactive, watch, computed } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { request } from '@/api'

const props = defineProps({
  modelValue: Boolean,
  mode: {
    type: String,
    default: 'add'
  },
  inspirationData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const submitting = ref(false)
const fileList = ref([])

const dialogTitle = computed(() => props.mode === 'add' ? '新增灵感' : '编辑灵感')

// 选项
const platformOptions = ['微博', '小红书', 'B站', 'Twitter', 'Pixiv', 'INS', '公众号', '其他']
const creatorOptions = ['张三', '李四', '王五', '赵六', '钱七']
const categoryOptions = ['手办', '立牌', '挂件', '海报', '抱枕', '徽章', '票根', '包装']
const craftOptions = ['喷漆', '电镀', '植绒', '刺绣', '印刷', '烫金', '注塑', '滴胶']
const ipOptions = ['原神', '明日方舟', '崩坏星穹铁道', '蔚蓝档案', '鸣潮', '无']
const sceneOptions = ['新品开发', '包装设计', '工艺参考', '营销素材', '竞品分析']
const tagOptions = ['精美', '限量', '联动款', '新款', '爆款', '参考价值高', '性价比', '收藏级']

// 表单数据
const formData = reactive({
  title: '',
  source_url: '',
  source_type: '',
  author: '',
  category: '',
  craft: '',
  ip: '',
  scene: '',
  tags: [],
  adopted: false,
  collectTime: '',
  valueDescription: '',
  screenshot: ''
})

// 校验规则
const formRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  source_url: [{ required: true, message: '请输入链接', trigger: 'blur' }],
  source_type: [{ required: true, message: '请选择来源平台', trigger: 'change' }]
}

// 监听数据变化
watch(() => props.inspirationData, (newData) => {
  if (newData) {
    Object.assign(formData, newData)
    if (newData.screenshot) {
      fileList.value = [{ name: 'screenshot', url: newData.screenshot }]
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
    // 本地预览
    const reader = new FileReader()
    reader.onload = (e) => {
      formData.screenshot = e.target.result
    }
    reader.readAsDataURL(file.raw)
  }
}

function handleFileRemove() {
  fileList.value = []
  formData.screenshot = ''
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
        if (m.description && !formData.valueDescription) formData.valueDescription = m.description.substring(0, 500)
        if (m.image && !formData.screenshot) formData.screenshot = m.image
        ElMessage.success('已自动抓取标题和封面')
      }
    } catch (e) { /* 抓取失败不提示，用户手动填 */ }
  }, 500)
}

function resetForm() {
  Object.keys(formData).forEach(key => {
    if (key === 'adopted') {
      formData[key] = false
    } else if (key === 'tags') {
      formData[key] = []
    } else {
      formData[key] = ''
    }
  })
  fileList.value = []
  formRef.value?.clearValidate()
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
    // TODO: 调用真实接口
    if (props.mode === 'add') {
      console.log('新增灵感:', formData)
    } else {
      console.log('编辑灵感:', formData)
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
.inspiration-form {
  padding-right: 20px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}
</style>
