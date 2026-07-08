-- v14: 灵感新增「平台播放量」字段 play_count
-- 背景：打通 B 站视频链接抓取，需存平台播放量用于跨平台热度排序。
-- 与 view_count 区分：view_count 是站内浏览计数（打开详情 +1），play_count 是平台真实播放量。
ALTER TABLE inspiration ADD COLUMN play_count INT DEFAULT 0 AFTER view_count;
