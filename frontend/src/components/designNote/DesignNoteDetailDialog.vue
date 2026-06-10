<template>
  <el-dialog :model-value="modelValue" title="注意事项详情" width="600px" destroy-on-close @update:model-value="$emit('update:modelValue',$event)">
    <div v-if="record" class="detail-container">
      <div class="info-cards">
        <div class="info-card"><div class="info-label">标题</div><div class="info-value">{{ record.title||'-' }}</div></div>
        <div class="info-card"><div class="info-label">类型</div><div class="info-value"><el-tag size="small" :type="record.note_type==='design'?'warning':'primary'">{{ record.note_type==='design'?'设计注意':'生产注意' }}</el-tag></div></div>
        <div class="info-card"><div class="info-label">品类</div><div class="info-value">{{ record.category||'-' }}</div></div>
        <div class="info-card"><div class="info-label">工艺</div><div class="info-value">{{ record.craft||'-' }}</div></div>
      </div>
      <div class="detail-fields">
        <div class="field-row"><span class="field-label">IP</span><span class="field-value">{{ record.ip||'-' }}</span></div>
        <div class="field-row"><span class="field-label">内容</span><span class="field-value pre-wrap">{{ record.content||'-' }}</span></div>
        <div class="field-row" v-if="record.remark"><span class="field-label">备注</span><span class="field-value">{{ record.remark }}</span></div>
      </div>
      <!-- 图片区域 -->
      <div class="image-section" v-if="imageList.length">
        <div class="section-label"><el-icon><PictureFilled /></el-icon><span>图片</span></div>
        <div class="image-grid">
          <el-image v-for="(img,i) in imageList" :key="i" :src="img" fit="cover" :preview-src-list="imageList" :initial-index="i" preview-teleported class="case-image" />
        </div>
      </div>
    </div>
    <template #footer><el-button @click="$emit('update:modelValue',false)">关闭</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { PictureFilled } from '@element-plus/icons-vue'
const props = defineProps({ modelValue:Boolean, record:{type:Object,default:null} })
defineEmits(['update:modelValue'])
const imageList = computed(() => {
  if (!props.record?.images) return []
  try { const p = typeof props.record.images==='string'?JSON.parse(props.record.images):props.record.images; return Array.isArray(p)?p:[] } catch { return [] }
})
</script>

<style scoped>
.detail-container { padding:0 4px; }
.info-cards { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
.info-card { background:#fafafa; border-radius:12px; padding:14px 16px; border:1px solid #f0f0f0; }
.info-label { font-size:12px; color:#909399; margin-bottom:8px; font-weight:500; }
.info-value { font-size:14px; font-weight:600; color:#303133; word-break:break-all; }
.detail-fields { background:#fafafa; border-radius:12px; padding:16px 20px; margin-bottom:16px; }
.field-row { display:flex; align-items:flex-start; padding:10px 0; border-bottom:1px solid #f0f0f0; }
.field-row:last-child { border-bottom:none; }
.field-label { width:60px; flex-shrink:0; font-size:13px; color:#909399; }
.field-value { flex:1; font-size:14px; color:#303133; }
.pre-wrap { white-space:pre-wrap; }
.image-section { margin-bottom:16px; }
.section-label { display:flex; align-items:center; gap:6px; font-size:14px; font-weight:600; color:#303133; margin-bottom:12px; }
.image-grid { display:flex; flex-wrap:wrap; gap:10px; }
.case-image { width:140px; height:140px; border-radius:10px; cursor:pointer; }
</style>