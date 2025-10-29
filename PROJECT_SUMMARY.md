# Cricket Predictor - Project Summary

## 📱 Overview

A complete Flutter/Dart web application for a cricket predictor game, hosted on Firebase, featuring user authentication, dynamic questions, and a real-time leaderboard.

## 🎯 Features Implemented

### ✅ User Authentication
- **Login/Signup Screen**: Modern, responsive login interface with email/password authentication
- **Firebase Auth Integration**: Secure user management through Firebase Authentication
- **Session Management**: Automatic session persistence across app restarts
- **Profile Display**: Shows user email in app header

### ✅ Splash Screen
- **Animated Welcome Screen**: Beautiful gradient background with cricket icon
- **Smooth Transitions**: Fade animation on app launch
- **Auto-Navigation**: Intelligently routes to login or home based on auth state

### ✅ Predictor Game
- **Dynamic Questions**: Loads questions from JSON configuration file
- **Progress Tracking**: Visual progress bar showing question completion
- **Point System**: Questions have configurable points based on difficulty
- **Categories**: Questions organized by categories (World Cup, Records, Legends, etc.)
- **Interactive UI**: Smooth, material design based user interface
- **Score Calculation**: Automatically calculates total score based on correct answers

### ✅ Leaderboard System
- **Real-time Updates**: Firestore stream provides live leaderboard updates
- **Top Player Highlights**: Special medals for top 3 players
- **Score History**: Shows timestamp for each score entry
- **Ranking Display**: Clear ranking with position and points
- **Empty State**: Friendly message when no scores exist yet

### ✅ Modern UI/Theme
- **Material 3 Design**: Latest Material Design 3 components
- **Google Fonts**: Inter font family for modern typography
- **Dark Mode Support**: Automatic dark mode based on system preference
- **Custom Color Palette**: Cricket-themed color scheme
- **Responsive Layout**: Works seamlessly on all screen sizes
- **Smooth Animations**: Card elevations, transitions, and feedback

### ✅ State Management
- **Provider Pattern**: Clean state management with Provider package
- **AuthProvider**: Manages authentication state and operations
- **GameProvider**: Handles game logic, questions, and scoring

### ✅ Firebase Integration
- **Firebase Authentication**: Email/password authentication
- **Cloud Firestore**: Database for storing leaderboard scores
- **Security Rules**: Configured Firestore security rules
- **Real-time Sync**: Automatic data synchronization

## 📁 Project Structure

```
cricket_predictor/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── firebase_options.dart        # Firebase configuration
│   │
│   ├── theme/
│   │   └── app_theme.dart          # Theme configuration
│   │
│   ├── providers/
│   │   ├── auth_provider.dart       # Authentication provider
│   │   └── game_provider.dart       # Game state provider
│   │
│   ├── models/
│   │   ├── question.dart            # Question data model
│   │   └── leaderboard_entry.dart   # Leaderboard model
│   │
│   ├── services/
│   │   └── leaderboard_service.dart # Firebase service
│   │
│   └── screens/
│       ├── splash_screen.dart       # App splash
│       │
│       ├── auth/
│       │   └── login_screen.dart    # Login/signup
│       │
│       ├── home/
│       │   ├── home_screen.dart            # Main navigation
│       │   └── predictor_game_screen.dart  # Game interface
│       │
│       └── leaderboard/
│           └── leaderboard_screen.dart    # Leaderboard
│
├── assets/
│   ├── config/
│   │   └── questions.json          # Game questions
│   ├── images/                     # Images directory
│   └── lottie/                     # Animations directory
│
├── web/
│   ├── index.html                  # Web entry point
│   └── manifest.json               # PWA manifest
│
├── firebase.json                   # Firebase configuration
├── firestore.rules                 # Database security rules
├── pubspec.yaml                    # Dependencies
├── README.md                       # Project documentation
├── SETUP.md                        # Setup instructions
└── analysis_options.yaml           # Linter configuration
```

## 🔧 Technologies Used

### Core Framework
- **Flutter 3.0+**: Cross-platform framework
- **Dart**: Programming language

### Backend Services
- **Firebase Authentication**: User management
- **Cloud Firestore**: NoSQL database
- **Firebase Hosting**: Web deployment

### State Management
- **Provider**: State management pattern

### UI Libraries
- **Material 3**: Latest Material Design
- **Google Fonts**: Typography
- **Intl**: Internationalization

## 🚀 Getting Started

### Prerequisites
- Flutter SDK installed
- Firebase account
- Chrome browser (for web development)

### Quick Start
1. **Install dependencies**: `flutter pub get`
2. **Configure Firebase**: Update `lib/firebase_options.dart`
3. **Run app**: `flutter run -d chrome`
4. **Deploy**: `flutter build web` then `firebase deploy`

See `SETUP.md` for detailed instructions.

## 🎮 How It Works

### User Flow
1. **Launch**: App shows splash screen
2. **Authentication**: User logs in or signs up
3. **Game Screen**: User starts predictor game
4. **Questions**: User answers multiple-choice questions
5. **Scoring**: Points calculated based on correct answers
6. **Submission**: Score saved to Firestore
7. **Leaderboard**: User can view rankings

### Question System
- Questions loaded from JSON config
- Each question has: ID, text, options, correct answer, points, category
- Questions displayed one at a time
- Navigation between questions
- Final score submission

### Leaderboard System
- Scores stored in Firestore collection
- Real-time updates via streams
- Sorted by score (descending)
- Shows top 100 players
- Displays username, score, timestamp, rank

## 📊 Question Categories

The app includes questions in:
- **World Cup History**
- **Records**
- **Legends**
- **Rules**
- **Terminology**
- **T20 Leagues**

## 🔒 Security

### Firestore Rules
- Public read access to leaderboard
- Write access only for authenticated users
- User-specific data protection

### Authentication
- Firebase-managed authentication
- Secure password storage
- Session management

## 🎨 Design Features

### Color Scheme
- Primary: Blue (#1a73e8)
- Secondary: Green (#34a853)
- Accent: Yellow (#fbbc04)
- Error: Red (#ea4335)

### Components
- Cards with elevation
- Rounded corners throughout
- Gradient backgrounds
- Smooth animations
- Material icons

## 📈 Future Enhancements

### Potential Features
- Google Sign-In authentication
- Daily challenges
- Achievement system
- Question difficulty levels
- Multiplayer mode
- Tournament brackets
- Social sharing
- In-app notifications

### Technical Improvements
- Offline support
- Caching strategies
- Analytics integration
- A/B testing
- Performance optimization

## 📝 Configuration

### Adding Questions
Edit `assets/config/questions.json`:

```json
{
  "id": "q13",
  "question": "Your question?",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "A",
  "points": 10,
  "category": "Your Category"
}
```

### Customizing Theme
Edit `lib/theme/app_theme.dart` to change colors, fonts, and styles.

### Firebase Setup
See `SETUP.md` for detailed Firebase configuration steps.

## 🐛 Troubleshooting

### Common Issues
1. **Firebase not initialized**: Check `firebase_options.dart`
2. **Build errors**: Run `flutter clean && flutter pub get`
3. **Leaderboard empty**: Verify Firestore rules deployed
4. **Auth not working**: Check Firebase Authentication enabled

### Debug Mode
```bash
flutter run -d chrome --web-port 8080
```

## 📄 License

This project is available as open source.

## 🙏 Acknowledgments

- Flutter Team
- Firebase Team
- Material Design Team

---

**Built with ❤️ using Flutter & Firebase**

