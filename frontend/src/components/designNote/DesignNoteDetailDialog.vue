<template>
  <el-dialog :model-value="modelValue" title="注意事项详情" width="600px" destroy-on-close @update:model-value="$emit('update:modelValue',$event)">
    <div v-if="record" class="detail-container">
      <div class="info-cards">
        <div class="info-card"><div class="info-label">标题</div><div class="info-value">{{ record.title||'-' }}</div></div>
        <div class="info-card"><div class="info-label">严重程度</div><div class="info-value">
          <el-tag v-if="record.severity==='fatal'" type="danger" effect="dark" size="small">致命坑</el-tag>
          <el-tag v-else-if="record.severity==='important'" type="warning" size="small">重要</el-tag>
          <el-tag v-else-if="record.severity==='suggestion'" type="info" size="small">建议</el-tag>
          <span v-else>-</span>
        </div></div>
        <div class="info-card"><div class="info-label">类型</div><div class="info-value"><el-tag size="small" :type="record.note_type==='design'?'warning':'primary'">{{ record.note_type==='design'?'设计注意':'生产注意' }}</el-tag></div></div>
        <div class="info-card"><div class="info-label">适用阶段</div><div class="info-value">
          <el-tag v-for="s in stageLabels(record.stage)" :key="s" size="small" effect="plain" style="margin:1px;">{{ s }}</el-tag>
          <span v-if="!record.stage">-</span>
        </div></div>
        <div class="info-card"><div class="info-label">品类</div><div class="info-value">{{ record.category||'-' }}</div></div>
        <div class="info-card"><div class="info-label">工艺</div><div class="info-value">{{ record.craft||'-' }}</div></div>
        <div class="info-card"><div class="info-label">IP</div><div class="info-value">{{ record.ip||'-' }}</div></div>
        <div class="info-card"><div class="info-label">关联项目</div><div class="info-value">{{ record.project_name||'-' }}</div></div>
      </div>
      <div class="detail-fields">
        <div class="field-row"><span class="field-label">问题描述</span><span class="field-value pre-wrap">{{ record.content||'-' }}</span></div>
        <div class="field-row" v-if="record.correct_practice"><span class="field-label">正确做法</span><span class="field-value pre-wrap">{{ record.correct_practice }}</span></div>
        <div class="field-row" v-if="record.remark"><span class="field-label">备注</span><span class="field-value">{{ record.remark }}</span></div>
      </div>
      <!-- 图片区域 -->
      <div class="image-section" v-if="imageList.length">
        <div class="section-label"><el-icon><PictureFilled /></el-icon><span>配图</span></div>
        <div class="image-grid">
          <el-image v-for="(img,i) in imageList" :key="i" :src="img" fit="cover" :preview-src-list="imageList" :initial-index="i" preview-teleported hide-on-click-modal class="case-image" />
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
const STAGE_LABELS = { design: '设计', sample: '打样', mass: '大货', package: '包装' }
function stageLabels(stage) {
  if (!stage) return []
  return String(stage).split(',').map(s => s.trim()).filter(Boolean).map(s => STAGE_LABELS[s] || s)
}
// images 存逗号分隔本地文件名；兼容历史 JSON/URL 数据
const imageList = computed(() => {
  if (!props.record?.images) return []
  const raw = props.record.images
  let arr = []
  try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; if (Array.isArray(p)) arr = p; else arr = String(raw).split(',').map(s=>s.trim()).filter(Boolean) }
  catch { arr = String(raw).split(',').map(s=>s.trim()).filter(Boolean) }
  return arr.map(s => s.startsWith('http') || s.startsWith('/uploads') ? s : `/uploads/${s}`)
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