const path = require('path')

const isProd = process.env.NODE_ENV === 'production'

// JWT 密钥：生产环境必须显式配置，缺失则启动即报错，避免使用公开默认值被伪造 token
const jwtSecret = process.env.JWT_SECRET || (isProd ? null : 'goods_visualization_dev_secret')
if (!jwtSecret) {
  throw new Error('启动失败：生产环境必须设置 JWT_SECRET 环境变量')
}
if (!process.env.JWT_SECRET && !isProd) {
  console.warn('[安全提醒] 未设置 JWT_SECRET，正在使用开发默认密钥，请勿用于生产环境')
}

// CORS 允许的来源：通过 CORS_ORIGINS 环境变量配置（逗号分隔）；未配置时默认放行本地开发源
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173']

module.exports = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',

  jwt: {
    secret: jwtSecret,
    expiresIn: '24h'
  },

  upload: {
    path: path.resolve(__dirname, '../../uploads'),
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    // 允许的扩展名（与 MIME 双重校验）
    allowedExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']
  },

  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
}
