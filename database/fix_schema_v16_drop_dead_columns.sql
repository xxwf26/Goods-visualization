-- v16: 删除重复/已迁移的废弃字段（保留"从未使用"的功能字段）
-- 判定：全表全空 + 代码零引用 + 属于「重复」或「数据已迁走」两类。
-- 保留了 file_storage / 图片字段 / 数量字段等"从未使用但代码有引用"的字段（后续可能启用）。
--
-- 1) project.man_days       —— 与在用的 person_days 重复（工时），man_days 全空且代码零引用
-- 2) project.file_storage_path —— 与在用的 quotation_file(77条) 重复的文件路径，全空且代码零引用
-- 3) inspiration.collect_count —— 收藏数已全部迁移到 save_count（15条已覆盖，0 丢失风险），死字段
ALTER TABLE project DROP COLUMN man_days;
ALTER TABLE project DROP COLUMN file_storage_path;
ALTER TABLE inspiration DROP COLUMN collect_count;
