-- ============================================
-- 周边可视化系统数据库初始化脚本 v2.0
-- 对齐需求文档 + 后端 Controller 字段
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 系统用户表 (sys_user)
-- ============================================
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
    `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
    `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像地址',
    `department` VARCHAR(100) DEFAULT NULL COMMENT '部门',
    `position` VARCHAR(100) DEFAULT NULL COMMENT '职位',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
    `last_login_ip` VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户表';

-- ============================================
-- 2. 系统角色表 (sys_role)
-- ============================================
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色ID',
    `role_name` VARCHAR(50) NOT NULL COMMENT '角色名称',
    `role_code` VARCHAR(50) NOT NULL COMMENT '角色编码: viewer/editor/admin/super_admin',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '角色描述',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色表';

-- ============================================
-- 3. 用户角色关联表 (sys_user_role)
-- ============================================
DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- ============================================
-- 4. 权限表 (sys_permission)
-- ============================================
DROP TABLE IF EXISTS `sys_permission`;
CREATE TABLE `sys_permission` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '权限ID',
    `parent_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '父级权限ID',
    `permission_name` VARCHAR(100) NOT NULL COMMENT '权限名称',
    `permission_code` VARCHAR(100) NOT NULL COMMENT '权限编码',
    `permission_type` VARCHAR(20) NOT NULL COMMENT '类型: menu/button',
    `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标',
    `path` VARCHAR(255) DEFAULT NULL COMMENT '路由路径',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_permission_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统权限表';

-- ============================================
-- 5. 角色权限关联表 (sys_role_permission)
-- ============================================
DROP TABLE IF EXISTS `sys_role_permission`;
CREATE TABLE `sys_role_permission` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
    `permission_id` BIGINT UNSIGNED NOT NULL COMMENT '权限ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_role_id` (`role_id`),
    KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ============================================
-- 6. 统一标签表 (tag)
-- ============================================
DROP TABLE IF EXISTS `tag`;
CREATE TABLE `tag` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标签ID',
    `tag_name` VARCHAR(100) NOT NULL COMMENT '标签名称',
    `tag_code` VARCHAR(100) DEFAULT NULL COMMENT '标签编码',
    `tag_type` VARCHAR(20) NOT NULL COMMENT '类型: ip/category/craft/scene',
    `parent_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '父级标签ID',
    `level` TINYINT NOT NULL DEFAULT 1 COMMENT '层级',
    `color` VARCHAR(20) DEFAULT NULL COMMENT '标签颜色',
    `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='统一标签表';

-- ============================================
-- 7. 供应商信息表 (supplier)
-- ============================================
DROP TABLE IF EXISTS `supplier`;
CREATE TABLE `supplier` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
    `supplier_name` VARCHAR(200) NOT NULL COMMENT '供应商全称',
    `supplier_short_name` VARCHAR(100) DEFAULT NULL COMMENT '供应商简称',
    `supplier_code` VARCHAR(50) DEFAULT NULL COMMENT '供应商编码',
    `supplier_type` VARCHAR(50) DEFAULT NULL COMMENT '供应商类型',
    `contact_person` VARCHAR(100) DEFAULT NULL COMMENT '联系人',
    `contact_phone` VARCHAR(50) DEFAULT NULL COMMENT '电话',
    `contact_email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    `contract_type` VARCHAR(50) DEFAULT NULL COMMENT '合同类型',
    `province` VARCHAR(50) DEFAULT NULL COMMENT '省份',
    `city` VARCHAR(50) DEFAULT NULL COMMENT '城市',
    `district` VARCHAR(50) DEFAULT NULL COMMENT '区县',
    `address` VARCHAR(500) DEFAULT NULL COMMENT '详细地址',
    `license_image` VARCHAR(500) DEFAULT NULL COMMENT '营业执照图片',
    `business_license` VARCHAR(100) DEFAULT NULL COMMENT '营业执照号',
    `tax_rate` DECIMAL(5,2) DEFAULT NULL COMMENT '税率',
    `payment_days` INT DEFAULT NULL COMMENT '账期(天)',
    `min_order_amount` DECIMAL(10,2) DEFAULT NULL COMMENT '最小起订金额',
    `shipping_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '运费',
    `cooperation_status` VARCHAR(20) DEFAULT 'potential' COMMENT '合作状态: potential/active/paused/terminated',
    `rating` DECIMAL(2,1) DEFAULT NULL COMMENT '主观评分(1-5)',
    `cooperation_project_count` INT DEFAULT 0 COMMENT '合作项目数',
    `cooperation_total_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '合作总金额',
    `category_tags` VARCHAR(500) DEFAULT NULL COMMENT '做过的品类(标签IDs)',
    `category_ids` VARCHAR(500) DEFAULT NULL COMMENT '合作品类标签IDs',
    `advantage_categories` VARCHAR(500) DEFAULT NULL COMMENT '优势品类',
    `main_products` VARCHAR(500) DEFAULT NULL COMMENT '主要产品',
    `advantage` TEXT DEFAULT NULL COMMENT '优势说明',
    `risk_notes` TEXT DEFAULT NULL COMMENT '风险备注',
    `remark` TEXT DEFAULT NULL COMMENT '备注',
    `case_images` TEXT DEFAULT NULL COMMENT '样品图或案例图(JSON数组)',
    `attachments` TEXT DEFAULT NULL COMMENT '附件(JSON数组)',
    `create_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    KEY `idx_supplier_name` (`supplier_name`),
    KEY `idx_cooperation_status` (`cooperation_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商信息表';

-- ============================================
-- 8. 供应商评价表 (supplier_evaluation)
-- ============================================
DROP TABLE IF EXISTS `supplier_evaluation`;
CREATE TABLE `supplier_evaluation` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评价ID',
    `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
    `project_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联项目ID',
    `quality_rating` TINYINT NOT NULL COMMENT '质量评分(1-5)',
    `delivery_rating` TINYINT NOT NULL COMMENT '交付评分(1-5)',
    `service_rating` TINYINT NOT NULL COMMENT '服务评分(1-5)',
    `price_rating` TINYINT NOT NULL COMMENT '价格评分(1-5)',
    `overall_rating` DECIMAL(2,1) NOT NULL COMMENT '综合评分',
    `evaluation_content` TEXT DEFAULT NULL COMMENT '评价内容',
    `pros` TEXT DEFAULT NULL COMMENT '优点',
    `cons` TEXT DEFAULT NULL COMMENT '缺点',
    `images` TEXT DEFAULT NULL COMMENT '评价图片(JSON数组)',
    `evaluator_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '评价人ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    KEY `idx_supplier_id` (`supplier_id`),
    KEY `idx_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商评价表';

-- ============================================
-- 9. 历史周边记录表 (project)
-- ============================================
DROP TABLE IF EXISTS `project`;
CREATE TABLE `project` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '项目ID',
    `project_name` VARCHAR(200) NOT NULL COMMENT '项目名称',
    `project_code` VARCHAR(50) DEFAULT NULL COMMENT '项目编码',
    `project_type` VARCHAR(50) DEFAULT NULL COMMENT '项目类型',
    `status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/reviewing/approved/rejected/in_progress/completed/cancelled',
    `priority` TINYINT DEFAULT 2 COMMENT '优先级: 1-紧急, 2-高, 3-中, 4-低',
    `budget` DECIMAL(15,2) DEFAULT NULL COMMENT '预算',
    `actual_cost` DECIMAL(15,2) DEFAULT NULL COMMENT '实际成本',
    `region` VARCHAR(100) DEFAULT NULL COMMENT '区服',
    `ip_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT 'IP标签IDs',
    `category_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT '品类标签IDs',
    `craft_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT '工艺标签IDs',
    `scene_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT '场景标签IDs',
    `supplier_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
    `buyer_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '采购负责人ID',
    `product_name` VARCHAR(200) DEFAULT NULL COMMENT '单品名称',
    `style_count` INT DEFAULT NULL COMMENT '款式数量',
    `single_quantity` INT DEFAULT NULL COMMENT '单款数量',
    `total_quantity` INT DEFAULT NULL COMMENT '总数量',
    `quantity` INT DEFAULT NULL COMMENT '采购数量',
    `product_spec` VARCHAR(500) DEFAULT NULL COMMENT '产品规格',
    `product_material` VARCHAR(500) DEFAULT NULL COMMENT '产品材质',
    `product_color` VARCHAR(200) DEFAULT NULL COMMENT '产品颜色',
    `product_size` VARCHAR(200) DEFAULT NULL COMMENT '产品尺寸',
    `product_weight` VARCHAR(100) DEFAULT NULL COMMENT '产品重量',
    `package_spec` VARCHAR(500) DEFAULT NULL COMMENT '包装规格',
    `unit_price` DECIMAL(10,2) DEFAULT NULL COMMENT '单价',
    `total_amount` DECIMAL(15,2) DEFAULT NULL COMMENT '总金额',
    `sample_cycle` INT DEFAULT NULL COMMENT '打样周期(天)',
    `mass_production_cycle` INT DEFAULT NULL COMMENT '大货周期(天)',
    `sample_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '打样费',
    `design_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '设计费',
    `other_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '其他费用',
    `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图片',
    `design_images` TEXT DEFAULT NULL COMMENT '设计图(JSON数组)',
    `product_images` TEXT DEFAULT NULL COMMENT '产品图(JSON数组)',
    `effect_images` TEXT DEFAULT NULL COMMENT '效果图/样品图(JSON数组)',
    `reference_links` TEXT DEFAULT NULL COMMENT '参考链接(JSON数组)',
    `purchase_order_no` VARCHAR(100) DEFAULT NULL COMMENT '关联请购单或合同编号',
    `expected_delivery_date` DATE DEFAULT NULL COMMENT '期望交付日期',
    `actual_delivery_date` DATE DEFAULT NULL COMMENT '实际交付日期',
    `project_start_date` DATE DEFAULT NULL COMMENT '项目开始时间',
    `project_end_date` DATE DEFAULT NULL COMMENT '项目结束时间',
    `project_leader` VARCHAR(100) DEFAULT NULL COMMENT '负责人',
    `requester` VARCHAR(100) DEFAULT NULL COMMENT '需求人',
    `description` TEXT DEFAULT NULL COMMENT '项目描述',
    `requirement` TEXT DEFAULT NULL COMMENT '需求说明',
    `remark` TEXT DEFAULT NULL COMMENT '备注',
    `approval_status` VARCHAR(20) DEFAULT NULL COMMENT '审批状态',
    `approval_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '审批人ID',
    `approval_time` DATETIME DEFAULT NULL COMMENT '审批时间',
    `approval_remark` TEXT DEFAULT NULL COMMENT '审批备注',
    `create_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    KEY `idx_project_name` (`project_name`),
    KEY `idx_supplier` (`supplier_id`),
    KEY `idx_region` (`region`),
    KEY `idx_create_time` (`create_time`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='历史周边记录表';

-- ============================================
-- 10. 外部灵感链接表 (inspiration)
-- ============================================
DROP TABLE IF EXISTS `inspiration`;
CREATE TABLE `inspiration` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '灵感ID',
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `source_platform` VARCHAR(50) NOT NULL COMMENT '来源平台',
    `source_type` VARCHAR(50) DEFAULT NULL COMMENT '来源类型',
    `source_name` VARCHAR(200) DEFAULT NULL COMMENT '来源名称',
    `source_url` VARCHAR(1000) DEFAULT NULL COMMENT '来源URL',
    `link` VARCHAR(1000) DEFAULT NULL COMMENT '链接',
    `author` VARCHAR(100) DEFAULT NULL COMMENT '作者/博主',
    `author_url` VARCHAR(500) DEFAULT NULL COMMENT '作者链接',
    `screenshot` VARCHAR(500) DEFAULT NULL COMMENT '截图',
    `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图片',
    `images` TEXT DEFAULT NULL COMMENT '图片集(JSON数组)',
    `video_url` VARCHAR(500) DEFAULT NULL COMMENT '视频链接',
    `thumbnail` VARCHAR(500) DEFAULT NULL COMMENT '缩略图',
    `category_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT '品类标签IDs',
    `craft_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT '工艺标签IDs',
    `ip_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT '适用IP标签IDs',
    `scene_tag_ids` VARCHAR(500) DEFAULT NULL COMMENT '适用场景标签IDs',
    `reference_value` TEXT DEFAULT NULL COMMENT '参考价值说明',
    `description` TEXT DEFAULT NULL COMMENT '描述',
    `content_summary` TEXT DEFAULT NULL COMMENT '内容摘要',
    `notes` TEXT DEFAULT NULL COMMENT '备注笔记',
    `application_scenario` VARCHAR(500) DEFAULT NULL COMMENT '适用场景',
    `collect_time` DATETIME DEFAULT NULL COMMENT '收藏时间',
    `collector` VARCHAR(100) DEFAULT NULL COMMENT '收集人',
    `collection_status` VARCHAR(20) DEFAULT 'uncollected' COMMENT '状态: uncollected/collected/applied',
    `folder_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '收藏夹ID',
    `is_featured` TINYINT DEFAULT 0 COMMENT '是否精选',
    `is_pinned` TINYINT DEFAULT 0 COMMENT '是否置顶',
    `like_count` INT DEFAULT 0 COMMENT '点赞数',
    `collect_count` INT DEFAULT 0 COMMENT '收藏数',
    `save_count` INT DEFAULT 0 COMMENT '保存数',
    `comment_count` INT DEFAULT 0 COMMENT '评论数',
    `view_count` INT DEFAULT 0 COMMENT '浏览数',
    `is_adopted` TINYINT DEFAULT 0 COMMENT '是否已被采用',
    `application_result` TEXT DEFAULT NULL COMMENT '应用结果',
    `application_date` DATE DEFAULT NULL COMMENT '应用日期',
    `is_sensitive` TINYINT DEFAULT 0 COMMENT '是否敏感内容',
    `sensitive_reason` VARCHAR(500) DEFAULT NULL COMMENT '敏感原因',
    `related_project_ids` VARCHAR(500) DEFAULT NULL COMMENT '关联内部项目IDs',
    `create_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    KEY `idx_title` (`title`),
    KEY `idx_source_platform` (`source_platform`),
    KEY `idx_source_type` (`source_type`),
    KEY `idx_collect_time` (`collect_time`),
    KEY `idx_is_adopted` (`is_adopted`),
    KEY `idx_folder_id` (`folder_id`),
    KEY `idx_collection_status` (`collection_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外部灵感链接表';

-- ============================================
-- 11. 灵感收藏夹表 (inspiration_folder)
-- ============================================
DROP TABLE IF EXISTS `inspiration_folder`;
CREATE TABLE `inspiration_folder` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收藏夹ID',
    `folder_name` VARCHAR(100) NOT NULL COMMENT '收藏夹名称',
    `folder_type` VARCHAR(20) DEFAULT 'personal' COMMENT '类型: personal/shared/system',
    `parent_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '父级收藏夹ID',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `is_public` TINYINT DEFAULT 0 COMMENT '是否公开: 0-私有, 1-公开',
    `create_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    KEY `idx_create_user_id` (`create_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='灵感收藏夹表';

-- ============================================
-- 12. 品类详情表 (category)
-- ============================================
DROP TABLE IF EXISTS `category`;
CREATE TABLE `category` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '品类ID',
    `category_name` VARCHAR(100) NOT NULL COMMENT '品类名称',
    `category_code` VARCHAR(100) DEFAULT NULL COMMENT '品类编码',
    `description` TEXT DEFAULT NULL COMMENT '品类基础说明',
    `common_sizes` VARCHAR(500) DEFAULT NULL COMMENT '常见尺寸',
    `common_materials` VARCHAR(500) DEFAULT NULL COMMENT '常见材质',
    `common_crafts` VARCHAR(500) DEFAULT NULL COMMENT '常见工艺',
    `price_range` VARCHAR(100) DEFAULT NULL COMMENT '常见单价区间',
    `risk_points` TEXT DEFAULT NULL COMMENT '常见风险点',
    `purchase_notes` TEXT DEFAULT NULL COMMENT '采购注意事项',
    `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图片',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='品类详情表';

-- ============================================
-- 13. 操作日志表 (log)
-- ============================================
DROP TABLE IF EXISTS `log`;
CREATE TABLE `log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
    `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '操作用户ID',
    `username` VARCHAR(50) DEFAULT NULL COMMENT '用户名',
    `operation` VARCHAR(100) NOT NULL COMMENT '操作类型',
    `module` VARCHAR(50) DEFAULT NULL COMMENT '操作模块',
    `method` VARCHAR(100) DEFAULT NULL COMMENT '请求方法',
    `url` VARCHAR(500) DEFAULT NULL COMMENT '请求URL',
    `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
    `user_agent` VARCHAR(500) DEFAULT NULL COMMENT 'User-Agent',
    `params` TEXT DEFAULT NULL COMMENT '请求参数',
    `result` TEXT DEFAULT NULL COMMENT '返回结果',
    `status` TINYINT DEFAULT 1 COMMENT '状态: 0-失败, 1-成功',
    `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_module` (`module`),
    KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ============================================
-- 初始化角色
-- ============================================
INSERT INTO `sys_role` (`role_name`, `role_code`, `description`, `sort`) VALUES
('普通用户', 'viewer', '普通查看权限：查看历史项目、价格库、外部灵感、搜索筛选', 1),
('编辑用户', 'editor', '编辑权限：新增外部链接、编辑标签、上传截图、补充参考说明', 2),
('管理员', 'admin', '管理员权限：删除数据、修改供应商信息、修改价格记录、批量导入、管理标签体系', 3),
('超级管理员', 'super_admin', '超级管理员：全部权限', 4);

-- ============================================
-- 初始化默认管理员账号 (密码: admin123)
-- ============================================
INSERT INTO `sys_user` (`username`, `password`, `nickname`, `real_name`, `status`) VALUES
('admin', '$2b$10$aH6SHcPy1MHXiMPWcILNy.VI.9Q.IJsiBLFKcmoIynfhUjaUvMBTi', '管理员', '系统管理员', 1);

-- 绑定管理员到admin角色
INSERT INTO `sys_user_role` (`user_id`, `role_id`) VALUES (1, 3);

-- 插入默认权限
INSERT INTO `sys_permission` (`parent_id`, `permission_name`, `permission_code`, `permission_type`, `icon`, `path`, `sort`, `status`) VALUES
-- 页面菜单权限
(0, '首页', 'home', 'menu', 'HomeFilled', '/home', 1, 1),
(0, '历史周边记录库', 'project', 'menu', 'Folder', '/projects', 2, 1),
(0, '历史价格查询', 'price', 'menu', 'Money', '/price-query', 3, 1),
(0, '外部灵感链接库', 'inspiration', 'menu', 'Picture', '/inspiration', 4, 1),
(0, '供应商库', 'supplier', 'menu', 'Shop', '/suppliers', 5, 1),
(0, '品类详情', 'category', 'menu', 'Grid', '/category', 6, 1),
(0, '批量导入', 'import', 'menu', 'Upload', '/import', 7, 1),
(0, '系统管理', 'system', 'menu', 'Setting', '/system', 8, 1),

-- 项目库按钮权限
(2, '项目查看', 'project:view', 'button', NULL, '/projects', 1, 1),
(2, '项目搜索', 'project:search', 'button', NULL, '/projects', 2, 1),
(2, '项目新增', 'project:create', 'button', NULL, '/projects', 3, 1),
(2, '项目编辑', 'project:edit', 'button', NULL, '/projects', 4, 1),
(2, '项目删除', 'project:delete', 'button', NULL, '/projects', 5, 1),
(2, '项目导入', 'project:import', 'button', NULL, '/projects', 6, 1),
(2, '项目导出', 'project:export', 'button', NULL, '/projects', 7, 1),

-- 价格库按钮权限
(3, '价格查看', 'price:view', 'button', NULL, '/price-query', 1, 1),
(3, '价格搜索', 'price:search', 'button', NULL, '/price-query', 2, 1),

-- 灵感库按钮权限
(4, '灵感查看', 'inspiration:view', 'button', NULL, '/inspiration', 1, 1),
(4, '灵感搜索', 'inspiration:search', 'button', NULL, '/inspiration', 2, 1),
(4, '灵感新增', 'inspiration:create', 'button', NULL, '/inspiration', 3, 1),
(4, '灵感编辑', 'inspiration:edit', 'button', NULL, '/inspiration', 4, 1),
(4, '灵感删除', 'inspiration:delete', 'button', NULL, '/inspiration', 5, 1),
(4, '灵感上传', 'inspiration:upload', 'button', NULL, '/inspiration', 6, 1),

-- 供应商库按钮权限
(5, '供应商查看', 'supplier:view', 'button', NULL, '/suppliers', 1, 1),
(5, '供应商搜索', 'supplier:search', 'button', NULL, '/suppliers', 2, 1),
(5, '供应商详情', 'supplier:detail', 'button', NULL, '/suppliers', 3, 1),
(5, '供应商新增', 'supplier:create', 'button', NULL, '/suppliers', 4, 1),
(5, '供应商编辑', 'supplier:edit', 'button', NULL, '/suppliers', 5, 1),
(5, '供应商删除', 'supplier:delete', 'button', NULL, '/suppliers', 6, 1),

-- 标签管理权限
(8, '标签查看', 'tag:view', 'button', NULL, '/system/tags', 1, 1),
(8, '标签新增', 'tag:create', 'button', NULL, '/system/tags', 2, 1),
(8, '标签编辑', 'tag:edit', 'button', NULL, '/system/tags', 3, 1),
(8, '标签删除', 'tag:delete', 'button', NULL, '/system/tags', 4, 1),

-- 系统管理权限
(8, '用户管理', 'system:user', 'button', NULL, '/system', 1, 1);

-- 为admin角色分配所有权限
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`)
SELECT 3, id FROM sys_permission WHERE is_delete = 0;

-- 为editor角色分配编辑权限
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`)
SELECT 2, id FROM sys_permission WHERE is_delete = 0
  AND permission_code IN (
    'home', 'project', 'price', 'inspiration', 'supplier', 'category',
    'project:view', 'project:search', 'project:create', 'project:edit',
    'price:view', 'price:search',
    'inspiration:view', 'inspiration:search', 'inspiration:create', 'inspiration:edit', 'inspiration:upload',
    'supplier:view', 'supplier:search', 'supplier:detail',
    'tag:view'
  );

-- 为viewer角色分配查看权限
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`)
SELECT 1, id FROM sys_permission WHERE is_delete = 0
  AND permission_code IN (
    'home', 'project', 'price', 'inspiration', 'supplier', 'category',
    'project:view', 'project:search',
    'price:view', 'price:search',
    'inspiration:view', 'inspiration:search',
    'supplier:view', 'supplier:search', 'supplier:detail'
  );

-- ============================================
-- 初始化 IP标签
-- ============================================
INSERT INTO `tag` (`tag_name`, `tag_code`, `tag_type`, `color`, `sort`, `status`) VALUES
('恋与深空', 'ip_lovesky', 'ip', '#7c3aed', 1, 1),
('闪耀暖暖', 'ip_shine', 'ip', '#ec4899', 2, 1),
('无限暖暖', 'ip_infinite', 'ip', '#06b6d4', 3, 1),
('恋与制作人', 'ip_producer', 'ip', '#f97316', 4, 1),
('无期迷途', 'ip_uuid', 'ip', '#84cc16', 5, 1),
('自有IP', 'ip_self', 'ip', '#9b59b6', 98, 1),
('无IP', 'ip_none', 'ip', '#95a5a6', 99, 1);

-- ============================================
-- 初始化 品类标签
-- ============================================
INSERT INTO `tag` (`tag_name`, `tag_code`, `tag_type`, `color`, `sort`, `status`) VALUES
('纸制品', 'cat_paper', 'category', '#fef3c7', 1, 1),
('亚克力制品', 'cat_acrylic', 'category', '#a5f3fc', 2, 1),
('PVC制品', 'cat_pvc', 'category', '#c4b5fd', 3, 1),
('金属制品', 'cat_metal', 'category', '#d1d5db', 4, 1),
('马口铁徽章', 'cat_tin_badge', 'category', '#fbbf24', 5, 1),
('毛绒制品', 'cat_plush', 'category', '#f9a8d4', 6, 1),
('日用品', 'cat_daily', 'category', '#6ee7b7', 7, 1),
('包装类', 'cat_package', 'category', '#fca5a5', 8, 1),
('线下活动物料', 'cat_event', 'category', '#93c5fd', 9, 1),
('明信片', 'cat_postcard', 'category', '#fef3c7', 101, 1),
('镭射票', 'cat_laser_ticket', 'category', '#e0e7ff', 102, 1),
('文件夹', 'cat_folder', 'category', '#dbeafe', 103, 1),
('亚克力立牌', 'cat_acrylic_stand', 'category', '#bfdbfe', 201, 1),
('拍立得', 'cat_instax', 'category', '#fed7e2', 204, 1),
('吧唧', 'cat_badge_round', 'category', '#fef3c7', 501, 1),
('纸袋', 'cat_paper_bag', 'category', '#fef9c3', 801, 1),
('贴纸', 'cat_sticker', 'category', '#d1fae5', 802, 1),
('集章手册', 'cat_stamp_book', 'category', '#fee2e2', 803, 1);

-- ============================================
-- 初始化 工艺标签
-- ============================================
INSERT INTO `tag` (`tag_name`, `tag_code`, `tag_type`, `color`, `sort`, `status`) VALUES
('镭射', 'craft_laser', 'craft', '#c084fc', 1, 1),
('珠光', 'craft_pearl', 'craft', '#f0abfc', 2, 1),
('烫金', 'craft_hot_stamp', 'craft', '#fbbf24', 3, 1),
('局部UV', 'craft_local_uv', 'craft', '#a78bfa', 4, 1),
('白墨', 'craft_white_ink', 'craft', '#f8fafc', 5, 1),
('异形裁切', 'craft_die_cut', 'craft', '#f472b6', 6, 1),
('压纹', 'craft_emboss', 'craft', '#78716c', 7, 1),
('磨砂', 'craft_frosted', 'craft', '#94a3b8', 8, 1),
('透明', 'craft_transparent', 'craft', '#67e8f9', 9, 1),
('镜面', 'craft_mirror', 'craft', '#e2e8f0', 10, 1),
('双面印刷', 'craft_double_side', 'craft', '#93c5fd', 11, 1),
('特种纸', 'craft_special_paper', 'craft', '#fef3c7', 12, 1),
('香味', 'craft_scent', 'craft', '#f9a8d4', 13, 1),
('温变', 'craft_thermo', 'craft', '#60a5fa', 14, 1),
('夜光', 'craft_glow', 'craft', '#a3e635', 15, 1);

-- ============================================
-- 初始化 场景标签
-- ============================================
INSERT INTO `tag` (`tag_name`, `tag_code`, `tag_type`, `color`, `sort`, `status`) VALUES
('线下活动赠品', 'scene_offline_gift', 'scene', '#f472b6', 1, 1),
('展会无料', 'scene_exhibition_gift', 'scene', '#a78bfa', 2, 1),
('VIP礼盒', 'scene_vip_gift', 'scene', '#fbbf24', 3, 1),
('联动物料', 'scene_collab_goods', 'scene', '#34d399', 4, 1),
('抽奖奖品', 'scene_raffle_prize', 'scene', '#f97316', 5, 1),
('生日活动', 'scene_birthday', 'scene', '#fb7185', 6, 1),
('艺术展', 'scene_art_exhibition', 'scene', '#818cf8', 7, 1),
('快闪店', 'scene_popup_store', 'scene', '#22d3ee', 8, 1),
('应援物料', 'scene_support_material', 'scene', '#e879f9', 9, 1),
('入场礼包', 'scene_welcome_kit', 'scene', '#4ade80', 10, 1);

-- ============================================
-- 初始化 品类详情
-- ============================================
INSERT INTO `category` (`category_name`, `category_code`, `description`, `common_sizes`, `common_materials`, `common_crafts`, `price_range`) VALUES
('明信片', 'postcard', '明信片是最常见的纸质周边之一，适用于多种场景', 'A6(105*148mm), A5(148*210mm), 自定义', '250g铜版纸, 300g白卡纸, 特种纸', '镭射, 珠光, 烫金, 局部UV, 白墨', '0.5-3元/张'),
('镭射票', 'laser_ticket', '镭射票是演唱会、展会等活动中常见的纪念品', '50*150mm, 60*180mm, 自定义', 'PVC, PET, 镭射纸', '镭射, 烫金, 异形裁切', '2-8元/张'),
('亚克力立牌', 'acrylic_stand', '亚克力立牌是常见的周边产品，适用于桌面展示', '40*80mm, 50*100mm, 60*150mm, 自定义', '亚克力(PMMA)', '数码印刷, 覆膜, 异形裁切', '5-20元/个'),
('拍立得', 'instax', '拍立得是一种即时成像的照片卡，适合收藏', '86*54mm(标准拍立得尺寸)', '相纸材质', '数码印刷, 镭射, 烫金', '3-10元/张'),
('吧唧', 'badge_round', '马口铁徽章，圆形的徽章类周边', '25mm, 32mm, 38mm, 50mm, 58mm', '马口铁', '包边, 柯式印刷, 镭射, 烫金', '1-5元/个'),
('纸袋', 'paper_bag', '包装类纸袋，可用于礼品包装', '200*280mm, 250*350mm, 300*400mm', '牛皮纸, 白卡纸, 特种纸', '烫金, 局部UV, 覆膜', '1-8元/个'),
('文件夹', 'folder', 'A4或A5尺寸的文件夹，实用性周边', 'A4(210*297mm), A5(148*210mm)', 'PP, 牛皮纸, 白卡纸', '烫金, 覆膜, 数码印刷', '2-10元/个'),
('贴纸', 'sticker', '各类不干胶贴纸，可用于包装或收藏', '圆形, 方形, 自定义异形', '铜版纸, 和纸, PVC', '覆膜, 镭射, 烫金', '0.1-2元/张'),
('集章手册', 'stamp_book', '用于收集印章的手册，适合活动现场使用', 'A6(105*148mm), A5(148*210mm)', '铜版纸, 牛皮纸', '覆膜, 烫金, 锁线装订', '5-20元/本');

SET FOREIGN_KEY_CHECKS = 1;