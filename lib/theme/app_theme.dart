import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color primaryColor = Color(0xFF3730A3);
  static const Color secondaryColor = Color(0xFF7C3AED);
  static const Color accentColor = Color(0xFFEC4899);
  static const Color accentLight = Color(0xFFF9A8D4);
  static const Color electricBlue = Color(0xFF2563EB);
  static const Color errorColor = Color(0xFFE11D48);
  static const Color backgroundColor = Color(0xFFF5F3FF);
  static const Color surfaceColor = Color(0xFFFFFFFF);
  static const Color cricketOrange = Color(0xFFFF6A00);
  static const Color cricketBrown = Color(0xFF92400E);
  static const Color ink = Color(0xFF07051A);
  static const Color midnight = Color(0xFF120B3A);
  static const Color pitch = Color(0xFF00E676);

  static const Color darkPrimary = Color(0xFFA78BFA);
  static const Color darkBackground = Color(0xFF0B0820);
  static const Color darkSurface = Color(0xFF1A1440);

  static const LinearGradient stadiumGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF1E40AF),
      Color(0xFF6D28D9),
      Color(0xFFDB2777),
    ],
    stops: [0.0, 0.55, 1.0],
  );

  static const LinearGradient energyGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      electricBlue,
      secondaryColor,
      accentColor,
    ],
  );

  static TextTheme _textTheme(TextTheme base) {
    final display = GoogleFonts.barlowCondensedTextTheme(base);
    final body = GoogleFonts.outfitTextTheme(base);
    return body.copyWith(
      displayLarge: display.displayLarge?.copyWith(fontWeight: FontWeight.w800),
      displayMedium: display.displayMedium?.copyWith(fontWeight: FontWeight.w800),
      displaySmall: display.displaySmall?.copyWith(fontWeight: FontWeight.w800),
      headlineLarge: display.headlineLarge?.copyWith(fontWeight: FontWeight.w800),
      headlineMedium: display.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
      headlineSmall: display.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
      titleLarge: body.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      titleMedium: body.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      titleSmall: body.titleSmall?.copyWith(fontWeight: FontWeight.w600),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: secondaryColor,
        tertiary: accentColor,
        error: errorColor,
        surface: Colors.white,
      ),
      scaffoldBackgroundColor: backgroundColor,
      textTheme: _textTheme(GoogleFonts.outfitTextTheme()),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 4,
          shadowColor: primaryColor.withOpacity(0.35),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        elevation: 6,
        backgroundColor: secondaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade300, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade300, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: secondaryColor, width: 2.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      ),
      cardTheme: CardThemeData(
        elevation: 3,
        shadowColor: primaryColor.withOpacity(0.12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: primaryColor,
        titleTextStyle: GoogleFonts.barlowCondensed(
          fontSize: 24,
          fontWeight: FontWeight.w800,
          color: Colors.white,
          letterSpacing: 0.6,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        elevation: 8,
        height: 68,
        indicatorColor: secondaryColor.withOpacity(0.18),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.outfit(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? primaryColor : Colors.grey.shade600,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? secondaryColor : Colors.grey.shade600,
          );
        }),
      ),
      chipTheme: ChipThemeData(
        selectedColor: secondaryColor.withOpacity(0.2),
        backgroundColor: Colors.white,
        labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: darkPrimary,
        brightness: Brightness.dark,
        primary: darkPrimary,
        secondary: accentColor,
        tertiary: accentColor,
        surface: darkSurface,
        background: darkBackground,
      ),
      scaffoldBackgroundColor: darkBackground,
      textTheme: _textTheme(GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme)),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.barlowCondensed(
          fontSize: 24,
          fontWeight: FontWeight.w800,
          color: Colors.white,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade700, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade700, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: darkPrimary, width: 2.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      ),
      cardTheme: CardThemeData(
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
        color: darkSurface,
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      ),
    );
  }
}
