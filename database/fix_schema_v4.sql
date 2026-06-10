-- Add case_files column to supplier table for PDF case files
ALTER TABLE supplier ADD COLUMN case_files TEXT DEFAULT NULL COMMENT '案例文件(JSON数组，PDF路径)' AFTER case_images;

SELECT 'case_files column added successfully!' AS result;