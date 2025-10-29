# Setup Instructions

## Quick Start Guide

### 1. Flutter Setup
```bash
# Install Flutter if not already installed
# Visit: https://flutter.dev/docs/get-started/install

# Verify installation
flutter doctor
```

### 2. Install Dependencies
```bash
flutter pub get
```

### 3. Firebase Setup

#### Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `cricket-predictor`
4. Disable Google Analytics (optional)
5. Click "Create project"

#### Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** provider
4. Click "Enable"

#### Create Firestore Database
1. Go to **Firestore Database**
2. Click "Create database"
3. Start in **production mode**
4. Choose a location
5. Click "Enable"

#### Get Firebase Configuration
1. In Firebase Console, click the web icon `</>`
2. Register your app name
3. Copy the configuration
4. Open `lib/firebase_options.dart`
5. Replace the values:

```dart
static const FirebaseOptions web = FirebaseOptions(
  apiKey: 'YOUR_API_KEY_HERE',
  appId: '1:YOUR_APP_ID_HERE',
  messagingSenderId: 'YOUR_SENDER_ID_HERE',
  projectId: 'YOUR_PROJECT_ID_HERE',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
);
```

#### Deploy Firestore Rules
1. In Firebase Console, go to **Firestore Database** > **Rules**
2. Copy the content from `firestore.rules`
3. Paste and click "Publish"

### 4. Run the App

#### For Web
```bash
flutter run -d chrome
```

#### For Debug
```bash
flutter run --web-port 8080
```

### 5. Build and Deploy

#### Build Web App
```bash
flutter build web
```

#### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase (if not done):
```bash
firebase init hosting
```
- Select "Firestore"
- Select "Hosting"
- Use `build/web` as public directory
- Single-page app: Yes
- Set up automatic builds: No

4. Deploy:
```bash
firebase deploy --only hosting
```

## Testing

1. **Create a test account** on the login screen
2. **Play the game** and answer questions
3. **Check leaderboard** to verify scores are saved
4. **Test logout** and login again

## Troubleshooting

### Firebase not initializing
- Check `firebase_options.dart` has correct values
- Verify Firebase project is set up correctly

### Leaderboard not showing data
- Check Firestore rules are deployed
- Verify database is created in Firebase Console

### Build errors
- Run `flutter clean`
- Run `flutter pub get`
- Check Flutter version: `flutter --version`

## Next Steps

- Customize questions in `assets/config/questions.json`
- Add more game features
- Implement daily challenges
- Add more authentication providers (Google, etc.)

