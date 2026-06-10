# 周边可视化系统

基于 Vue3 + Express + MySQL 的前后端分离周边采购灵感与历史价格知识库。

## 技术栈

### 前端
- Vite 8 + Vue 3.5 + Element Plus 2 + Pinia 3 + Vue Router 5 + ECharts 6 + Axios

### 后端
- Node.js + Express 4 + MySQL (mysql2) + JWT + Multer + Sharp + xlsx + bcryptjs

## 项目结构

```
Goods visualization/
├── frontend/                 # 前端项目 (Vue3 + Element Plus)
│   ├── src/
│   │   ├── api/             # API 接口层 (auth/tags/projects/inspirations/suppliers/price)
│   │   ├── components/      # 组件
│   │   │   ├── common/      # 通用组件 (Table/Filter/DialogForm/Pagination/ImagePreview)
│   │   │   ├── home/        # 首页组件 (StatsCards/ChartsSection/RankingSection/RecentUpdates)
│   │   │   ├── inspiration/ # 灵感组件 (FormDialog/DetailDialog)
│   │   │   ├── layout/      # 布局组件 (Header/Sidebar)
│   │   │   ├── permission/  # 权限组件 (UserEditDialog)
│   │   │   ├── project/     # 项目组件 (FormDialog/DetailDialog)
│   │   │   ├── supplier/    # 供应商组件 (FormDialog/DetailDialog)
│   │   │   └── tag/         # 标签组件 (TagEditDialog)
│   │   ├── constants/       # 常量定义
│   │   ├── directives/      # Vue 指令 (权限指令)
│   │   ├── router/          # 路由配置 + 权限守卫
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── utils/           # 工具函数
│   │   └── views/           # 页面视图
│   │       ├── category/    # 品类详情页
│   │       ├── import/      # 批量导入页
│   │       ├── inspiration/ # 灵感链接库
│   │       ├── layout/      # 布局页 + 首页
│   │       ├── login/       # 登录页
│   │       ├── permission/  # 权限演示页
│   │       ├── price/       # 价格查询页
│   │       ├── project/     # 历史项目库
│   │       ├── supplier/    # 供应商库
│   │       └── system/      # 系统管理 (标签/权限)
│   └── vite.config.js
│
├── backend/                  # 后端项目 (Express)
│   ├── src/
│   │   ├── config/          # 配置 (数据库/应用)
│   │   ├── controllers/     # 控制器 (Auth/Project/Inspiration/Supplier/Tag/Statistics/Upload/Import)
│   │   ├── middleware/      # 中间件 (auth/errorHandler/upload)
│   │   ├── routes/          # 路由 (auth/project/inspiration/supplier/tag/price/statistics/import/upload)
│   │   ├── services/        # 服务层 (ImportService)
│   │   ├── utils/           # 工具 (jwt/password/response/validator)
│   │   └── app.js           # 应用入口
│   └── uploads/             # 文件上传目录
│
├── database/                 # 数据库
│   ├── init.sql             # 建库脚本 (13张表 + 种子数据)
│   └── test_data.sql        # 测试数据
│
└── README.md
```

## 快速开始

### 1. 初始化数据库
```bash
# 创建数据库并导入
mysql -u root -p < database/init.sql
# （可选）导入测试数据
mysql -u root -p < database/test_data.sql
```

### 2. 启动后端
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库连接
npm run dev
```

### 3. 启动前端
```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173，默认管理员账号 admin/admin123。

## 功能模块

| 模块 | 功能 | 状态 |
|------|------|------|
| 首页总览 | 数据概览、IP/品类分布图(ECharts)、最近更新、快捷入口 | ✅ |
| 历史项目库 | 表格列表、多条件筛选(IP/品类/工艺/供应商/时间/单价)、CRUD、批量导入导出 | ✅ |
| 价格查询 | 品类+工艺+数量+供应商查询、历史最高/低/均价、相近数量参考、跨供应商对比 | ✅ |
| 灵感链接库 | 卡片流展示、来源平台/品类/工艺/IP筛选、收藏夹管理、链接跳转 | ✅ |
| 供应商库 | 表格列表、评价/合作状态筛选、CRUD、详情抽屉、评分系统 | ✅ |
| 品类详情页 | 品类基础信息、历史项目案例、外部灵感参考、推荐供应商 | ✅ |
| 标签管理 | IP/品类/工艺/场景四类标签统一管理，CRUD | ✅ |
| 权限管理 | 用户管理(CRUD)、角色分配(admin/editor/viewer)、按钮级权限控制 | ✅ |
| 批量导入 | Excel解析、字段映射、去重(跳过/更新) | ✅ |

## API 接口

### 认证 (需要认证)
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/current | 获取当前用户信息 |
| POST | /api/auth/change-password | 修改密码 |
| GET | /api/auth/menus | 获取菜单权限 |
| GET | /api/auth/permissions | 获取按钮权限 |

### 用户管理 (管理员)
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/auth/users | 用户列表 |
| POST | /api/auth/users | 新增用户 |
| PUT | /api/auth/users/:id | 编辑用户 |
| DELETE | /api/auth/users/:id | 删除用户 |

### 业务接口 (需要认证)
| 方法 | 路径 | 描述 |
|------|------|------|
| GET/POST | /api/projects | 项目列表/新增 |
| GET/PUT/DELETE | /api/projects/:id | 项目详情/编辑/删除 |
| POST | /api/projects/import | 批量导入 |
| GET | /api/projects/export | 导出 |
| GET/POST | /api/inspirations | 灵感列表/新增 |
| GET/PUT/DELETE | /api/inspirations/:id | 灵感详情/编辑/删除 |
| POST | /api/inspirations/:id/collect | 收藏 |
| POST | /api/inspirations/:id/uncollect | 取消收藏 |
| GET | /api/inspiration-folders | 收藏夹列表 |
| POST | /api/inspiration-folders | 新增收藏夹 |
| GET/POST | /api/suppliers | 供应商列表/新增 |
| GET/PUT/DELETE | /api/suppliers/:id | 供应商详情/编辑/删除 |
| POST | /api/suppliers/:id/evaluate | 供应商评价 |
| GET | /api/price/query | 价格查询 |
| GET | /api/price/stats | 价格统计 |
| GET | /api/price/category/:id | 品类详情数据 |
| GET | /api/statistics/dashboard | 仪表盘统计 |
| GET/POST | /api/tags | 标签列表/新增 |
| GET | /api/tags/tree | 标签树 |
| PUT/DELETE | /api/tags/:id | 标签编辑/删除 |
| POST | /api/upload/image | 图片上传 |

## 数据库表 (13张)

| 表名 | 说明 |
|------|------|
| sys_user | 系统用户 |
| sys_role | 角色 (viewer/editor/admin/super_admin) |
| sys_user_role | 用户角色关联 |
| sys_permission | 权限定义 |
| sys_role_permission | 角色权限关联 |
| tag | 统一标签 (IP/品类/工艺/场景) |
| supplier | 供应商信息 |
| supplier_evaluation | 供应商评价 |
| project | 历史周边记录 |
| inspiration | 外部灵感链接 |
| inspiration_folder | 灵感收藏夹 |
| category | 品类详情 |
| log | 操作日志 |

## 环境变量

后端 `.env`：
```env
PORT=3000
HOST=localhost
DB_HOST=localhost
DB_PORT=3306
DB_NAME=goods_visualization
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```