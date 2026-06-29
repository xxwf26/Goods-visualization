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
import { computed } from 'vue'
import { Link, User, Document, Star } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: Boolean,
  inspiration: { type: Object, default: null }
})
defineEmits(['update:modelValue'])

const coverImages = computed(() => {
  const list = []
  if (props.inspiration?.cover_image) list.push(props.inspiration.cover_image)
  return list
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

.d-info { margin-top: 4px; }
.d-link { color: #8B5CF6; text-decoration: none; word-break: break-all; }
.d-link:hover { text-decoration: underline; }
</style>
