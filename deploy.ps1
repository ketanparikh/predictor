# Firebase Deployment Script for Cricket Predictor App
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cricket Predictor - Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Check-CommandExists {
    param($CommandName, $ErrorMessage)
    $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($null -eq $cmd) {
        Write-Host $ErrorMessage -ForegroundColor Red
        exit 1
    }
    return $true
}

# Check Firebase CLI
Write-Host "[1/5] Checking Firebase CLI..." -ForegroundColor Yellow
Check-CommandExists "firebase" "✗ Firebase CLI not found. Please install it first.`n  Install via: npm install -g firebase-tools"
$firebaseVersion = firebase --version
Write-Host "✓ Firebase CLI found: $firebaseVersion" -ForegroundColor Green

# Check Flutter
Write-Host "[2/5] Checking Flutter..." -ForegroundColor Yellow
Check-CommandExists "flutter" "✗ Flutter not found. Please install Flutter first."
Write-Host "✓ Flutter found" -ForegroundColor Green

# Build Cloud Functions
Write-Host "[3/5] Building Cloud Functions..." -ForegroundColor Yellow
Set-Location functions

$nodeModulesPath = "node_modules"
$modulesExist = Test-Path $nodeModulesPath

if (-not $modulesExist) {
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

if ($modulesExist) {
    Write-Host "✓ Node modules found" -ForegroundColor Green
}

npm run build
$buildExitCode = $LASTEXITCODE
if ($buildExitCode -ne 0) {
    Write-Host "✗ Failed to build Cloud Functions" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✓ Cloud Functions built successfully" -ForegroundColor Green
Set-Location ..

# Build Flutter Web App
Write-Host "[4/5] Building Flutter Web App..." -ForegroundColor Yellow
flutter build web
$flutterExitCode = $LASTEXITCODE
if ($flutterExitCode -ne 0) {
    Write-Host "✗ Failed to build Flutter web app" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Flutter web app built successfully" -ForegroundColor Green

# Deploy to Firebase
Write-Host "[5/5] Deploying to Firebase..." -ForegroundColor Yellow
Write-Host ""
firebase deploy
$deployExitCode = $LASTEXITCODE
if ($deployExitCode -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your app at: https://predictor-jcpl.web.app" -ForegroundColor Cyan
Write-Host "Firebase Console: https://console.firebase.google.com/project/predictor-jcpl/overview" -ForegroundColor Cyan
Write-Host ""
