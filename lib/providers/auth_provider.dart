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

