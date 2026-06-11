<template>
  <el-dialog
    :model-value="modelValue"
    title="价格记录详情"
    width="650px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="record" class="detail-container">
      <!-- 图片 -->
      <div class="image-section">
        <div class="section-label">
          <el-icon><PictureFilled /></el-icon>
          <span>物料图片</span>
          <span v-if="imageUrls.length > 1" style="font-size:12px;color:#94A3B8;font-weight:400;margin-left:6px;">共 {{ imageUrls.length }} 张</span>
        </div>
        <div v-if="imageUrls.length" style="display:flex;flex-wrap:wrap;gap:10px;">
          <el-image
            v-for="(url, i) in imageUrls"
            :key="i"
            :src="url"
            fit="cover"
            :preview-src-list="imageUrls"
            :initial-index="i"
            preview-teleported
            style="width:120px;height:120px;border-radius:8px;border:1px solid #EDE9FE;cursor:pointer;"
          />
        </div>
        <div v-else class="image-empty">
          <el-icon><Picture /></el-icon>
          <p>暂无物料图片</p>
          <span>后续可上传产品图片</span>
        </div>
      </div>

      <!-- 核心信息卡片 -->
      <div class="info-cards">
        <div class="info-card">
          <div class="info-label">单品</div>
          <div class="info-value">{{ record.product_name || '-' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">品类</div>
          <div class="info-value">{{ record.category || '-' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">IP</div>
          <div class="info-value">{{ record.ip || '-' }}</div>
        </div>
        <div class="info-card price-card">
          <div class="info-label">单价</div>
          <div class="info-value">
            <span v-if="record.unit_price" class="unit-price">¥{{ Number(record.unit_price).toFixed(2) }}</span>
            <span v-else class="no-data">-</span>
          </div>
        </div>
      </div>

      <!-- 详细字段：严格按 19 个 Excel 列 -->
      <div class="detail-fields">
        <div class="field-row">
          <span class="field-label">供应商</span>
          <span class="field-value">{{ record.supplier_name || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">项目</span>
          <span class="field-value">{{ record.project_name || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">打样(天)</span>
          <span class="field-value">{{ record.sample_days ?? '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">大货(天)</span>
          <span class="field-value">{{ record.mass_production_days ?? '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">款式</span>
          <span class="field-value">{{ record.style_count ?? '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">单款数量</span>
          <span class="field-value">{{ record.single_quantity?.toLocaleString() || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">总数量</span>
          <span class="field-value">{{ record.total_quantity?.toLocaleString() || '-' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">总价</span>
          <span class="field-value total-amount" v-if="record.total_price">¥{{ Number(record.total_price).toFixed(2) }}</span>
          <span class="field-value" v-else>-</span>
        </div>
        <div class="field-row" v-if="record.production_info">
          <span class="field-label">生产信息</span>
          <span class="field-value">{{ record.production_info }}</span>
        </div>
      </div>

      <!-- 费用明细 -->
      <div class="fee-section" v-if="record.design_fee || record.sample_fee || record.other_fee">
        <div class="section-label">
          <el-icon><Money /></el-icon>
          <span>费用明细</span>
        </div>
        <div class="fee-items">
          <div class="fee-item" v-if="record.design_fee">
            <span>设计费</span>
            <span class="fee-amount">¥{{ Number(record.design_fee).toFixed(2) }}</span>
          </div>
          <div class="fee-item" v-if="record.sample_fee">
            <span>打样费</span>
            <span class="fee-amount">¥{{ Number(record.sample_fee).toFixed(2) }}</span>
          </div>
          <div class="fee-item" v-if="record.other_fee">
            <span>其他费用</span>
            <span class="fee-amount">¥{{ Number(record.other_fee).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div class="remark-section" v-if="record.remark1">
        <div class="section-label"><el-icon><Document /></el-icon><span>备注1</span></div>
        <p class="remark-content">{{ record.remark1 }}</p>
      </div>
      <div class="remark-section" v-if="record.remark2">
        <div class="section-label"><el-icon><Document /></el-icon><span>备注2</span></div>
        <p class="remark-content">{{ record.remark2 }}</p>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { PictureFilled, Picture, Money, Document } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  record: { type: Object, default: null }
})

defineEmits(['update:modelValue'])

const imageUrls = computed(() => {
  const img = props.record?.image
  if (!img || img === 'image.png') return []
  return String(img).split(',').map(f => f.trim()).filter(Boolean)
    .map(f => f.startsWith('http') ? f : `/uploads/${f}`)
})
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
.image-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 32px 0; border: 1px dashed #dcdfe6; border-radius: 10px;
  background: #fafafa; color: #c0c4cc; gap: 8px;
}
.image-empty .el-icon { font-size: 40px; }
.image-empty p { margin: 0; font-size: 14px; color: #909399; }
.image-empty span { font-size: 12px; color: #c0c4cc; }

.info-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;
}
.info-card {
  background: #fafafa; border-radius: 12px; padding: 14px 16px;
  border: 1px solid #f0f0f0;
}
.info-label { font-size: 12px; color: #909399; margin-bottom: 8px; font-weight: 500; }
.info-value { font-size: 14px; font-weight: 600; color: #303133; word-break: break-all; }
.unit-price { color: var(--accent); font-size: 20px; font-weight: 700; }
.no-data { color: #c0c4cc; font-weight: 400; font-size: 14px; }

.detail-fields {
  background: #fafafa; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;
}
.field-row {
  display: flex; align-items: center; padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.field-row:last-child { border-bottom: none; }
.field-label { width: 80px; flex-shrink: 0; font-size: 13px; color: #909399; }
.field-value { flex: 1; font-size: 14px; color: #303133; word-break: break-all; }
.total-amount { color: #7C3AED; font-weight: 600; }

.fee-section { margin-bottom: 16px; }
.fee-items { display: flex; gap: 12px; flex-wrap: wrap; }
.fee-item {
  flex: 1; min-width: 120px; display: flex; justify-content: space-between;
  align-items: center; padding: 12px 16px; background: #fafafa;
  border-radius: 10px; font-size: 13px; color: #606266;
}
.fee-amount { font-weight: 600; color: #303133; }

.remark-section { margin-bottom: 4px; }
.remark-content {
  margin: 0; font-size: 13px; color: #606266; line-height: 1.7;
  padding: 12px 16px; background: #fafafa; border-radius: 10px; white-space: pre-wrap;
}

@media (max-width: 640px) {
  .info-cards { grid-template-columns: repeat(2, 1fr); }
}
</style>