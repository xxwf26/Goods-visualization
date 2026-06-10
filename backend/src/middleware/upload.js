const multer = require('multer')
const path = require('path')
const fs = require('fs')
const config = require('../config')

const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = config.upload.path
    ensureDirExists(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSize
  },
  fileFilter
})

module.exports = upload
