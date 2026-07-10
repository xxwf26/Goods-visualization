-- v17: 标签关联表（替代 inspiration/project 的逗号字符串 _tag_ids 字段）
-- 背景：原 ip_tag_ids/category_tag_ids/craft_tag_ids/scene_tag_ids 用 "1,5,63" 逗号存储，
-- 查询用 LIKE '%id%' 会误匹配（查1命中10/11），且无法走索引。改关联表根治。
-- 旧字段暂保留并双写，稳定后再删。

CREATE TABLE IF NOT EXISTS inspiration_tag (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspiration_id BIGINT UNSIGNED NOT NULL,
  tag_type VARCHAR(20) NOT NULL COMMENT 'ip/category/craft/scene',
  tag_id BIGINT UNSIGNED NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_insp_tag (inspiration_id, tag_type, tag_id),
  KEY idx_insp_type_tagid (tag_type, tag_id),
  KEY idx_insp_tagid (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_tag (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  tag_type VARCHAR(20) NOT NULL COMMENT 'ip/category/craft/scene',
  tag_id BIGINT UNSIGNED NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_proj_tag (project_id, tag_type, tag_id),
  KEY idx_proj_type_tagid (tag_type, tag_id),
  KEY idx_proj_tagid (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
