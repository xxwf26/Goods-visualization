<template>
  <div class="import-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        <h2>批量导入</h2>
        <span class="page-desc">从飞书多维表格导出的 Excel 文件批量导入数据</span>
      </div>
    </div>

    <!-- 导入步骤 -->
    <el-steps :active="currentStep" finish-status="success" class="import-steps">
      <el-step title="上传文件" />
      <el-step title="字段映射" />
      <el-step title="导入结果" />
    </el-steps>

    <!-- 步骤1: 上传文件 -->
    <el-card v-show="currentStep === 0" class="step-card">
      <template #header>
        <span>上传 Excel 文件</span>
      </template>

      <el-form label-width="120px">
        <el-form-item label="数据类型">
          <el-radio-group v-model="importType">
            <el-radio label="project">历史项目</el-radio>
            <el-radio label="supplier">供应商</el-radio>
            <el-radio label="price">价格数据</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="去重模式">
          <el-radio-group v-model="duplicateMode">
            <el-radio label="skip">跳过已存在</el-radio>
            <el-radio label="update">更新已存在</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="上传文件">
          <el-upload
            ref="uploadRef"
            class="upload-area"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
          >
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div class="upload-text">
              <span>将文件拖到此处，或<em>点击上传</em></span>
              <span class="upload-tip">支持 .xlsx, .xls 格式</span>
            </div>
          </el-upload>
        </el-form-item>

        <el-form-item label="下载模板">
          <el-button type="primary" plain @click="downloadTemplate">
            <el-icon><Download /></el-icon>
            下载 {{ typeName }}导入模板
          </el-button>
        </el-form-item>
      </el-form>

      <div class="step-actions">
        <el-button type="primary" :disabled="!selectedFile" @click="handleParse">
          解析文件
        </el-button>
      </div>
    </el-card>

    <!-- 步骤2: 字段映射 -->
    <el-card v-show="currentStep === 1" class="step-card">
      <template #header>
        <span>字段映射预览</span>
      </template>

      <div class="mapping-info">
        <el-alert
          :title="`共 ${previewData.totalCount} 条数据，系统将自动匹配字段`"
          type="info"
          :closable="false"
        />
      </div>

      <!-- 原始数据预览 -->
      <div class="preview-section">
        <div class="preview-title">原始数据预览（仅显示前10条）</div>
        <el-table :data="previewData.preview" stripe border max-height="300">
          <el-table-column
            v-for="col in previewData.originalHeaders"
            :key="col"
            :prop="col"
            :label="col"
            min-width="120"
            show-overflow-tooltip
          />
        </el-table>
      </div>

      <!-- 字段映射规则 -->
      <div class="mapping-rules">
        <div class="preview-title">字段映射规则</div>
        <el-table :data="mappingRules" stripe size="small">
          <el-table-column prop="excelField" label="Excel表头" width="150" />
          <el-table-column prop="arrow" label="" width="40" align="center">
            <template #default>
              <el-icon><Right /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="dbField" label="系统字段" width="150" />
          <el-table-column prop="sample" label="示例值" show-overflow-tooltip />
        </el-table>
      </div>

      <div class="step-actions">
        <el-button @click="currentStep = 0">上一步</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">
          开始导入
        </el-button>
      </div>
    </el-card>

    <!-- 步骤3: 导入结果 -->
    <el-card v-show="currentStep === 2" class="step-card">
      <template #header>
        <span>导入结果</span>
      </template>

      <!-- 统计信息 -->
      <el-row :gutter="20" class="result-stats">
        <el-col :span="6">
          <div class="stat-item success">
            <div class="stat-value">{{ importResult.success }}</div>
            <div class="stat-label">成功</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item danger">
            <div class="stat-value">{{ importResult.failed }}</div>
            <div class="stat-label">失败</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item warning">
            <div class="stat-value">{{ importResult.skipped }}</div>
            <div class="stat-label">跳过</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item info">
            <div class="stat-value">{{ importResult.success + importResult.failed + importResult.skipped }}</div>
            <div class="stat-label">总计</div>
          </div>
        </el-col>
      </el-row>

      <!-- 错误详情 -->
      <div v-if="importResult.errors?.length" class="error-section">
        <el-divider content-position="left">错误详情</el-divider>
        <el-alert
          v-for="(error, index) in importResult.errors.slice(0, 20)"
          :key="index"
          :title="error"
          type="error"
          :closable="true"
          show-icon
          class="error-item"
        />
        <div v-if="importResult.errors.length > 20" class="more-errors">
          还有 {{ importResult.errors.length - 20 }} 条错误未显示...
        </div>
      </div>

      <div class="step-actions">
        <el-button @click="handleReset">继续导入</el-button>
        <el-button type="primary" @click="goToList">查看 {{ typeName }}列表</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { UploadFilled, Download, Right } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { request } from '@/api'

const router = useRouter()
const userStore = useUserStore()

// 导入配置
const importType = ref('project')
const duplicateMode = ref('skip')
const selectedFile = ref(null)
const fileList = ref([])

// 步骤控制
const currentStep = ref(0)
const importing = ref(false)

// 预览数据
const previewData = reactive({
  totalCount: 0,
  originalHeaders: [],
  preview: [],
  mappedData: []
})

// 导入结果
const importResult = reactive({
  success: 0,
  failed: 0,
  skipped: 0,
  errors: []
})

// 类型名称
const typeName = computed(() => {
  const names = {
    project: '历史项目',
    supplier: '供应商',
    price: '价格数据'
  }
  return names[importType.value] || importType.value
})

// 字段映射规则
const mappingRules = computed(() => {
  const rules = {
    project: [
      { excelField: '项目名称', dbField: 'project_name', sample: '原神角色立牌' },
      { excelField: '项目编号', dbField: 'project_code', sample: 'PRJ-001' },
      { excelField: '产品名称', dbField: 'product_name', sample: '立牌-可莉' },
      { excelField: '品类', dbField: 'category', sample: '立牌' },
      { excelField: '工艺', dbField: 'craft', sample: '喷漆' },
      { excelField: '数量', dbField: 'quantity', sample: '500' },
      { excelField: '单价', dbField: 'unit_price', sample: '25.00' },
      { excelField: '供应商', dbField: 'supplier_name', sample: '萌え物语' }
    ],
    supplier: [
      { excelField: '供应商名称', dbField: 'supplier_name', sample: '萌え物语旗舰店' },
      { excelField: '联系人', dbField: 'contact_person', sample: '张经理' },
      { excelField: '联系电话', dbField: 'contact_phone', sample: '13800138000' },
      { excelField: '合作状态', dbField: 'cooperation_status', sample: '合作中' },
      { excelField: '评级', dbField: 'rating', sample: '4.5' }
    ],
    price: [
      { excelField: '供应商', dbField: 'supplier_name', sample: '萌え物语' },
      { excelField: '品类', dbField: 'category', sample: '立牌' },
      { excelField: '工艺', dbField: 'craft', sample: '喷漆' },
      { excelField: '数量', dbField: 'quantity', sample: '500' },
      { excelField: '单价', dbField: 'unit_price', sample: '25.00' },
      { excelField: '报价日期', dbField: 'quote_date', sample: '2026-06-01' }
    ]
  }
  return rules[importType.value] || []
})

// 文件选择
function handleFileChange(file, files) {
  selectedFile.value = file.raw
  fileList.value = files
}

// 文件移除
function handleFileRemove() {
  selectedFile.value = null
  fileList.value = []
}

// 解析文件
async function handleParse() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const result = await request.post('/import/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (result.code === 200) {
      // 解析成功，进入字段映射步骤
      const sheets = Object.keys(result.data.preview)
      if (sheets.length > 0) {
        const sheetData = result.data.preview[sheets[0]]
        previewData.originalHeaders = sheetData.headers || []
        previewData.preview = sheetData.rows?.slice(0, 10) || []
        previewData.totalCount = sheetData.count || 0
        previewData.mappedData = sheetData.rows || []
      }

      currentStep.value = 1
      ElMessage.success('文件解析成功')
    } else {
      ElMessage.error(result.message || '解析失败')
    }
  } catch (error) {
    console.error('解析失败:', error)
    ElMessage.error('文件解析失败')
  }
}

// 开始导入
async function handleImport() {
  importing.value = true

  try {
    const endpoint = {
      project: '/import/projects',
      supplier: '/import/suppliers',
      price: '/import/prices'
    }[importType.value]

    const result = await request.post(endpoint, {
      projects: previewData.mappedData,
      options: {
        duplicateMode: duplicateMode.value
      }
    })

    if (result.code === 200) {
      importResult.success = result.data.success
      importResult.failed = result.data.failed
      importResult.skipped = result.data.skipped
      importResult.errors = result.data.errors || []
      currentStep.value = 2
      ElMessage.success('导入完成')
    } else {
      ElMessage.error(result.message || '导入失败')
    }
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败，请重试')
  } finally {
    importing.value = false
  }
}

// 下载模板
async function downloadTemplate() {
  try {
    const result = await request.get(`/import/template/${importType.value}`, {
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([result], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${typeName.value}_导入模板.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('模板下载失败')
  }
}

// 重置
function handleReset() {
  currentStep.value = 0
  selectedFile.value = null
  fileList.value = []
  previewData.totalCount = 0
  previewData.originalHeaders = []
  previewData.preview = []
  previewData.mappedData = []
  importResult.success = 0
  importResult.failed = 0
  importResult.skipped = 0
  importResult.errors = []
}

// 跳转列表
function goToList() {
  const routes = {
    project: '/projects',
    supplier: '/suppliers',
    price: '/price-query'
  }
  router.push(routes[importType.value] || '/')
}
</script>

<style scoped>
.import-container {
  padding: 20px;
  background: #FFF0F3;
  min-height: calc(100vh - 60px);
}

.page-header { margin-bottom: 20px; }
.page-title h2 { margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #4A3340; }
.page-desc { color: #A0808C; font-size: 14px; }
.import-steps { margin: 30px auto; max-width: 600px; }
.step-card { max-width: 900px; margin: 0 auto; border-radius: 16px !important; }
.upload-area { width: 100%; }
.upload-icon { font-size: 67px; color: #FF6B9D; margin-bottom: 16px; }
.upload-text { display: flex; flex-direction: column; align-items: center; }
.upload-text em { color: #FF6B9D; font-style: normal; }
.upload-tip { font-size: 12px; color: #A0808C; margin-top: 8px; }
.step-actions { display: flex; justify-content: center; gap: 16px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #FFD4E0; }
.mapping-info { margin-bottom: 16px; }
.preview-section, .mapping-rules { margin-bottom: 20px; }
.preview-title { font-size: 14px; font-weight: 600; color: #4A3340; margin-bottom: 12px; }
.result-stats { margin-bottom: 24px; }

.stat-item { text-align: center; padding: 20px; border-radius: 14px; }
.stat-item.success { background: #F0FFF8; }
.stat-item.danger { background: #FFF0F3; }
.stat-item.warning { background: #FFFCF0; }
.stat-item.info { background: #FFF5F8; }
.stat-value { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
.stat-item.success .stat-value { color: #7ECFC0; }
.stat-item.danger .stat-value { color: #EF476F; }
.stat-item.warning .stat-value { color: #FF8DB5; }
.stat-item.info .stat-value { color: #A0808C; }
.stat-label { font-size: 14px; color: #4A3340; }
.error-section { margin-top: 20px; }
.error-item { margin-bottom: 8px; }
.more-errors { text-align: center; color: #A0808C; font-size: 13px; padding: 12px; }
</style>
