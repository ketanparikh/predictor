# Flutter Path Setup Script
# This script helps locate Flutter and adds it to PATH for the current session

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Flutter Path Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Common Flutter installation locations
$flutterPaths = @(
    "$env:LOCALAPPDATA\flutter",
    "C:\flutter",
    "$env:USERPROFILE\flutter",
    "$env:USERPROFILE\dev\flutter",
    "C:\src\flutter",
    "C:\tools\flutter",
    "$env:ProgramFiles\flutter"
)

Write-Host "Searching for Flutter installation..." -ForegroundColor Yellow

$foundFlutter = $null
foreach ($path in $flutterPaths) {
    $flutterBin = Join-Path $path "bin\flutter.bat"
    if (Test-Path $flutterBin) {
        $foundFlutter = $path
        Write-Host "✓ Found Flutter at: $path" -ForegroundColor Green
        break
    }
}

# If not found in common locations, search more broadly
if ($null -eq $foundFlutter) {
    Write-Host "Flutter not found in common locations. Searching more broadly..." -ForegroundColor Yellow
    
    # Search in user's home directory (limited depth for performance)
    $searchPaths = @(
        "$env:USERPROFILE",
        "C:\"
    )
    
    foreach ($searchPath in $searchPaths) {
        try {
            $flutterBin = Get-ChildItem -Path $searchPath -Recurse -Filter "flutter.bat" -ErrorAction SilentlyContinue -Depth 3 | Select-Object -First 1
            if ($flutterBin) {
                $foundFlutter = $flutterBin.Directory.Parent.FullName
                Write-Host "✓ Found Flutter at: $foundFlutter" -ForegroundColor Green
                break
            }
        } catch {
            # Continue searching
        }
    }
}

if ($null -eq $foundFlutter) {
    Write-Host ""
    Write-Host "✗ Flutter not found on your system." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Flutter:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Cyan
    Write-Host "  2. Extract to a folder (e.g., C:\flutter)" -ForegroundColor Cyan
    Write-Host "  3. Add C:\flutter\bin to your PATH environment variable" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or if Flutter is already installed, please provide the path:" -ForegroundColor Yellow
    $manualPath = Read-Host "Enter Flutter installation path (or press Enter to exit)"
    if ($manualPath -and (Test-Path (Join-Path $manualPath "bin\flutter.bat"))) {
        $foundFlutter = $manualPath
        Write-Host "✓ Using Flutter at: $foundFlutter" -ForegroundColor Green
    } else {
        exit 1
    }
}

if ($foundFlutter) {
    $flutterBinPath = Join-Path $foundFlutter "bin"
    
    # Add to PATH for current session
    if ($env:PATH -notlike "*$flutterBinPath*") {
        $env:PATH += ";$flutterBinPath"
        Write-Host ""
        Write-Host "✓ Added Flutter to PATH for this session" -ForegroundColor Green
    }
    
    # Verify Flutter works
    Write-Host ""
    Write-Host "Verifying Flutter installation..." -ForegroundColor Yellow
    try {
        $flutterVersion = & "$flutterBinPath\flutter.bat" --version 2>&1 | Select-Object -First 1
        Write-Host "✓ Flutter is working: $flutterVersion" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Setup Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Flutter is now available in this PowerShell session." -ForegroundColor Cyan
        Write-Host "To make this permanent, add the following to your PATH:" -ForegroundColor Yellow
        Write-Host "  $flutterBinPath" -ForegroundColor White
        Write-Host ""
    } catch {
        Write-Host "✗ Error running Flutter: $_" -ForegroundColor Red
        exit 1
    }
}
