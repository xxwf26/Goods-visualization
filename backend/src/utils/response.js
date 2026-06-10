/**
 * 统一响应格式化工具
 */

const CODE = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
}

const MESSAGE = {
  [CODE.SUCCESS]: '操作成功',
  [CODE.BAD_REQUEST]: '请求参数错误',
  [CODE.UNAUTHORIZED]: '未授权访问',
  [CODE.FORBIDDEN]: '无权限访问',
  [CODE.NOT_FOUND]: '资源不存在',
  [CODE.SERVER_ERROR]: '服务器内部错误'
}

class Response {
  static success(data = null, message = null) {
    return {
      code: CODE.SUCCESS,
      message: message || MESSAGE[CODE.SUCCESS],
      data
    }
  }

  static error(code = CODE.SERVER_ERROR, message = null, data = null) {
    return {
      code,
      message: message || MESSAGE[code] || '未知错误',
      data
    }
  }

  static badRequest(message = '请求参数错误') {
    return this.error(CODE.BAD_REQUEST, message)
  }

  static unauthorized(message = '未授权访问') {
    return this.error(CODE.UNAUTHORIZED, message)
  }

  static forbidden(message = '无权限访问') {
    return this.error(CODE.FORBIDDEN, message)
  }

  static notFound(message = '资源不存在') {
    return this.error(CODE.NOT_FOUND, message)
  }

  static serverError(message = '服务器内部错误') {
    return this.error(CODE.SERVER_ERROR, message)
  }
}

module.exports = {
  CODE,
  MESSAGE,
  Response
}
