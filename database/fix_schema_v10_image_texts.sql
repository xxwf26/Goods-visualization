-- 灵感表新增 image_texts 字段：存储每张图片本地文件名+OCR文字
ALTER TABLE inspiration
ADD COLUMN IF NOT EXISTS image_texts TEXT DEFAULT NULL
  COMMENT '每张图片的OCR文字(JSON: [{file,text}])' AFTER images;

SELECT 'image_texts column added!' AS result;
