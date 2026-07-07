# 安全设计与加固清单

> 周边可视化系统（Node.js + Express + Vue3 + MySQL）的安全水位与加固记录。

## 一、整体安全水位

| 维度 | 措施 | 状态 |
|---|---|---|
| SQL 注入 | 全程参数化查询(`?`+params) + 列名白名单(`ALLOWED_COLS`/tag_type) | ✅ |
| XSS | 无 `v-html`；`utils/safeUrl` 拦 `javascript:`/`data:` 协议；构建期注入 CSP | ✅ |
| 文件上传 | 扩展名+MIME+魔数 三重校验 + 大小限制 + 静态托管加 nosniff | ✅ |
| 认证/会话 | bcrypt 哈希；JWT 24h 过期；生产环境密钥缺失即启动失败 | ✅ |
| 限流防爆破 | 登录 20次/15分/IP；写接口 120次/分/用户（按 JWT 用户 keying） | ✅ |
| SSRF | `utils/urlSafety` 协议白名单 + 解析 IP 拦私网 | ✅ |
| 安全响应头 | nosniff / X-Frame-Options:DENY / Referrer-Policy / HSTS | ✅ |
| 敏感来源 | github/gitee 隐藏链接 + 不抓封面，防源码地址泄露 | ✅ |
| 依赖漏洞 | `npm audit` 前后端 0 漏洞（xlsx 升 SheetJS 0.20.3） | ✅ |
| 审计日志 | 写操作经 auditLog 中间件留痕 | ✅ |
| 分页边界 | page≥1、pageSize 1~100，防负偏移/全表拉取 | ✅ |
| 路径穿越 | 文件名取 basename + 路径归属二次校验 | ✅ |
| 数据备份 | `tools/backup_db.sh`，保留最近 30 份 | ✅ |

## 二、越权自查报告

权限模型为**角色级**（admin / editor / viewer），非归属级。结论：无关键越权漏洞，适合内部团队工具。

### 写操作权限矩阵

| 操作 | 权限要求 | 说明 |
|---|---|---|
| 删除（所有资源） | admin | 仅管理员可删，✅ |
| 用户管理/改密 | admin | ✅ |
| 系统配置 / 供应商改 | admin | ✅ |
| 编辑项目/价格/灵感/设计注意/标签 | editor | 任意编辑者可改任意记录（协作模型） |

### 设计说明
- **协作模型**：editor 可编辑所有同事实例数据（项目/价格/灵感/设计注意）。对内部团队工具这是预期行为，**未做"仅创建者可改"的归属级校验**。若未来需要"只能改自己创建的"，需加 `create_user_id = req.user.id` 校验。
- **越权读**：editor 可读全部业务数据（工作所需）；访客搜索接口只返回 `id/title/description/author/categories`，不暴露链接/封面/敏感字段。
- **敏感操作**：删除、用户管理、配置、供应商均为 admin 专属，editor 无法越权。

### 若要升级为归属级（可选）
在每个 PUT `/:id` 控制器加：
```js
const [row] = await db.query('SELECT create_user_id FROM <table> WHERE id=? AND is_delete=0', [id])
if (!row) return res.status(404).json(Response.notFound('不存在'))
if (row.create_user_id !== req.user.id && !req.user.role_codes.includes('admin')) {
  return res.status(403).json(Response.forbidden('仅创建者或管理员可修改'))
}
```

## 三、限流策略（不影响多人协作）

| 接口 | 限流维度 | 阈值 | 影响 |
|---|---|---|---|
| `/auth/login` | IP | 20次/15分 | 登录低频，多人共 IP 也不误伤 |
| 写接口(POST/PUT/DELETE) | 用户(JWT id) | 120次/分/用户 | 每人独立配额，A 不影响 B；只拦脚本 |
| 读接口 | 不限 | — | 浏览/查询零影响 |

## 四、备份

```bash
# 手动备份
bash tools/backup_db.sh

# 定时备份（Linux crontab，每天 03:17）
17 3 * * * cd /path/to/project && bash tools/backup_db.sh >> backups/backup.log 2>&1
```
- 备份文件：`backups/goods_visualization_YYYYMMDD_HHMMSS.sql.gz`
- 自动保留最近 30 份，更早的清理。

## 五、CSP（内容安全策略）

- 构建期由 `vite.config.js` 的 `cspPlugin` 注入到 `dist/index.html` 的 `<meta>` 标签。
- `script-src 'self'`：阻断内联脚本注入（构建产物无内联脚本）。
- dev 模式不注入，不影响开发热更新。
- 如上线后某功能被 CSP 拦截，按报错在 `vite.config.js` 的 csp 数组里放行对应来源。

## 六、运维 Checklist

- [ ] 生产环境 `NODE_ENV=production` 且设置 `JWT_SECRET`（否则启动失败）
- [ ] 生产环境设置 `CORS_ORIGINS` 为正式域名白名单
- [ ] HTTPS 部署（启用 HSTS）
- [ ] 定时备份已配置
- [ ] 定期 `npm audit`（前后端）
- [ ] 上传目录 `/uploads` 不允许执行权限（nginx 配 `location /uploads/ { ... }` 不解析 PHP/脚本）
