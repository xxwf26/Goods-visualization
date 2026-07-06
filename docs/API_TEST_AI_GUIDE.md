# 周边可视化系统 — 接口批量测试指南（AI 可执行版）

> 本文档面向 AI Agent。读完后，AI 应能独立完成全量接口的批量测试：登录取 token → 按 65 个用例逐条发请求 → 四层断言 → 清理虚构数据 → 验证 404 → 输出通过/失败报告。也可按同一方法为新接口扩展用例。
>
> 来源：由 `docs/API_TEST.md`、`docs/API_TEST_GUIDE.md`、`tools/api_test.js` 改写整理。

---

## 0. 一句话总览

对 `http://localhost:3000/api` 下 14 个模块共 65 个用例做 CRUD 闭环测试。所有写操作用 `TEST_*` 前缀虚构数据，测完即删并验证 404，不污染真实数据。

---

## 1. 环境与前置条件

| 项 | 值 |
|---|---|
| 后端 BASE URL | `http://localhost:3000/api` |
| 后端运行确认 | `pm2 status goods-backend` 应为 online（或 `curl http://localhost:3000/api/settings` 返回 200） |
| 测试账号-管理员 | `admin` / `admin123`（全部权限） |
| 测试账号-查看者 | `viewer` / `viewer123`（只读 + 访客搜索） |
| 依赖 | Node.js 内置 `fetch` + `dotenv`，无需第三方库 |

**前置检查**：若后端未运行，所有用例都会失败（连接拒绝）。先确认后端在线再开始。

---

## 2. 核心方法约定（必须严格遵循）

### 2.1 请求函数 `req(method, path, body)`

```
- URL = BASE + path
- headers: { 'Content-Type': 'application/json' }
- 若已有 TOKEN：追加 headers['Authorization'] = 'Bearer ' + TOKEN
- method ∈ {GET, POST, PUT, DELETE}
- body 非 null 时：opts.body = JSON.stringify(body)
- 返回 { status: number, data: object }；若响应非 JSON，data = { raw: text }
```

### 2.2 断言函数 `log(ok, name, detail)`

- `ok` 为布尔表达式结果；`name` 为用例名；`detail` 为补充信息（如 `status=200, id=12`）。
- 通过则 `passCount++`，失败则 `failCount++`。失败时仍继续后续用例（不中断）。

### 2.3 CRUD 闭环（每个有写操作的模块都按此顺序）

```
1. POST 创建虚构数据 → 取回 id 存入 createdIds
2. GET /:id 读详情 → 断言 200
3. PUT /:id 更新 → 断言 200
4. DELETE /:id 删除 → 断言 200
5.（清理验证阶段）GET /:id → 断言 404
```

若第 1 步未拿到 id，则跳过 2/3/4，但仍要在清理验证阶段记录该模块未创建。

### 2.4 四层断言（判定用例是否通过）

| 层 | 判定内容 | 示例 |
|---|---|---|
| 1 状态码 | `r.status === 预期值` | 创建成功 200、错误密码 401、越权 403、不存在 404、空参 400 |
| 2 结构 | 返回 JSON 含 `data` 字段 | `r.data?.data?.id` 存在 |
| 3 内容 | 关键字段值正确 | `total > 0`、`groups.length` |
| 4 副作用 | 数据真的写进/删掉了 | 创建后能 GET 到、删除后 GET 返回 404 |

**最小断言**：至少做第 1 层（状态码）。有 id 返回的用例必须做第 2 层（拿到 id）。

### 2.5 TOKEN 管理

- 全局变量 `TOKEN`：登录后写入 admin token，后续请求自动带上。
- 测无 token 场景：临时 `TOKEN=''` 发请求后立即恢复。
- 测 viewer 越权：保存当前 TOKEN → 用 viewer 登录得到 viewerToken → 赋给 TOKEN → 测完恢复原 TOKEN。

---

## 3. 通用执行规则（数据安全）

1. **所有写操作用虚构数据**，字段值带 `TEST_` 前缀或 `DELETE_ME`，便于识别和清理。
2. **测试后立即删除**，并在第 14 阶段统一验证 404。
3. **供应商名用时间戳后缀**（如 `TEST_SUPPLIER_<timestamp>`），因 `uk_supplier_name` 唯一键包含软删除记录，会冲突。
4. **灵感测试不传小红书链接**：`source_url` 用 `https://example.com/test`，避免触发后台 AI 图文分析（耗时且消耗 API 额度）。
5. **不影响的真实数据**：所有虚构数据测完即删，CRUD 操作触发审计日志属正常。
6. **createdIds 对象**：`{ project, priceRecord, inspiration, supplier, designNote, tag, user }`，每个创建用例把 id 写进对应键，供清理验证阶段使用。

---

## 4. 完整测试用例清单（65 条，按模块顺序执行）

> 每条用例格式：`编号 | 方法 | 路径 | 请求体 | 预期状态 | 断言要点`

### 模块 1：认证（7 条）

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 1.1 | POST | /auth/login | `{username:'admin',password:'admin123'}` | 200 | status=200 且返回 token；**将 token 存入 TOKEN** |
| 1.2 | POST | /auth/login | `{username:'admin',password:'wrong'}` | 401 | status=401 |
| 1.3 | GET | /auth/current | — | 200 | status=200 |
| 1.4 | GET | /auth/menus | — | 200 | status=200 |
| 1.5 | GET | /auth/permissions | — | 200 | status=200 |
| 1.6 | GET | /auth/users?page=1&pageSize=10 | — | 200 | status=200 |
| 1.7 | GET | /auth/current | （TOKEN 置空） | 401 | status=401；测完恢复 TOKEN |

### 模块 2：标签（6 条）

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 2.1 | GET | /tags | — | 200 | status=200 |
| 2.2 | GET | /tags?tag_type=ip | — | 200 | status=200 |
| 2.3 | GET | /tags/tree | — | 200 | status=200 |
| 2.4 | POST | /tags | `{tag_name:'TEST_TAG_DELETE_ME',tag_code:'test_delete',tag_type:'category',sort:999}` | 200 | status=200 且返回 id；存入 createdIds.tag |
| 2.5 | PUT | /tags/:id | `{tag_name:'TEST_TAG_UPDATED'}` | 200 | status=200 |
| 2.6 | DELETE | /tags/:id | — | 200 | status=200 |

### 模块 3：项目（6 条）

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 3.1 | GET | /projects?page=1&pageSize=5 | — | 200 | status=200，含 pagination.total |
| 3.2 | GET | /projects/options | — | 200 | status=200 |
| 3.3 | POST | /projects | `{product_name:'TEST_PROJECT_DELETE_ME',project_name:'测试项目',project_year:2026,region:'国服',total_amount:999.99,requester:'测试人',requirement_type:'新需求'}` | 200 | 返回 id；存入 createdIds.project |
| 3.4 | GET | /projects/:id | — | 200 | status=200 |
| 3.5 | PUT | /projects/:id | `{product_name:'TEST_PROJECT_UPDATED',total_amount:888.88}` | 200 | status=200 |
| 3.6 | DELETE | /projects/:id | — | 200 | status=200 |

### 模块 4：价格记录（7 条）

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 4.1 | GET | /price-records?page=1&pageSize=5 | — | 200 | status=200 |
| 4.2 | GET | /price-records/options | — | 200 | status=200 |
| 4.3 | GET | /price-records/query?keyword=test | — | 200 | status=200 |
| 4.4 | POST | /price-records | `{product_name:'TEST_PRICE_DELETE_ME',category:'纸制品',supplier_name:'测试供应商',ip:'无限暖暖',unit_price:9.99,total_quantity:100,total_price:999.00}` | 200 | 返回 id；存入 createdIds.priceRecord |
| 4.5 | GET | /price-records/:id | — | 200 | status=200 |
| 4.6 | PUT | /price-records/:id | `{unit_price:19.99}` | 200 | status=200 |
| 4.7 | DELETE | /price-records/:id | — | 200 | status=200 |

### 模块 5：灵感（5 条）

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 5.1 | GET | /inspirations?page=1&pageSize=5 | — | 200 | status=200 |
| 5.2 | POST | /inspirations | `{title:'TEST_INSPIRATION_DELETE_ME',source_url:'https://example.com/test',inspiration_type:'peripheral',collection_status:'uncollected'}` | 200 | 返回 id；存入 createdIds.inspiration |
| 5.3 | GET | /inspirations/:id | — | 200 | status=200 |
| 5.4 | PUT | /inspirations/:id/detail | `{title:'TEST_INSPIRATION_UPDATED',description:'测试描述'}` | 200 | status=200 |
| 5.5 | DELETE | /inspirations/:id | — | 200 | status=200 |

> ⚠️ 5.2 的 source_url **禁止**填小红书链接，否则触发后台 AI 分析。

### 模块 6：供应商（6 条）

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 6.1 | GET | /suppliers?page=1&pageSize=5 | — | 200 | status=200 |
| 6.2 | GET | /suppliers/dashboard | — | 200 | status=200 |
| 6.3 | POST | /suppliers | `{supplier_name:'TEST_SUPPLIER_<timestamp>',supplier_short_name:'测试',contact_person:'测试人',contact_phone:'13800000000'}` | 200 | 返回 id；存入 createdIds.supplier |
| 6.4 | GET | /suppliers/:id | — | 200 | status=200 |
| 6.5 | PUT | /suppliers/:id | `{contact_person:'测试人2'}` | 200 | status=200 |
| 6.6 | DELETE | /suppliers/:id | — | 200 | status=200 |

> ⚠️ 6.3 的 supplier_name 必须带时间戳后缀，避免唯一键冲突。

### 模块 7：设计注意（5 条）

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 7.1 | GET | /design-notes?page=1&pageSize=5 | — | 200 | status=200 |
| 7.2 | POST | /design-notes | `{title:'TEST_NOTE_DELETE_ME',content:'测试内容',note_type:'design'}` | 200 | 返回 id；存入 createdIds.designNote |
| 7.3 | GET | /design-notes/:id | — | 200 | status=200 |
| 7.4 | PUT | /design-notes/:id | `{title:'TEST_NOTE_UPDATED'}` | 200 | status=200 |
| 7.5 | DELETE | /design-notes/:id | — | 200 | status=200 |

### 模块 8：搜索（2 条）

| # | 方法 | 路径 | 预期 | 断言 |
|---|---|---|---|---|
| 8.1 | GET | /search?q=烫金 | 200 | status=200，含 groups 数组 |
| 8.2 | GET | /search?q= | 400 | status=400（空关键词） |

### 模块 9：统计（1 条）

| # | 方法 | 路径 | 预期 | 断言 |
|---|---|---|---|---|
| 9.1 | GET | /statistics/dashboard | 200 | status=200 |

### 模块 10：配置（2 条）

| # | 方法 | 路径 | 预期 | 断言 |
|---|---|---|---|---|
| 10.1 | GET | /settings/visitor_hot_words | 200 | status=200 |
| 10.2 | GET | /settings | 200 | status=200 |

### 模块 11：日志（2 条）

| # | 方法 | 路径 | 预期 | 断言 |
|---|---|---|---|---|
| 11.1 | GET | /logs?page=1&pageSize=5 | 200 | status=200 |
| 11.2 | GET | /logs/modules | 200 | status=200 |

### 模块 12：流量监控（1 条）

| # | 方法 | 路径 | 预期 | 断言 |
|---|---|---|---|---|
| 12.1 | GET | /traffic-stats | 200 | status=200 |

### 模块 13：权限越权（9 条，用 viewer 账号）

先 POST /auth/login 用 `{username:'viewer',password:'viewer123'}` 登录，取 viewerToken 赋给 TOKEN。

| # | 方法 | 路径 | 请求体 | 预期 | 断言 |
|---|---|---|---|---|---|
| 13.1 | POST | /auth/login | viewer 凭证 | 200 | status=200 且返回 token |
| 13.2 | GET | /settings | — | 403 | viewer 无权访问管理配置 |
| 13.3 | GET | /logs | — | 403 | viewer 无权访问操作日志 |
| 13.4 | GET | /traffic-stats | — | 403 | viewer 无权访问流量监控 |
| 13.5 | GET | /auth/users | — | 403 | viewer 无权访问用户管理 |
| 13.6 | POST | /tags | `{tag_name:'HACK',tag_type:'ip'}` | 403 | viewer 无写权限 |
| 13.7 | DELETE | /projects/1 | — | 403 | viewer 无删除权限（用 id=1，不会真删因 403 拦截） |
| 13.8 | GET | /projects?page=1&pageSize=1 | — | 200 | viewer 可读项目 |
| 13.9 | GET | /search?q=test | — | 200 | viewer 可搜索 |

> 测完恢复 admin 的 TOKEN。

### 模块 14：清理验证（6 条）

对 createdIds 中每个非空 id，GET 其详情接口，应全部返回 404（证明虚构数据已删干净）。

| # | 检查路径 | 预期 |
|---|---|---|
| 14.1 | GET /projects/:id | 404 |
| 14.2 | GET /price-records/:id | 404 |
| 14.3 | GET /inspirations/:id | 404 |
| 14.4 | GET /suppliers/:id | 404 |
| 14.5 | GET /design-notes/:id | 404 |
| 14.6 | GET /tags/:id | 404 |

---

## 5. 执行流程（AI 操作步骤）

```
1. 前置检查：确认后端在 localhost:3000 在线。
2. 初始化：passCount=0, failCount=0, createdIds={...7个键null}, TOKEN=''。
3. 模块1：admin 登录 → 写 TOKEN → 跑 1.1~1.7。
4. 模块2~7：每个模块按 CRUD 闭环跑（GET 列表 → POST 创建存id → GET 详情 → PUT 更新 → DELETE 删除）。
5. 模块8~12：只读接口，逐条 GET 断言状态码。
6. 模块13：viewer 登录 → 9 条越权/可读断言 → 恢复 admin TOKEN。
7. 模块14：遍历 createdIds，GET 验证 404。
8. 汇总：输出 passCount/failCount；failCount>0 则退出码 1，否则 0。
```

---

## 6. 结果报告格式

```
═══════════════════════════════════════════
  测试完成: ✅ {pass} 通过  ❌ {fail} 失败
  虚构数据: {N} 条已全部清理
═══════════════════════════════════════════
```

每条用例输出示例：`✅ POST /auth/login (admin) → status=200` 或 `❌ GET /tags/tree → status=500`。

**通过标准**：65 条全部 ✅，failCount=0，且清理验证 6 条全 404。

---

## 7. 已知历史 Bug（已修复，回归测试时关注）

| Bug | 模块 | 原因 | 修复 |
|---|---|---|---|
| GET /auth/permissions 500 | 认证 | MySQL8 严格模式 DISTINCT+ORDER BY 列不匹配 | SELECT 加 p.id |
| GET /tags/tree 500 | 标签 | 实例方法引用静态方法 | 改 TagController.buildTree |
| DELETE /tags/:id 500 | 标签 | db.query 返回值被错误解构 | 去掉解构 |
| POST /projects 500 | 项目 | INSERT 列数与值数不匹配 | supplier_name → supplier_id,buyer_id |
| POST /tags 500 | 标签 | tag 表缺 description 列 | ALTER TABLE 加列 |
| POST /suppliers 500 | 供应商 | supplier 表缺 risk_level 列 | ALTER TABLE 加列 |

回归时若这些用例再返回 5xx，优先排查上述方向。

---

## 8. 扩展指南（为新接口加测试用例）

1. 在对应模块区域新增一行用例，明确：方法、路径、请求体、预期状态、断言要点。
2. 用 `req(method, path, body)` 发请求，用 `log(ok, name, detail)` 记录。
3. 若涉及创建：把返回 id 存入 `createdIds` 对应键。
4. 在模块 14 清理验证阶段，为该新创建项加一条 `GET /:id → 404` 检查。
5. 涉及权限的接口：补 viewer 越权用例（预期 403）。
6. 虚构数据字段值带 `TEST_` 前缀，便于识别和排查。

---

## 9. 注意事项

- 测试前确保后端运行；否则全红。
- 测试账号 admin/viewer 必须存在（数据库种子已含）。
- 供应商名必须带时间戳后缀。
- 灵感 source_url 禁止用小红书链接。
- CRUD 会写审计日志，属正常，勿当作 Bug。
- 同一脚本可重复运行：虚构数据每次测完即删，无残留冲突。
