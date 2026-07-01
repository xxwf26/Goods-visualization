<template>
  <div class="homepage-search">
    <div class="search-box">
      <el-icon class="search-icon"><Search /></el-icon>
      <input
        v-model="keyword"
        class="search-input"
        placeholder="输入关键词，如「拍立得」「烫金」「抱枕」"
        @input="onInput"
        @keydown.enter="onEnter"
        @focus="showPanel = true"
      />
      <el-button v-if="keyword" class="clear-btn" link @click="clear"><el-icon><Close /></el-icon></el-button>
    </div>

    <!-- 维度入口面板 -->
    <div v-if="showPanel && keyword.trim()" class="dim-panel" @mousedown.prevent>
      <div class="dim-hint">「{{ keyword.trim() }}」相关内容，按维度查看：</div>
      <div class="dim-list">
        <div
          v-for="d in dimensions"
          :key="d.key"
          class="dim-item"
          :class="{ disabled: (countOf(d) === 0) }"
          @click="go(d)"
        >
          <span class="dim-label">{{ keyword.trim() }} {{ d.label }}</span>
          <span class="dim-count" v-if="countOf(d) > 0">{{ countOf(d) }} 条</span>
          <span class="dim-count zero" v-else>无</span>
          <el-icon class="dim-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Close, ArrowRight } from '@element-plus/icons-vue'
import request from '@/api/request'

const router = useRouter()
const keyword = ref('')
const showPanel = ref(false)
const result = ref({ groups: [] })
let timer = null

// 5 个维度入口（固定顺序）
const dimensions = [
  { key: 'inspiration', label: '工艺灵感', route: '/inspiration', extra: { inspiration_type: 'craft' }, useCraft: true },
  { key: 'designNote', label: '设计要求', route: '/design-notes' },
  { key: 'price', label: '历史价格', route: '/price-records' },
  { key: 'project', label: '历史项目', route: '/projects' },
  { key: 'supplier', label: '供应商', route: '/suppliers' }
]

function countOf(d) {
  const g = result.value.groups?.find(x => x.type === d.key)
  if (!g) return 0
  return d.useCraft ? (g.craftTotal ?? 0) : (g.total ?? 0)
}

function onInput() {
  showPanel.value = true
  clearTimeout(timer)
  const q = keyword.value.trim()
  if (!q) { result.value = { groups: [] }; return }
  timer = setTimeout(async () => {
    try {
      const res = await request.get('/search', { params: { q } })
      if (res.code === 200) result.value = res.data || { groups: [] }
    } catch { /* 忽略 */ }
  }, 400)
}

function onEnter() {
  // 回车直接跳到第一个有结果的维度
  const first = dimensions.find(d => countOf(d) > 0)
  if (first) go(first)
}

function go(d) {
  const q = keyword.value.trim()
  router.push({ path: d.route, query: { keyword: q, ...(d.extra || {}) } })
  showPanel.value = false
}

function clear() {
  keyword.value = ''
  result.value = { groups: [] }
  showPanel.value = false
}
</script>

<style scoped>
.homepage-search { position: relative; max-width: 640px; margin: 0 auto; }

.search-box {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border-radius: 28px; padding: 6px 10px 6px 20px;
  box-shadow: 0 8px 24px rgba(139,92,246,0.12);
  border: 2px solid #EDE9FE;
}
.search-icon { font-size: 20px; color: #8B5CF6; }
.search-input {
  flex: 1; border: none; outline: none; font-size: 16px; padding: 12px 0;
  background: transparent; color: #1E293B;
}
.search-input::placeholder { color: #94A3B8; }
.clear-btn { color: #94A3B8; }

.dim-panel {
  position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 50;
  background: #fff; border-radius: 16px; padding: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.12); border: 1px solid #EDE9FE;
}
.dim-hint { font-size: 12px; color: #94A3B8; padding: 4px 8px 10px; }

.dim-item {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-radius: 10px; cursor: pointer;
  transition: background 0.15s;
}
.dim-item:hover { background: #F5F3FF; }
.dim-item.disabled { opacity: 0.45; }
.dim-item.disabled:hover { background: transparent; }
.dim-label { flex: 1; font-size: 15px; font-weight: 600; color: #1E293B; }
.dim-count { font-size: 12px; color: #8B5CF6; background: #F5F3FF; padding: 2px 8px; border-radius: 10px; }
.dim-count.zero { color: #94A3B8; background: #F1F5F9; }
.dim-arrow { color: #CBD5E1; }
.dim-item:hover .dim-arrow { color: #8B5CF6; }
</style>
