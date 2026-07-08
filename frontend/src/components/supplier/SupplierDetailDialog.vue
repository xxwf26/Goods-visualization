<template>
  <el-drawer
    :model-value="modelValue"
    title="供应商详情"
    direction="rtl"
    size="600px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="supplier" class="supplier-detail">
      <!-- 基础信息 -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span>基础信息</span>
            <el-button
              v-permission="'supplier:edit'"
              type="primary"
              size="small"
              @click="$emit('edit', supplier)"
            >
              编辑
            </el-button>
          </div>
        </template>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="供应商名称" :span="2">
            <span class="name-text">{{ supplier.supplier_name || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="主观评分">
            <span class="score-badge">{{ supplier.rating || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="合作状态">
            <el-tag :type="getStatusType(supplier.cooperation_status)" size="small">
              {{ getStatusText(supplier.cooperation_status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="合同类型">
            {{ getContractText(supplier.contract_type) }}
          </el-descriptions-item>
          <el-descriptions-item label="风险等级" v-if="supplier.riskLevel">
            <el-tag :type="getRiskType(supplier.riskLevel)" size="small">
              {{ getRiskText(supplier.riskLevel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="合作项目数">
            <span class="count-value">{{ supplier.cooperation_project_count || 0 }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="合作总金额">
            <span v-if="supplier.cooperation_total_amount" class="amount-value">
              ¥{{ Number(supplier.cooperation_total_amount).toLocaleString() }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="优势品类" :span="2" v-if="supplier.advantage_categories || supplier.category_names">
            <div class="category-tags">
              <el-tag
                v-for="(cat, i) in advantageCategoryList"
                :key="i"
                size="small"
                effect="plain"
              >{{ cat }}</el-tag>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 联系方式 -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <span>联系方式</span>
        </template>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="联系人">
            {{ supplier.contact_person || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ supplier.contact_phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="电子邮箱">
            {{ supplier.contact_email || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="公司地址">
            {{ supplier.address || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 风险备注 -->
      <el-card v-if="supplier.risk_notes || supplier.remark" class="detail-section" shadow="never">
        <template #header>
          <span>风险备注</span>
        </template>
        <div class="remark-content">
          {{ supplier.risk_notes || supplier.remark }}
        </div>
      </el-card>

      <!-- 案例图片 -->
      <el-card v-if="caseImageList.length > 0" class="detail-section" shadow="never">
        <template #header>
          <span>案例图片</span>
        </template>
        <div class="images-grid">
          <el-image
            v-for="(img, index) in caseImageList"
            :key="index"
            :src="img"
            fit="cover"
            class="case-image"
            style="cursor:zoom-in"
            @click="openViewer(caseImageList, index)"
          />
        </div>
      </el-card>

      <!-- 案例文件 -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <span>案例文件</span>
        </template>
        <div v-if="caseFiles.length > 0" class="case-files-list">
          <div
            v-for="(file, index) in caseFiles"
            :key="index"
            class="case-file-item"
          >
            <el-icon class="pdf-icon"><Document /></el-icon>
            <span class="file-name">{{ getFileName(file) }}</span>
            <el-button
              link
              type="primary"
              size="small"
              @click="downloadFile(file)"
            >
              <el-icon><Download /></el-icon> 下载
            </el-button>
          </div>
        </div>
        <div v-else class="empty-hint">
          <span>暂无案例文件</span>
        </div>
      </el-card>
    </div>

    <!-- 大图查看器：自控显隐（不 teleport），关抽屉时随组件一起卸载，不会残留 -->
    <ImagePreview v-model="viewerVisible" :images="viewerImages" :initial-index="viewerIndex" />
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Document, Download } from '@element-plus/icons-vue'
import ImagePreview from '@/components/common/ImagePreview.vue'

const props = defineProps({
  modelValue: Boolean,
  supplier: {
    type: Object,
    default: null
  }
})

defineEmits(['update:modelValue', 'edit'])

// 大图查看器状态：点缩略图打开，关抽屉时一并关闭
const viewerVisible = ref(false)
const viewerImages = ref([])
const viewerIndex = ref(0)
function openViewer(list, i) {
  viewerImages.value = list
  viewerIndex.value = i
  viewerVisible.value = true
}
watch(() => props.modelValue, v => { if (!v) viewerVisible.value = false })

// 解析案例图片
const caseImageList = computed(() => {
  if (!props.supplier) return []
  const val = props.supplier.case_images
  if (!val) return []
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

// 解析优势品类列表
const advantageCategoryList = computed(() => {
  if (!props.supplier) return []
  const val = props.supplier.advantage_categories || props.supplier.category_names
  if (!val) return []
  return String(val).split(',').map(s => s.trim()).filter(Boolean)
})

// 解析案例文件
const caseFiles = computed(() => {
  if (!props.supplier?.case_files) return []
  try {
    const parsed = typeof props.supplier.case_files === 'string'
      ? JSON.parse(props.supplier.case_files)
      : props.supplier.case_files
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

function getFileName(fileUrl) {
  if (!fileUrl) return 'unknown.pdf'
  const parts = fileUrl.split('/')
  return decodeURIComponent(parts[parts.length - 1])
}

function downloadFile(fileUrl) {
  window.open(fileUrl, '_blank')
}

function getStatusType(status) {
  return { active: 'success', paused: 'warning', terminated: 'danger', potential: 'info' }[status] || 'info'
}

function getStatusText(status) {
  return { active: '合作中', paused: '暂停', terminated: '已终止', potential: '潜在' }[status] || status || '-'
}

function getRiskType(risk) {
  return { low: 'success', medium: 'warning', high: 'danger' }[risk] || 'info'
}

function getRiskText(risk) {
  return { low: '低风险', medium: '中风险', high: '高风险' }[risk] || risk
}

function getContractText(type) {
  return { framework: '框架合同', project: '单项目合同', longterm: '长期合作', third_party: '三方合同', none: '无合同' }[type] || type || '-'
}
</script>

<style scoped>
.supplier-detail {
  padding: 0 16px;
}

.detail-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.score-badge {
  color: #e6a23c;
  font-weight: 700;
  font-size: 16px;
}

.count-value {
  color: #409eff;
  font-weight: 500;
}

.amount-value {
  color: #f56c6c;
  font-weight: 500;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.remark-content {
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.case-image {
  width: 100%;
  height: 100px;
  border-radius: 4px;
  cursor: pointer;
}

.case-files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.case-file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.case-file-item:hover {
  background: #f0f0f0;
  border-color: #dcdfe6;
}

.pdf-icon {
  font-size: 20px;
  color: #e84878;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  padding: 20px;
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
}
</style>