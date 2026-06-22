-- 灵感表新增 inspiration_type 字段
-- 用于区分 周边制品灵感(product) / 工艺灵感(craft)
ALTER TABLE inspiration
ADD COLUMN IF NOT EXISTS inspiration_type VARCHAR(20) DEFAULT 'product'
  COMMENT '灵感类型: product/craft' AFTER id;

SELECT 'inspiration_type column added!' AS result;
