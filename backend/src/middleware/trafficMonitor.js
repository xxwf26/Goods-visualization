/**
 * 流量监控中间件
 * 记录每个请求的入站/出站字节数，按天/小时/接口路径统计，持久化到 JSON 文件。
 * 用于评估 ECS 带宽需求。统计接口：GET /api/traffic-stats
 */
const fs = require('fs')
const path = require('path')

const STATS_FILE = path.resolve(__dirname, '../../traffic_stats.json')

// 内存统计，定期落盘
let stats = loadStats()

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
  } catch {}
  return {
    startTime: new Date().toISOString(),
    totalRequests: 0, totalBytesIn: 0, totalBytesOut: 0,
    byDay: {},      // { '2026-06-30': { requests, bytesIn, bytesOut } }
    byHour: {},     // { '0'..'23': { requests, bytesIn, bytesOut } }
    byEndpoint: {}, // { '/api/inspirations': { requests, bytesIn, bytesOut } }
    peak: { bytes: 0, time: '' }
  }
}

function saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2)) } catch {}
}

// 归一化路径：去 query，数字ID/长hash归并为:id，便于按接口聚合
function normalizePath(p) {
  if (!p) return '/'
  return p
    .split('?')[0]
    .replace(/\/[0-9a-f]{16,}/gi, '/:hash')     // 长hash(图片文件名等)
    .replace(/\/\d{2,}(?=\/|$)/g, '/:id')       // 数字ID(2位以上，避免误伤)
}

function record(req, bytesIn, bytesOut) {
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  const hour = String(now.getHours())
  const ep = normalizePath(req.originalUrl || req.url || '/')

  const bump = (obj, key) => {
    if (!obj[key]) obj[key] = { requests: 0, bytesIn: 0, bytesOut: 0 }
    obj[key].requests++
    obj[key].bytesIn += bytesIn
    obj[key].bytesOut += bytesOut
  }

  stats.totalRequests++
  stats.totalBytesIn += bytesIn
  stats.totalBytesOut += bytesOut
  bump(stats.byDay, day)
  bump(stats.byHour, hour)
  bump(stats.byEndpoint, ep)

  const total = bytesIn + bytesOut
  if (total > stats.peak.bytes) stats.peak = { bytes: total, time: now.toISOString() }
}

function middleware(req, res, next) {
  // 跳过统计接口自身，避免自循环计数
  if (req.path === '/api/traffic-stats') return next()

  const bytesIn = parseInt(req.headers['content-length'] || '0', 10) || 0
  let bytesOut = 0
  const oldWriteHead = res.writeHead
  const oldEnd = res.end

  res.on('finish', () => {
    bytesOut = parseInt(res.getHeader('Content-Length') || '0', 10) || 0
    record(req, bytesIn, bytesOut)
  })

  next()
}

// 每30秒落盘一次
setInterval(saveStats, 30000)
// 进程退出时落盘
process.on('SIGINT', () => { saveStats(); process.exit() })
process.on('SIGTERM', () => { saveStats(); process.exit() })

module.exports = { middleware, getStats: () => stats, saveStats }
