# Quick deployment script for Windows PowerShell

Write-Host "🚀 Starting Quick Frontend Deployment to EC2..." -ForegroundColor Green
Write-Host ""

# Check if Download.pem exists
if (-not (Test-Path "Download.pem")) {
    Write-Host "❌ Error: Download.pem not found!" -ForegroundColor Red
    Write-Host "Please ensure your SSH key is in the project directory." -ForegroundColor Yellow
    exit 1
}

# Run the deployment script
& .\deploy-frontend.ps1

Write-Host ""
Write-Host "Done! Check the output above for any errors." -ForegroundColor Cyan
