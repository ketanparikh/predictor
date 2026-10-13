import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import 'home/home_screen.dart';

class LetsPlaySplashScreen extends StatefulWidget {
  const LetsPlaySplashScreen({super.key});

  @override
  State<LetsPlaySplashScreen> createState() => _LetsPlaySplashScreenState();
}

class _LetsPlaySplashScreenState extends State<LetsPlaySplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );
    _scaleAnimation = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );
    _controller.forward();
    _goToHome();
  }

  Future<void> _goToHome() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const HomeScreen()),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.stadiumGradient),
        child: Stack(
          children: [
            Positioned(
              top: 80,
              left: -50,
              child: Transform.rotate(
                angle: -0.45,
                child: Container(
                  width: 240,
                  height: 16,
                  color: AppTheme.secondaryColor.withOpacity(0.4),
                ),
              ),
            ),
            Center(
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: ScaleTransition(
                  scale: _scaleAnimation,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.accentColor,
                            width: 3,
                          ),
                          color: Colors.white.withOpacity(0.08),
                        ),
                        child: const Icon(
                          Icons.sports_cricket,
                          size: 96,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 28),
                      Text(
                        'JCPL-4',
                        style: GoogleFonts.barlowCondensed(
                          fontSize: 56,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: 4,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Jade Cricket Premier League',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: Colors.white.withOpacity(0.85),
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        "LET'S PLAY",
                        style: GoogleFonts.barlowCondensed(
                          fontSize: 40,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.accentColor,
                          letterSpacing: 3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
