-- 对齐 项目及人天统计 Excel 的 18 个字段
-- 补充 project 表中缺失的列

-- 投入人天
ALTER TABLE project ADD COLUMN IF NOT EXISTS person_days DECIMAL(10,2) DEFAULT NULL COMMENT '投入人天' AFTER total_amount;

-- 报价单（文件路径）
ALTER TABLE project ADD COLUMN IF NOT EXISTS quotation_file VARCHAR(500) DEFAULT NULL COMMENT '报价单文件' AFTER project_leader;

-- 需求种类
ALTER TABLE project ADD COLUMN IF NOT EXISTS requirement_type VARCHAR(100) DEFAULT NULL COMMENT '需求种类' AFTER requester;

-- 文件存储地址
ALTER TABLE project ADD COLUMN IF NOT EXISTS file_storage VARCHAR(500) DEFAULT NULL COMMENT '文件存储地址' AFTER remark;

-- 父记录
ALTER TABLE project ADD COLUMN IF NOT EXISTS parent_record VARCHAR(500) DEFAULT NULL COMMENT '父记录' AFTER file_storage;

SELECT 'project table columns aligned!' AS result;