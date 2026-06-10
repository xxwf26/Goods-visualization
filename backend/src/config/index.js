const path = require('path')

module.exports = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'goods_visualization_secret',
    expiresIn: '24h'
  },
  
  upload: {
    path: path.resolve(__dirname, '../../uploads'),
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
  },
  
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
}
