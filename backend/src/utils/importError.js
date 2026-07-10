/**
 * 把批量导入时的原始错误（多为数据库报错）翻译成用户能看懂的人话。
 * 用于 ImportService / 各 controller 的 import 错误收集处。
 */

function humanizeImportError(err) {
  const msg = (err && err.message) ? String(err.message) : '未知错误'
  // MySQL 常见报错
  if (/Data too long for column/i.test(msg)) {
    const m = msg.match(/column '([^']+)'/i)
    return `${m ? m[1] : '某字段'} 内容过长，请缩短后重试`
  }
  if (/Incorrect \w+ value/i.test(msg) || /truncated/i.test(msg)) {
    const m = msg.match(/column '([^']+)'/i)
    return `${m ? m[1] : '某字段'} 格式不正确（如日期、数字填写有误）`
  }
  if (/Duplicate entry/i.test(msg)) {
    return '数据重复，该记录可能已存在（如名称重复）'
  }
  if (/cannot be null/i.test(msg) || /doesn't have a default value/i.test(msg)) {
    const m = msg.match(/column '([^']+)'/i)
    return `${m ? m[1] : '某字段'} 不能为空`
  }
  if (/foreign key constraint/i.test(msg)) {
    return '关联数据不存在（如供应商、IP 等未在系统中找到）'
  }
  if (/out of range/i.test(msg)) {
    return '数值超出范围（如金额、数量过大）'
  }
  // 网络层
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) return '网络连接失败，请稍后重试'
  return msg
}

module.exports = { humanizeImportError }
