<template>
  <div class="settings-container">
    <div class="page-header">
      <div class="page-title">
        <h2>AI 配置</h2>
        <span class="page-desc">配置 AI 工作流推荐的系统提示词和访客搜索热门词</span>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
    </div>

    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <el-icon><MagicStick /></el-icon>
          <span>AI 系统提示词（System Prompt）</span>
        </div>
      </template>
      <el-input
        v-model="form.ai_system_prompt"
        type="textarea"
        :rows="8"
        placeholder="定义 AI 的角色、专业领域、回答风格等。这段提示词会作为工作流推荐的系统前缀发送给 AI。"
        maxlength="2000"
        show-word-limit
      />
      <div class="tips">
        <p>💡 提示：好的系统提示词应包含：</p>
        <ul>
          <li>AI 的角色定位（如：你是周边物料采购顾问）</li>
          <li>专业领域（包装印刷、亚克力、纸品、徽章等）</li>
          <li>回答风格（专业/简洁/实用/可执行）</li>
          <li>特殊要求（如：优先推荐系统内已有的供应商）</li>
        </ul>
      </div>
    </el-card>

    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <el-icon><Search /></el-icon>
          <span>访客搜索热门词</span>
        </div>
      </template>
      <el-input
        v-model="form.visitor_hot_words"
        placeholder="逗号分隔，如：拍立得,烫金,抱枕,立牌"
      />
      <div class="tips">
        <p>💡 访客搜索页底部会显示这些热门词，点击即搜。逗号分隔。</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { MagicStick, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const saving = ref(false)
const form = reactive({
  ai_system_prompt: '',
  visitor_hot_words: ''
})

async function loadSettings() {
  loading.value = true
  try {
    const res = await request.get('/settings')
    if (res.code === 200 && res.data) {
      form.ai_system_prompt = res.data.ai_system_prompt || ''
      form.visitor_hot_words = res.data.visitor_hot_words || ''
    }
  } catch (e) {
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const res = await request.put('/settings', { settings: { ...form } })
    if (res.code === 200) {
      ElMessage.success('配置已保存，即时生效')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => loadSettings())
</script>

<style scoped>
.settings-container { padding: 20px; background: var(--bg-primary, #FDFBFF); min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title h2 { margin: 0; font-size: 22px; font-weight: 700; color: #1E293B; }
.page-desc { color: #94A3B8; font-size: 14px; }
.setting-card { margin-bottom: 16px; border-radius: 14px !important; }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #1E293B; }
.tips { margin-top: 12px; padding: 12px 16px; background: #F5F3FF; border-radius: 10px; font-size: 13px; color: #64748B; line-height: 1.7; }
.tips p { margin: 0 0 6px; }
.tips ul { margin: 0; padding-left: 20px; }
.tips li { margin-bottom: 2px; }
</style>
