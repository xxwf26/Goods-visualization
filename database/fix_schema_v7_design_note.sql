-- 生产/设计注意事项表
CREATE TABLE IF NOT EXISTS `design_note` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `title`           VARCHAR(200) NOT NULL COMMENT '标题',
  `content`         TEXT DEFAULT NULL COMMENT '内容',
  `note_type`       VARCHAR(20) DEFAULT NULL COMMENT '类型: design/production',
  `category`        VARCHAR(100) DEFAULT NULL COMMENT '品类',
  `craft`           VARCHAR(100) DEFAULT NULL COMMENT '工艺',
  `ip`              VARCHAR(100) DEFAULT NULL COMMENT 'IP',
  `images`          TEXT DEFAULT NULL COMMENT '图片(逗号分隔)',
  `attachments`     TEXT DEFAULT NULL COMMENT '附件',
  `remark`          TEXT DEFAULT NULL COMMENT '备注',
  `create_user_id`  BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人',
  `create_time`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_delete`       TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_note_type` (`note_type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产/设计注意事项';

SELECT 'design_note table created!' AS result;
