import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AuthProvider with ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  User? _user;

  User? get user => _user;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _auth.authStateChanges().listen((User? user) {
      _user = user;
      notifyListeners();
    });
  }

  Future<void> checkAuthState() async {
    _user = _auth.currentUser;
    notifyListeners();
  }

  String? _errorMessage;

  String? get errorMessage => _errorMessage;

  /// Sign in with Google using Firebase Auth directly (works on web & mobile)
  Future<bool> signInWithGoogle() async {
    try {
      _errorMessage = null;

      UserCredential userCredential;

      if (kIsWeb) {
        // For web: use signInWithPopup or signInWithRedirect
        GoogleAuthProvider googleProvider = GoogleAuthProvider();
        googleProvider.addScope('email');
        googleProvider.addScope('profile');

        userCredential = await _auth.signInWithPopup(googleProvider);
      } else {
        // For mobile: would use google_sign_in package
        // But since we're web-only, this won't be reached
        throw UnimplementedError('Mobile sign-in not implemented');
      }

      _user = userCredential.user;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      String errorMsg = 'Google sign-in failed. Please try again.';

      switch (e.code) {
        case 'account-exists-with-different-credential':
          errorMsg = 'An account already exists with this email.';
          break;
        case 'invalid-credential':
          errorMsg = 'Invalid credentials. Please try again.';
          break;
        case 'user-disabled':
          errorMsg = 'This account has been disabled.';
          break;
        case 'popup-closed-by-user':
          errorMsg = 'Sign in cancelled';
          break;
        case 'popup-blocked':
          errorMsg = 'Popup was blocked. Please allow popups for this site.';
          break;
      }

      _errorMessage = errorMsg;
      debugPrint('Google sign in error: ${e.code} - ${e.message}');
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred. Please try again.';
      debugPrint('Google sign in error: $e');
      notifyListeners();
      return false;
    }
  }

  Future<bool> signInWithEmailPassword(String email, String password) async {
    try {
      _errorMessage = null;
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      _user = credential.user;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      String errorMsg = 'Login failed. Please try again.';

      switch (e.code) {
        case 'user-not-found':
          errorMsg = 'No account found with this email.';
          break;
        case 'wrong-password':
          errorMsg = 'Incorrect password. Please try again.';
          break;
        case 'invalid-email':
          errorMsg = 'Invalid email address.';
          break;
        case 'user-disabled':
          errorMsg = 'This account has been disabled.';
          break;
        case 'too-many-requests':
          errorMsg = 'Too many failed attempts. Please try again later.';
          break;
      }

      _errorMessage = errorMsg;
      print('Sign in error: ${e.message}');
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred. Please try again.';
      print('Sign in error: $e');
      notifyListeners();
      return false;
    }
  }

  Future<bool> signUpWithEmailPassword(
    String email,
    String password, {
    String? displayName,
  }) async {
    try {
      _errorMessage = null;
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      _user = credential.user;

      // Update display name if provided
      if (displayName != null && displayName.isNotEmpty && _user != null) {
        await _user!.updateDisplayName(displayName);
        await _user!.reload();
        _user = _auth.currentUser;
      }

      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      String errorMsg = 'Registration failed. Please try again.';

      switch (e.code) {
        case 'weak-password':
          errorMsg = 'Password is too weak. Please use a stronger password.';
          break;
        case 'email-already-in-use':
          errorMsg = 'An account with this email already exists. Please login.';
          break;
        case 'invalid-email':
          errorMsg = 'Invalid email address.';
          break;
        case 'operation-not-allowed':
          errorMsg = 'Email/password accounts are not enabled.';
          break;
      }

      _errorMessage = errorMsg;
      print('Sign up error: ${e.message}');
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred. Please try again.';
      print('Sign up error: $e');
      notifyListeners();
      return false;
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
    _user = null;
    notifyListeners();
  }
}
