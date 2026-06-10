-- sys_permission additions
ALTER TABLE sys_permission ADD COLUMN icon VARCHAR(50) DEFAULT NULL COMMENT '图标' AFTER permission_type;
ALTER TABLE sys_permission ADD COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常' AFTER sort;

-- Update parent_id
UPDATE sys_permission SET parent_id = 2 WHERE permission_code IN ('project:view','project:search','project:create','project:edit','project:delete','project:import','project:export');
UPDATE sys_permission SET parent_id = 3 WHERE permission_code IN ('price:view','price:search');
UPDATE sys_permission SET parent_id = 4 WHERE permission_code IN ('inspiration:view','inspiration:search','inspiration:create','inspiration:edit','inspiration:delete','inspiration:upload');
UPDATE sys_permission SET parent_id = 5 WHERE permission_code IN ('supplier:view','supplier:search','supplier:detail','supplier:create','supplier:edit','supplier:delete');
UPDATE sys_permission SET parent_id = 8 WHERE permission_code IN ('tag:view','tag:create','tag:edit','tag:delete','system:user');

-- sys_role
INSERT INTO sys_role (role_name, role_code, description, sort) VALUES ('超级管理员', 'super_admin', '超级管理员：全部权限', 4);

-- tag additions
ALTER TABLE tag ADD COLUMN icon VARCHAR(50) DEFAULT NULL COMMENT '图标' AFTER color;
ALTER TABLE tag ADD COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常' AFTER sort;

-- supplier additions
ALTER TABLE supplier ADD COLUMN supplier_code VARCHAR(50) DEFAULT NULL COMMENT '供应商编码' AFTER supplier_short_name;
ALTER TABLE supplier ADD COLUMN supplier_type VARCHAR(50) DEFAULT NULL COMMENT '供应商类型' AFTER supplier_code;
ALTER TABLE supplier ADD COLUMN province VARCHAR(50) DEFAULT NULL COMMENT '省份' AFTER contract_type;
ALTER TABLE supplier ADD COLUMN city VARCHAR(50) DEFAULT NULL COMMENT '城市' AFTER province;
ALTER TABLE supplier ADD COLUMN district VARCHAR(50) DEFAULT NULL COMMENT '区县' AFTER city;
ALTER TABLE supplier ADD COLUMN address VARCHAR(500) DEFAULT NULL COMMENT '详细地址' AFTER district;
ALTER TABLE supplier ADD COLUMN license_image VARCHAR(500) DEFAULT NULL COMMENT '营业执照图片' AFTER address;
ALTER TABLE supplier ADD COLUMN business_license VARCHAR(100) DEFAULT NULL COMMENT '营业执照号' AFTER license_image;
ALTER TABLE supplier ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT NULL COMMENT '税率' AFTER business_license;
ALTER TABLE supplier ADD COLUMN payment_days INT DEFAULT NULL COMMENT '账期(天)' AFTER tax_rate;
ALTER TABLE supplier ADD COLUMN min_order_amount DECIMAL(10,2) DEFAULT NULL COMMENT '最小起订金额' AFTER payment_days;
ALTER TABLE supplier ADD COLUMN shipping_fee DECIMAL(10,2) DEFAULT NULL COMMENT '运费' AFTER min_order_amount;
ALTER TABLE supplier ADD COLUMN cooperation_status VARCHAR(20) DEFAULT 'potential' COMMENT '合作状态: potential/active/paused/terminated' AFTER shipping_fee;
ALTER TABLE supplier ADD COLUMN category_ids VARCHAR(500) DEFAULT NULL COMMENT '合作品类标签IDs' AFTER advantage_categories;
ALTER TABLE supplier ADD COLUMN main_products VARCHAR(500) DEFAULT NULL COMMENT '主要产品' AFTER category_ids;
ALTER TABLE supplier ADD COLUMN advantage TEXT DEFAULT NULL COMMENT '优势说明' AFTER main_products;
ALTER TABLE supplier ADD COLUMN remark TEXT DEFAULT NULL COMMENT '备注' AFTER risk_notes;
ALTER TABLE supplier ADD COLUMN attachments TEXT DEFAULT NULL COMMENT '附件(JSON数组)' AFTER case_images;
ALTER TABLE supplier ADD COLUMN create_user_id BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID' AFTER attachments;
ALTER TABLE supplier ADD INDEX idx_cooperation_status (cooperation_status);

-- project additions
ALTER TABLE project ADD COLUMN project_code VARCHAR(50) DEFAULT NULL COMMENT '项目编码' AFTER project_name;
ALTER TABLE project ADD COLUMN project_type VARCHAR(50) DEFAULT NULL COMMENT '项目类型' AFTER project_code;
ALTER TABLE project ADD COLUMN status VARCHAR(20) DEFAULT 'draft' COMMENT '状态' AFTER project_type;
ALTER TABLE project ADD COLUMN priority TINYINT DEFAULT 2 COMMENT '优先级' AFTER status;
ALTER TABLE project ADD COLUMN budget DECIMAL(15,2) DEFAULT NULL COMMENT '预算' AFTER priority;
ALTER TABLE project ADD COLUMN actual_cost DECIMAL(15,2) DEFAULT NULL COMMENT '实际成本' AFTER budget;
ALTER TABLE project ADD COLUMN buyer_id BIGINT UNSIGNED DEFAULT NULL COMMENT '采购负责人ID' AFTER supplier_id;
ALTER TABLE project ADD COLUMN quantity INT DEFAULT NULL COMMENT '采购数量' AFTER total_quantity;
ALTER TABLE project ADD COLUMN product_spec VARCHAR(500) DEFAULT NULL COMMENT '产品规格' AFTER quantity;
ALTER TABLE project ADD COLUMN product_material VARCHAR(500) DEFAULT NULL COMMENT '产品材质' AFTER product_spec;
ALTER TABLE project ADD COLUMN product_color VARCHAR(200) DEFAULT NULL COMMENT '产品颜色' AFTER product_material;
ALTER TABLE project ADD COLUMN product_size VARCHAR(200) DEFAULT NULL COMMENT '产品尺寸' AFTER product_color;
ALTER TABLE project ADD COLUMN product_weight VARCHAR(100) DEFAULT NULL COMMENT '产品重量' AFTER product_size;
ALTER TABLE project ADD COLUMN package_spec VARCHAR(500) DEFAULT NULL COMMENT '包装规格' AFTER product_weight;
ALTER TABLE project ADD COLUMN cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图片' AFTER other_fee;
ALTER TABLE project ADD COLUMN design_images TEXT DEFAULT NULL COMMENT '设计图(JSON数组)' AFTER cover_image;
ALTER TABLE project ADD COLUMN product_images TEXT DEFAULT NULL COMMENT '产品图(JSON数组)' AFTER design_images;
ALTER TABLE project ADD COLUMN reference_links TEXT DEFAULT NULL COMMENT '参考链接(JSON数组)' AFTER effect_images;
ALTER TABLE project ADD COLUMN expected_delivery_date DATE DEFAULT NULL COMMENT '期望交付日期' AFTER project_end_date;
ALTER TABLE project ADD COLUMN actual_delivery_date DATE DEFAULT NULL COMMENT '实际交付日期' AFTER expected_delivery_date;
ALTER TABLE project ADD COLUMN description TEXT DEFAULT NULL COMMENT '项目描述' AFTER requester;
ALTER TABLE project ADD COLUMN requirement TEXT DEFAULT NULL COMMENT '需求说明' AFTER description;
ALTER TABLE project ADD COLUMN approval_status VARCHAR(20) DEFAULT NULL COMMENT '审批状态' AFTER remark;
ALTER TABLE project ADD COLUMN approval_user_id BIGINT UNSIGNED DEFAULT NULL COMMENT '审批人ID' AFTER approval_status;
ALTER TABLE project ADD COLUMN approval_time DATETIME DEFAULT NULL COMMENT '审批时间' AFTER approval_user_id;
ALTER TABLE project ADD COLUMN approval_remark TEXT DEFAULT NULL COMMENT '审批备注' AFTER approval_time;
ALTER TABLE project ADD INDEX idx_status (status);

-- inspiration additions
ALTER TABLE inspiration ADD COLUMN source_type VARCHAR(50) DEFAULT NULL COMMENT '来源类型' AFTER source_platform;
ALTER TABLE inspiration ADD COLUMN source_name VARCHAR(200) DEFAULT NULL COMMENT '来源名称' AFTER source_type;
ALTER TABLE inspiration ADD COLUMN source_url VARCHAR(1000) DEFAULT NULL COMMENT '来源URL' AFTER link;
ALTER TABLE inspiration ADD COLUMN author VARCHAR(100) DEFAULT NULL COMMENT '作者/博主' AFTER source_url;
ALTER TABLE inspiration ADD COLUMN author_url VARCHAR(500) DEFAULT NULL COMMENT '作者链接' AFTER author;
ALTER TABLE inspiration ADD COLUMN cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图片' AFTER screenshot;
ALTER TABLE inspiration ADD COLUMN images TEXT DEFAULT NULL COMMENT '图片集(JSON数组)' AFTER cover_image;
ALTER TABLE inspiration ADD COLUMN video_url VARCHAR(500) DEFAULT NULL COMMENT '视频链接' AFTER images;
ALTER TABLE inspiration ADD COLUMN thumbnail VARCHAR(500) DEFAULT NULL COMMENT '缩略图' AFTER video_url;
ALTER TABLE inspiration ADD COLUMN description TEXT DEFAULT NULL COMMENT '描述' AFTER reference_value;
ALTER TABLE inspiration ADD COLUMN content_summary TEXT DEFAULT NULL COMMENT '内容摘要' AFTER description;
ALTER TABLE inspiration ADD COLUMN notes TEXT DEFAULT NULL COMMENT '备注笔记' AFTER content_summary;
ALTER TABLE inspiration ADD COLUMN application_scenario VARCHAR(500) DEFAULT NULL COMMENT '适用场景' AFTER scene_tag_ids;
ALTER TABLE inspiration ADD COLUMN collection_status VARCHAR(20) DEFAULT 'uncollected' COMMENT '状态: uncollected/collected/applied' AFTER collector;
ALTER TABLE inspiration ADD COLUMN folder_id BIGINT UNSIGNED DEFAULT NULL COMMENT '收藏夹ID' AFTER collection_status;
ALTER TABLE inspiration ADD COLUMN is_featured TINYINT DEFAULT 0 COMMENT '是否精选' AFTER folder_id;
ALTER TABLE inspiration ADD COLUMN is_pinned TINYINT DEFAULT 0 COMMENT '是否置顶' AFTER is_featured;
ALTER TABLE inspiration ADD COLUMN save_count INT DEFAULT 0 COMMENT '保存数' AFTER collect_count;
ALTER TABLE inspiration ADD COLUMN view_count INT DEFAULT 0 COMMENT '浏览数' AFTER comment_count;
ALTER TABLE inspiration ADD COLUMN application_result TEXT DEFAULT NULL COMMENT '应用结果' AFTER is_adopted;
ALTER TABLE inspiration ADD COLUMN application_date DATE DEFAULT NULL COMMENT '应用日期' AFTER application_result;
ALTER TABLE inspiration ADD COLUMN is_sensitive TINYINT DEFAULT 0 COMMENT '是否敏感内容' AFTER application_date;
ALTER TABLE inspiration ADD COLUMN sensitive_reason VARCHAR(500) DEFAULT NULL COMMENT '敏感原因' AFTER is_sensitive;
ALTER TABLE inspiration ADD COLUMN create_user_id BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID' AFTER related_project_ids;
ALTER TABLE inspiration ADD INDEX idx_source_type (source_type);
ALTER TABLE inspiration ADD INDEX idx_folder_id (folder_id);
ALTER TABLE inspiration ADD INDEX idx_collection_status (collection_status);

-- Create missing tables
CREATE TABLE IF NOT EXISTS supplier_evaluation (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评价ID',
    supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
    project_id BIGINT UNSIGNED DEFAULT NULL COMMENT '关联项目ID',
    quality_rating TINYINT NOT NULL COMMENT '质量评分(1-5)',
    delivery_rating TINYINT NOT NULL COMMENT '交付评分(1-5)',
    service_rating TINYINT NOT NULL COMMENT '服务评分(1-5)',
    price_rating TINYINT NOT NULL COMMENT '价格评分(1-5)',
    overall_rating DECIMAL(2,1) NOT NULL COMMENT '综合评分',
    evaluation_content TEXT DEFAULT NULL COMMENT '评价内容',
    pros TEXT DEFAULT NULL COMMENT '优点',
    cons TEXT DEFAULT NULL COMMENT '缺点',
    images TEXT DEFAULT NULL COMMENT '评价图片(JSON数组)',
    evaluator_id BIGINT UNSIGNED DEFAULT NULL COMMENT '评价人ID',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_delete TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (id),
    KEY idx_supplier_id (supplier_id),
    KEY idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商评价表';

CREATE TABLE IF NOT EXISTS inspiration_folder (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收藏夹ID',
    folder_name VARCHAR(100) NOT NULL COMMENT '收藏夹名称',
    folder_type VARCHAR(20) DEFAULT 'personal' COMMENT '类型: personal/shared/system',
    parent_id BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '父级收藏夹ID',
    description VARCHAR(500) DEFAULT NULL COMMENT '描述',
    sort INT NOT NULL DEFAULT 0 COMMENT '排序',
    is_public TINYINT DEFAULT 0 COMMENT '是否公开: 0-私有, 1-公开',
    create_user_id BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_delete TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
    PRIMARY KEY (id),
    KEY idx_create_user_id (create_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='灵感收藏夹表';

SELECT 'All schema fixes applied successfully!' AS result;