-- v6: 供应商风险等级字段
-- 供应商表新增 risk_level 列（low/medium/high），配合前端"风险等级"下拉持久化
ALTER TABLE `supplier`
  ADD COLUMN `risk_level` VARCHAR(16) DEFAULT NULL COMMENT '风险等级 low/medium/high' AFTER `rating`;
