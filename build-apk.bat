@echo off
echo ========================================
echo   ChatApp - Build Android APK
echo ========================================
echo.
echo This will build a standalone Android APK
echo with full contact sync and all features!
echo.
echo Build time: 15-20 minutes
echo.
echo ========================================
echo.

echo Step 1: Checking EAS CLI...
call eas --version
if errorlevel 1 (
    echo.
    echo ERROR: EAS CLI not found!
    echo Installing EAS CLI...
    call npm install -g eas-cli
)

echo.
echo ========================================
echo Step 2: Login to Expo
echo ========================================
echo.
echo You'll need an Expo account (free)
echo Sign up at: https://expo.dev/signup
echo.
pause
call eas login

echo.
echo ========================================
echo Step 3: Configure Project
echo ========================================
echo.
call eas build:configure

echo.
echo ========================================
echo Step 4: Start Build
echo ========================================
echo.
echo Choose build type:
echo 1. Development (Recommended for testing)
echo 2. Preview (Beta testing)
echo 3. Production (Final release)
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Building DEVELOPMENT APK...
    call eas build --profile development --platform android
) else if "%choice%"=="2" (
    echo.
    echo Building PREVIEW APK...
    call eas build --profile preview --platform android
) else if "%choice%"=="3" (
    echo.
    echo Building PRODUCTION APK...
    call eas build --profile production --platform android
) else (
    echo Invalid choice! Building DEVELOPMENT APK by default...
    call eas build --profile development --platform android
)

echo.
echo ========================================
echo Build Started!
echo ========================================
echo.
echo The build is happening in the cloud.
echo This will take 15-20 minutes.
echo.
echo You can:
echo - Wait here and watch the progress
echo - Or check status at: https://expo.dev
echo.
echo When complete, you'll get a download link!
echo.
pause
