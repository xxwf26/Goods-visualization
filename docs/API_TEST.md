# API 接口测试文档

## 概述

本文档描述周边可视化系统的全量接口测试方案，覆盖所有 API 的增删改查（CRUD）操作、权限边界测试和数据清理验证。

- **测试脚本**：`tools/api_test.js`
- **运行方式**：`node tools/api_test.js`
- **测试环境**：本地（http://localhost:3000）
- **数据安全**：所有写操作使用虚构数据，测试后自动删除，不影响原有数据

---

## 测试架构

```
tools/api_test.js
├── 1. 认证模块 (7项)
├── 2. 标签模块 (6项)
├── 3. 项目模块 (6项)
├── 4. 价格记录模块 (7项)
├── 5. 灵感模块 (5项)
├── 6. 供应商模块 (6项)
├── 7. 设计注意模块 (5项)
├── 8. 搜索模块 (2项)
├── 9. 统计模块 (1项)
├── 10. 配置模块 (2项)
├── 11. 日志模块 (2项)
├── 12. 流量监控 (1项)
├── 13. 权限越权测试 (9项)
└── 14. 清理验证 (6项)

总计: 65 个测试用例
```

---

## 测试工具

| 工具 | 说明 |
|---|---|
| Node.js 内置 `fetch` | 发送 HTTP 请求（无需第三方依赖） |
| `dotenv` | 读取后端 .env 配置 |
| 控制台输出 | ✅/❌ 图标 + 通过/失败计数 |

### 辅助函数

```javascript
// 发送请求（自动带 token）
async function req(method, path, body = null)

// 记录测试结果
function log(ok, name, detail = '')
```

---

## 各模块测试详情

### 1. 认证模块（7项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 1.1 | POST | /auth/login | admin 登录 | 200 + token |
| 1.2 | POST | /auth/login | 错误密码 | 401 |
| 1.3 | GET | /auth/current | 获取当前用户 | 200 |
| 1.4 | GET | /auth/menus | 获取菜单权限 | 200 |
| 1.5 | GET | /auth/permissions | 获取按钮权限 | 200 |
| 1.6 | GET | /auth/users | 用户列表 | 200 |
| 1.7 | GET | /auth/current | 无 token 访问 | 401 |

### 2. 标签模块（6项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 2.1 | GET | /tags | 标签列表 | 200 |
| 2.2 | GET | /tags?tag_type=ip | 按类型筛选 | 200 |
| 2.3 | GET | /tags/tree | 标签树 | 200 |
| 2.4 | POST | /tags | 新增虚构标签 | 200 + id |
| 2.5 | PUT | /tags/:id | 更新标签名 | 200 |
| 2.6 | DELETE | /tags/:id | 删除虚构标签 | 200 |

**虚构数据**：`{ tag_name: 'TEST_TAG_DELETE_ME', tag_type: 'category' }`

### 3. 项目模块（6项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 3.1 | GET | /projects?page=1&pageSize=5 | 项目列表 | 200 + total |
| 3.2 | GET | /projects/options | 筛选选项 | 200 |
| 3.3 | POST | /projects | 新增虚构项目 | 200 + id |
| 3.4 | GET | /projects/:id | 项目详情 | 200 |
| 3.5 | PUT | /projects/:id | 更新项目 | 200 |
| 3.6 | DELETE | /projects/:id | 删除虚构项目 | 200 |

**虚构数据**：`{ product_name: 'TEST_PROJECT_DELETE_ME', project_name: '测试项目', total_amount: 999.99 }`

### 4. 价格记录模块（7项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 4.1 | GET | /price-records | 列表 | 200 |
| 4.2 | GET | /price-records/options | 筛选选项 | 200 |
| 4.3 | GET | /price-records/query | 价格查询 | 200 |
| 4.4 | POST | /price-records | 新增虚构记录 | 200 + id |
| 4.5 | GET | /price-records/:id | 详情 | 200 |
| 4.6 | PUT | /price-records/:id | 更新 | 200 |
| 4.7 | DELETE | /price-records/:id | 删除 | 200 |

**虚构数据**：`{ product_name: 'TEST_PRICE_DELETE_ME', unit_price: 9.99, total_quantity: 100 }`

### 5. 灵感模块（5项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 5.1 | GET | /inspirations | 列表 | 200 |
| 5.2 | POST | /inspirations | 新增虚构灵感 | 200 + id |
| 5.3 | GET | /inspirations/:id | 详情 | 200 |
| 5.4 | PUT | /inspirations/:id/detail | 更新详情 | 200 |
| 5.5 | DELETE | /inspirations/:id | 删除 | 200 |

**虚构数据**：`{ title: 'TEST_INSPIRATION_DELETE_ME', source_url: 'https://example.com/test' }`
> 注意：测试用例不传小红书链接，避免触发后台 AI 分析

### 6. 供应商模块（6项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 6.1 | GET | /suppliers | 列表 | 200 |
| 6.2 | GET | /suppliers/dashboard | 供应商看板 | 200 |
| 6.3 | POST | /suppliers | 新增虚构供应商 | 200 + id |
| 6.4 | GET | /suppliers/:id | 详情 | 200 |
| 6.5 | PUT | /suppliers/:id | 更新 | 200 |
| 6.6 | DELETE | /suppliers/:id | 删除 | 200 |

**虚构数据**：`{ supplier_name: 'TEST_SUPPLIER_<timestamp>', contact_person: '测试人' }`
> 注意：供应商名用时间戳后缀避免唯一键冲突

### 7. 设计注意模块（5项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 7.1 | GET | /design-notes | 列表 | 200 |
| 7.2 | POST | /design-notes | 新增虚构记录 | 200 + id |
| 7.3 | GET | /design-notes/:id | 详情 | 200 |
| 7.4 | PUT | /design-notes/:id | 更新 | 200 |
| 7.5 | DELETE | /design-notes/:id | 删除 | 200 |

**虚构数据**：`{ title: 'TEST_NOTE_DELETE_ME', content: '测试内容', note_type: 'design' }`

### 8. 搜索模块（2项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 8.1 | GET | /search?q=烫金 | 正常搜索 | 200 + groups |
| 8.2 | GET | /search?q= | 空关键词 | 400 |

### 9. 统计模块（1项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 9.1 | GET | /statistics/dashboard | 仪表盘数据 | 200 |

### 10. 配置模块（2项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 10.1 | GET | /settings/visitor_hot_words | 获取单个配置 | 200 |
| 10.2 | GET | /settings | 获取所有配置 | 200 |

### 11. 日志模块（2项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 11.1 | GET | /logs | 日志列表 | 200 |
| 11.2 | GET | /logs/modules | 日志模块列表 | 200 |

### 12. 流量监控（1项）

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 12.1 | GET | /traffic-stats | 流量统计 | 200 |

### 13. 权限越权测试（9项）

使用 viewer 账号登录，测试权限边界：

| # | 方法 | 接口 | 说明 | 预期 |
|---|---|---|---|---|
| 13.1 | POST | /auth/login | viewer 登录 | 200 + token |
| 13.2 | GET | /settings | viewer 访问管理配置 | 403 |
| 13.3 | GET | /logs | viewer 访问操作日志 | 403 |
| 13.4 | GET | /traffic-stats | viewer 访问流量监控 | 403 |
| 13.5 | GET | /auth/users | viewer 访问用户管理 | 403 |
| 13.6 | POST | /tags | viewer 尝试写标签 | 403 |
| 13.7 | DELETE | /projects/1 | viewer 尝试删除项目 | 403 |
| 13.8 | GET | /projects | viewer 正常读项目 | 200 |
| 13.9 | GET | /search | viewer 正常搜索 | 200 |

### 14. 清理验证（6项）

验证所有虚构数据已删除：

| # | 检查项 | 预期 |
|---|---|---|
| 14.1 | GET /projects/:id | 404 |
| 14.2 | GET /price-records/:id | 404 |
| 14.3 | GET /inspirations/:id | 404 |
| 14.4 | GET /suppliers/:id | 404 |
| 14.5 | GET /design-notes/:id | 404 |
| 14.6 | GET /tags/:id | 404 |

---

## 测试账号

| 角色 | 用户名 | 密码 | 权限 |
|---|---|---|---|
| 管理员 | admin | admin123 | 全部操作 |
| 查看者 | viewer | viewer123 | 只读 + 访客搜索 |

---

## 运行方式

```bash
# 确保后端在运行
pm2 status goods-backend

# 运行测试
cd tools
node api_test.js

# 预期输出
═══════════════════════════════════════════
  周边可视化系统 — 全量接口测试
═══════════════════════════════════════════
...(各模块测试结果)...
═══════════════════════════════════════════
  测试完成: ✅ 65 通过  ❌ 0 失败
  虚构数据: 6 条已全部清理
═══════════════════════════════════════════
```

---

## 测试发现的 Bug 及修复记录

本次测试发现并修复了 5 个 Bug：

| Bug | 模块 | 原因 | 修复方式 |
|---|---|---|---|
| GET /auth/permissions 500 | 认证 | MySQL8 严格模式下 DISTINCT + ORDER BY 列不匹配 | SELECT 加 `p.id` |
| GET /tags/tree 500 | 标签 | `this.buildTree` 在实例方法中引用静态方法 | 改为 `TagController.buildTree` |
| DELETE /tags/:id 500 | 标签 | `db.query` 返回数组被错误解构为 `[children]` | 去掉解构，直接用返回值 |
| POST /projects 500 | 项目 | INSERT 列数(28)与值数(29)不匹配 | 列名 `supplier_name` → `supplier_id, buyer_id` |
| POST /tags 500 | 标签 | tag 表缺少 `description` 列 | `ALTER TABLE tag ADD COLUMN description` |
| POST /suppliers 500 | 供应商 | supplier 表缺少 `risk_level` 列 | `ALTER TABLE supplier ADD COLUMN risk_level` |

---

## 注意事项

1. **测试前确保后端运行**：`pm2 status goods-backend` 确认 online
2. **测试账号需要存在**：admin/admin123 和 viewer/viewer123
3. **供应商名用时间戳**：避免唯一键 `uk_supplier_name` 冲突（软删除的记录仍占唯一键）
4. **灵感测试不传小红书链接**：避免触发后台 AI 分析（耗时且消耗 API 额度）
5. **测试不影响原有数据**：所有写操作用 `TEST_*` 前缀的虚构数据，测试后立即删除并验证 404
6. **测试会触发审计日志**：CRUD 操作会被 `auditLog` 中间件记录，属正常行为

---

## 扩展指南

如需新增测试用例：

1. 在对应模块区域添加测试代码
2. 使用 `req(method, path, body)` 发送请求
3. 使用 `log(ok, name, detail)` 记录结果
4. 虚构数据的 ID 存入 `createdIds` 对象，清理验证阶段会检查
5. 涉及创建的测试，在清理验证阶段加对应的 404 检查
