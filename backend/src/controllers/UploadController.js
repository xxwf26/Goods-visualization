/**
 * 文件上传 Controller
 */
const { Response } = require('../utils/response')
const path = require('path')
const fs = require('fs')
const config = require('../config')
const { verifyFile, verifyBuffer } = require('../utils/fileSignature')

// 动态导入 sharp (Node.js 原生模块)
let sharp = null
try {
  sharp = require('sharp')
} catch (e) {
  console.log('sharp not available, image compression disabled')
}

class UploadController {
  /**
   * 通用图片上传
   * POST /api/upload/image
   */
  async image(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json(Response.badRequest('请选择要上传的图片'))
      }

      const file = req.file
      const { auto_compress = 'true' } = req.body

      // 文件头魔数校验：防伪造扩展名/MIME 上传，不符则删除并拒绝
      if (!verifyFile(file.path, file.mimetype)) {
        try { fs.unlinkSync(file.path) } catch {}
        return res.status(400).json(Response.badRequest('文件内容与类型不匹配，已拒绝'))
      }

      let resultFile = file

      // 自动压缩图片
      if (auto_compress === 'true' && sharp && ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        try {
          const compressedFilename = `compressed_${file.filename}`
          const compressedPath = path.join(config.upload.path, compressedFilename)

          await sharp(file.path)
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .png({ compressionLevel: 8 })
            .webp({ quality: 80 })
            .toFile(compressedPath)

          // 删除原图
          fs.unlinkSync(file.path)

          resultFile = {
            ...file,
            filename: compressedFilename,
            path: compressedPath,
            size: fs.statSync(compressedPath).size
          }
        } catch (err) {
          console.error('Image compression failed:', err)
        }
      }

      // 返回可访问地址
      const url = `/uploads/${resultFile.filename}`

      res.json(Response.success({
        url,
        filename: resultFile.filename,
        originalname: resultFile.originalname,
        mimetype: resultFile.mimetype,
        size: resultFile.size
      }, '上传成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 多图片上传
   * POST /api/upload/images
   */
  async images(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json(Response.badRequest('请选择要上传的图片'))
      }

      const { auto_compress = 'true' } = req.body
      const results = []

      for (const file of req.files) {
        // 文件头魔数校验：不符则删除该文件并跳过
        if (!verifyFile(file.path, file.mimetype)) {
          try { fs.unlinkSync(file.path) } catch {}
          continue
        }

        let resultFile = file

        // 自动压缩
        if (auto_compress === 'true' && sharp && ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          try {
            const compressedFilename = `compressed_${file.filename}`
            const compressedPath = path.join(config.upload.path, compressedFilename)

            await sharp(file.path)
              .resize(1920, 1920, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 80 })
              .png({ compressionLevel: 8 })
              .webp({ quality: 80 })
              .toFile(compressedPath)

            fs.unlinkSync(file.path)

            resultFile = {
              ...file,
              filename: compressedFilename,
              path: compressedPath,
              size: fs.statSync(compressedPath).size
            }
          } catch (err) {
            console.error('Image compression failed:', err)
          }
        }

        results.push({
          url: `/uploads/${resultFile.filename}`,
          filename: resultFile.filename,
          originalname: resultFile.originalname,
          mimetype: resultFile.mimetype,
          size: resultFile.size
        })
      }

      if (results.length === 0) {
        return res.status(400).json(Response.badRequest('所有文件内容与类型不匹配，已拒绝'))
      }
      res.json(Response.success(results, '上传成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 通用文件上传
   * POST /api/upload/file
   */
  async file(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json(Response.badRequest('请选择要上传的文件'))
      }

      const file = req.file
      // 文件头魔数校验
      if (!verifyFile(file.path, file.mimetype)) {
        try { fs.unlinkSync(file.path) } catch {}
        return res.status(400).json(Response.badRequest('文件内容与类型不匹配，已拒绝'))
      }
      const url = `/uploads/${file.filename}`

      res.json(Response.success({
        url,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }, '上传成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Base64 图片上传
   * POST /api/upload/base64
   */
  async base64(req, res, next) {
    try {
      const { data, filename, auto_compress = 'true' } = req.body

      if (!data) {
        return res.status(400).json(Response.badRequest('请提供图片数据'))
      }

      // 解析 Base64
      const matches = data.match(/^data:(.+);base64,(.+)$/)
      if (!matches) {
        return res.status(400).json(Response.badRequest('无效的 Base64 数据'))
      }

      const ext = matches[1].split('/')[1]
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')

      // 文件头魔数校验（写入前校验内存 buffer）
      if (!verifyBuffer(buffer, matches[1])) {
        return res.status(400).json(Response.badRequest('文件内容与类型不匹配，已拒绝'))
      }

      // 生成文件名
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      const finalFilename = `${uniqueSuffix}.${ext}`
      const filePath = path.join(config.upload.path, finalFilename)

      let finalBuffer = buffer

      // 自动压缩
      if (auto_compress === 'true' && sharp && ['image/jpeg', 'image/png', 'image/webp'].includes(matches[1])) {
        try {
          const processed = await sharp(buffer)
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .png({ compressionLevel: 8 })
            .webp({ quality: 80 })
            .toBuffer()
          finalBuffer = processed
        } catch (err) {
          console.error('Base64 compression failed:', err)
        }
      }

      // 写入文件
      fs.writeFileSync(filePath, finalBuffer)

      const url = `/uploads/${finalFilename}`

      res.json(Response.success({
        url,
        filename: finalFilename,
        originalname: filename || 'image',
        size: finalBuffer.length
      }, '上传成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除文件
   * DELETE /api/upload/:filename
   */
  async delete(req, res, next) {
    try {
      const { filename } = req.params
      // 仅取文件名部分，防止路径穿越（../、绝对路径、URL 编码的分隔符）
      const safeName = path.basename(filename)
      const uploadDir = path.resolve(config.upload.path)
      const filePath = path.resolve(uploadDir, safeName)

      // 二次校验：解析后的路径必须仍在上传目录内
      if (filePath !== path.join(uploadDir, safeName) || !filePath.startsWith(uploadDir + path.sep)) {
        return res.status(400).json(Response.badRequest('非法的文件名'))
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json(Response.notFound('文件不存在'))
      }

      fs.unlinkSync(filePath)

      res.json(Response.success(null, '删除成功'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new UploadController()
