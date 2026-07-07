#!/usr/bin/env bash
# MySQL 数据库备份脚本
# 用法: bash tools/backup_db.sh
# 说明: 读取 backend/.env 的数据库配置，mysqldump 导出并 gzip 压缩，保留最近 30 份。
# 建议: Linux 用 crontab 每天 03:00 跑一次  (0 3 * * * cd /path && bash tools/backup_db.sh)
set -e
cd "$(dirname "$0")/.."

# 读取 backend/.env 中的 DB_* 配置
if [ ! -f backend/.env ]; then echo "找不到 backend/.env"; exit 1; fi
set -a; . backend/.env; set +a

: "${DB_HOST:=127.0.0.1}"; : "${DB_PORT:=3307}"
: "${DB_NAME:=goods_visualization}"; : "${DB_USER:=root}"
if [ -z "$DB_PASSWORD" ]; then echo "backend/.env 未设置 DB_PASSWORD"; exit 1; fi

BACKUP_DIR="backups"; mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"

echo "正在备份 $DB_NAME -> $FILE ..."
mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines --triggers --default-character-set=utf8mb4 \
  "$DB_NAME" 2>/dev/null | gzip > "$FILE"

SIZE=$(du -h "$FILE" | cut -f1)
echo "✅ 备份完成: $FILE ($SIZE)"

# 保留最近 30 份，更早的自动清理
ls -t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null | tail -n +31 | while read -r old; do
  rm -f "$old"; echo "清理旧备份: $old"
done
