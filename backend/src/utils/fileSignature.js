/**
 * 文件头魔数(magic bytes)校验
 * 防止伪造 MIME/扩展名上传（如把 .js 改名 .jpg），与扩展名+MIME 白名单形成纵深防御。
 * 仅校验已登记类型；未登记类型返回 true（依赖上层白名单）。
 */
const fs = require('fs')

// 各类型文件头签名：offset + 期望字节序列，全部命中才算匹配
const SIGNATURES = {
  'image/jpeg': [[0, [0xFF, 0xD8, 0xFF]]],
  'image/png': [[0, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]]],
  'image/gif': [[0, [0x47, 0x49, 0x46, 0x38]]], // GIF8
  'image/webp': [[0, [0x52, 0x49, 0x46, 0x46]], [8, [0x57, 0x45, 0x42, 0x50]]], // RIFF....WEBP
  'application/pdf': [[0, [0x25, 0x50, 0x44, 0x46]]] // %PDF
}

function matchAll(buf, sigs) {
  return sigs.every(([offset, bytes]) => {
    for (let i = 0; i < bytes.length; i++) {
      if (buf[offset + i] !== bytes[i]) return false
    }
    return true
  })
}

/** 校验内存 Buffer（base64 上传用） */
function verifyBuffer(buf, mimetype) {
  const sigs = SIGNATURES[mimetype]
  if (!sigs) return true // 未登记类型交由上层白名单
  return matchAll(buf, sigs)
}

/** 校验已落盘文件（multipart 上传用）：读首 16 字节比对 */
function verifyFile(filePath, mimetype) {
  const sigs = SIGNATURES[mimetype]
  if (!sigs) return true
  try {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(16)
    fs.readSync(fd, buf, 0, 16, 0)
    fs.closeSync(fd)
    return matchAll(buf, sigs)
  } catch {
    return false
  }
}

module.exports = { verifyFile, verifyBuffer }
