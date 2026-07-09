-- v15: tag 表补业务索引
-- 背景：tag 表原本只有主键，但被大量 LEFT JOIN ... ON FIND_IN_SET(tag.id, ...)
-- 以及按 tag_type/status 查询（灵感/项目的标签匹配、按类型拉取标签选项等）。
-- 补 tag_type、status 索引提升这些查询效率，纯收益、无风险。
ALTER TABLE tag ADD INDEX idx_tag_type (tag_type);
ALTER TABLE tag ADD INDEX idx_status (status);
