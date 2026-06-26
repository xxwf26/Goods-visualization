/**
 * URL 安全校验工具
 * 协议白名单 + 解析主机名拦截内网/环回/链路本地地址，防 SSRF / DNS 重绑定。
 * 由 MetaFetcher（抓元数据）与 LinkChecker（探活）共用。
 */
const dns = require('dns').promises
const net = require('net')

// 判断 IP 是否属于内网/环回/链路本地等不可对外访问的地址
function isBlockedIp(ip) {
  const type = net.isIP(ip)
  if (type === 4) {
    const p = ip.split('.').map(Number)
    if (p[0] === 10) return true                          // 10.0.0.0/8
    if (p[0] === 127) return true                         // 127.0.0.0/8 环回
    if (p[0] === 0) return true                           // 0.0.0.0/8
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true // 172.16.0.0/12
    if (p[0] === 192 && p[1] === 168) return true         // 192.168.0.0/16
    if (p[0] === 169 && p[1] === 254) return true         // 169.254.0.0/16 链路本地/云元数据
    return false
  }
  if (type === 6) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::') return true            // 环回/未指定
    if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true // 链路本地/ULA
    if (v.startsWith('::ffff:')) return isBlockedIp(v.slice(7)) // IPv4 映射
    return false
  }
  return true // 无法识别一律拒绝
}

// 校验 URL 安全性：协议白名单 + 解析主机名拦截私网
async function assertSafeUrl(url) {
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('非法 URL') }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http/https 链接')
  }
  // 主机名本身就是 IP
  if (net.isIP(parsed.hostname) && isBlockedIp(parsed.hostname)) {
    throw new Error('禁止访问内网地址')
  }
  // 解析域名对应的所有 IP，任一命中私网即拒绝（防 DNS 重绑定/内网域名）
  try {
    const addrs = await dns.lookup(parsed.hostname, { all: true })
    if (addrs.some(a => isBlockedIp(a.address))) {
      throw new Error('禁止访问内网地址')
    }
  } catch (e) {
    if (e.message === '禁止访问内网地址') throw e
    throw new Error('域名解析失败')
  }
}

module.exports = { isBlockedIp, assertSafeUrl }
