<template>
  <el-dialog
    :model-value="modelValue"
    title="灵感详情"
    width="700px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="inspiration" class="detail-container">
      <!-- 封面图（自动抓取的快照） -->
      <div v-if="inspiration.cover_image" class="cover-section">
        <el-image
          :src="inspiration.cover_image"
          fit="contain"
          :preview-src-list="coverImages"
          preview-teleported
          class="cover-img"
        />
      </div>

      <!-- 标题 + 作者 -->
      <div class="head-section">
        <h3 class="d-title">{{ inspiration.title || '无标题' }}</h3>
        <div class="d-meta">
          <el-tag size="small" type="primary">{{ inspiration.source_platform || '其他' }}</el-tag>
          <span v-if="inspiration.author" class="d-author">
            <el-icon><User /></el-icon>{{ inspiration.author }}
          </span>
          <span v-if="inspiration.link_status==='dead'" class="d-dead">链接已失效</span>
          <span v-else-if="inspiration.link_status==='error'" class="d-err">链接无法验证</span>
        </div>
      </div>

      <!-- 正文（自动提取的内容） -->
      <div v-if="inspiration.description" class="content-section">
        <div class="sec-label"><el-icon><Document /></el-icon> 内容快照</div>
        <div class="content-text">{{ inspiration.description }}</div>
      </div>

      <!-- AI 图片分析结果 -->
      <div class="content-section">
        <div class="sec-label">
          <el-icon><MagicStick /></el-icon> AI 图片分析
          <el-button
            link type="primary" size="small" :loading="analyzing"
            @click="handleAnalyze"
            style="margin-left:auto;"
          >
            {{ inspiration.content_summary ? '重新分析' : 'AI 分析图片内容' }}
          </el-button>
        </div>
        <div v-if="inspiration.content_summary" class="content-text ai-text">{{ inspiration.content_summary }}</div>
        <div v-else class="ai-empty">
          点击「AI 分析图片内容」，自动读取帖子所有图片文字并总结成结构化内容（链接失效后此分析结果仍保留）。
        </div>
      </div>

      <!-- 逐图 OCR（图片+识别文字，本地永久保存） -->
      <div v-if="imageTexts.length" class="content-section">
        <div class="sec-label"><el-icon><Picture /></el-icon> 帖子图片（已存本地 + 识别文字）</div>
        <div v-for="(it, i) in imageTexts" :key="i" class="img-ocr-item">
          <div class="img-ocr-img">
            <el-image
              v-if="it.file"
              :src="`/uploads/${it.file}`"
              fit="contain"
              :preview-src-list="imageTexts.filter(x=>x.file).map(x=>`/uploads/${x.file}`)"
              :initial-index="imageTexts.filter(x=>x.file).indexOf(it)"
              preview-teleported
              class="ocr-pic"
            />
            <div v-else class="img-fail">图片下载失败</div>
          </div>
          <div class="img-ocr-text">
            <div class="img-ocr-no">图 {{ i + 1 }}</div>
            <div class="img-ocr-content">{{ it.text || '(未识别到文字)' }}</div>
          </div>
        </div>
      </div>

      <!-- 参考价值 -->
      <div v-if="inspiration.reference_value && inspiration.reference_value !== inspiration.description" class="content-section">
        <div class="sec-label"><el-icon><Star /></el-icon> 参考价值</div>
        <div class="content-text">{{ inspiration.reference_value }}</div>
      </div>

      <!-- 附加信息 -->
      <el-descriptions :column="2" border size="small" class="d-info">
        <el-descriptions-item label="来源类型">{{ inspiration.source_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="收集人">{{ inspiration.creator_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="采用状态">
          <el-tag :type="inspiration.is_adopted ? 'success' : 'info'" size="small">
            {{ inspiration.is_adopted ? '已采用' : '未采用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="收藏状态">{{ collectionStatusText }}</el-descriptions-item>
        <el-descriptions-item label="收藏时间" :span="2">{{ formatDate(inspiration.collect_time) }}</el-descriptions-item>
        <el-descriptions-item label="原始链接" :span="2">
          <a v-if="inspiration.link || inspiration.source_url" :href="inspiration.link || inspiration.source_url" target="_blank" class="d-link">
            {{ (inspiration.link || inspiration.source_url).substring(0, 60) }}...
          </a>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      <el-button
        v-if="inspiration && (inspiration.link || inspiration.source_url)"
        type="primary"
        @click="jumpToOriginal"
      >
        <el-icon><Link /></el-icon> 跳转原始链接
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Link, User, Document, Star, MagicStick, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { analyzeInspirationImages } from '@/api/inspirations'

const props = defineProps({
  modelValue: Boolean,
  inspiration: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'analyzed'])

const analyzing = ref(false)

const coverImages = computed(() => {
  const list = []
  if (props.inspiration?.cover_image) list.push(props.inspiration.cover_image)
  return list
})

// 解析每张图的本地文件名 + OCR 文字
const imageTexts = computed(() => {
  const raw = props.inspiration?.image_texts
  if (!raw) return []
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
})

const collectionStatusText = computed(() => {
  const m = { uncollected: '未收藏', collected: '已收藏', applied: '已采用' }
  return m[props.inspiration?.collection_status] || '-'
})

function formatDate(d) {
  if (!d) return '-'
  return String(d).replace('T', ' ').substring(0, 16)
}

function jumpToOriginal() {
  const url = props.inspiration?.link || props.inspiration?.source_url
  if (url) window.open(url, '_blank')
  else ElMessage.warning('暂无原始链接')
}

async function handleAnalyze() {
  if (!props.inspiration?.id) return
  analyzing.value = true
  try {
    const res = await analyzeInspirationImages(props.inspiration.id)
    if (res.code === 200) {
      ElMessage.success(res.message || 'AI分析完成')
      // 通知父组件刷新数据（拿到最新的 content_summary）
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
.img-ocr-img { flex-shrink: 0; width: 140px; }
.ocr-pic { width: 140px; height: 140px; border-radius: 8px; background: #fff; cursor: pointer; }
.img-fail { width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; color: #EF4444; font-size: 12px; background: #FEF2F2; border-radius: 8px; }
.img-ocr-text { flex: 1; min-width: 0; }
.img-ocr-no { font-size: 12px; color: #8B5CF6; font-weight: 600; margin-bottom: 6px; }
.img-ocr-content { font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }

.d-info { margin-top: 4px; }
.d-link { color: #8B5CF6; text-decoration: none; word-break: break-all; }
.d-link:hover { text-decoration: underline; }
</style>
