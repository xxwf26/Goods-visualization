<template>
  <el-dialog
    :model-value="modelValue"
    :title="editing ? '编辑灵感详情' : '灵感详情'"
    width="720px"
    destroy-on-close
    @update:model-value="handleClose"
  >
    <div v-if="inspiration" class="detail-container">
      <!-- 封面图 -->
      <div v-if="displayCover" class="cover-section">
        <el-image :src="displayCover" fit="contain" :preview-src-list="[displayCover]" preview-teleported class="cover-img" />
      </div>

      <!-- 标题 + 作者 -->
      <div class="head-section">
        <template v-if="editing">
          <el-input v-model="form.title" placeholder="标题" size="default" class="d-title-input" />
          <div class="d-meta">
            <el-tag size="small" type="primary">{{ inspiration.source_platform || '其他' }}</el-tag>
            <el-input v-model="form.author" placeholder="作者" size="small" style="width:160px" />
          </div>
        </template>
        <template v-else>
          <h3 class="d-title">{{ inspiration.title || '无标题' }}</h3>
          <div class="d-meta">
            <el-tag size="small" type="primary">{{ inspiration.source_platform || '其他' }}</el-tag>
            <span v-if="inspiration.author" class="d-author"><el-icon><User /></el-icon>{{ inspiration.author }}</span>
            <span v-if="inspiration.link_status==='dead'" class="d-dead">链接已失效</span>
            <span v-else-if="inspiration.link_status==='error'" class="d-err">链接无法验证</span>
          </div>
        </template>
      </div>

      <!-- 正文内容快照 -->
      <div class="content-section">
        <div class="sec-label">
          <el-icon><Document /></el-icon> 内容快照
          <el-button v-if="!editing && canEdit" link type="primary" size="small" :loading="refreshing" @click="handleRefresh" style="margin-left:auto;">
            重新抓取
          </el-button>
        </div>
        <el-input v-if="editing" v-model="form.description" type="textarea" :rows="4" placeholder="正文内容" />
        <div v-else-if="inspiration.description" class="content-text">{{ inspiration.description }}</div>
        <div v-else class="ai-empty">暂无内容，可点「重新抓取」从链接获取</div>
      </div>

      <!-- AI 图片分析结果 -->
      <div class="content-section">
        <div class="sec-label">
          <el-icon><MagicStick /></el-icon> AI 图片分析
          <el-button v-if="!editing" link type="primary" size="small" :loading="analyzing" @click="handleAnalyze" style="margin-left:auto;">
            {{ inspiration.content_summary ? '重新分析' : 'AI 分析图片内容' }}
          </el-button>
        </div>
        <el-input v-if="editing" v-model="form.content_summary" type="textarea" :rows="5" placeholder="AI分析总结" />
        <template v-else>
          <div v-if="inspiration.content_summary" class="content-text ai-text">{{ inspiration.content_summary }}</div>
          <div v-else class="ai-empty">点击「AI 分析图片内容」，自动读取帖子所有图片文字并总结（链接失效后结果仍保留）。</div>
        </template>
      </div>

      <!-- 帖子图片 + 识别文字（可编辑） -->
      <div v-if="displayImageTexts.length || editing" class="content-section">
        <div class="sec-label">
          <el-icon><Picture /></el-icon> 帖子图片{{ editing ? '（可编辑文字 / 删除 / 上传）' : '（已存本地 + 识别文字）' }}
        </div>
        <div v-for="(it, i) in displayImageTexts" :key="i" class="img-ocr-item">
          <div class="img-ocr-img">
            <el-image
              v-if="it.file"
              :src="`/uploads/${it.file}`"
              fit="contain"
              :preview-src-list="displayImageTexts.filter(x=>x.file).map(x=>`/uploads/${x.file}`)"
              :initial-index="displayImageTexts.filter(x=>x.file).indexOf(it)"
              preview-teleported
              class="ocr-pic"
            />
            <div v-else class="img-fail">无图</div>
            <el-button v-if="editing" link type="danger" size="small" class="img-del" @click="removeImage(i)">删除图片</el-button>
          </div>
          <div class="img-ocr-text">
            <div class="img-ocr-no">图 {{ i + 1 }}</div>
            <el-input v-if="editing" v-model="it.text" type="textarea" :rows="4" placeholder="该图识别文字（可编辑）" />
            <div v-else class="img-ocr-content">{{ it.text || '(未识别到文字)' }}</div>
          </div>
        </div>
        <!-- 上传新图 -->
        <el-upload v-if="editing" :show-file-list="false" :auto-upload="false" accept="image/*" multiple :on-change="handleUpload">
          <el-button size="small" :loading="uploading" :icon="Plus">添加图片</el-button>
        </el-upload>
      </div>

      <!-- 附加信息（只读） -->
      <el-descriptions v-if="!editing" :column="2" border size="small" class="d-info">
        <el-descriptions-item label="来源类型">{{ inspiration.source_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="收集人">{{ inspiration.creator_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="采用状态">
          <el-tag :type="inspiration.is_adopted ? 'success' : 'info'" size="small">{{ inspiration.is_adopted ? '已采用' : '未采用' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="收藏状态">{{ collectionStatusText }}</el-descriptions-item>
        <el-descriptions-item label="收藏时间" :span="2">{{ formatDate(inspiration.collect_time) }}</el-descriptions-item>
        <el-descriptions-item label="原始链接" :span="2">
          <a v-if="inspiration.link || inspiration.source_url" :href="inspiration.link || inspiration.source_url" target="_blank" rel="noopener noreferrer" class="d-link">
            {{ (inspiration.link || inspiration.source_url).substring(0, 60) }}...
          </a>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <template #footer>
      <template v-if="editing">
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
      <template v-else>
        <el-button v-if="canDelete" type="danger" plain @click="handleDelete">删除</el-button>
        <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
        <el-button v-if="canEdit" type="warning" plain @click="startEdit">编辑</el-button>
        <a v-if="inspiration && (inspiration.link || inspiration.source_url)" :href="inspiration.link || inspiration.source_url" target="_blank" rel="noopener noreferrer" class="jump-primary-btn">
          <el-icon><Link /></el-icon> 跳转原始链接
        </a>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue'
import { Link, User, Document, Star, MagicStick, Picture, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { analyzeInspirationImages, updateInspirationDetail, deleteInspiration, refreshInspirationSnapshot } from '@/api/inspirations'
import { useUserStore } from '@/stores/user'
import request from '@/api/request'

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('inspiration:edit') || userStore.hasPermission('inspiration:create'))
const canDelete = computed(() => userStore.role === 'admin' || userStore.role === 'super_admin')

const props = defineProps({
  modelValue: Boolean,
  inspiration: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'analyzed', 'deleted'])

const analyzing = ref(false)
const uploading = ref(false)
const saving = ref(false)
const refreshing = ref(false)
const editing = ref(false)

const form = reactive({
  title: '', author: '', description: '', content_summary: '',
  imageTexts: []  // [{file, text}]
})

// 解析原始 image_texts
const parsedImageTexts = computed(() => {
  const raw = props.inspiration?.image_texts
  if (!raw) return []
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
})

// 展示用：编辑时用 form.imageTexts，否则用原始
const displayImageTexts = computed(() => editing.value ? form.imageTexts : parsedImageTexts.value)
const displayCover = computed(() => {
  if (editing.value) {
    const f = form.imageTexts.find(x => x.file)
    return f ? `/uploads/${f.file}` : (props.inspiration?.cover_image || '')
  }
  return props.inspiration?.cover_image || ''
})

const collectionStatusText = computed(() => {
  const m = { uncollected: '未收藏', collected: '已收藏', applied: '已采用' }
  return m[props.inspiration?.collection_status] || '-'
})

function formatDate(d) {
  if (!d) return '-'
  return String(d).replace('T', ' ').substring(0, 16)
}

// 进入编辑：把当前数据复制到 form
function startEdit() {
  form.title = props.inspiration?.title || ''
  form.author = props.inspiration?.author || ''
  form.description = props.inspiration?.description || ''
  form.content_summary = props.inspiration?.content_summary || ''
  form.imageTexts = parsedImageTexts.value.map(x => ({ file: x.file || null, text: x.text || '' }))
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  if (!props.inspiration?.id) return
  saving.value = true
  try {
    const res = await updateInspirationDetail(props.inspiration.id, {
      title: form.title,
      author: form.author,
      description: form.description,
      content_summary: form.content_summary,
      image_texts: form.imageTexts
    })
    if (res.code === 200) {
      ElMessage.success('保存成功')
      editing.value = false
      emit('analyzed', props.inspiration.id) // 刷新数据
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败：' + (e?.message || '请重试'))
  } finally {
    saving.value = false
  }
}

// 上传新图片
async function handleUpload(file, fileList) {
  const rawFiles = fileList.filter(f => f.status === 'ready').map(f => f.raw)
  if (!rawFiles.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    rawFiles.forEach(f => fd.append('files', f))
    const res = await request.post('/upload/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const newFiles = (Array.isArray(res.data) ? res.data : [res.data]).map(r => r.filename)
    newFiles.forEach(f => form.imageTexts.push({ file: f, text: '' }))
    ElMessage.success(`已上传 ${newFiles.length} 张`)
  } catch (e) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

function removeImage(idx) {
  form.imageTexts.splice(idx, 1)
}

async function handleDelete() {
  if (!props.inspiration?.id) return
  try {
    await ElMessageBox.confirm(
      `确定删除灵感「${props.inspiration.title || '无标题'}」吗？删除后无法恢复。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await deleteInspiration(props.inspiration.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      emit('update:modelValue', false)
      emit('deleted', props.inspiration.id)
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败：' + (e?.message || '请重试'))
  }
}

async function handleAnalyze() {
  if (!props.inspiration?.id) return
  if (editing.value) { ElMessage.info('请先退出编辑模式'); return }
  analyzing.value = true
  try {
    const res = await analyzeInspirationImages(props.inspiration.id)
    if (res.code === 200) {
      ElMessage.success(res.message || 'AI分析完成')
      emit('analyzed', props.inspiration.id)
    } else {
      ElMessage.error(res.message || '分析失败')
    }
  } catch (e) {
    ElMessage.error('分析失败：' + (e?.message || '请稍后重试'))
  } finally {
    analyzing.value = false
  }
}

async function handleRefresh() {
  if (!props.inspiration?.id) return
  if (editing.value) { ElMessage.info('请先退出编辑模式'); return }
  refreshing.value = true
  try {
    const res = await refreshInspirationSnapshot(props.inspiration.id)
    if (res.code === 200) {
      ElMessage.success(res.message || '已重新抓取')
      emit('analyzed', props.inspiration.id) // 复用刷新逻辑
    } else {
      ElMessage.error(res.message || '抓取失败')
    }
  } catch (e) {
    ElMessage.error('抓取失败：' + (e?.message || '链接可能已失效'))
  } finally {
    refreshing.value = false
  }
}

function handleClose(v) {
  if (!v && editing.value) {
    // 关闭时若在编辑，提示
    editing.value = false
  }
  emit('update:modelValue', v)
}

// 弹窗关闭时重置编辑态
watch(() => props.modelValue, (v) => { if (!v) editing.value = false })
</script>

<style scoped>
.detail-container { padding: 0 4px; }

.cover-section { margin-bottom: 16px; text-align: center; }
.cover-img {
  max-width: 100%; max-height: 360px; border-radius: 10px;
  background: #fafafa; border: 1px solid #EDE9FE;
}

.head-section { margin-bottom: 16px; }
.d-title { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1E293B; line-height: 1.4; }
.d-title-input { margin-bottom: 8px; }
.d-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.d-author { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #64748B; }
.d-dead { font-size: 12px; color: #EF4444; font-weight: 600; }
.d-err { font-size: 12px; color: #F59E0B; font-weight: 600; }

.content-section { margin-bottom: 16px; }
.sec-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;
}
.content-text {
  font-size: 14px; color: #334155; line-height: 1.8; white-space: pre-wrap;
  background: #F8F5FF; border-radius: 10px; padding: 14px 16px;
  border: 1px solid #EDE9FE;
}
.ai-text { background: #FFF7ED; border-color: #FED7AA; }
.ai-empty {
  font-size: 13px; color: #94A3B8; line-height: 1.7;
  background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 14px 16px;
}

/* 逐图 OCR */
.img-ocr-item {
  display: flex; gap: 12px; margin-bottom: 14px;
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px;
}
.img-ocr-img { flex-shrink: 0; width: 140px; position: relative; }
.ocr-pic { width: 140px; height: 140px; border-radius: 8px; background: #fff; cursor: pointer; }
.img-fail { width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; color: #94A3B8; font-size: 12px; background: #F1F5F9; border-radius: 8px; }
.img-del { display: block; margin: 4px auto 0; }
.img-ocr-text { flex: 1; min-width: 0; }
.img-ocr-no { font-size: 12px; color: #8B5CF6; font-weight: 600; margin-bottom: 6px; }
.img-ocr-content { font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }

.d-info { margin-top: 4px; }
.d-link { color: #8B5CF6; text-decoration: none; word-break: break-all; }
.d-link:hover { text-decoration: underline; }

.jump-primary-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: #8B5CF6; color: #fff; text-decoration: none;
  padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;
  transition: background 0.2s;
}
.jump-primary-btn:hover { background: #7C3AED; }
</style>
