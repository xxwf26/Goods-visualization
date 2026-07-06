# 接口测试方法与详细步骤指南

## 一、接口测试是什么

接口测试就是：**向服务器的接口发送请求，检查返回的结果是否符合预期**。

一个接口请求包含 4 个部分：

```
1. 方法（GET/POST/PUT/DELETE）— 你要做什么操作
2. 地址（URL）— 你要请求哪个接口
3. 请求头（Headers）— 身份凭证 + 数据格式
4. 请求体（Body）— 你要传什么数据
```

服务器返回的响应也包含 4 个部分：

```
1. 状态码（200/401/403/404/500）— 服务器处理结果
2. 响应头 — 服务器信息
3. 响应体（JSON）— 返回的数据
4. 本项目的统一格式：{ code: 200, message: "操作成功", data: {...} }
```

---

## 二、测试工具

### 2.1 curl（命令行工具）

系统自带，无需安装。适合快速验证单个接口。

### 2.2 Postman（图形化工具）

需要安装，适合手动逐个测试，界面直观。

下载地址：https://www.postman.com/downloads/

### 2.3 Node.js 脚本（自动化测试）

适合批量测试，一次跑完所有接口。

---

## 三、HTTP 方法与 CRUD 对应关系

| HTTP 方法 | 对应操作 | 中文 | 举例 |
|---|---|---|---|
| GET | Read | 查询 | 获取项目列表 |
| POST | Create | 新增 | 创建一个新标签 |
| PUT | Update | 修改 | 修改项目名称 |
| DELETE | Delete | 删除 | 删除一条价格记录 |

---

## 四、HTTP 状态码速查

| 状态码 | 含义 | 什么时候出现 | 测试时怎么判断 |
|---|---|---|---|
| 200 | 成功 | 正常返回数据 | ✅ 通过 |
| 400 | 参数错误 | 必填字段没传、格式不对 | 看测试场景，如果是故意传错参数，400 就是 ✅ |
| 401 | 未认证 | 没带 token 或 token 过期 | 如果是测试无 token 访问，401 就是 ✅ |
| 403 | 无权限 | 登录了但角色不够 | 如果是测试权限越权，403 就是 ✅ |
| 404 | 找不到 | 路径不对、记录已删除 | 如果是验证删除后查不到，404 就是 ✅ |
| 429 | 请求过多 | 触发限流 | 说明限流功能正常 |
| 500 | 服务器错误 | 代码 bug、数据库问题 | ❌ 永远是失败的，需要修 |

**关键理解**：状态码本身没有"好"和"坏"，取决于你期望什么。你期望成功就是 200 好；你期望被拒绝就是 403 好。

---

## 五、curl 命令逐词详解

### 5.1 登录请求

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

逐词拆解：

| 部分 | 含义 |
|---|---|
| `curl` | 命令行工具，用来发送 HTTP 请求 |
| `-X POST` | -X 指定请求方法，POST 表示这是新增/提交操作 |
| `http://localhost:3000/api/auth/login` | 请求地址。localhost=本机，3000=端口，/api/auth/login=登录接口路径 |
| `-H "Content-Type: application/json"` | -H 添加请求头，告诉服务器"我发的数据是 JSON 格式" |
| `-d '{...}'` | -d 指定请求体数据，里面是用户名和密码 |

**预期返回**：

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userInfo": { "id": 1, "username": "admin" }
  }
}
```

**怎么判断成功**：状态码 200 + 返回里有 token。

### 5.2 查询请求（带 token）

```bash
curl http://localhost:3000/api/projects?page=1&pageSize=5 -H "Authorization: Bearer eyJhbGci..."
```

逐词拆解：

| 部分 | 含义 |
|---|---|
| `curl` | 发送请求（不写 -X 默认是 GET） |
| `http://localhost:3000/api/projects` | 项目列表接口地址 |
| `?page=1&pageSize=5` | 查询参数。? 开始参数，& 分隔多个参数。page=1 第1页，pageSize=5 每页5条 |
| `-H "Authorization: Bearer eyJhbGci..."` | 请求头带 token。Bearer 是固定前缀，后面是登录拿到的 token |

**预期返回**：

```json
{
  "code": 200,
  "data": {
    "list": [ { "id": 1, "project_name": "BW展会物料" }, ... ],
    "pagination": { "page": 1, "pageSize": 5, "total": 80 }
  }
}
```

**怎么判断成功**：状态码 200 + list 数组有数据 + total 数量合理。

### 5.3 新增请求

```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"tag_name":"测试标签","tag_type":"category"}'
```

逐词拆解：

| 部分 | 含义 |
|---|---|
| `-X POST` | 用 POST 方法（新增数据） |
| `http://localhost:3000/api/tags` | 标签接口地址 |
| `-H "Authorization: Bearer token"` | 第一个请求头：身份认证 |
| `-H "Content-Type: application/json"` | 第二个请求头：数据格式。可以写多个 -H |
| `-d '{"tag_name":"测试标签","tag_type":"category"}'` | 请求体：要新增的标签名称和类型 |
| `\` | 换行符，让长命令分成多行方便阅读 |

**预期返回**：

```json
{ "code": 200, "message": "创建成功", "data": { "id": 78 } }
```

**怎么判断成功**：状态码 200 + 返回里有 id（说明数据库插入成功）。

### 5.4 修改请求

```bash
curl -X PUT http://localhost:3000/api/tags/78 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"tag_name":"改过的名字"}'
```

逐词拆解：

| 部分 | 含义 |
|---|---|
| `-X PUT` | 用 PUT 方法（修改数据） |
| `http://localhost:3000/api/tags/78` | 路径里的 78 是要修改的标签 ID |
| `-d '{"tag_name":"改过的名字"}'` | 只传要修改的字段，其他字段不变 |

**怎么判断成功**：状态码 200。再发一个 GET 请求查这条记录，名字确实变了。

### 5.5 删除请求

```bash
curl -X DELETE http://localhost:3000/api/tags/78 -H "Authorization: Bearer token"
```

逐词拆解：

| 部分 | 含义 |
|---|---|
| `-X DELETE` | 用 DELETE 方法（删除数据） |
| `http://localhost:3000/api/tags/78` | 路径里的 78 是要删除的标签 ID |
| 没有 -d | 删除不需要传请求体，ID 已经在路径里了 |

**怎么判断成功**：状态码 200。再发 GET 查这个 ID，应该返回 404。

---

## 六、手动测试完整流程（用 curl 或 Postman）

### 第一步：登录拿 token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

从返回结果里复制 token 的值（不含引号）。

### 第二步：测试查询（GET）

```bash
curl http://localhost:3000/api/projects?page=1&pageSize=5 \
  -H "Authorization: Bearer 粘贴你的token"
```

检查：状态码 200，返回有 list 和 total。

### 第三步：测试新增（POST）

```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Authorization: Bearer 粘贴你的token" \
  -H "Content-Type: application/json" \
  -d '{"tag_name":"测试标签_删除用","tag_type":"category"}'
```

检查：状态码 200，返回有 id。记下这个 id。

### 第四步：测试修改（PUT）

```bash
curl -X PUT http://localhost:3000/api/tags/返回的id \
  -H "Authorization: Bearer 粘贴你的token" \
  -H "Content-Type: application/json" \
  -d '{"tag_name":"改过的名字"}'
```

检查：状态码 200。再 GET 一次，名字确实变了。

### 第五步：测试删除（DELETE）

```bash
curl -X DELETE http://localhost:3000/api/tags/返回的id \
  -H "Authorization: Bearer 粘贴你的token"
```

检查：状态码 200。再 GET 一次这个 id，应该返回 404。

### 第六步：测试权限（用 viewer 账号）

```bash
# 用 viewer 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"viewer","password":"viewer123"}'

# 用 viewer 的 token 尝试删除（应该被拒绝）
curl -X DELETE http://localhost:3000/api/projects/1 \
  -H "Authorization: Bearer viewer的token"
```

检查：状态码 403（权限不足）。

### 第七步：测试无 token 访问

```bash
# 不带 Authorization 头
curl http://localhost:3000/api/projects
```

检查：状态码 401（未认证）。

---

## 七、自动化脚本测试详解

### 7.1 脚本结构

```
tools/api_test.js
├── req() 函数      — 封装发送请求的逻辑
├── log() 函数      — 记录测试结果
├── main() 函数     — 按模块顺序执行所有测试
└── createdIds 对象  — 存储测试创建的 ID，用于后续清理验证
```

### 7.2 请求封装函数逐行解释

```javascript
async function req(method, path, body = null) {
```
- `async`：异步函数，因为网络请求需要等待
- `method`：HTTP 方法（GET/POST/PUT/DELETE）
- `path`：接口路径（如 '/projects?page=1'）
- `body = null`：请求体，默认空（GET 不需要）

```javascript
  const headers = { 'Content-Type': 'application/json' }
```
- 创建请求头对象，告诉服务器数据格式是 JSON

```javascript
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
```
- 如果已登录（TOKEN 有值），在请求头里加上身份凭证
- `Bearer ` 是认证协议要求的前缀
- `${TOKEN}` 是 JavaScript 模板字符串，把变量值拼进字符串

```javascript
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
```
- 组装请求配置
- `JSON.stringify(body)`：把 JavaScript 对象转成 JSON 字符串（HTTP 只能传文本）

```javascript
  const resp = await fetch(`http://localhost:3000/api${path}`, opts)
```
- `await`：等待请求完成
- `fetch`：Node.js 内置的 HTTP 请求函数
- URL 拼接：基础地址 + 接口路径

```javascript
  const text = await resp.text()
  try { return { status: resp.status, data: JSON.parse(text) } }
  catch { return { status: resp.status, data: { raw: text } } }
```
- 读取响应体文本
- 尝试解析为 JSON（正常情况）
- 解析失败则保留原始文本（服务器报错时可能返回非 JSON）

### 7.3 一个完整 CRUD 测试示例

```javascript
// ① 新增（Create）
r = await req('POST', '/tags', {
  tag_name: 'TEST_TAG_DELETE_ME',
  tag_type: 'category'
})
createdIds.tag = r.data?.data?.id || null
// r.data 是解析后的 JSON
// r.data.data 是后端返回的 { code, data: { id: 78 } } 里的 data
// r.data?.data?.id 用 ?. 可选链，防止中间某层为 null 报错
// || null 兜底，取不到 id 就给 null
log(r.status === 200 && createdIds.tag, '新增标签', `id=${createdIds.tag}`)
// 判断：状态码 200 并且拿到了 id

// ② 修改（Update）
r = await req('PUT', `/tags/${createdIds.tag}`, {
  tag_name: 'TEST_TAG_UPDATED'
})
// `/tags/${createdIds.tag}` 把 id 拼进路径，如 /tags/78
log(r.status === 200, '更新标签', `status=${r.status}`)

// ③ 删除（Delete）
r = await req('DELETE', `/tags/${createdIds.tag}`)
log(r.status === 200, '删除标签', `status=${r.status}`)

// ④ 验证删除（Read 确认 404）
r = await req('GET', `/tags/${createdIds.tag}`)
log(r.status === 404, '清理验证(应404)', `status=${r.status}`)
// 删除后再查，应该返回 404，说明确实删干净了
```

### 7.4 日志函数解释

```javascript
function log(ok, name, detail = '') {
  const icon = ok ? '✅' : '❌'
  console.log(`${icon} ${name}${detail ? ' → ' + detail : ''}`)
  if (ok) passCount++; else failCount++
}
```
- `ok`：true=通过，false=失败
- `ok ? '✅' : '❌'`：三元表达式，通过显示 ✅，失败显示 ❌
- `passCount++`：通过计数加1
- `failCount++`：失败计数加1

---

## 八、怎么判断接口正常 — 4 个层面

### 层面 1：状态码

```
查询/新增/修改/删除成功 → 200
没登录 → 401
权限不够 → 403
参数错误 → 400
记录不存在 → 404
服务器崩了 → 500（永远不正常）
```

### 层面 2：响应结构

本项目统一返回：

```json
{
  "code": 200,        // 业务码，200=成功
  "message": "操作成功", // 提示信息
  "data": { ... }     // 实际数据
}
```

即使 HTTP 状态码是 200，如果 `code` 不是 200 也算失败。

### 层面 3：数据内容

- 新增后返回了 `id`
- 查询返回的 `list` 数组不为空
- `total` 数量和数据库里的记录数对得上
- 修改后再查，字段值确实变了

### 层面 4：副作用

- 新增后数据库确实多了一条（去数据库查或再 GET 一次）
- 删除后再 GET 返回 404
- 没有影响到其他数据

---

## 九、完整测试示例：项目接口 CRUD

以项目模块为例，完整的 6 步测试：

### 步骤 1：查询列表（验证接口能响应）

```bash
curl http://localhost:3000/api/projects?page=1&pageSize=5 \
  -H "Authorization: Bearer TOKEN"
```

**预期**：200 + list 有数据 + total=80

### 步骤 2：新增虚构项目（验证能写入数据库）

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "TEST_PROJECT_DELETE_ME",
    "project_name": "测试项目",
    "project_year": 2026,
    "region": "国服",
    "total_amount": 999.99,
    "requester": "测试人",
    "requirement_type": "新需求"
  }'
```

**预期**：200 + 返回 `{ "data": { "id": 223 } }`

### 步骤 3：查询详情（验证数据确实存进去了）

```bash
curl http://localhost:3000/api/projects/223 \
  -H "Authorization: Bearer TOKEN"
```

**预期**：200 + `product_name` 是 "TEST_PROJECT_DELETE_ME"

### 步骤 4：修改（验证能更新）

```bash
curl -X PUT http://localhost:3000/api/projects/223 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_name": "TEST_PROJECT_UPDATED", "total_amount": 888.88}'
```

**预期**：200。再查一次，名字变了、金额变了。

### 步骤 5：删除（验证能删除）

```bash
curl -X DELETE http://localhost:3000/api/projects/223 \
  -H "Authorization: Bearer TOKEN"
```

**预期**：200

### 步骤 6：验证删除（确认数据真的没了）

```bash
curl http://localhost:3000/api/projects/223 \
  -H "Authorization: Bearer TOKEN"
```

**预期**：404

**以上 6 步全部通过 = 项目接口的 CRUD 完全正常。**

---

## 十、权限测试

除了功能测试，还要测权限边界：

| 测试场景 | 用什么账号 | 调什么接口 | 预期结果 |
|---|---|---|---|
| 正常读 | admin | GET /projects | 200 |
| 正常写 | admin | POST /tags | 200 |
| viewer 读 | viewer | GET /projects | 200（能看） |
| viewer 写 | viewer | POST /tags | 403（不能写） |
| viewer 删 | viewer | DELETE /projects/1 | 403（不能删） |
| 无 token 读 | 不带 token | GET /projects | 401（没登录） |
| 无 token 写 | 不带 token | POST /tags | 401 |

**权限测试的目的**：确保只有有权限的人能做对应的操作，防止越权。

---

## 十一、运行自动化测试

```bash
# 确保后端在运行
pm2 status goods-backend

# 运行测试脚本
cd tools
node api_test.js
```

预期输出：

```
═══════════════════════════════════════════
  周边可视化系统 — 全量接口测试
═══════════════════════════════════════════

── 1. 认证模块 ──
✅ POST /auth/login (admin) → status=200
✅ POST /auth/login (错误密码应401) → status=401
...

── 14. 清理验证 ──
✅ 清理验证: project #224 (应404) → status=404
...

═══════════════════════════════════════════
  测试完成: ✅ 65 通过  ❌ 0 失败
  虚构数据: 6 条已全部清理
═══════════════════════════════════════════
```

---

## 十二、测试注意事项

1. **测试前确保后端在运行**：`pm2 status goods-backend` 确认 online
2. **测试账号需要存在**：admin/admin123 和 viewer/viewer123
3. **虚构数据用 TEST_ 前缀**：方便识别和清理
4. **供应商名用时间戳**：避免唯一键冲突（软删除的记录仍占唯一键）
5. **灵感测试不传小红书链接**：避免触发 AI 分析（耗时且消耗额度）
6. **测试后验证清理**：每个创建的记录删除后，GET 应返回 404
7. **测试会触发审计日志**：CRUD 操作会被记录，属正常行为
8. **状态码 500 永远是问题**：需要查看后端日志定位原因
