const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      message: err.message,
      data: null
    })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      code: 401,
      message: '未授权访问',
      data: null
    })
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      code: 400,
      message: '文件大小超过限制',
      data: null
    })
  }

  if (err.message && err.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      code: 400,
      message: err.message,
      data: null
    })
  }

  // 5xx 错误：生产环境隐藏原始信息，避免泄漏 SQL/堆栈等内部细节
  const status = err.status || 500
  const isServerError = status >= 500
  const exposeDetail = process.env.NODE_ENV !== 'production'
  res.status(status).json({
    code: status,
    message: (isServerError && !exposeDetail) ? '服务器内部错误' : (err.message || '服务器内部错误'),
    data: null
  })
}

const notFoundHandler = (req, res) => {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在',
    data: null
  })
}

module.exports = {
  errorHandler,
  notFoundHandler
}
