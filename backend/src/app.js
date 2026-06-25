const express = require('express')
const cors = require('cors')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()

const config = require('./config')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')

const app = express()

// CORS 跨域配置
app.use(cors(config.cors))

// 请求体解析
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 分页参数边界保护：page >= 1，pageSize 1~100，非法值回退默认，防止全表拉取/负偏移
app.use((req, res, next) => {
  if (req.query) {
    if (req.query.page !== undefined) {
      const p = parseInt(req.query.page, 10)
      req.query.page = (!Number.isFinite(p) || p < 1) ? 1 : p
    }
    if (req.query.pageSize !== undefined) {
      const ps = parseInt(req.query.pageSize, 10)
      req.query.pageSize = (!Number.isFinite(ps) || ps < 1) ? 20 : Math.min(ps, 100)
    }
  }
  next()
})

// 静态文件托管（加 nosniff，防止浏览器把上传文件 MIME 嗅探成可执行类型，缓解存储型 XSS）
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
  }
}))

// API 路由
const authRoutes = require('./routes/auth')
const tagRoutes = require('./routes/tag')
const projectRoutes = require('./routes/project')
const inspirationRoutes = require('./routes/inspiration')
const inspirationFolderRoutes = require('./routes/inspirationFolder')
const supplierRoutes = require('./routes/supplier')
const uploadRoutes = require('./routes/upload')
const statisticsRoutes = require('./routes/statistics')
const importRoutes = require('./routes/import')
const priceRoutes = require('./routes/price')
const priceRecordRoutes = require('./routes/priceRecord')
const designNoteRoutes = require('./routes/designNote')
const logRoutes = require('./routes/log')
const searchRoutes = require('./routes/search')

// 操作审计：对写操作自动记录到 log 表（须在业务路由之前挂载）
const auditLog = require('./middleware/auditLog')
app.use(auditLog)

app.use('/api/auth', authRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/inspirations', inspirationRoutes)
app.use('/api/inspiration-folders', inspirationFolderRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/import', importRoutes)
app.use('/api/price', priceRoutes)
app.use('/api/price-records', priceRecordRoutes)
app.use('/api/design-notes', designNoteRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/search', searchRoutes)

// 健康检查
app.get('/api', (req, res) => {
  res.json({
    code: 200,
    message: '周边可视化系统 API 服务运行正常',
    data: {
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  })
})

// 404 处理
app.use(notFoundHandler)

// 全局异常捕获
app.use(errorHandler)

const PORT = config.port
const HOST = config.host

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
  console.log(`API endpoint: http://${HOST}:${PORT}/api`)
  console.log('\n=== API Routes ===')
  console.log('Auth:      /api/auth/*')
  console.log('Tags:      /api/tags/*')
  console.log('Projects:  /api/projects/*')
  console.log('Inspirations: /api/inspirations/*')
  console.log('Suppliers: /api/suppliers/*')
  console.log('Upload:    /api/upload/*')
  console.log('Statistics: /api/statistics/*')
  console.log('Import:     /api/import/*')
  console.log('Price:      /api/price/*')
})

module.exports = app
