-- v12: design_note 增加 严重程度/适用阶段/关联项目/正确做法 字段
-- 用于结构化设计·生产注意事项，支持分级筛选与踩坑溯源

ALTER TABLE design_note ADD COLUMN severity VARCHAR(20) DEFAULT 'important' COMMENT '严重程度: fatal-致命坑 / important-重要 / suggestion-建议' AFTER note_type;
ALTER TABLE design_note ADD COLUMN stage VARCHAR(100) DEFAULT NULL COMMENT '适用阶段(逗号分隔): design,sample,mass,package' AFTER severity;
ALTER TABLE design_note ADD COLUMN project_id BIGINT UNSIGNED DEFAULT NULL COMMENT '关联项目ID(踩坑溯源)' AFTER stage;
ALTER TABLE design_note ADD COLUMN correct_practice TEXT DEFAULT NULL COMMENT '正确做法' AFTER content;

ALTER TABLE design_note ADD INDEX idx_severity (severity);
ALTER TABLE design_note ADD INDEX idx_project_id (project_id);

SELECT 'design_note v12 fields added!' AS result;
