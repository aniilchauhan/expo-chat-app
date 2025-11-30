# EAS Build Script for Windows
# This script works around Windows long path issues

Write-Host "Starting EAS Build for ChatApp..." -ForegroundColor Green
Write-Host ""

# Ensure we're in the right directory
$projectPath = "C:\Anil\projects\chat-app\expo-chat-app"
Set-Location $projectPath

# Check if logged in
Write-Host "Checking EAS login status..." -ForegroundColor Yellow
eas whoami

if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Please run: eas login" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting preview build for Android..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Run the build
eas build --profile preview --platform android

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build submitted successfully!" -ForegroundColor Green
    Write-Host "Check your build status at: https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Build failed. Check the error messages above." -ForegroundColor Red
    Write-Host "You can also try building from the web dashboard at:" -ForegroundColor Yellow
    Write-Host "https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds" -ForegroundColor Cyan
}
