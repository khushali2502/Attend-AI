# AttendAI Orchestration Script
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "    AttendAI Classroom Attendance Platform   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$mode = Read-Host "Select execution mode: [1] Local Native Dev [2] Docker Compose Containerized"

if ($mode -eq "1") {
    Write-Host "Launching Local Native Dev Environment..." -ForegroundColor Green
    
    # 1. Setup Backend Python Virtual Environment
    Write-Host "Setting up Python virtual environment..." -ForegroundColor Yellow
    if (!(Test-Path "backend/venv")) {
        py -m venv backend/venv
    }
    
    Write-Host "Installing python dependencies..." -ForegroundColor Yellow
    & backend/venv/Scripts/pip install -r backend/requirements.txt
    
    # 2. Run Backend
    Write-Host "Launching FastAPI backend server on http://localhost:8000..." -ForegroundColor Yellow
    Start-Process -FilePath "backend/venv/Scripts/uvicorn" -ArgumentList "app.main:app --reload --port 8000" -WorkingDirectory "backend"
    
    # 3. Launch Frontend dev server
    Write-Host "Launching Next.js frontend dev server on http://localhost:3000..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "run dev -- --port 3000" -WorkingDirectory "frontend"
    
    Write-Host "Servers booted. Access dashboard at: http://localhost:3000/login" -ForegroundColor Green
} else {
    Write-Host "Launching Docker Compose Containers..." -ForegroundColor Green
    docker-compose up --build
}
