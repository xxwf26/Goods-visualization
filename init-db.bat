@echo off
chcp 65001 >nul
echo ========================================
echo   周边可视化系统 - 数据库初始化
echo ========================================
echo.

cd /d "%~dp0"

echo 正在初始化数据库，请稍候...
mysql -u root -p goods_visualization < database\init.sql

echo.
echo ========================================
echo   初始化完成！
echo ========================================
pause
