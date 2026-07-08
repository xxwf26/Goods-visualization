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
        <el-image :key="`cover-${previewKey}`" :src="displayCover" fit="contain" :preview-src-list="[displayCover]" preview-teleported hide-on-click-modal class="cover-img" />
      </div>

      <!-- 标题 + 作者 -->
      <div class="head-section">
        <template v-if="editing">
          <el-input v-model="form.title" placeholder="标题" size="default" class="d-title-input" />
          <div class="d-meta">
            <el-tag size="small" type="primary">{{ inspiration.source_platform || '其他' }}</el-tag>
            <el-input v-model="form.author" placeholder="作者" size="small" style="width:160px" />
          </div>
          <el-input v-model="form.link" placeholder="帖子链接（修改后链接状态重置为未检测）" size="small" class="d-link-input" clearable>
            <template #prefix><el-icon><Link /></el-icon></template>
          </el-input>
        </template>
        <template v-else>
          <h3 class="d-title">{{ inspiration.title || '无标题' }}</h3>
          <div class="d-meta">
            <el-tag size="small" type="primary">{{ inspiration.source_platform || '其他' }}</el-tag>
            <span v-if="inspiration.author" class="d-author"><el-icon><User /></el-icon>{{ inspiration.author }}</span>
            <span v-if="inspiration.link_status==='dead'" class="d-dead">链接已失效</span>
            <span v-else-if="inspiration.link_status==='error'" class="d-err">链接无法验证</span>
            <!-- 链接失效/抓不到内容的常见原因（留给后人排查参考） -->
            <el-popover v-if="!editing" placement="bottom" :width="360" trigger="click">
              <template #reference>
                <el-button link size="small" type="info" class="link-reason-btn">
                  <el-icon><InfoFilled /></el-icon>链接失效原因
                </el-button>
              </template>
              <div class="link-reason-tip">
                <div class="lr-title">链接失效 / 抓不到内容的常见原因</div>
                <ol>
                  <li><b>笔记被删或设为私密 / 仅粉丝可见</b>：小红书对未登录的服务端请求返回 404，浏览器登录态能看，后端抓不到（最常见）。</li>
                  <li><b>分享令牌 xsec_token 过期</b>：小红书分享链接带时效，失效后需重新「分享 → 复制链接」并更新。</li>
                  <li><b>平台风控 / 限流</b>：同一笔记匿名请求被暂时拦截，可稍后重试。</li>
                  <li><b>登录墙平台</b>：1688 / 淘宝等需登录才能查看，请直接上传截图后点「AI 分析图片内容」。</li>
                  <li><b>链接已下架</b>：商品下架或原帖被删。</li>
                </ol>
                <div class="lr-foot">补救：在详情里上传截图 + 点「AI 分析图片内容」补全；或重新复制链接后用「链接状态 → 更新链接」。</div>
              </div>
            </el-popover>
            <el-dropdown v-if="!editing && canEdit" trigger="click" size="small" @command="handleSetLinkStatus">
              <el-button link size="small" type="primary">链接状态<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="ok">✅ 标记为正常</el-dropdown-item>
                  <el-dropdown-item command="dead">❌ 标记为已失效</el-dropdown-item>
                  <el-dropdown-item command="unknown">⚪ 重置为未检测</el-dropdown-item>
                  <el-dropdown-item command="recheck" divided>🔄 重新检测</el-dropdown-item>
                  <el-dropdown-item command="editlink" divided>✏️ 更新链接</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
          <el-button v-if="!editing && canEdit" link type="primary" size="small" :loading="analyzing" @click="handleAnalyze" style="margin-left:auto;">
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
      <div class="content-section">
        <div class="sec-label">
          <el-icon><Picture /></el-icon> 帖子图片{{ editing ? '（可编辑文字 / 删除 / 上传）' : (displayImageTexts.length ? '（已存本地 + 识别文字）' : '') }}
        </div>
        <!-- 无图片时的引导 -->
        <div v-if="!displayImageTexts.length && !editing" class="ai-empty">
          暂无图片。点底部「编辑」→「添加图片」上传截图（1688/淘宝等登录墙平台，请在已登录的浏览器截图后上传），保存后再点「AI 分析图片内容」即可识别文字。
        </div>
        <div v-for="(it, i) in displayImageTexts" :key="i" class="img-ocr-item">
          <div class="img-ocr-img">
            <el-image
              v-if="it.file"
              :key="`ocr-${previewKey}-${i}`"
              :src="`/uploads/${it.file}`"
              fit="contain"
              :preview-src-list="displayImageTexts.filter(x=>x.file).map(x=>`/uploads/${x.file}`)"
              :initial-index="displayImageTexts.filter(x=>x.file).indexOf(it)"
              preview-teleported
              hide-on-click-modal
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
        <span v-if="editing" class="paste-tip">或直接 Ctrl+V 粘贴截图</span>
      </div>

      <!-- 附加信息（只读） -->
      <el-descriptions v-if="!editing" :column="2" border size="small" class="d-info">
        <el-descriptions-item label="分类" :span="2">
          <el-tag v-for="c in categoryLabels" :key="c" size="small" type="primary" effect="plain" style="margin-right:4px;">{{ c }}</el-tag>
          <span v-if="!categoryLabels.length">-</span>
        </el-descriptions-item>
        <el-descriptions-item label="来源类型">{{ inspiration.source_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="收集人">{{ inspiration.creator_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{ tagNames(inspiration.ip_tag_ids) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="品类">{{ tagNames(inspiration.category_tag_ids) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工艺">{{ tagNames(inspiration.craft_tag_ids) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="适用场景">{{ tagNames(inspiration.scene_tag_ids) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="采用状态">
          <el-tag :type="inspiration.is_adopted ? 'success' : 'info'" size="small">{{ inspiration.is_adopted ? '已采用' : '未采用' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="收藏状态">{{ collectionStatusText }}</el-descriptions-item>
        <el-descriptions-item label="收藏时间" :span="2">{{ formatDate(inspiration.collect_time) }}</el-descriptions-item>
        <el-descriptions-item label="原始链接" :span="2">
          <a v-if="canViewLink" :href="safeHref" target="_blank" rel="noopener noreferrer" class="d-link">
            {{ linkUrl.substring(0, 60) }}...
          </a>
          <span v-else-if="sensitiveLink" class="d-link-muted">(来源已隐藏)</span>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <template v-if="editing">
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
        </template>
        <template v-else>
          <el-button v-if="canDelete" type="danger" plain @click="handleDelete">删除</el-button>
          <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
          <el-button v-if="canEdit" type="warning" plain @click="startEdit">编辑</el-button>
          <a v-if="canViewLink" :href="safeHref" target="_blank" rel="noopener noreferrer" class="jump-primary-btn">
            <el-icon><Link /></el-icon> 跳转原始链接
          </a>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, reactive, watch, onMounted } from 'vue'
import { getTagsByType } from '@/api/tags'
import { Link, User, Document, Star, MagicStick, Picture, Plus, ArrowDown, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ElMessageBox as ElMsgBox } from 'element-plus'
import { analyzeInspirationImages, updateInspirationDetail, deleteInspiration, refreshInspirationSnapshot, setLinkStatus, checkInspirationLink, updateInspirationLink } from '@/api/inspirations'
import { isSensitiveSource } from '@/utils/sourcePolicy'
import { safeUrl } from '@/utils/safeUrl'
import { useUserStore } from '@/stores/user'
import request from '@/api/request'
import { usePasteUpload } from '@/composables/usePasteUpload'

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('inspiration:edit') || userStore.hasPermission('inspiration:create'))
const canDelete = computed(() => userStore.role === 'admin' || userStore.role === 'super_admin')
// 当前链接及其敏感标记（github/gitee 等代码仓库）：非编辑者不展示，避免源码地址泄露
const linkUrl = computed(() => props.inspiration?.link || props.inspiration?.source_url || '')
const safeHref = computed(() => safeUrl(linkUrl.value)) // 仅 http/https，防 javascript: 注入
const sensitiveLink = computed(() => isSensitiveSource(linkUrl.value))
// 非编辑者对敏感来源不可见链接；协议非法(javascript:/data:等)一律不渲染
const canViewLink = computed(() => !!safeHref.value && (!sensitiveLink.value || canEdit.value))

const props = defineProps({
  modelValue: Boolean,
  inspiration: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'analyzed', 'deleted'])

const analyzing = ref(false)
const uploading = ref(false)

// 标签ID→名称映射（用于展示自动匹配的标签）
const tagMap = ref({})
onMounted(async () => {
  try {
    const types = ['ip', 'category', 'craft', 'scene']
    const results = await Promise.all(types.map(t => getTagsByType(t)))
    types.forEach((t, i) => {
      const list = results[i].data?.list || results[i].data || []
      list.forEach(tag => { tagMap.value[tag.id] = tag.tag_name })
    })
  } catch (e) { /* 标签加载失败不影响展示 */ }
})
function tagNames(ids) {
  if (!ids) return ''
  return String(ids).split(',').map(id => tagMap.value[id]).filter(Boolean).join('、')
}
const saving = ref(false)
const refreshing = ref(false)
const editing = ref(false)

const form = reactive({
  title: '', author: '', description: '', content_summary: '', link: '',
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
// 封面地址：裸文件名前拼 /uploads/，http 全链接原样返回（与 Inspiration.vue 的 toImageUrl 一致）
function toImageUrl(v) {
  if (!v) return ''
  const s = String(v).trim()
  return s.startsWith('http') ? s : `/uploads/${s}`
}
const displayCover = computed(() => {
  if (editing.value) {
    const f = form.imageTexts.find(x => x.file)
    return f ? `/uploads/${f.file}` : toImageUrl(props.inspiration?.cover_image)
  }
  return toImageUrl(props.inspiration?.cover_image)
})

const collectionStatusText = computed(() => {
  const m = { uncollected: '未收藏', collected: '已收藏', applied: '已采用' }
  return m[props.inspiration?.collection_status] || '-'
})

const categoryLabels = computed(() => {
  const cats = props.inspiration?.categories
  if (!cats) return []
  const map = { packaging: '包装结构', peripheral: '周边品类灵感', effect: '效果与特殊工艺', production: '印刷与生产攻略' }
  return String(cats).split(',').map(s => s.trim()).filter(Boolean).map(v => map[v] || v)
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
  form.link = props.inspiration?.link || props.inspiration?.source_url || ''
  form.imageTexts = parsedImageTexts.value.map(x => ({ file: x.file || null, text: x.text || '' }))
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  if (!props.inspiration?.id) return
  // 链接校验：留空或合法 http(s) 才放行
  if (form.link && !/^https?:\/\//i.test(form.link)) {
    ElMessage.error('链接需以 http:// 或 https:// 开头')
    return
  }
  saving.value = true
  try {
    const origLink = props.inspiration?.link || props.inspiration?.source_url || ''
    // 链接有变更：走专门的更新链接接口（会同步 source_url/link 并重置状态为未检测）
    if (form.link && form.link !== origLink) {
      const lr = await updateInspirationLink(props.inspiration.id, form.link)
      if (lr.code !== 200) { ElMessage.error(lr.message || '链接更新失败'); return }
    }
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
async function uploadRawFiles(rawFiles) {
  if (!rawFiles || !rawFiles.length) return
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
// el-upload 选择文件
function handleUpload(file, fileList) {
  const rawFiles = fileList.filter(f => f.status === 'ready').map(f => f.raw)
  uploadRawFiles(rawFiles)
}
// 粘贴图片上传（需在编辑模式）
usePasteUpload(files => {
  if (!editing.value) return
  uploadRawFiles(files)
})

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
    ElMessage.error('抓取失败：' + (e?.message || '链接可能已失效') + '（点「链接失效原因」查看说明）')
  } finally {
    refreshing.value = false
  }
}

async function handleSetLinkStatus(cmd) {
  if (!props.inspiration?.id) return
  if (cmd === 'recheck') {
    try {
      const res = await checkInspirationLink(props.inspiration.id)
      if (res.code === 200) {
        ElMessage.success(`检测完成：${res.data.status === 'ok' ? '正常' : res.data.status === 'dead' ? '已失效' : '无法验证'}`)
        emit('analyzed', props.inspiration.id)
      }
    } catch (e) { ElMessage.error('检测失败') }
  } else if (cmd === 'editlink') {
    try {
      const currentLink = props.inspiration.link || props.inspiration.source_url || ''
      const { value } = await ElMsgBox.prompt('请输入新的链接URL', '更新链接', {
        confirmButtonText: '确定', cancelButtonText: '取消',
        inputValue: currentLink,
        inputPlaceholder: '粘贴小红书/淘宝/1688链接',
        inputValidator: (v) => (v && v.startsWith('http')) || '请输入有效的URL（以http开头）'
      })
      const res = await updateInspirationLink(props.inspiration.id, value)
      if (res.code === 200) {
        ElMessage.success('链接已更新，状态重置为未检测')
        emit('analyzed', props.inspiration.id)
      }
    } catch (e) { /* 用户取消 */ }
  } else {
    try {
      const res = await setLinkStatus(props.inspiration.id, cmd)
      if (res.code === 200) {
        ElMessage.success('链接状态已更新')
        emit('analyzed', props.inspiration.id)
      }
    } catch (e) { ElMessage.error('更新失败') }
  }
}

function handleClose(v) {
  if (!v && editing.value) {
    // 关闭时若在编辑，提示
    editing.value = false
  }
  emit('update:modelValue', v)
}

// 弹窗关闭时重置编辑态；同时改变 previewKey 强制 el-image 重挂载，
// 销毁残留的（teleport 到 body 的）大图查看器，避免关弹窗后背景大图还开着
const previewKey = ref(0)
watch(() => props.modelValue, (v) => { if (!v) { editing.value = false; previewKey.value++ } })
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
.d-link-input { margin-top: 8px; }
.d-dead { font-size: 12px; color: #EF4444; font-weight: 600; }
.d-err { font-size: 12px; color: #F59E0B; font-weight: 600; }
.link-reason-btn { font-size: 12px; color: #909399; }
.link-reason-tip { font-size: 13px; line-height: 1.6; color: #303133; }
.link-reason-tip .lr-title { font-weight: 600; margin-bottom: 8px; }
.link-reason-tip ol { padding-left: 18px; margin: 0 0 8px; }
.link-reason-tip ol li { margin-bottom: 6px; }
.link-reason-tip .lr-foot { color: #909399; font-size: 12px; border-top: 1px solid #EBEEF5; padding-top: 8px; }

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
.paste-tip { font-size: 12px; color: #94A3B8; margin-left: 8px; }
.img-ocr-text { flex: 1; min-width: 0; }
.img-ocr-no { font-size: 12px; color: #8B5CF6; font-weight: 600; margin-bottom: 6px; }
.img-ocr-content { font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }

.d-info { margin-top: 4px; }
.d-link { color: #8B5CF6; text-decoration: none; word-break: break-all; }
.d-link:hover { text-decoration: underline; }
.d-link-muted { color: #94A3B8; font-size: 12px; }

.dialog-footer { display: flex; justify-content: flex-end; align-items: center; gap: 10px; flex-wrap: wrap; }

.jump-primary-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; padding: 0 16px; box-sizing: border-box;
  background: #8B5CF6; color: #fff; text-decoration: none;
  border: 1px solid #8B5CF6; border-radius: 4px; font-size: 14px; cursor: pointer;
  line-height: 1; transition: background 0.2s;
}
.jump-primary-btn:hover { background: #7C3AED; border-color: #7C3AED; }
</style>
