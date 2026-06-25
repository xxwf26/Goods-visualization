<template>
  <!-- 搜索结果详情预览宿主：项目案例 / 价格记录，按 id 取完整详情后复用现有弹窗 -->
  <ProjectDetailDialog v-model="projVisible" :project="proj" />
  <PriceRecordDetailDialog v-model="priceVisible" :record="rec" />
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ProjectDetailDialog from '@/components/project/ProjectDetailDialog.vue'
import PriceRecordDetailDialog from '@/components/priceRecord/PriceRecordDetailDialog.vue'
import { getProjectDetail } from '@/api/projects'
import { getPriceRecordDetail } from '@/api/priceRecords'

const projVisible = ref(false)
const priceVisible = ref(false)
const proj = ref(null)
const rec = ref(null)
const loadingDetail = ref(false)

// 由搜索宿主调用：根据结果类型 + id 取完整详情并弹窗
async function open(type, id) {
  if (loadingDetail.value) return
  loadingDetail.value = true
  try {
    if (type === 'project') {
      const res = await getProjectDetail(id)
      proj.value = res.data
      projVisible.value = true
    } else if (type === 'price') {
      const res = await getPriceRecordDetail(id)
      rec.value = res.data
      priceVisible.value = true
    }
  } catch (e) {
    ElMessage.error('加载详情失败，请稍后重试')
  } finally {
    loadingDetail.value = false
  }
}

defineExpose({ open })
</script>
