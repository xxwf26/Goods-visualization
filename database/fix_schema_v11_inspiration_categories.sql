-- v11: 灵感多分类字段
-- categories 存逗号分隔的多分类(packaging,peripheral,effect,production)
-- inspiration_type 迁移为4分类: product→peripheral, craft→effect
ALTER TABLE inspiration
ADD COLUMN IF NOT EXISTS categories VARCHAR(200) DEFAULT NULL
  COMMENT '多分类(逗号分隔: packaging,peripheral,effect,production)' AFTER inspiration_type;

-- 迁移旧 inspiration_type 值到 4 分类
UPDATE inspiration SET inspiration_type = CASE
  WHEN inspiration_type = 'product' THEN 'peripheral'
  WHEN inspiration_type = 'craft' THEN 'effect'
  WHEN inspiration_type IN ('packaging','peripheral','effect','production') THEN inspiration_type
  ELSE 'peripheral'
END WHERE inspiration_type IS NOT NULL;

SELECT 'v11: categories field added, inspiration_type migrated' AS result;
