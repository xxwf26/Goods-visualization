-- ============================================
-- 数据库校对修复脚本 v2 (兼容 MySQL 8.0)
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

-- 辅助存储过程：安全添加列
DROP PROCEDURE IF EXISTS safe_add_column //
CREATE PROCEDURE safe_add_column(
  IN table_name VARCHAR(128),
  IN column_name VARCHAR(128),
  IN column_def TEXT
)
BEGIN
  DECLARE col_count INT DEFAULT 0;
  SELECT COUNT(*) INTO col_count
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'goods_visualization'
    AND TABLE_NAME = table_name
    AND COLUMN_NAME = column_name;
  IF col_count = 0 THEN
    SET @stmt = CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `', column_name, '` ', column_def);
    PREPARE stmt FROM @stmt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

-- 辅助存储过程：安全添加索引
DROP PROCEDURE IF EXISTS safe_add_index //
CREATE PROCEDURE safe_add_index(
  IN table_name VARCHAR(128),
  IN index_name VARCHAR(128),
  IN index_def TEXT
)
BEGIN
  DECLARE idx_count INT DEFAULT 0;
  SELECT COUNT(*) INTO idx_count
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'goods_visualization'
    AND TABLE_NAME = table_name
    AND INDEX_NAME = index_name;
  IF idx_count = 0 THEN
    SET @stmt = CONCAT('ALTER TABLE `', table_name, '` ADD INDEX `', index_name, '` ', index_def);
    PREPARE stmt FROM @stmt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

-- ============================================
-- 1. 修复 sys_permission
-- ============================================
CALL safe_add_column('sys_permission', 'parent_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT \'父级权限ID\' AFTER `id`');
CALL safe_add_column('sys_permission', 'icon', 'VARCHAR(50) DEFAULT NULL COMMENT \'图标\' AFTER `permission_type`');
CALL safe_add_column('sys_permission', 'status', 'TINYINT NOT NULL DEFAULT 1 COMMENT \'状态: 0-禁用, 1-正常\' AFTER `sort`');

-- 更新 parent_id
UPDATE `sys_permission` SET `parent_id` = 2 WHERE `permission_code` IN ('project:view','project:search','project:create','project:edit','project:delete','project:import','project:export');
UPDATE `sys_permission` SET `parent_id` = 3 WHERE `permission_code` IN ('price:view','price:search');
UPDATE `sys_permission` SET `parent_id` = 4 WHERE `permission_code` IN ('inspiration:view','inspiration:search','inspiration:create','inspiration:edit','inspiration:delete','inspiration:upload');
UPDATE `sys_permission` SET `parent_id` = 5 WHERE `permission_code` IN ('supplier:view','supplier:search','supplier:detail','supplier:create','supplier:edit','supplier:delete');
UPDATE `sys_permission` SET `parent_id` = 8 WHERE `permission_code` IN ('tag:view','tag:create','tag:edit','tag:delete','system:user');

-- ============================================
-- 2. 补充 super_admin 角色
-- ============================================
INSERT INTO `sys_role` (`role_name`, `role_code`, `description`, `sort`)
SELECT '超级管理员', 'super_admin', '超级管理员：全部权限', 4
WHERE NOT EXISTS (SELECT 1 FROM `sys_role` WHERE `role_code` = 'super_admin');

-- ============================================
-- 3. 修复 tag 表
-- ============================================
CALL safe_add_column('tag', 'icon', 'VARCHAR(50) DEFAULT NULL COMMENT \'图标\' AFTER `color`');
CALL safe_add_column('tag', 'status', 'TINYINT NOT NULL DEFAULT 1 COMMENT \'状态: 0-禁用, 1-正常\' AFTER `sort`');

-- ============================================
-- 4. 修复 supplier 表
-- ============================================
CALL safe_add_column('supplier', 'supplier_code', 'VARCHAR(50) DEFAULT NULL COMMENT \'供应商编码\' AFTER `supplier_short_name`');
CALL safe_add_column('supplier', 'supplier_type', 'VARCHAR(50) DEFAULT NULL COMMENT \'供应商类型\' AFTER `supplier_code`');
CALL safe_add_column('supplier', 'province', 'VARCHAR(50) DEFAULT NULL COMMENT \'省份\' AFTER `contract_type`');
CALL safe_add_column('supplier', 'city', 'VARCHAR(50) DEFAULT NULL COMMENT \'城市\' AFTER `province`');
CALL safe_add_column('supplier', 'district', 'VARCHAR(50) DEFAULT NULL COMMENT \'区县\' AFTER `city`');
CALL safe_add_column('supplier', 'address', 'VARCHAR(500) DEFAULT NULL COMMENT \'详细地址\' AFTER `district`');
CALL safe_add_column('supplier', 'license_image', 'VARCHAR(500) DEFAULT NULL COMMENT \'营业执照图片\' AFTER `address`');
CALL safe_add_column('supplier', 'business_license', 'VARCHAR(100) DEFAULT NULL COMMENT \'营业执照号\' AFTER `license_image`');
CALL safe_add_column('supplier', 'tax_rate', 'DECIMAL(5,2) DEFAULT NULL COMMENT \'税率\' AFTER `business_license`');
CALL safe_add_column('supplier', 'payment_days', 'INT DEFAULT NULL COMMENT \'账期(天)\' AFTER `tax_rate`');
CALL safe_add_column('supplier', 'min_order_amount', 'DECIMAL(10,2) DEFAULT NULL COMMENT \'最小起订金额\' AFTER `payment_days`');
CALL safe_add_column('supplier', 'shipping_fee', 'DECIMAL(10,2) DEFAULT NULL COMMENT \'运费\' AFTER `min_order_amount`');
CALL safe_add_column('supplier', 'cooperation_status', 'VARCHAR(20) DEFAULT \'potential\' COMMENT \'合作状态: potential/active/paused/terminated\' AFTER `shipping_fee`');
CALL safe_add_column('supplier', 'category_ids', 'VARCHAR(500) DEFAULT NULL COMMENT \'合作品类标签IDs\' AFTER `advantage_categories`');
CALL safe_add_column('supplier', 'main_products', 'VARCHAR(500) DEFAULT NULL COMMENT \'主要产品\' AFTER `category_ids`');
CALL safe_add_column('supplier', 'advantage', 'TEXT DEFAULT NULL COMMENT \'优势说明\' AFTER `main_products`');
CALL safe_add_column('supplier', 'remark', 'TEXT DEFAULT NULL COMMENT \'备注\' AFTER `risk_notes`');
CALL safe_add_column('supplier', 'attachments', 'TEXT DEFAULT NULL COMMENT \'附件(JSON数组)\' AFTER `case_images`');
CALL safe_add_column('supplier', 'create_user_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'创建人ID\' AFTER `attachments`');
CALL safe_add_index('supplier', 'idx_cooperation_status', '(`cooperation_status`)');

-- ============================================
-- 5. 修复 project 表
-- ============================================
CALL safe_add_column('project', 'project_code', 'VARCHAR(50) DEFAULT NULL COMMENT \'项目编码\' AFTER `project_name`');
CALL safe_add_column('project', 'project_type', 'VARCHAR(50) DEFAULT NULL COMMENT \'项目类型\' AFTER `project_code`');
CALL safe_add_column('project', 'status', 'VARCHAR(20) DEFAULT \'draft\' COMMENT \'状态\' AFTER `project_type`');
CALL safe_add_column('project', 'priority', 'TINYINT DEFAULT 2 COMMENT \'优先级\' AFTER `status`');
CALL safe_add_column('project', 'budget', 'DECIMAL(15,2) DEFAULT NULL COMMENT \'预算\' AFTER `priority`');
CALL safe_add_column('project', 'actual_cost', 'DECIMAL(15,2) DEFAULT NULL COMMENT \'实际成本\' AFTER `budget`');
CALL safe_add_column('project', 'buyer_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'采购负责人ID\' AFTER `supplier_id`');
CALL safe_add_column('project', 'quantity', 'INT DEFAULT NULL COMMENT \'采购数量\' AFTER `total_quantity`');
CALL safe_add_column('project', 'product_spec', 'VARCHAR(500) DEFAULT NULL COMMENT \'产品规格\' AFTER `quantity`');
CALL safe_add_column('project', 'product_material', 'VARCHAR(500) DEFAULT NULL COMMENT \'产品材质\' AFTER `product_spec`');
CALL safe_add_column('project', 'product_color', 'VARCHAR(200) DEFAULT NULL COMMENT \'产品颜色\' AFTER `product_material`');
CALL safe_add_column('project', 'product_size', 'VARCHAR(200) DEFAULT NULL COMMENT \'产品尺寸\' AFTER `product_color`');
CALL safe_add_column('project', 'product_weight', 'VARCHAR(100) DEFAULT NULL COMMENT \'产品重量\' AFTER `product_size`');
CALL safe_add_column('project', 'package_spec', 'VARCHAR(500) DEFAULT NULL COMMENT \'包装规格\' AFTER `product_weight`');
CALL safe_add_column('project', 'cover_image', 'VARCHAR(500) DEFAULT NULL COMMENT \'封面图片\' AFTER `other_fee`');
CALL safe_add_column('project', 'design_images', 'TEXT DEFAULT NULL COMMENT \'设计图(JSON数组)\' AFTER `cover_image`');
CALL safe_add_column('project', 'product_images', 'TEXT DEFAULT NULL COMMENT \'产品图(JSON数组)\' AFTER `design_images`');
CALL safe_add_column('project', 'reference_links', 'TEXT DEFAULT NULL COMMENT \'参考链接(JSON数组)\' AFTER `effect_images`');
CALL safe_add_column('project', 'expected_delivery_date', 'DATE DEFAULT NULL COMMENT \'期望交付日期\' AFTER `project_end_date`');
CALL safe_add_column('project', 'actual_delivery_date', 'DATE DEFAULT NULL COMMENT \'实际交付日期\' AFTER `expected_delivery_date`');
CALL safe_add_column('project', 'description', 'TEXT DEFAULT NULL COMMENT \'项目描述\' AFTER `requester`');
CALL safe_add_column('project', 'requirement', 'TEXT DEFAULT NULL COMMENT \'需求说明\' AFTER `description`');
CALL safe_add_column('project', 'approval_status', 'VARCHAR(20) DEFAULT NULL COMMENT \'审批状态\' AFTER `remark`');
CALL safe_add_column('project', 'approval_user_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'审批人ID\' AFTER `approval_status`');
CALL safe_add_column('project', 'approval_time', 'DATETIME DEFAULT NULL COMMENT \'审批时间\' AFTER `approval_user_id`');
CALL safe_add_column('project', 'approval_remark', 'TEXT DEFAULT NULL COMMENT \'审批备注\' AFTER `approval_time`');
CALL safe_add_index('project', 'idx_status', '(`status`)');

-- ============================================
-- 6. 修复 inspiration 表
-- ============================================
CALL safe_add_column('inspiration', 'source_type', 'VARCHAR(50) DEFAULT NULL COMMENT \'来源类型\' AFTER `source_platform`');
CALL safe_add_column('inspiration', 'source_name', 'VARCHAR(200) DEFAULT NULL COMMENT \'来源名称\' AFTER `source_type`');
CALL safe_add_column('inspiration', 'source_url', 'VARCHAR(1000) DEFAULT NULL COMMENT \'来源URL\' AFTER `link`');
CALL safe_add_column('inspiration', 'author', 'VARCHAR(100) DEFAULT NULL COMMENT \'作者/博主\' AFTER `source_url`');
CALL safe_add_column('inspiration', 'author_url', 'VARCHAR(500) DEFAULT NULL COMMENT \'作者链接\' AFTER `author`');
CALL safe_add_column('inspiration', 'cover_image', 'VARCHAR(500) DEFAULT NULL COMMENT \'封面图片\' AFTER `screenshot`');
CALL safe_add_column('inspiration', 'images', 'TEXT DEFAULT NULL COMMENT \'图片集(JSON数组)\' AFTER `cover_image`');
CALL safe_add_column('inspiration', 'video_url', 'VARCHAR(500) DEFAULT NULL COMMENT \'视频链接\' AFTER `images`');
CALL safe_add_column('inspiration', 'thumbnail', 'VARCHAR(500) DEFAULT NULL COMMENT \'缩略图\' AFTER `video_url`');
CALL safe_add_column('inspiration', 'description', 'TEXT DEFAULT NULL COMMENT \'描述\' AFTER `reference_value`');
CALL safe_add_column('inspiration', 'content_summary', 'TEXT DEFAULT NULL COMMENT \'内容摘要\' AFTER `description`');
CALL safe_add_column('inspiration', 'notes', 'TEXT DEFAULT NULL COMMENT \'备注笔记\' AFTER `content_summary`');
CALL safe_add_column('inspiration', 'application_scenario', 'VARCHAR(500) DEFAULT NULL COMMENT \'适用场景\' AFTER `scene_tag_ids`');
CALL safe_add_column('inspiration', 'collection_status', 'VARCHAR(20) DEFAULT \'uncollected\' COMMENT \'状态: uncollected/collected/applied\' AFTER `collector`');
CALL safe_add_column('inspiration', 'folder_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'收藏夹ID\' AFTER `collection_status`');
CALL safe_add_column('inspiration', 'is_featured', 'TINYINT DEFAULT 0 COMMENT \'是否精选\' AFTER `folder_id`');
CALL safe_add_column('inspiration', 'is_pinned', 'TINYINT DEFAULT 0 COMMENT \'是否置顶\' AFTER `is_featured`');
CALL safe_add_column('inspiration', 'save_count', 'INT DEFAULT 0 COMMENT \'保存数\' AFTER `collect_count`');
CALL safe_add_column('inspiration', 'view_count', 'INT DEFAULT 0 COMMENT \'浏览数\' AFTER `comment_count`');
CALL safe_add_column('inspiration', 'application_result', 'TEXT DEFAULT NULL COMMENT \'应用结果\' AFTER `is_adopted`');
CALL safe_add_column('inspiration', 'application_date', 'DATE DEFAULT NULL COMMENT \'应用日期\' AFTER `application_result`');
CALL safe_add_column('inspiration', 'is_sensitive', 'TINYINT DEFAULT 0 COMMENT \'是否敏感内容\' AFTER `application_date`');
CALL safe_add_column('inspiration', 'sensitive_reason', 'VARCHAR(500) DEFAULT NULL COMMENT \'敏感原因\' AFTER `is_sensitive`');
CALL safe_add_column('inspiration', 'create_user_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'创建人ID\' AFTER `related_project_ids`');
CALL safe_add_index('inspiration', 'idx_source_type', '(`source_type`)');
CALL safe_add_index('inspiration', 'idx_folder_id', '(`folder_id`)');
CALL safe_add_index('inspiration', 'idx_collection_status', '(`collection_status`)');

-- ============================================
-- 7. 创建缺失表: supplier_evaluation
-- ============================================
CREATE TABLE IF NOT EXISTS `supplier_evaluation` (
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
-- 8. 创建缺失表: inspiration_folder
-- ============================================
CREATE TABLE IF NOT EXISTS `inspiration_folder` (
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

-- 清理存储过程
DROP PROCEDURE IF EXISTS safe_add_column;
DROP PROCEDURE IF EXISTS safe_add_index;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 执行结果汇总
-- ============================================
SELECT 'Schema fix completed!' AS result;