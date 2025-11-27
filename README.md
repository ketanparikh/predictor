# 🏏 Cricket Predictor

A modern web-based cricket predictor game built with Flutter and Firebase. Test your cricket knowledge, compete on the leaderboard, and become the ultimate cricket predictor!

## ✨ Features

- 🎮 **Interactive Predictor Game** - Answer cricket-related questions with varying difficulty levels
- 🏆 **Real-time Leaderboard** - Compete with other players and see top scores
- 🔐 **User Authentication** - Secure login and registration with Firebase
- 🎨 **Modern UI** - Beautiful, responsive design with Material 3 theming
- 📱 **Progressive Web App** - Works seamlessly across all devices
- ⚡ **Firebase Backend** - Scalable cloud database for scores and user data

## 🚀 Getting Started

### Prerequisites

- Flutter SDK (latest stable version)
- Firebase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Predictor
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Set up Firebase**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Enable Cloud Firestore
   - Add a web app and copy the configuration

4. **Configure Firebase**

   Edit `lib/firebase_options.dart` with your Firebase configuration:

   ```dart
   static const FirebaseOptions web = FirebaseOptions(
     apiKey: 'YOUR_API_KEY',
     appId: '1:YOUR_APP_ID',
     messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
     projectId: 'YOUR_PROJECT_ID',
     authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
     storageBucket: 'YOUR_PROJECT_ID.appspot.com',
   );
   ```

5. **Configure Firestore Rules**

   Go to Firebase Console > Firestore > Rules and add:

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /leaderboard/{document} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

6. **Run the app**
   ```bash
   flutter run -d chrome
   ```

## 📂 Project Structure

```
lib/
├── main.dart                 # App entry point
├── firebase_options.dart     # Firebase configuration
├── theme/
│   └── app_theme.dart       # App theming
├── providers/
│   ├── auth_provider.dart   # Authentication state management
│   └── game_provider.dart   # Game state management
├── models/
│   ├── question.dart        # Question data model
│   └── leaderboard_entry.dart # Leaderboard data model
├── screens/
│   ├── splash_screen.dart   # App splash screen
│   ├── auth/
│   │   └── login_screen.dart # Login/signup screen
│   ├── home/
│   │   ├── home_screen.dart        # Main navigation
│   │   └── predictor_game_screen.dart # Game interface
│   └── leaderboard/
│       └── leaderboard_screen.dart  # Leaderboard display
└── services/
    └── leaderboard_service.dart    # Leaderboard data service
```

## 🎮 How to Play

1. **Sign Up/Login** - Create an account or login with existing credentials
2. **Start Predicting** - Click "Start Game" to begin answering questions
3. **Answer Questions** - Select your answer from multiple options
4. **Score Points** - Earn points based on question difficulty
5. **Check Leaderboard** - See how you rank against other players

## 🎯 Question Configuration

Questions are stored in `assets/config/questions.json`. You can customize:

- **Questions** - Add, modify, or remove questions
- **Points** - Adjust point values for each question
- **Categories** - Organize questions by category
- **Options** - Set up multiple choice answers

## 🔥 Backend Scoring & Functions

We use Cloud Functions to reconcile match outcomes against user predictions and maintain a tournament-scoped leaderboard.

### Data Model
- `tournaments/{tournamentId}/matches/{matchId}/predictions/{userId}`
  - `{ answers: { [questionId]: userAnswer }, submittedAt }`
- `tournaments/{tournamentId}/matches/{matchId}/outcome`
  - `{ correctAnswers: { [qId]: value }, points: { [qId]: number }, lockedAt }`
- `tournaments/{tournamentId}/matches/{matchId}/scores/{userId}`
  - `{ matchScore, computedAt }`
- `leaderboard/{tournamentId}_{userId}`
  - `{ tournamentId, userId, userName, score, timestamp }`

### Deploy Functions
```
cd functions
npm install
npm run build
firebase deploy --only functions --project <your-project-id>
```

### Deploy Indexes and Rules
```
firebase deploy --only firestore:indexes --project <your-project-id>
firebase deploy --only firestore:rules --project <your-project-id>
```

### How it Works
On write to `.../outcome`, the function:
1. Reads `correctAnswers` and `points`
2. Iterates predictions for that match
3. Computes `matchScore` per user and writes to `scores/{userId}`
4. Transactionally updates `leaderboard/{tournamentId}_{userId}`: `total = prevTotal - prevMatchScore + newMatchScore`

## 🔥 Deploy to Firebase Hosting

1. **Build the web app**
   ```bash
   flutter build web
   ```

2. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

3. **Login to Firebase**
   ```bash
   firebase login
   ```

4. **Initialize Firebase**
   ```bash
   firebase init
   ```
   - Select "Hosting"
   - Set public directory as `build/web`

5. **Deploy**

   **Quick Deployment (Recommended):**
   
   **Windows Users:**
   
   PowerShell (Recommended):
   ```powershell
   .\deploy.ps1
   ```
   
   Or Command Prompt:
   ```cmd
   deploy.bat
   ```
   
   ⚠️ Note: `deploy.sh` is for Linux/Mac only. On Windows, use `deploy.ps1` or `deploy.bat`.
   
   **Linux/Mac Users:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
   
   **Manual Deployment:**
   ```bash
   firebase deploy
   ```
   
   For detailed deployment instructions, see [README_DEPLOYMENT.md](README_DEPLOYMENT.md)

## 🛠️ Technologies Used

- **Flutter** - UI framework
- **Firebase Auth** - User authentication
- **Cloud Firestore** - Database for scores
- **Provider** - State management
- **Google Fonts** - Typography
- **Material 3** - Modern UI design

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

For questions or support, please open an issue on the repository.

---

Made with ❤️ using Flutter & Firebase

