/**
 * 数据验证器工具
 */

class Validator {
  constructor(data) {
    this.data = data
    this.errors = []
  }

  required(fields) {
    const fieldList = Array.isArray(fields) ? fields : [fields]
    for (const field of fieldList) {
      const value = this.getValue(field)
      if (value === undefined || value === null || value === '') {
        this.errors.push(field + ' 不能为空')
      }
    }
    return this
  }

  optional(fields) {
    return this
  }

  isInteger(field, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      if (!Number.isInteger(Number(value))) {
        this.errors.push(message || field + ' 必须是整数')
      }
    }
    return this
  }

  isNumber(field, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      if (isNaN(Number(value))) {
        this.errors.push(message || field + ' 必须是数字')
      }
    }
    return this
  }

  isPositive(field, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      if (Number(value) <= 0) {
        this.errors.push(message || field + ' 必须是正数')
      }
    }
    return this
  }

  minLength(field, min, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      if (String(value).length < min) {
        this.errors.push(message || field + ' 长度不能小于 ' + min)
      }
    }
    return this
  }

  maxLength(field, max, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      if (String(value).length > max) {
        this.errors.push(message || field + ' 长度不能大于 ' + max)
      }
    }
    return this
  }

  isIn(field, values, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      if (!values.includes(value)) {
        const valuesStr = values.join(', ')
        this.errors.push(message || field + ' 必须是 [' + valuesStr + '] 之一')
      }
    }
    return this
  }

  isEmail(field, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        this.errors.push(message || field + ' 必须是有效的邮箱地址')
      }
    }
    return this
  }

  isUrl(field, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      try {
        new URL(value)
      } catch (e) {
        this.errors.push(message || field + ' 必须是有效的URL')
      }
    }
    return this
  }

  isDate(field, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        this.errors.push(message || field + ' 必须是有效的日期')
      }
    }
    return this
  }

  isArray(field, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      if (!Array.isArray(value)) {
        this.errors.push(message || field + ' 必须是数组')
      }
    }
    return this
  }

  custom(field, validatorFn, message) {
    const value = this.getValue(field)
    if (value !== undefined && value !== null && value !== '') {
      try {
        if (!validatorFn(value)) {
          this.errors.push(message || field + ' 验证失败')
        }
      } catch (e) {
        this.errors.push(message || field + ' 验证失败')
      }
    }
    return this
  }

  getValue(field) {
    const keys = field.split('.')
    let value = this.data
    for (const key of keys) {
      if (value === undefined || value === null) return undefined
      value = value[key]
    }
    return value
  }

  validate() {
    return this.errors.length === 0
  }

  getErrors() {
    return this.errors
  }

  getFirstError() {
    return this.errors[0] || '验证失败'
  }
}

const validate = (data) => new Validator(data)

module.exports = {
  Validator,
  validate
}
