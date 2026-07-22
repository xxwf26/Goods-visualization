-- v18: 灵感采集功能 —— 候选表 inspiration_candidate + 抓取批次表 crawl_run
-- 背景：把灵感库从「手动贴单链接」升级为「关键词搜小红书最新帖 → 候选队列 → 人工复核转正」。
-- 详见 docs/灵感采集设计方案.md。
-- MySQL 8 无 CREATE TABLE IF NOT EXISTS 的列级幂等问题，但 CREATE TABLE IF NOT EXISTS 表级是支持的，可重复运行。
SET @db := DATABASE();

-- ============ 抓取批次表 ============
CREATE TABLE IF NOT EXISTS crawl_run (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  keywords    VARCHAR(500)  COMMENT '本次搜索的关键词（逗号分隔）',
  status      VARCHAR(20)   DEFAULT 'running' COMMENT 'running=进行中, ok=完成, failed=失败',
  recalled    INT           DEFAULT 0 COMMENT '召回帖子总数（去重前）',
  new_count   INT           DEFAULT 0 COMMENT '去重后新增候选数',
  error       VARCHAR(500)  COMMENT '失败原因',
  created_by  BIGINT        COMMENT '发起人 sys_user.id',
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME      COMMENT '完成/失败时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='灵感采集抓取批次';

-- ============ 候选表 ============
-- 设计：候选表 = inspiration 业务字段镜像 + 复核脚手架（溯源/AI分/去重/状态机）。
-- 转正时业务字段迁入 inspiration，候选记录保留只翻状态（留审计轨迹）。
CREATE TABLE IF NOT EXISTS inspiration_candidate (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  -- 溯源脚手架
  crawl_run_id    BIGINT        COMMENT '归属抓取批次 crawl_run.id',
  keyword         VARCHAR(100)  COMMENT '由哪个关键词采到',
  source_platform VARCHAR(50)   DEFAULT '小红书',
  -- 业务字段（对齐 inspiration，转正时迁移）
  source_url      VARCHAR(1000) NOT NULL COMMENT '帖子链接（含 xsec_token）',
  title           VARCHAR(500),
  author          VARCHAR(100),
  author_url      VARCHAR(500),
  cover_image     VARCHAR(500)  COMMENT '已下载到本地的封面路径',
  images          TEXT          COMMENT '逗号分隔的本地图路径',
  post_tags       VARCHAR(500)  COMMENT '帖子话题标签（逗号分隔）',
  description     TEXT          COMMENT '正文',
  like_count      INT,
  save_count      INT           COMMENT '收藏数（对齐 inspiration.save_count）',
  comment_count   INT,
  -- AI 预筛脚手架
  ai_score        INT           COMMENT '0-100 相关度/质量分',
  ai_reason       VARCHAR(500)  COMMENT '一句话理由',
  ai_category     VARCHAR(50)   COMMENT 'AI 猜的分类 packaging/peripheral/effect/production',
  -- 去重命中（软提示）
  dedup_inspiration_id BIGINT   COMMENT '疑似已存在的灵感 id',
  -- 状态机
  status          VARCHAR(20)   DEFAULT 'pending' COMMENT 'pending=待复核, adopted=已转正, rejected=已丢弃',
  reviewed_by     BIGINT        COMMENT '复核人 sys_user.id',
  promoted_id     BIGINT        COMMENT '转正后生成的 inspiration.id',
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_source_url (source_url(255)),
  INDEX idx_status (status),
  INDEX idx_run (crawl_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='灵感采集候选（待复核）';

SELECT 'v18 inspiration_candidate + crawl_run migration done' AS result;
