import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/admin_bypass_service.dart';

class AdminProvider with ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final AdminBypassService _adminBypass = AdminBypassService();

  bool _isAdmin = false;
  bool _loading = true;

  bool get isAdmin => _isAdmin;
  bool get loading => _loading;

  AdminProvider() {
    // Check current user immediately on initialization
    final currentUser = _auth.currentUser;
    if (currentUser != null) {
      _checkAdmin(currentUser.uid);
    } else {
      _loading = false;
      notifyListeners();
    }
    
    // Also listen for auth state changes
    _auth.authStateChanges().listen((user) async {
      if (user == null) {
        _isAdmin = await _adminBypass.isEnabled();
        _loading = false;
        notifyListeners();
      } else {
        _checkAdmin(user.uid);
      }
    });
  }

  Future<void> _checkAdmin(String uid) async {
    try {
      _loading = true;
      notifyListeners();
      final bypass = await _adminBypass.isEnabled();
      if (bypass) {
        _isAdmin = true;
        return;
      }
      final snap = await _db.collection('admins').doc(uid).get();
      _isAdmin = snap.exists;
    } catch (e) {
      final bypass = await _adminBypass.isEnabled();
      _isAdmin = bypass;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}


