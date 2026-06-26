-- 灵感表新增「链接健康状态」字段（用于外部链接失效检测）
-- MySQL 8 不支持 ADD COLUMN IF NOT EXISTS，这里用 information_schema 判断后动态执行，可重复运行。
SET @db := DATABASE();

-- link_status：链接状态
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='inspiration' AND COLUMN_NAME='link_status');
SET @sql := IF(@exists=0,
  "ALTER TABLE inspiration ADD COLUMN link_status VARCHAR(20) DEFAULT 'unknown' COMMENT '链接状态: unknown=未检测, ok=正常, dead=已失效(4xx/5xx), error=无法验证(超时/网络错误)' AFTER source_url",
  "SELECT 'link_status exists'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- link_http_code：最近探活的 HTTP 状态码
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='inspiration' AND COLUMN_NAME='link_http_code');
SET @sql := IF(@exists=0,
  "ALTER TABLE inspiration ADD COLUMN link_http_code INT DEFAULT NULL COMMENT '最近一次探活的 HTTP 状态码' AFTER link_status",
  "SELECT 'link_http_code exists'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- link_checked_at：最近探活时间
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='inspiration' AND COLUMN_NAME='link_checked_at');
SET @sql := IF(@exists=0,
  "ALTER TABLE inspiration ADD COLUMN link_checked_at DATETIME DEFAULT NULL COMMENT '最近一次链接探活时间' AFTER link_http_code",
  "SELECT 'link_checked_at exists'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 按状态筛选用的索引（如只看已失效）
SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='inspiration' AND INDEX_NAME='idx_link_status');
SET @sql := IF(@exists=0,
  "ALTER TABLE inspiration ADD INDEX idx_link_status (link_status)",
  "SELECT 'idx_link_status exists'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT 'v9 link_status migration done' AS result;
