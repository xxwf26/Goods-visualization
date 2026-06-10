-- ============================================
-- 周边价格登记表 (price_record)
-- 对应 Excel 表: 周边价格登记（仅国服）
-- ============================================
DROP TABLE IF EXISTS `price_record`;
CREATE TABLE `price_record` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
    `product_name` VARCHAR(200) NOT NULL COMMENT '单品',
    `category` VARCHAR(100) DEFAULT NULL COMMENT '品类',
    `supplier_name` VARCHAR(200) DEFAULT NULL COMMENT '供应商',
    `ip` VARCHAR(100) DEFAULT NULL COMMENT 'IP',
    `image` VARCHAR(500) DEFAULT NULL COMMENT '图片',
    `project_name` VARCHAR(200) DEFAULT NULL COMMENT '项目',
    `sample_days` INT DEFAULT NULL COMMENT '打样（天）',
    `mass_production_days` INT DEFAULT NULL COMMENT '大货（天）',
    `style_count` INT DEFAULT NULL COMMENT '款式',
    `single_quantity` INT DEFAULT NULL COMMENT '单款数量',
    `design_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '设计费',
    `sample_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '打样费',
    `unit_price` DECIMAL(10,2) DEFAULT NULL COMMENT '单价',
    `total_quantity` INT DEFAULT NULL COMMENT '总数量',
    `other_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '其他费用',
    `total_price` DECIMAL(15,2) DEFAULT NULL COMMENT '总价',
    `production_info` TEXT DEFAULT NULL COMMENT '生产信息',
    `remark1` TEXT DEFAULT NULL COMMENT '备注1',
    `remark2` TEXT DEFAULT NULL COMMENT '备注2',
    `create_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (`id`),
    KEY `idx_product_name` (`product_name`),
    KEY `idx_category` (`category`),
    KEY `idx_ip` (`ip`),
    KEY `idx_supplier_name` (`supplier_name`),
    KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='周边价格登记表';

SELECT 'price_record table created successfully!' AS result;