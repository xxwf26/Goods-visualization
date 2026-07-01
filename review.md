# 代码审查报告

> 审查时间：2026-07-01
> 审查范围：全项目（前端 + 后端 + 数据库 + 配置）

---

## 一、后端接口清单与问题

### 1.1 路由总览（11 个路由文件，~70 个接口）

| 路由文件 | 挂载路径 | 接口数 | 权限 |
|---|---|---|---|
| auth.js | /api/auth | 10 | 登录无需认证，用户管理需 admin |
| project.js | /api/projects | 8 | 查看 auth，写 editor，删除 admin |
| priceRecord.js | /api/price-records | 8 | 查看 auth，写 editor，删除 admin |
| price.js | /api/price | 3 | auth（旧价格查询模块） |
| inspiration.js | /api/inspirations | 13 | 查看 auth，写 editor，删除 admin |
| inspirationFolder.js | /api/inspiration-folders | 2 | auth |
| supplier.js | /api/suppliers | 7 | 查看 auth，创建/更新/删除 admin |
| designNote.js | /api/design-notes | 5 | 查看 auth，写 editor，删除 admin |
| tag.js | /api/tags | 7 | 查看 auth，写 editor，删除 admin |
| statistics.js | /api/statistics | 3 | auth |
| search.js | /api/search | 1 | auth |
| upload.js | /api/upload | 5 | 写 editor，删除 admin |
| import.js | /api/import | 6 | admin |
| log.js | /api/logs | 2 | auth |

### 1.2 ⚠️ 接口问题

| 问题 | 严重程度 | 说明 |
|---|---|---|
| **price.js 与 priceRecord.js 功能重叠** | 中 | `price.js`（/api/price）是旧的价格查询模块，`priceRecord.js`（/api/price-records）是新模块。两者都有 `/query` 接口，前端 PriceQuery.vue 用 `/price/query`，PriceRecords.vue 用 `/price-records`。旧 price.js 的 `/stats` 和 `/category/:id` 是否还有前端在用需确认 |
| **inspiration.js 的 collect/uncollect 接口可能废弃** | 低 | 收藏夹功能（folders/collect/uncollect）前端已无对应 UI，可能遗留 |
| **SearchController 仍用 `inspiration_type='craft'`** | 高 | `_searchInspiration` 里查 `craftTotal`（`WHERE inspiration_type='craft'`），但分类已改为 packaging/peripheral/effect/production，`craft` 不再存在，craftTotal 永远为 0 |
| **SearchController 未同步 categories 多分类** | 中 | 搜索接口不知道 categories 字段，灵感分组仍按旧逻辑，无法按多分类搜索 |
| **import.js 的 /preview 接口未在 app.js 注册** | 低 | import.js 定义了 `/preview` 路由，但需确认是否被前端使用 |
| **traffic-stats 接口无角色限制写在 app.js** | 低 | 直接在 app.js 里写了 `authMiddleware + requireRole('admin')`，没走路由文件，风格不一致 |

---

## 二、前端 API 层与后端不匹配

| 前端 API 函数 | 后端接口 | 问题 |
|---|---|---|
| `searchAll(q)` (search.js) | GET /api/search?q= | ✅ 正常 |
| `getInspirationDetail` | GET /api/inspirations/:id | ✅ 正常 |
| 前端 `request.js` 在 `api/request.js` | - | ✅ 唯一，无重复 |
| `getPriceStats` (price.js) | GET /api/price/stats | ⚠️ 旧接口，确认 PriceQuery.vue 是否仍在用 |
| `getPriceRecords` (priceRecords.js) | GET /api/price-records | ✅ 正常 |

---

## 三、废弃/未引用的前端文件

### 3.1 废弃组件（无人 import）

| 文件 | 状态 | 建议 |
|---|---|---|
| `components/home/HomepageSearch.vue` | ❌ 废弃 | 首页搜索已移除，改为访客独立搜索页。**删除** |
| `components/common/DialogForm.vue` | ❌ 未引用 | 通用表单弹窗，从未使用。**删除** |
| `components/common/Pagination.vue` | ❌ 未引用 | 通用分页组件，各页面直接用 el-pagination。**删除** |
| `components/common/Filter.vue` | 疑似未引用 | 通用筛选组件，需确认 |
| `components/common/Table.vue` | 疑似未引用 | 通用表格组件，各页面直接用 el-table。需确认 |

### 3.2 废弃页面（无路由引用）

| 文件 | 状态 | 建议 |
|---|---|---|
| `views/permission/PermissionDemo.vue` | ❌ 无路由 | 权限演示页，无路由指向。**删除** |

### 3.3 搜索功能重复（三套搜索）

| 组件 | 用途 | 状态 |
|---|---|---|
| `components/layout/GlobalSearch.vue` | 管理员顶栏弹窗搜索（Header 里触发） | ⚠️ 与访客搜索功能重叠 |
| `views/visitor/index.vue` | 访客独立搜索页 | ✅ 在用 |
| `components/home/HomepageSearch.vue` | 首页搜索框 | ❌ 已废弃 |

**建议**：GlobalSearch（管理员弹窗搜索）和 visitor 搜索功能高度重叠，考虑统一为一套搜索逻辑。

---

## 四、数据库问题

### 4.1 迁移脚本版本混乱

```
fix_schema.sql          (v1, 初始修复)
fix_schema_v2.sql       (v2)
fix_schema_v3.sql       (v3)
fix_schema_v4.sql       (v4, supplier.case_files)
fix_schema_v5_price.sql (v5, price_record 表)
fix_schema_v6_project.sql       (v6, project 补字段)
fix_schema_v6_supplier_risk.sql (v6 重复! supplier 风险字段)
fix_schema_v7_design_note.sql   (v7, design_note 表)
fix_schema_v8_inspiration_type.sql (v8, inspiration_type)
fix_schema_v9_link_status.sql   (v9, link_status)
fix_schema_v10_image_texts.sql  (v10, image_texts)
```

| 问题 | 说明 |
|---|---|
| **v6 有两个文件** | `fix_schema_v6_project.sql` 和 `fix_schema_v6_supplier_risk.sql` 版本号重复，易混淆 |
| **缺少 v11** | `fix_schema_v11_inspiration_category.sql` 在分类重构时创建又被 revert 删除了，categories 字段直接 ALTER 添加无脚本记录 |
| **缺少 categories 迁移脚本** | categories 字段是手动 ALTER 加的，没有迁移脚本，新环境部署会缺这个字段 |
| **test_data.sql 过时** | 测试数据里的 inspiration_type 还是旧值（product），与当前 4 分类不符 |

### 4.2 inspiration_type 与 categories 双字段并存

| 问题 | 说明 |
|---|---|
| **两个字段表达同一概念** | `inspiration_type`（单值）和 `categories`（逗号分隔多值）并存，代码里 `COALESCE(categories, inspiration_type)` 做兜底，逻辑分散 |
| **SearchController 不同步** | 搜索接口仍用 `inspiration_type='craft'` 查 craftTotal，该值已不存在 |
| **前端表单同时提交两个字段** | FormDialog 提交时 `inspiration_type=categories[0]` + `categories=逗号字符串`，重复 |
| **建议** | 统一用 categories 字段，inspiration_type 设为 categories 的第一个值的冗余字段（用于兼容），或完全废弃 inspiration_type |

---

## 五、配置文件问题

### 5.1 .env.example 缺少 AI 配置

```env
# 当前 .env.example 内容（缺少 AI 相关）
PORT=3000
HOST=localhost
DB_HOST=localhost
DB_PORT=3306
...
```

**缺少**：
```env
AI_API_KEY=...
AI_BASE_URL=...
AI_OCR_MODEL=qwen-vl-ocr
AI_TEXT_MODEL=glm-5.2
```

新环境部署时不知道要配 AI，会导致 AI 分析功能静默失败。

### 5.2 .env.example 的 HOST/DB_PORT 与实际不符

| 配置项 | .env.example | 实际 .env | 说明 |
|---|---|---|---|
| HOST | localhost | 0.0.0.0 | 生产应 0.0.0.0 |
| DB_PORT | 3306 | 3307 | 实际 MySQL 在 3307 |

### 5.3 .gitignore

- `traffic_stats.json` ✅ 已排除
- `backend/uploads/` ✅ 已排除（通过 uploads/* 规则）
- `.proxyai/` ✅ 已排除

---

## 六、跨模块不一致

### 6.1 灵感分类的连锁影响

| 模块 | 是否同步 categories | 问题 |
|---|---|---|
| InspirationController (list) | ✅ FIND_IN_SET | 正常 |
| InspirationController (create/update) | ✅ 接收 categories | 正常 |
| SearchController | ❌ 仍用 inspiration_type='craft' | craftTotal 永远 0 |
| 访客搜索页 (visitor) | ⚠️ 不受直接影响 | 搜索结果不显示分类信息 |
| 灵感表单 (FormDialog) | ✅ 多选 categories | 正常 |
| 灵感详情 (DetailDialog) | ⚠️ 不显示 categories | 详情页看不到多分类标签 |

### 6.2 供应商权限不一致

| 操作 | 权限要求 | 对比项目/价格 |
|---|---|---|
| 供应商创建 | admin | 项目创建是 editor |
| 供应商更新 | admin | 价格记录更新是 editor |
| 供应商删除 | admin | 一致 |

供应商的创建/更新要 admin，比项目/价格严格一级，可能是有意设计（供应商是核心数据），但需确认。

---

## 七、潜在 Bug

| Bug | 位置 | 说明 |
|---|---|---|
| **SearchController craftTotal 永远 0** | SearchController.js:142 | `WHERE inspiration_type='craft'` 该值已不存在 |
| **_analyzeInspiration 中 categoriesStr 可能空** | InspirationController.js:678 | AI 分类失败时 categoriesStr=''，`COALESCE(NULLIF('', ''), categories)` = 保持原值，新灵感会没分类。应兜底为 inspiration_type |
| **InspirationFormDialog 的 fetchMeta 仍填 reference_value** | FormDialog.vue:357 | `if (m.description && !formData.reference_value) formData.reference_value = m.description.substring(0, 500)` —— 但后端 autofill 已不填 reference_value，前端表单的 fetchMeta 还在填，不一致 |
| **visitor 页面搜索结果不显示分类** | visitor/index.vue | 搜索结果只有 title/subtitle，看不到灵感属于哪个分类 |
| **InspirationDetailDialog 不显示 categories** | InspirationDetailDialog.vue | 详情页附加信息里没有分类字段展示 |

---

## 八、建议的清理优先级

### P0（影响功能，应立即修）
1. SearchController 移除 `craftTotal`（查不存在的 `'craft'`），或改为查 categories
2. 补 categories 字段的迁移脚本（fix_schema_v11）
3. .env.example 补 AI 配置
4. InspirationDetailDialog 加 categories 展示

### P1（代码整洁，近期修）
5. 删除废弃组件：HomepageSearch.vue、DialogForm.vue、Pagination.vue、PermissionDemo.vue
6. 统一 inspiration_type / categories：废弃 inspiration_type 或明确其为 categories 首值冗余
7. 前端 FormDialog 的 fetchMeta 与后端 autofill 逻辑对齐（reference_value 不自动填）
8. fix_schema_v6 版本号去重

### P2（优化，有空再做）
9. 合并 GlobalSearch 和 visitor 搜索的重复逻辑
10. 确认 price.js 旧模块是否可废弃
11. 确认 collect/uncollect/folders 是否还在用
12. test_data.sql 更新为 4 分类数据
13. 供应商创建/更新权限是否放宽到 editor

---

## 九、技术栈总结

| 层 | 技术 | 版本 |
|---|---|---|
| 前端框架 | Vue 3 (Composition API) | 3.5 |
| UI 库 | Element Plus | 2.14 |
| 状态管理 | Pinia | 3 |
| 路由 | Vue Router | 5 |
| 图表 | ECharts + vue-echarts | 6 / 8 |
| HTTP | Axios | 1.17 |
| 构建 | Vite | 8 |
| 后端 | Node.js + Express | 24 / 4 |
| 数据库 | MySQL | 8.4 (端口 3307) |
| ORM | mysql2 (原生 SQL) | 3.6 |
| 认证 | JWT | jsonwebtoken 9 |
| 文件上传 | Multer + Sharp | 1.4 / 0.34 |
| AI | qwen-vl-ocr + glm-5.2 (OpenAI 兼容协议) | - |
| 进程管理 | PM2 | 7 |

---

## 十、整体架构评价

### 优点
- 前后端分离清晰，API 规范（统一 {code, data, message}）
- 权限体系完整（三级角色 + 按钮级控制）
- AI 能力（OCR + 总结 + 多分类）集成完整
- 流量监控、操作审计等运维功能到位

### 主要问题
- **迭代痕迹重**：多次需求变更（2分类→4分类→多分类，首页搜索→访客搜索，双价格模块）导致遗留代码多
- **字段冗余**：inspiration_type / categories 双字段，reference_value / description 混淆
- **搜索功能分散**：三套搜索（GlobalSearch / visitor / HomepageSearch）逻辑重复
- **迁移脚本不规范**：版本号重复、缺脚本、test_data 过时
