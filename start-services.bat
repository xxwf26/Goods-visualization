@echo off
:: 周边可视化系统 - 服务自启动脚本
:: 由 Windows 任务计划程序在开机后调用

:: 等待网络就绪
timeout /t 10 /nobreak >nul

:: 用 PM2 恢复所有已保存的进程
"D:\support\nodejs\node_global\pm2.cmd" resurrect

exit /b 0
