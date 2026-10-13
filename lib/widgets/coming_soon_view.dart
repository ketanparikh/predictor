import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_theme.dart';

class ComingSoonView extends StatelessWidget {
  final String title;
  final String message;
  final IconData icon;

  const ComingSoonView({
    super.key,
    this.title = 'Coming Soon',
    this.message = 'JCPL-4 details will be announced shortly.',
    this.icon = Icons.sports_cricket,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.18),
                    AppTheme.secondaryColor.withValues(alpha: 0.18),
                  ],
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.secondaryColor.withValues(alpha: 0.2),
                    blurRadius: 20,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: Icon(icon, size: 64, color: AppTheme.secondaryColor),
            ),
            const SizedBox(height: 28),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.barlowCondensed(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                height: 1.5,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
