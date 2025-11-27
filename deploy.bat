@echo off
REM Firebase Deployment Script for Cricket Predictor App
REM This script builds and deploys all components to Firebase

echo ========================================
echo   Cricket Predictor - Deployment Script
echo ========================================
echo.

REM Check if Firebase CLI is installed
echo [1/5] Checking Firebase CLI...
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Firebase CLI not found. Please install it first.
    echo   Install via: npm install -g firebase-tools
    exit /b 1
)
echo ✓ Firebase CLI found
echo.

REM Check if Flutter is installed
echo [2/5] Checking Flutter...
flutter --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Flutter not found. Please install Flutter first.
    exit /b 1
)
echo ✓ Flutter found
echo.

REM Build Cloud Functions
echo [3/5] Building Cloud Functions...
cd functions
if not exist "node_modules" (
    echo   Installing dependencies...
    call npm install
)
call npm run build
if %errorlevel% neq 0 (
    echo ✗ Failed to build Cloud Functions
    cd ..
    exit /b 1
)
echo ✓ Cloud Functions built successfully
cd ..
echo.

REM Build Flutter Web App
echo [4/5] Building Flutter Web App...
flutter build web
if %errorlevel% neq 0 (
    echo ✗ Failed to build Flutter web app
    exit /b 1
)
echo ✓ Flutter web app built successfully
echo.

REM Deploy to Firebase
echo [5/5] Deploying to Firebase...
echo.
firebase deploy
if %errorlevel% neq 0 (
    echo ✗ Deployment failed
    exit /b 1
)

echo.
echo ========================================
echo   ✓ Deployment Complete!
echo ========================================
echo.
echo Access your app at: https://predictor-jcpl.web.app
echo Firebase Console: https://console.firebase.google.com/project/predictor-jcpl/overview
echo.

pause

