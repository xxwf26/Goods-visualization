<template>
  <div class="candidate-review">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">灵感采集</h2>
        <span class="page-desc">爬取/贴链接的灵感先入候选队列，复核后转正进灵感库</span>
      </div>
      <div class="toolbar-right">
        <el-button @click="openHistory">
          <el-icon><Clock /></el-icon> 采集历史
        </el-button>
        <el-button v-if="userStore.isEditor" type="primary" @click="addDialogVisible = true">
          <el-icon><Plus /></el-icon> 贴链接入队
        </el-button>
        <el-button v-if="userStore.isEditor" type="success" @click="openCrawl">
          <el-icon><Search /></el-icon> 关键词采集
        </el-button>
      </div>
    </div>

    <!-- 采集进度条（采集运行中常驻显示，刷新页面也能恢复） -->
    <div v-if="crawlProgress" class="crawl-progress">
      <el-icon class="spin"><Loading /></el-icon>
      <div class="cp-body">
        <div class="cp-text">
          <b>正在采集：</b>{{ crawlProgress.keywords }}
          <span class="cp-phase">· {{ crawlPhaseText }}</span>
          <span class="cp-time">· 已用 {{ crawlElapsed }}s</span>
        </div>
        <el-progress :percentage="crawlPercent" :status="crawlProgress.status === 'failed' ? 'exception' : undefined" :stroke-width="8" />
      </div>
    </div>

    <!-- 批次筛选提示条：选中某次采集时显示 -->
    <div v-if="selectedRun" class="run-filter-bar">
      <el-icon><Clock /></el-icon>
      <span>正在查看采集批次 <b>#{{ selectedRun.id }}</b>「{{ selectedRun.keywords }}」的全部候选</span>
      <el-button link type="primary" size="small" @click="clearRunFilter">← 返回全部</el-button>
    </div>

    <!-- 状态 Tab（带计数角标）；按批次筛选时隐藏，改看该批次全部状态 -->
    <el-tabs v-else v-model="activeStatus" @tab-change="onStatusChange">
      <el-tab-pane name="pending">
        <template #label>待复核 <el-badge v-if="counts.pending" :value="counts.pending" class="tab-badge" /></template>
      </el-tab-pane>
      <el-tab-pane name="adopted">
        <template #label>已转正 <el-badge v-if="counts.adopted" :value="counts.adopted" type="success" class="tab-badge" /></template>
      </el-tab-pane>
      <el-tab-pane name="rejected">
        <template #label>已丢弃 <el-badge v-if="counts.rejected" :value="counts.rejected" type="info" class="tab-badge" /></template>
      </el-tab-pane>
    </el-tabs>

    <!-- 搜索 + 批量操作 -->
    <div class="filter-row">
      <el-input v-model="keyword" placeholder="搜索标题/关键词/作者" clearable style="width: 260px" @keyup.enter="reload" @clear="reload">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button @click="reload">查询</el-button>
      <template v-if="activeStatus === 'pending' && !selectedRun && userStore.isEditor">
        <el-divider direction="vertical" />
        <el-button :loading="scoring" @click="doScorePending">AI 打分（未打分）</el-button>
        <el-popconfirm :title="`转正所有 ≥${batchAdoptScore} 分的候选（跳过疑似重复）？`" @confirm="doBatchAdopt" width="240">
          <template #reference>
            <el-button type="success" plain>批量转正 ≥ <el-input-number v-model="batchAdoptScore" :min="0" :max="100" size="small" controls-position="right" style="width:70px" @click.stop /></el-button>
          </template>
        </el-popconfirm>
        <el-popconfirm :title="`丢弃所有 <${batchRejectScore} 分的候选？`" @confirm="doBatchReject" width="220">
          <template #reference>
            <el-button type="danger" plain>批量丢弃 &lt; <el-input-number v-model="batchRejectScore" :min="0" :max="100" size="small" controls-position="right" style="width:70px" @click.stop /></el-button>
          </template>
        </el-popconfirm>
      </template>
    </div>

    <!-- 候选卡片网格 -->
    <div v-loading="loading" class="candidate-grid">
      <el-empty v-if="!loading && !list.length" description="暂无候选" />
      <div v-for="item in list" :key="item.id" class="candidate-card">
        <div class="card-image">
          <el-image v-if="item.cover_image" :src="toImageUrl(item.cover_image)" fit="cover" lazy />
          <div v-else class="no-image"><el-icon :size="28"><Picture /></el-icon></div>
          <div v-if="item.ai_score != null" class="ai-badge">
            <el-tag size="small" :type="item.ai_score >= 85 ? 'success' : item.ai_score >= 60 ? 'warning' : 'info'" effect="dark">AI {{ item.ai_score }}</el-tag>
          </div>
          <div v-if="item.dedup_inspiration_id" class="dedup-badge">
            <el-tag size="small" type="danger" effect="dark">疑似重复</el-tag>
          </div>
        </div>
        <div class="card-content">
          <div class="card-title" :title="item.title">{{ item.title || '未命名' }}</div>
          <div class="card-meta">
            <el-tag size="small" type="info" effect="plain">{{ item.source_platform || '小红书' }}</el-tag>
            <span v-if="item.keyword" class="kw">#{{ item.keyword }}</span>
          </div>
          <div v-if="item.post_tags" class="card-tags">
            <el-tag v-for="tag in item.post_tags.split(',').slice(0,3)" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
          </div>
          <div v-if="item.ai_reason" class="ai-reason" :title="item.ai_reason">AI：{{ item.ai_reason }}</div>
          <div v-if="item.description" class="card-desc">{{ item.description }}</div>
          <div class="card-stats">
            <span v-if="item.like_count"><el-icon><Star /></el-icon>{{ formatCount(item.like_count) }}</span>
            <span v-if="item.save_count"><el-icon><FolderOpened /></el-icon>{{ formatCount(item.save_count) }}</span>
          </div>
        </div>
        <div class="card-actions">
          <a v-if="safeUrl(item.source_url)" :href="safeUrl(item.source_url)" target="_blank" rel="noopener noreferrer" class="jump-link">原帖</a>
          <template v-if="userStore.isEditor">
            <template v-if="item.status === 'pending'">
              <el-button link type="success" size="small" @click="openAdopt(item)">转正</el-button>
              <el-button link type="danger" size="small" @click="doReject(item)">丢弃</el-button>
            </template>
            <template v-else-if="item.status === 'rejected'">
              <el-button link type="primary" size="small" @click="doRestore(item)">恢复</el-button>
            </template>
            <el-tag v-else-if="item.status === 'adopted'" size="small" type="success" effect="plain">已进灵感库</el-tag>
          </template>
        </div>
      </div>
    </div>

    <div v-if="total > 0" class="pagination-wrapper">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[12,24,36]" :total="total"
        layout="total,sizes,prev,pager,next" @size-change="reload" @current-change="loadList" />
    </div>

    <!-- 贴链接入队弹窗 -->
    <el-dialog v-model="addDialogVisible" title="贴链接入候选队列" width="480px">
      <el-form label-width="80px">
        <el-form-item label="链接" required>
          <el-input v-model="addForm.source_url" placeholder="粘贴小红书/B站等帖子链接" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="addForm.keyword" placeholder="可选，标记这条属于哪个采购主题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="doAdd">入队</el-button>
      </template>
    </el-dialog>

    <!-- 转正弹窗 -->
    <el-dialog v-model="adoptDialogVisible" title="转正进灵感库" width="480px">
      <el-form label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="adoptForm.title" placeholder="转正后的灵感标题" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="adoptForm.inspiration_type" style="width: 100%">
            <el-option label="包装结构" value="packaging" />
            <el-option label="周边品类灵感" value="peripheral" />
            <el-option label="效果与特殊工艺" value="effect" />
            <el-option label="印刷与生产攻略" value="production" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adoptDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="adopting" @click="doAdopt">确认转正</el-button>
      </template>
    </el-dialog>

    <!-- 关键词采集弹窗 -->
    <el-dialog v-model="crawlDialogVisible" title="关键词采集小红书最新灵感" width="520px">
      <el-alert v-if="!cookieConfigured" type="warning" :closable="false" style="margin-bottom: 12px">
        尚未登录小红书，采集会拿不到数据。请先点下方「扫码登录」（会在服务器弹出浏览器窗口）。
      </el-alert>
      <el-alert v-else type="success" :closable="false" style="margin-bottom: 12px">
        已登录小红书。采集后帖子进入「待复核」，需人工确认后才进灵感库。
      </el-alert>
      <el-form label-width="80px">
        <el-form-item label="关键词">
          <el-select v-model="crawlForm.keywords" multiple filterable allow-create default-first-option
            placeholder="输入采购主题，回车添加，如 亚克力吧唧 / 醒型POP" style="width: 100%">
            <el-option v-for="kw in commonKeywords" :key="kw" :label="kw" :value="kw" />
          </el-select>
        </el-form-item>
        <el-form-item label="每次数量">
          <el-input-number v-model="crawlForm.limit" :min="10" :max="200" :step="10" />
          <span class="form-hint">总召回上限（多关键词均分）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :loading="logging" @click="doLogin">扫码登录小红书</el-button>
        <el-button @click="crawlDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="crawling" :disabled="!crawlForm.keywords.length" @click="doCrawl">开始采集</el-button>
      </template>
    </el-dialog>

    <!-- 采集历史抽屉 -->
    <el-drawer v-model="historyDrawerVisible" title="采集历史" size="440px">
      <div v-loading="runsLoading">
        <el-empty v-if="!runs.length" description="还没有采集记录" />
        <div v-for="run in runs" :key="run.id" class="run-item" @click="selectRun(run)">
          <div class="run-head">
            <span class="run-kw">{{ run.keywords }}</span>
            <el-tag size="small" :type="run.status === 'ok' ? 'success' : run.status === 'failed' ? 'danger' : 'warning'">
              {{ runStatusText(run.status) }}
            </el-tag>
          </div>
          <div class="run-meta">
            <span>#{{ run.id }}</span>
            <span>{{ formatDateTime(run.created_at) }}</span>
            <span v-if="run.status !== 'failed'">召回 {{ run.recalled }} · 新增 {{ run.new_count }}</span>
          </div>
          <div v-if="run.breakdown" class="run-breakdown">
            <span class="bd pending">待复核 {{ run.breakdown.pending }}</span>
            <span class="bd adopted">已转正 {{ run.breakdown.adopted }}</span>
            <span class="bd rejected">已丢弃 {{ run.breakdown.rejected }}</span>
          </div>
          <div v-if="run.error" class="run-error">{{ run.error }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Plus, Search, Picture, Star, FolderOpened, Loading, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { formatCount, formatDateTime } from '@/utils/format'
import { safeUrl } from '@/utils/safeUrl'
import { getCandidates, getCandidateCounts, createCandidate, adoptCandidate, rejectCandidate, restoreCandidate, startCrawl, getCrawlStatus, getCrawlRuns, getXhsCookieStatus, xhsLogin, scorePending, batchAdopt, batchReject } from '@/api/candidates'

const userStore = useUserStore()

const activeStatus = ref('pending')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(24)
const total = ref(0)
const loading = ref(false)
const list = ref([])
const counts = reactive({ pending: 0, adopted: 0, rejected: 0 })

const addDialogVisible = ref(false)
const adding = ref(false)
const addForm = reactive({ source_url: '', keyword: '' })

const adoptDialogVisible = ref(false)
const adopting = ref(false)
const adoptForm = reactive({ id: null, title: '', inspiration_type: 'peripheral' })

// 关键词采集
const crawlDialogVisible = ref(false)
const crawling = ref(false)
const logging = ref(false)
const cookieConfigured = ref(false)
const crawlForm = reactive({ keywords: [], limit: 60 })
const commonKeywords = ['亚克力吧唧', '醒型POP', '谷子周边', '徽章', '亚克力立牌', '拍立得卡', '色纸', '毛绒挂件']
let crawlPollTimer = null

// 采集进度：正在运行的批次（null=无）。crawlProgress = { runId, keywords, status, recalled, new_count, limit, startAt }
const crawlProgress = ref(null)
const crawlElapsed = ref(0)
let elapsedTimer = null

// 阶段文字：搜索中（recalled 未知）→ 入库中 x/N → 完成
const crawlPhaseText = computed(() => {
  const p = crawlProgress.value
  if (!p) return ''
  if (p.status === 'failed') return '采集失败'
  if (!p.recalled) return '搜索小红书中…'
  return `入库处理中 ${p.new_count || 0}/${p.recalled}`
})

// 进度百分比：搜索阶段给个缓动假进度(封顶40%)，入库阶段按 new/recalled 映射到 40~100%
const crawlPercent = computed(() => {
  const p = crawlProgress.value
  if (!p) return 0
  if (!p.recalled) return Math.min(40, Math.round(crawlElapsed.value / 60 * 40)) // 搜索阶段随时间缓增到40%
  const ratio = p.recalled ? (p.new_count || 0) / p.recalled : 0
  return Math.min(99, 40 + Math.round(ratio * 59))
})

// AI 预筛 + 批量
const scoring = ref(false)
const batchAdoptScore = ref(85)
const batchRejectScore = ref(50)

// 采集历史
const historyDrawerVisible = ref(false)
const runs = ref([])
const runsLoading = ref(false)
const selectedRun = ref(null) // 当前按哪次采集筛选（null=看全部）

function toImageUrl(v) {
  if (!v) return ''
  const s = String(v).trim()
  return s.startsWith('http') ? s : `/uploads/${s}`
}

async function loadCounts() {
  try {
    const res = await getCandidateCounts()
    Object.assign(counts, res.data || {})
  } catch (e) { /* 静默 */ }
}

async function loadList(silent = false) {
  if (!silent) loading.value = true
  try {
    const params = {
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    }
    if (selectedRun.value) {
      // 查某次采集历史：该批次全部状态
      params.crawl_run_id = selectedRun.value.id
      params.status = ''
    } else {
      params.status = activeStatus.value
    }
    const res = await getCandidates(params)
    list.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch (e) { console.error(e) }
  finally { if (!silent) loading.value = false }
}

function reload() {
  page.value = 1
  loadList()
  loadCounts()
}

function onStatusChange() {
  keyword.value = ''
  reload()
}

async function doAdd() {
  if (!addForm.source_url) return ElMessage.warning('请填写链接')
  adding.value = true
  try {
    const res = await createCandidate({ source_url: addForm.source_url.trim(), keyword: addForm.keyword.trim() || undefined })
    ElMessage.success(res.message || '已入队')
    addDialogVisible.value = false
    addForm.source_url = ''
    addForm.keyword = ''
    reload()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '入队失败')
  } finally { adding.value = false }
}

function openAdopt(item) {
  adoptForm.id = item.id
  adoptForm.title = item.title || ''
  adoptForm.inspiration_type = item.ai_category || 'peripheral'
  adoptDialogVisible.value = true
}

async function doAdopt() {
  adopting.value = true
  try {
    await adoptCandidate(adoptForm.id, { title: adoptForm.title, inspiration_type: adoptForm.inspiration_type, categories: adoptForm.inspiration_type })
    ElMessage.success('已转正进灵感库')
    adoptDialogVisible.value = false
    reload()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '转正失败')
  } finally { adopting.value = false }
}

async function doReject(item) {
  try {
    await ElMessageBox.confirm(`确定丢弃「${item.title || '该候选'}」？丢弃后可在「已丢弃」里恢复。`, '提示', { type: 'warning' })
  } catch { return }
  try {
    await rejectCandidate(item.id)
    ElMessage.success('已丢弃')
    reload()
  } catch (e) { ElMessage.error(e.response?.data?.message || '操作失败') }
}

async function doRestore(item) {
  try {
    await restoreCandidate(item.id)
    ElMessage.success('已恢复到待复核')
    reload()
  } catch (e) { ElMessage.error(e.response?.data?.message || '操作失败') }
}

async function openCrawl() {
  crawlDialogVisible.value = true
  try {
    const res = await getXhsCookieStatus()
    cookieConfigured.value = !!res.data?.configured
  } catch { cookieConfigured.value = false }
}

async function doLogin() {
  logging.value = true
  ElMessage.info('正在服务器打开小红书登录页，请在弹出的浏览器窗口用手机扫码（120秒内）')
  try {
    await xhsLogin()
    ElMessage.success('登录成功，cookie 已保存')
    cookieConfigured.value = true
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '登录失败或超时')
  } finally { logging.value = false }
}

async function doCrawl() {
  if (!crawlForm.keywords.length) return ElMessage.warning('请至少输入一个关键词')
  crawling.value = true
  try {
    const res = await startCrawl({ keywords: crawlForm.keywords, limit: crawlForm.limit })
    const runId = res.data?.run_id
    ElMessage.success('采集已启动，进度见页面顶部')
    crawlDialogVisible.value = false
    startProgress({ runId, keywords: crawlForm.keywords.join('、'), status: 'running', recalled: 0, new_count: 0 })
    pollCrawl(runId)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '采集启动失败')
  } finally { crawling.value = false }
}

// 显示进度条并启动"已用时"计时器
function startProgress(p) {
  crawlProgress.value = p
  crawlElapsed.value = 0
  if (elapsedTimer) clearInterval(elapsedTimer)
  elapsedTimer = setInterval(() => { crawlElapsed.value++ }, 1000)
}
function stopProgress() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
  crawlProgress.value = null
}

// 轮询批次状态：实时喂进度条；采集中 new_count 增长即刷新列表(近实时显示新候选)，完成后刷新并收起
function pollCrawl(runId) {
  if (!runId) return
  if (crawlPollTimer) clearInterval(crawlPollTimer)
  let ticks = 0
  let lastNewCount = 0
  crawlPollTimer = setInterval(async () => {
    ticks++
    try {
      const res = await getCrawlStatus(runId)
      const run = res.data
      if (!run) return
      // 更新进度条数据（保留 keywords 显示）
      if (crawlProgress.value) {
        crawlProgress.value = { ...crawlProgress.value, status: run.status, recalled: run.recalled, new_count: run.new_count }
      }
      // 采集中：有新候选入库就静默刷新列表(近实时，不闪 loading)，让用户立刻看到新增
      if (run.status === 'running' && run.new_count > lastNewCount) {
        lastNewCount = run.new_count
        loadList(true)
        loadCounts()
      }
      if (run.status !== 'running') {
        clearInterval(crawlPollTimer); crawlPollTimer = null
        if (run.status === 'ok') ElMessage.success(`采集完成：召回 ${run.recalled} 篇，新增候选 ${run.new_count} 条`)
        else ElMessage.warning(`采集失败：${(run.error || '').slice(0, 80)}`)
        activeStatus.value = 'pending'
        reload()
        // 完成态进度条停留 2.5 秒再收起，让用户看到结果
        setTimeout(stopProgress, 2500)
      }
    } catch { /* 忽略单次轮询失败 */ }
    if (ticks > 120) { clearInterval(crawlPollTimer); crawlPollTimer = null; stopProgress() } // 最长轮询 ~10 分钟
  }, 3000)
}

// 页面进入时若有正在跑的采集批次，恢复进度显示（刷新/重进不丢进度）
async function resumeRunningCrawl() {
  try {
    const res = await getCrawlRuns()
    const running = (res.data || []).find(r => r.status === 'running')
    if (running) {
      startProgress({ runId: running.id, keywords: running.keywords, status: 'running', recalled: running.recalled, new_count: running.new_count })
      pollCrawl(running.id)
    }
  } catch { /* 忽略 */ }
}

// ===== 采集历史 =====
async function openHistory() {
  historyDrawerVisible.value = true
  runsLoading.value = true
  try {
    const res = await getCrawlRuns()
    runs.value = res.data || []
  } catch (e) { ElMessage.error('加载采集历史失败') }
  finally { runsLoading.value = false }
}

// 选中某次采集，筛出该批次候选（含各状态）
function selectRun(run) {
  selectedRun.value = run
  historyDrawerVisible.value = false
  page.value = 1
  loadList()
}

// 清除批次筛选，回到按状态浏览
function clearRunFilter() {
  selectedRun.value = null
  page.value = 1
  loadList()
}

function runStatusText(s) {
  return { running: '进行中', ok: '完成', failed: '失败' }[s] || s
}


async function doScorePending() {
  scoring.value = true
  try {
    const res = await scorePending()
    ElMessage.success(res.message || '打分完成')
    reload()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || 'AI 打分失败（可能未配置 AI 服务）')
  } finally { scoring.value = false }
}

async function doBatchAdopt() {
  try {
    const res = await batchAdopt(batchAdoptScore.value)
    ElMessage.success(res.message || '批量转正完成')
    reload()
  } catch (e) { ElMessage.error(e.response?.data?.message || '批量转正失败') }
}

async function doBatchReject() {
  try {
    const res = await batchReject(batchRejectScore.value)
    ElMessage.success(res.message || '批量丢弃完成')
    reload()
  } catch (e) { ElMessage.error(e.response?.data?.message || '批量丢弃失败') }
}

onMounted(() => {
  loadList()
  loadCounts()
  resumeRunningCrawl()
})

onBeforeUnmount(() => {
  if (crawlPollTimer) clearInterval(crawlPollTimer)
  if (elapsedTimer) clearInterval(elapsedTimer)
})
</script>

<style scoped>
.candidate-review { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.page-title { margin: 0; font-size: 20px; }
.page-desc { color: #999; font-size: 12px; }
.tab-badge { margin-left: 2px; }
.crawl-progress { display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 12px; border: 1px solid var(--el-color-primary-light-5); background: var(--el-color-primary-light-9); border-radius: 8px; }
.crawl-progress .spin { font-size: 18px; color: var(--el-color-primary); animation: cp-spin 1s linear infinite; }
.crawl-progress .cp-body { flex: 1; }
.crawl-progress .cp-text { font-size: 13px; color: var(--el-text-color-primary); margin-bottom: 6px; }
.crawl-progress .cp-phase { color: var(--el-color-primary); }
.crawl-progress .cp-time { color: #999; }
@keyframes cp-spin { to { transform: rotate(360deg); } }
.run-filter-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 12px; background: var(--el-color-info-light-9); border: 1px solid var(--el-border-color-light); border-radius: 8px; font-size: 13px; }
.run-filter-bar b { color: var(--el-color-primary); }
.run-item { padding: 12px 14px; border: 1px solid var(--el-border-color-light); border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all .2s; }
.run-item:hover { border-color: var(--el-color-primary); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.run-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.run-kw { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.run-meta { display: flex; flex-wrap: wrap; gap: 10px; color: #999; font-size: 12px; margin-bottom: 6px; }
.run-breakdown { display: flex; gap: 10px; font-size: 12px; }
.run-breakdown .bd.pending { color: var(--el-color-warning); }
.run-breakdown .bd.adopted { color: var(--el-color-success); }
.run-breakdown .bd.rejected { color: #999; }
.run-error { margin-top: 6px; font-size: 12px; color: var(--el-color-danger); }
.filter-row { display: flex; gap: 8px; margin-bottom: 16px; }
.candidate-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; min-height: 200px; }
.candidate-card { border: 1px solid var(--el-border-color-light); border-radius: 10px; overflow: hidden; background: var(--el-bg-color); display: flex; flex-direction: column; transition: box-shadow .2s; }
.candidate-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.card-image { position: relative; height: 160px; background: var(--el-fill-color-lighter); }
.card-image .el-image { width: 100%; height: 100%; }
.no-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #bbb; }
.ai-badge { position: absolute; top: 6px; left: 6px; }
.dedup-badge { position: absolute; top: 6px; right: 6px; }
.card-content { padding: 10px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.card-title { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { display: flex; align-items: center; gap: 6px; }
.card-meta .kw { color: #999; font-size: 12px; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.ai-reason { font-size: 12px; color: #e6a23c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-desc { font-size: 12px; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-stats { display: flex; gap: 12px; color: #999; font-size: 12px; }
.card-stats span { display: flex; align-items: center; gap: 2px; }
.card-actions { padding: 8px 10px; border-top: 1px solid var(--el-border-color-lighter); display: flex; align-items: center; gap: 8px; }
.jump-link { font-size: 13px; color: var(--el-color-primary); text-decoration: none; margin-right: auto; }
.form-hint { color: #999; font-size: 12px; margin-left: 8px; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: center; }
</style>
