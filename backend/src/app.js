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

// 静态文件托管
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

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
