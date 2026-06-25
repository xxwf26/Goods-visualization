<template>
  <el-dialog
    :model-value="visible"
    width="720px"
    top="8vh"
    :show-close="false"
    :close-on-click-modal="true"
    append-to-body
    class="global-search-dialog"
    @update:model-value="handleVisibleChange"
    @opened="onOpened"
  >
    <!-- 搜索输入 -->
    <div class="gs-input-wrap">
      <el-input
        ref="inputRef"
        v-model="keyword"
        placeholder="搜索项目、价格、供应商、灵感、品类…"
        size="large"
        :prefix-icon="Search"
        clearable
        @keydown="onKeydown"
      />
      <span class="gs-kbd">Esc</span>
    </div>

    <!-- 结果区 -->
    <div ref="resultsRef" class="gs-scroll" v-loading="loading">
      <SearchResults
        :data="data"
        :visible-groups="visibleGroups"
        :active-index="activeIndex"
        :keyword="keyword"
        :show-empty="showEmpty"
        :flat-index-of="flatIndexOf"
        @select="go"
        @select-group="goList"
        @hover="activeIndex = $event"
      />
      <div v-if="!keyword.trim() && !loading" class="gs-hint">
        输入关键词即可跨「项目 / 价格 / 供应商 / 灵感 / 品类」检索　·　<span class="gs-kbd-inline">↑↓</span> 选择　<span class="gs-kbd-inline">Enter</span> 打开
      </div>
    </div>

    <SearchDetailDialogs ref="detailRef" />
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import SearchResults from '@/components/common/SearchResults.vue'
import SearchDetailDialogs from '@/components/common/SearchDetailDialogs.vue'
import { useGlobalSearch } from '@/composables/useGlobalSearch'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible'])

const inputRef = ref(null)
const resultsRef = ref(null)
const detailRef = ref(null)

const {
  keyword, loading, data, activeIndex,
  visibleGroups, showEmpty, flatIndexOf,
  moveActive, go, goList, activateCurrent, reset
} = useGlobalSearch({
  onNavigate: () => close(),
  onOpenDetail: (type, id) => detailRef.value?.open(type, id)
})

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault(); moveActive(1); scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault(); moveActive(-1); scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault(); activateCurrent()
  } else if (e.key === 'Escape') {
    close()
  }
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = resultsRef.value?.querySelector('.active')
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

function close() {
  emit('update:visible', false)
}
function handleVisibleChange(val) {
  emit('update:visible', val)
}
function onOpened() {
  nextTick(() => inputRef.value?.focus())
}

// 关闭时重置
watch(() => props.visible, (val) => {
  if (!val) reset()
})
</script>

<style scoped>
.global-search-dialog :deep(.el-dialog__header) {
  display: none;
}
.global-search-dialog :deep(.el-dialog__body) {
  padding: 18px;
}

.gs-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gs-input-wrap :deep(.el-input__wrapper) {
  border-radius: 12px;
}
.gs-kbd {
  font-size: 12px;
  color: var(--text-secondary, #94A3B8);
  border: 1px solid var(--border-color, #EDE9FE);
  border-radius: 6px;
  padding: 2px 8px;
  white-space: nowrap;
}

.gs-scroll {
  margin-top: 16px;
  max-height: 64vh;
  overflow-y: auto;
}

.gs-hint {
  text-align: center;
  color: var(--text-secondary, #94A3B8);
  font-size: 13px;
  padding: 28px 12px;
}
.gs-kbd-inline {
  border: 1px solid var(--border-color, #EDE9FE);
  border-radius: 5px;
  padding: 1px 6px;
  margin: 0 2px;
}
</style>
