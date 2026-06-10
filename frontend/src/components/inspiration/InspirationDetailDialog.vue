<template>
  <el-dialog
    :model-value="modelValue"
    title="灵感详情"
    width="700px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="inspiration" class="detail-container">
      <!-- 截图 -->
      <div class="detail-screenshot" v-if="inspiration.screenshot">
        <el-image
          :src="inspiration.screenshot"
          fit="contain"
          :preview-src-list="[inspiration.screenshot]"
          preview-teleported
        />
      </div>

      <!-- 基本信息 -->
      <el-descriptions :column="2" border class="detail-info">
        <el-descriptions-item label="标题" :span="2">
          {{ inspiration.title }}
        </el-descriptions-item>
        <el-descriptions-item label="来源平台">
          <el-tag size="small">{{ inspiration.platform }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="收集人">
          {{ inspiration.creator }}
        </el-descriptions-item>
        <el-descriptions-item label="品类">
          {{ inspiration.category || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="工艺">
          {{ inspiration.craft || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="IP">
          {{ inspiration.ip || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="适用场景">
          {{ inspiration.scene || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="采用状态">
          <el-tag :type="inspiration.adopted ? 'success' : 'info'" size="small">
            {{ inspiration.adopted ? '已采用' : '未采用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="收藏时间" :span="2">
          {{ inspiration.collectTime }}
        </el-descriptions-item>
        <el-descriptions-item label="原始链接" :span="2">
          <a
            v-if="inspiration.originalUrl"
            :href="inspiration.originalUrl"
            target="_blank"
            class="original-link"
          >
            {{ inspiration.originalUrl }}
            <el-icon><Link /></el-icon>
          </a>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <div class="tags-list">
            <el-tag
              v-for="tag in inspiration.tags"
              :key="tag"
              size="small"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
            <span v-if="!inspiration.tags?.length">-</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="价值说明" :span="2">
          <div class="value-content">
            {{ inspiration.valueDescription || '暂无说明' }}
          </div>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      <el-button
        v-if="inspiration?.originalUrl"
        type="primary"
        @click="jumpToOriginal"
      >
        跳转原始链接
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { Link } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: Boolean,
  inspiration: {
    type: Object,
    default: null
  }
})

defineEmits(['update:modelValue'])

function jumpToOriginal() {
  if (props.inspiration?.originalUrl) {
    window.open(props.inspiration.originalUrl, '_blank')
  } else {
    ElMessage.warning('暂无原始链接')
  }
}
</script>

<style scoped>
.detail-container {
  padding: 0 10px;
}

.detail-screenshot {
  width: 100%;
  max-height: 300px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-screenshot :deep(.el-image) {
  max-width: 100%;
  max-height: 300px;
}

.detail-info {
  margin-top: 10px;
}

.original-link {
  color: #409eff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  word-break: break-all;
}

.original-link:hover {
  text-decoration: underline;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.value-content {
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
