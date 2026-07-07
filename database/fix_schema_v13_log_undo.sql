-- v13: log 表增加回撤(undo)所需字段
-- before_data: 操作前的整行 JSON（PUT/DELETE 用，回撤时还原）
-- resource_table / resource_id: 操作的资源表与主键（回撤定位用，避免解析 URL）
-- undone: 是否已回撤（0/1），已回撤的日志不可再次回撤

ALTER TABLE log ADD COLUMN before_data TEXT DEFAULT NULL COMMENT '操作前整行JSON(回撤用)' AFTER params;
ALTER TABLE log ADD COLUMN resource_table VARCHAR(50) DEFAULT NULL COMMENT '资源表名' AFTER before_data;
ALTER TABLE log ADD COLUMN resource_id BIGINT UNSIGNED DEFAULT NULL COMMENT '资源主键ID' AFTER resource_table;
ALTER TABLE log ADD COLUMN undone TINYINT NOT NULL DEFAULT 0 COMMENT '是否已回撤: 0-否 1-是' AFTER resource_id;
ALTER TABLE log ADD INDEX idx_resource (resource_table, resource_id);

SELECT 'log v13 undo fields added!' AS result;
