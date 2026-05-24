# 拼拼看Me - 一键启动脚本

Write-Host "🚀 正在启动拼拼看Me..." -ForegroundColor Cyan
Write-Host ""

# 启动后端（新窗口）
Write-Host "1️⃣ 正在启动后端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\projects\puzzle-fusion-engine\backend; uvicorn main:app --reload --host 0.0.0.0 --port 8000"

# 等待3秒让后端启动
Write-Host "⏳ 等待后端启动..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# 启动前端（新窗口）
Write-Host "2️⃣ 正在启动前端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\projects\puzzle-fusion-engine\frontend; npm run dev"

Write-Host ""
Write-Host "✅ 前后端已启动！" -ForegroundColor Green
Write-Host "🌐 前端：http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 后端：http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示：关闭终端窗口即可停止服务" -ForegroundColor Gray

Start-Sleep -Seconds 10
