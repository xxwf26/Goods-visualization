/**
 * 全局检索逻辑（主页内嵌大搜索 与 Ctrl+K 命令面板 共用）
 * 封装：关键词、防抖请求、分组/扁平化、键盘导航、结果路由跳转。
 * @param {object} options
 * @param {Function} [options.onNavigate] 跳转后回调（面板用于关闭弹窗；主页可不传）
 */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { searchAll } from '@/api/search'
import { hasPermission } from '@/utils/permission'
import { debounce } from '@/utils/debounce'

export function useGlobalSearch(options = {}) {
  const { onNavigate, onOpenDetail } = options
  const router = useRouter()

  const keyword = ref('')
  const loading = ref(false)
  const data = ref(null)
  const activeIndex = ref(-1)
  let latestQuery = '' // 防乱序：仅采纳最后一次请求的结果

  // 按权限过滤、且非空的分组
  const visibleGroups = computed(() => {
    if (!data.value) return []
    return data.value.groups.filter(g => {
      if (g.items.length === 0) return false
      return g.permission ? hasPermission(g.permission) : true
    })
  })

  // 扁平化可导航项（速览卡 + 各组 items），用于键盘上下选择
  const flatItems = computed(() => {
    const list = []
    if (data.value?.categoryOverview) {
      list.push({ groupType: 'overview', id: data.value.categoryOverview.tagId, route: null })
    }
    for (const g of visibleGroups.value) {
      for (const it of g.items) {
        list.push({ groupType: g.type, id: it.id, route: g.route })
      }
    }
    return list
  })

  const showEmpty = computed(() =>
    !!keyword.value.trim() && !loading.value && data.value !== null &&
    !data.value.categoryOverview && visibleGroups.value.length === 0
  )

  // 某 item 在 flatItems 里的下标（用于高亮）
  function flatIndexOf(groupType, id) {
    return flatItems.value.findIndex(f => f.groupType === groupType && f.id === id)
  }

  const runSearch = debounce(async (q) => {
    loading.value = true
    try {
      const res = await searchAll(q)
      if (q !== latestQuery) return // 已有更新的查询，丢弃本次
      data.value = res.data
      activeIndex.value = flatItems.value.length > 0 ? 0 : -1
    } catch (e) {
      if (q === latestQuery) data.value = null
    } finally {
      if (q === latestQuery) loading.value = false
    }
  }, 300)

  watch(keyword, (val) => {
    const q = val.trim()
    latestQuery = q
    if (!q) {
      runSearch.cancel()
      data.value = null
      loading.value = false
      activeIndex.value = -1
      return
    }
    runSearch(q)
  })

  function moveActive(delta) {
    const len = flatItems.value.length
    if (!len) return
    activeIndex.value = (activeIndex.value + delta + len) % len
  }

  // 结果导航
  function go(entry) {
    if (!entry) return
    // 历史项目 / 价格记录：直接弹详情预览（宿主提供 onOpenDetail）
    if ((entry.groupType === 'project' || entry.groupType === 'price') && onOpenDetail) {
      onOpenDetail(entry.groupType, entry.id)
      return
    }
    if (entry.groupType === 'overview' || entry.groupType === 'tag') {
      router.push('/category/' + entry.id)
    } else {
      router.push({ path: entry.route, query: { keyword: keyword.value.trim() } })
    }
    onNavigate && onNavigate()
  }

  // 「查看全部」→ 该模块列表（按关键词过滤）
  function goList(group) {
    if (!group.route) return
    router.push({ path: group.route, query: { keyword: keyword.value.trim() } })
    onNavigate && onNavigate()
  }

  function activateCurrent() {
    if (activeIndex.value >= 0 && activeIndex.value < flatItems.value.length) {
      go(flatItems.value[activeIndex.value])
    }
  }

  function reset() {
    keyword.value = ''
    data.value = null
    activeIndex.value = -1
    loading.value = false
    runSearch.cancel()
  }

  return {
    keyword, loading, data, activeIndex,
    visibleGroups, flatItems, showEmpty,
    flatIndexOf, moveActive, go, goList, activateCurrent, reset
  }
}
