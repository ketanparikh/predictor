import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthProvider with ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();
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

  /// Sign in with Google
  Future<bool> signInWithGoogle() async {
    try {
      _errorMessage = null;

      // Trigger the authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        // User cancelled the sign-in
        _errorMessage = 'Sign in cancelled';
        return false;
      }

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the Google credential
      final userCredential = await _auth.signInWithCredential(credential);
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
      }

      _errorMessage = errorMsg;
      print('Google sign in error: ${e.message}');
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred. Please try again.';
      print('Google sign in error: $e');
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
    try {
      await _googleSignIn.signOut();
    } catch (e) {
      // Ignore Google sign out errors
    }
    await _auth.signOut();
    _user = null;
    notifyListeners();
  }
}
