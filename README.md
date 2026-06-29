# 周边可视化系统

基于 Vue3 + Express + MySQL 的前后端分离周边采购灵感与历史价格知识库。支持历史项目/价格记录管理、外部灵感链接归档（含小红书等反爬平台的内容快照与 AI 图文识别）、供应商管理、权限体系。

## 技术栈

### 前端
- Vite 8 + Vue 3.5 + Element Plus 2 + Pinia 3 + Vue Router 5 + ECharts 6 + Axios

### 后端
- Node.js + Express 4 + MySQL (mysql2) + JWT + Multer + Sharp + xlsx + bcryptjs
- AI 能力：视觉 OCR（qwen-vl-ocr）+ 文本总结（glm-5.2），走 OpenAI 兼容协议

## 项目结构

```
Goods visualization/
├── frontend/                 # 前端 (Vue3 + Element Plus)
│   └── src/
│       ├── api/             # 接口层 (含 inspirations 的 analyze/updateDetail)
│       ├── components/      # 组件
│       │   ├── inspiration/ # 灵感组件 (FormDialog/DetailDialog，含就地编辑)
│       │   ├── project/     # 项目组件 (FormDialog/DetailDialog，报价单多图上传)
│       │   ├── priceRecord/ # 价格记录组件
│       │   ├── home/        # 首页图表
│       │   └── layout/      # 布局 (Header/Sidebar，含主题切换)
│       ├── router/          # 路由 + 权限守卫
│       ├── stores/          # Pinia
│       └── views/           # 页面 (project/price/inspiration/supplier/designNote)
│
├── backend/                  # 后端 (Express)
│   └── src/
│       ├── controllers/     # 控制器 (含 Inspiration 的 analyzeImages/updateDetail)
│       ├── routes/          # 路由
│       ├── services/        # MetaFetcher(链接抓取) / LinkChecker(失效检测) / AiAnalyzer(AI图文)
│       ├── utils/           # urlSafety(SSRF防护) / jwt / response / validator
│       └── app.js
│
├── database/                 # 建表脚本 (init.sql + fix_schema_v4~v10 增量迁移)
├── tools/import_images/     # 批量导入脚本 (Excel/图片/灵感元数据回填)
├── start-services.bat        # PM2 开机自启脚本
└── README.md
```

## 快速开始

### 1. 初始化数据库
```bash
mysql -u root -p < database/init.sql
# 依次执行增量迁移
mysql -u root -p goods_visualization < database/fix_schema_v4.sql
mysql -u root -p goods_visualization < database/fix_schema_v5_price.sql
mysql -u root -p goods_visualization < database/fix_schema_v6_project.sql
mysql -u root -p goods_visualization < database/fix_schema_v7_design_note.sql
mysql -u root -p goods_visualization < database/fix_schema_v8_inspiration_type.sql
mysql -u root -p goods_visualization < database/fix_schema_v9_link_status.sql
mysql -u root -p goods_visualization < database/fix_schema_v10_image_texts.sql
```

### 2. 启动后端
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库 + AI 接口
npm run dev
```

### 3. 启动前端
```bash
cd frontend
npm install
npm run dev
```
访问 http://localhost:5173，默认管理员账号 `admin / admin123`。

### 4. 生产部署（PM2 托管 + 开机自启）
```bash
npm install -g pm2
pm2 start backend/src/app.js --name goods-backend
pm2 start frontend/node_modules/vite/bin/vite.js --name goods-frontend --cwd frontend
pm2 save
# Windows 开机自启：用任务计划程序在登录时执行 start-services.bat（pm2 resurrect）
```

## 功能模块

| 模块 | 功能 |
|------|------|
| 首页总览 | 项目/价格/供应商统计、IP分布饼图、品类分布柱图、供应商排行、主题切换(淡紫/暖金) |
| 历史项目库 | 18列字段表格、IP/年份/供应商/需求种类筛选、报价单多图上传+缩略图角标、CRUD |
| 历史价格记录库 | 19列字段、品类/IP/供应商/单价筛选、图片多图上传+角标、CRUD |
| 价格查询 | 品类+工艺+数量+供应商查询、最高/低/均价、相近数量校准、跨供应商对比 |
| **灵感链接库** | 卡片流、双Tab(制品/工艺)、链接失效检测、**AI图文识别**、**就地编辑** |
| 供应商库 | 评分看板(KPI/排行/分布)、CRUD、案例文件 |
| 设计/生产注意 | 设计/生产注意事项分类管理 |
| 标签管理 | IP/品类/工艺/场景四类标签 |
| 权限管理 | 用户CRUD、角色分配(admin/editor/viewer)、按钮级权限 |
| 批量导入 | Excel三表(项目/价格/供应商)导入、字段映射、去重 |

## 灵感链接库 · 核心能力

灵感库针对小红书、淘宝等"链接易失效、内容在图片里"的平台，做了完整的**内容快照**机制：

### 1. 录入即抓取快照
新增/编辑灵感粘贴链接后，后端自动抓取并存为快照（链接失效后仍保留）：
- 标题、作者、来源平台、正文引言、封面图
- 帖子**所有图片**（下载到本地 `backend/uploads`）

### 2. 链接失效检测
批量探活所有灵感链接，状态分：正常(ok) / 已失效(dead, 404/410) / 无法验证(error, 反爬/超时)。列表可按状态筛选，失效的显示角标。

### 3. AI 图文识别
点「AI 分析图片内容」，自动：
- 用 **qwen-vl-ocr** 逐图 OCR 提取文字
- 用 **glm-5.2** 批量**清洗**（去水印/装饰文字/图形化英文标题/OCR乱码，只留实质内容）
- 综合正文+图片文字，生成结构化总结（标题/内容总结/关键要点/适用场景）
- 图片下载到本地永久保存，每图OCR文字单独存储

### 4. 就地编辑
详情弹窗点「编辑」即可在同一页面修改（实时展示，不另开界面）：
- 标题/作者/正文/AI总结 直接改
- 每张图的识别文字可改、图片可删、可上传新图
- 保存后立即刷新

## ⚠️ 添加小红书链接注意事项（重要）

小红书用 **token 鉴权**限制访问，链接格式直接决定能否被系统读取。**添加灵感时务必复制带 token 的完整长链接。**

### 正确的链接格式（必须包含 xsec_token）

```
https://www.xiaohongshu.com/explore/6a0febc200000000080259ee?xsec_token=ABtWtyiTNDN4OqHnW8rIJJU_is3S-0sjjebqug8x6LC-0=&xsec_source=pc_search&source=web_explore_feed
```

关键部分：
- 路径必须是 `/explore/笔记ID`（不是 `/discovery/item/`）
- **`xsec_token=...` 必须保留**，这是访问令牌，服务端校验它才返回内容
- `xsec_source=pc_search` 表示 token 来源（搜索页生成的 token 权限较全）

### 错误的链接（会被拦截，显示"页面不见了"）
```
❌ https://www.xiaohongshu.com/discovery/item/xxx?xsec_source=pc_share   # discovery 路径 + pc_share 源，匿名访问被拦
❌ https://www.xiaohongshu.com/explore/xxx                                # 缺 xsec_token，无法鉴权
❌ 短链 https://xhslink.com/a/xxx                                          # 需先在浏览器打开拿到跳转后的长链
```

### 获取正确链接的方法
1. 在小红书 App / 网页版打开笔记
2. 点「分享 → 复制链接」
3. 粘贴到系统灵感表单的链接框（确认是 `/explore/...?xsec_token=...` 格式）
4. 系统录入时自动抓取快照

### 关于有效期
- `xsec_token` **会过期**（通常几天到几周），过期后链接显示"页面不见了"
- **没有任何小红书链接能保证长期有效**——这正是本系统做快照的原因：链接有效时把**图片+OCR文字+AI总结**全部存到本地，链接失效后内容依然完整可查
- 建议在链接还有效时尽快点「AI 分析图片内容」，把图文内容固化下来

## AI 配置

后端 `.env`：
```env
AI_API_KEY=your_api_key
AI_BASE_URL=https://your-proxy/v1       # OpenAI 兼容协议
AI_OCR_MODEL=qwen-vl-ocr                # 视觉OCR模型
AI_TEXT_MODEL=glm-5.2                   # 文本总结模型
```
AI 调用走标准 OpenAI Chat Completion 协议，可替换为任何兼容的视觉+文本模型组合。`.env` 不入 git。

## 环境变量

后端 `.env`：
```env
PORT=3000
HOST=0.0.0.0
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=goods_visualization
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
# AI
AI_API_KEY=...
AI_BASE_URL=...
AI_OCR_MODEL=qwen-vl-ocr
AI_TEXT_MODEL=glm-5.2
```

## API 接口（主要）

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/login | 登录 |
| GET/POST | /api/projects | 项目列表/新增 |
| GET/PUT/DELETE | /api/projects/:id | 项目CRUD |
| GET | /api/projects/options | 筛选下拉选项 |
| GET/POST | /api/price-records | 价格记录列表/新增 |
| GET/PUT/DELETE | /api/price-records/:id | 价格记录CRUD |
| GET | /api/price-records/options | 筛选下拉选项 |
| GET | /api/price/query | 价格查询 |
| GET/POST | /api/inspirations | 灵感列表/新增（自动抓快照） |
| GET/PUT/DELETE | /api/inspirations/:id | 灵感CRUD |
| POST | /api/inspirations/fetch-meta | 抓取链接元数据 |
| POST | /api/inspirations/:id/check-link | 检测单条链接 |
| POST | /api/inspirations/check-links | 批量检测链接 |
| **POST** | **/api/inspirations/:id/analyze** | **AI 图文识别（OCR+清洗+总结+下载图片）** |
| **PUT** | **/api/inspirations/:id/detail** | **就地编辑详情（标题/作者/正文/AI总结/逐图文字）** |
| GET | /api/suppliers | 供应商列表 |
| GET | /api/suppliers/dashboard | 供应商评分看板 |
| GET | /api/design-notes | 设计/生产注意列表 |
| GET | /api/statistics/dashboard | 首页仪表盘 |
| POST | /api/upload/images | 多图上传 |
| GET | /api/search?q= | 全局检索 |

## 数据库表

| 表名 | 说明 |
|------|------|
| sys_user / sys_role / sys_user_role / sys_permission / sys_role_permission | 用户/角色/权限体系 |
| project | 历史项目（含 quotation_file 报价单多图、person_days 等18列） |
| price_record | 历史价格记录（19列） |
| inspiration | 外部灵感（含 link_status 链接状态、image_texts 逐图OCR的JSON） |
| inspiration_folder | 灵感收藏夹 |
| supplier / supplier_evaluation | 供应商 + 评价 |
| design_note | 设计/生产注意事项 |
| tag | 统一标签(IP/品类/工艺/场景) |
| category / log | 品类详情 / 操作日志 |

## 权限体系

三级角色层层继承：
- **viewer** 查看者：只读所有数据
- **editor** 编辑：+ 新增灵感/项目、编辑标签、上传截图
- **admin** 管理员：+ 删除、供应商管理、批量导入、系统管理、AI分析

通过 `v-permission` 指令和 `<PermissionButton>` 控制按钮级显隐。
