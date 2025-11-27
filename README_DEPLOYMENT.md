# Deployment Guide

This document explains how to deploy the Cricket Predictor app to Firebase.

## Prerequisites

1. **Firebase CLI** - Install globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Flutter SDK** - Make sure Flutter is installed and in your PATH:
   ```bash
   flutter --version
   ```

3. **Firebase Login** - Authenticate with Firebase:
   ```bash
   firebase login
   ```

4. **Node.js** - Required for Cloud Functions (Node.js 20 or later)

## Quick Deployment

### Windows Users

**PowerShell (Recommended):**
```powershell
.\deploy.ps1
```

**Command Prompt:**
```cmd
deploy.bat
```

⚠️ **Important:** The `deploy.sh` script is for Linux/Mac only. On Windows, use `deploy.ps1` (PowerShell) or `deploy.bat` (CMD) instead.

### Linux/Mac Users

```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Deployment

If you prefer to deploy components individually:

### 1. Deploy Firestore Rules and Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 2. Build and Deploy Cloud Functions
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### 3. Build and Deploy Flutter Web App
```bash
flutter build web
firebase deploy --only hosting
```

### 4. Deploy Everything at Once
```bash
firebase deploy
```

## What Gets Deployed

- **Firestore Rules** (`firestore.rules`) - Security rules for database access
- **Firestore Indexes** (`firestore.indexes.json`) - Query performance indexes
- **Cloud Functions** (`functions/`) - Backend scoring function
- **Flutter Web App** (`build/web/`) - The complete web application

## Deployment URLs

After successful deployment:
- **Web App**: https://predictor-jcpl.web.app
- **Firebase Console**: https://console.firebase.google.com/project/predictor-jcpl/overview

## Troubleshooting

### Firebase CLI Not Found
```bash
npm install -g firebase-tools
```

### Flutter Not Found
Make sure Flutter is installed and added to your PATH.

### Node.js Version Error
Cloud Functions require Node.js 20+. Update `functions/package.json` if needed:
```json
"engines": {
  "node": "20"
}
```

### Build Failures
1. Check that all dependencies are installed:
   ```bash
   cd functions && npm install
   flutter pub get
   ```

2. Verify Firebase project is set:
   ```bash
   firebase use predictor-jcpl
   ```

3. Check Firebase login status:
   ```bash
   firebase login:list
   ```

## Updating After Code Changes

1. Make your code changes
2. Run the deployment script:
   ```bash
   .\deploy.ps1    # Windows PowerShell
   deploy.bat      # Windows CMD
   ./deploy.sh     # Linux/Mac
   ```

The script will automatically:
- Build Cloud Functions
- Build Flutter web app
- Deploy everything to Firebase

## Environment-Specific Deployments

### Deploy Only Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Only Functions
```bash
firebase deploy --only functions
```

### Deploy Only Hosting
```bash
firebase deploy --only hosting
```

### Deploy Specific Function
```bash
firebase deploy --only functions:reconcileMatchOutcome
```

## Notes

- First-time deployment may take longer as Firebase sets up resources
- Cloud Functions may take a few minutes to be fully available
- The web app is available immediately after hosting deployment

