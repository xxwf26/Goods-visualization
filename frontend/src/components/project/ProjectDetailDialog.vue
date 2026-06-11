<template>
  <el-dialog
    :model-value="modelValue"
    title="项目详情"
    width="650px"
    destroy-on-close
    class="project-detail-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="project" class="detail-container">
      <!-- 物料图片（报价单） -->
      <div class="image-section" v-if="project.quotation_file && project.quotation_file !== 'image.png'">
        <div class="section-label">
          <el-icon><PictureFilled /></el-icon>
          <span>报价单/图片</span>
        </div>
        <el-image
          :src="`/uploads/${project.quotation_file}`"
          fit="contain"
          :preview-src-list="[`/uploads/${project.quotation_file}`]"
          preview-teleported
          class="detail-image"
        />
      </div>

      <!-- 核心信息卡片 -->
      <div class="info-cards">
        <div class="info-card">
          <div class="info-label">文本</div>
          <div class="info-value">{{ project.product_name || '-' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">IP</div>
          <div class="info-value">{{ project.ip_tag_ids || '-' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">年份</div>
          <div class="info-value">{{ project.project_year || '-' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">项目</div>
          <div class="info-value">{{ project.project_name || '-' }}</div>
        </div>
      </div>

      <!-- 详细字段：严格按 18 个 Excel 列 -->
      <div class="detail-fields">
        <div class="field-row">
          <span class="field-label">相关请购需求单</span>
          <span class="field-value">{{ project.purchase_order_no || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">项目总价</span>
          <span class="field-value total-amount" v-if="project.total_amount">¥{{ Number(project.total_amount).toFixed(2) }}</span>
          <span class="field-value" v-else>-</span>
        </div>
        <div class="field-row">
          <span class="field-label">投入人天</span>
          <span class="field-value">{{ project.person_days ?? '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">需求人</span>
          <span class="field-value">{{ project.requester || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">区服</span>
          <span class="field-value">{{ project.region || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">供应商</span>
          <span class="field-value">{{ project.supplier_name || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">开始日期</span>
          <span class="field-value">{{ formatDate(project.project_start_date) }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">结束日期</span>
          <span class="field-value">{{ formatDate(project.project_end_date) }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">主要负责人</span>
          <span class="field-value">{{ project.project_leader || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">报价单</span>
          <span class="field-value">{{ project.quotation_file || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">需求种类</span>
          <span class="field-value">{{ project.requirement_type || '-' }}</span>
        </div>
        <div class="field-row" v-if="project.remark">
          <span class="field-label">备注</span>
          <span class="field-value">{{ project.remark }}</span>
        </div>
        <div class="field-row" v-if="project.file_storage">
          <span class="field-label">文件存储地址</span>
          <span class="field-value">{{ project.file_storage }}</span>
        </div>
        <div class="field-row" v-if="project.parent_record">
          <span class="field-label">父记录</span>
          <span class="field-value">{{ project.parent_record }}</span>
        </div>
      </div>

      <!-- 效果图 -->
      <div v-if="imageUrls.length" class="image-section" style="margin-top:16px;">
        <div class="section-label">
          <el-icon><PictureFilled /></el-icon>
          <span>效果图</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <el-image
            v-for="(img, i) in imageUrls"
            :key="i"
            :src="img"
            fit="cover"
            :preview-src-list="imageUrls"
            :initial-index="i"
            preview-teleported
            style="width:100px;height:100px;border-radius:8px;border:1px solid #ebeef5;cursor:pointer;"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { PictureFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  project: { type: Object, default: null }
})

defineEmits(['update:modelValue'])

const imageUrls = computed(() => {
  if (!props.project?.effect_images) return []
  return String(props.project.effect_images).split(',').map(f => f.trim()).filter(Boolean)
    .map(f => f.startsWith('http') ? f : `/uploads/${f}`)
})

function formatDate(date) {
  if (!date) return '-'
  return String(date).split('T')[0]
}
</script>

<style scoped>
.detail-container { padding: 0 4px; }

.image-section { margin-bottom: 20px; }
.section-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 12px;
}
.detail-image {
  width: 100%; max-height: 360px; border-radius: 10px;
  background: #fafafa; border: 1px solid #ebeef5;
}

.info-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;
}
.info-card {
  background: #fafafa; border-radius: 12px; padding: 14px 16px;
  border: 1px solid #f0f0f0;
}
.info-label { font-size: 12px; color: #909399; margin-bottom: 8px; font-weight: 500; }
.info-value { font-size: 14px; font-weight: 600; color: #303133; word-break: break-all; }

.detail-fields {
  background: #fafafa; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;
}
.field-row {
  display: flex; align-items: center; padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.field-row:last-child { border-bottom: none; }
.field-label { width: 100px; flex-shrink: 0; font-size: 13px; color: #909399; }
.field-value { flex: 1; font-size: 14px; color: #303133; word-break: break-all; }
.total-amount { color: #7C3AED; font-weight: 600; }

@media (max-width: 640px) {
  .info-cards { grid-template-columns: repeat(2, 1fr); }
}
</style>