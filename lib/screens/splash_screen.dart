import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'auth/login_screen.dart';
import 'home/home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  // The intro (JCPL flash + umpire signal) is timed on a 4.8 s scale; the
  // celebration then plays on until the controller finishes.
  static const _introMs = 4800;
  static const _totalMs = 5700;
  static const _celebrateStart = 0.54 * _introMs / 1000;

  late AnimationController _seq;

  @override
  void initState() {
    super.initState();
    _seq = AnimationController(
      duration: const Duration(milliseconds: _totalMs),
      vsync: this,
    );
    _boot();
  }

  Future<void> _boot() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final authFuture = () async {
      await authProvider.checkAuthState();
      if (!authProvider.isAuthenticated) {
        await authProvider.restoreAdminBypassIfNeeded();
      }
    }();

    // Start the intro only once the title font is ready, so JCPL doesn't
    // swap typefaces mid-flash.
    try {
      await GoogleFonts.pendingFonts([
        GoogleFonts.barlowCondensed(fontWeight: FontWeight.w900),
        GoogleFonts.barlowCondensed(fontWeight: FontWeight.w800),
      ]).timeout(const Duration(milliseconds: 1500));
    } catch (_) {}
    if (!mounted) return;
    _seq.forward();

    await Future.wait([
      Future.delayed(const Duration(milliseconds: _totalMs - 800)),
      authFuture,
    ]);

    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 1100),
        pageBuilder: (_, __, ___) => authProvider.isAuthenticated
            ? const HomeScreen()
            : const LoginScreen(),
        transitionsBuilder: (_, animation, __, child) {
          final fade = CurvedAnimation(
            parent: animation,
            curve: Curves.easeInOutCubic,
          );
          final zoom = Tween<double>(begin: 1.06, end: 1.0).animate(
            CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
          );
          return FadeTransition(
            opacity: fade,
            child: ScaleTransition(scale: zoom, child: child),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _seq.dispose();
    super.dispose();
  }

  double _pulse(double t, double center, double width, [double peak = 1]) {
    final d = (t - center).abs();
    if (d >= width) return 0;
    return (1 - d / width) * peak;
  }

  double _range(double t, double start, double end) =>
      ((t - start) / (end - start)).clamp(0.0, 1.0);

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final jcplSize = (size.width * 0.28).clamp(88.0, 150.0);
    final umpireScale = (size.height / 820).clamp(0.72, 1.1);

    return Scaffold(
      backgroundColor: const Color(0xFF05031A),
      body: AnimatedBuilder(
        animation: _seq,
        builder: (context, _) {
          final seconds = _seq.value * _totalMs / 1000;
          final t = seconds * 1000 / _introMs;
          final celebrateSeconds = math.max(0.0, seconds - _celebrateStart);
          final celebrate = Curves.easeInOut.transform(_range(t, 0.54, 0.62));
          final burstBeat = [0.15, 0.55, 1.05, 1.6, 2.2]
              .map((b) => _pulse(celebrateSeconds, b + 0.05, 0.12))
              .reduce(math.max);

          // JCPL keeps flashing until the umpire finishes the signal, then
          // the umpire leaves and the title settles as JCPL / SEASON 4.
          final signalDone = _range(t, 0.54, 0.64);
          final jcplIn = Curves.easeOut.transform(_range(t, 0, 0.05));
          final blink = 0.45 + 0.55 * math.sin(t * math.pi * 16).abs();
          final jcplOpacity =
              (jcplIn * (blink + (1 - blink) * signalDone)).clamp(0.0, 1.0);
          final glow = 0.4 + 0.6 * (blink * (1 - signalDone) + signalDone);
          final jcplScale = 0.72 +
              0.28 * Curves.easeOutBack.transform(_range(t, 0, 0.10));

          final settle = Curves.easeInOutCubic.transform(signalDone);
          final seasonT = _range(t, 0.58, 0.68);
          final seasonOpacity = Curves.easeOut.transform(seasonT);
          final seasonScale = 0.6 + 0.4 * Curves.easeOutBack.transform(seasonT);
          final umpireOut = Curves.easeIn.transform(_range(t, 0.54, 0.60));

          final flash = [
            _pulse(t, 0.06, 0.03, 0.75),
            _pulse(t, 0.14, 0.03, 0.5),
            _pulse(t, 0.60, 0.025, 0.45),
            0.14 * celebrate * burstBeat,
          ].reduce(math.max);

          final umpireIn = Curves.easeOut.transform(_range(t, 0.15, 0.21));

          // Raise the arm out to the side, wave it across the front of the
          // body a few times, then lower it.
          var armLift = Curves.easeOutCubic.transform(_range(t, 0.21, 0.26));
          armLift *= 1 - Curves.easeInOut.transform(_range(t, 0.49, 0.54));
          var armWave = 1.0;
          if (t > 0.26 && t < 0.49) {
            armWave = math.cos(_range(t, 0.26, 0.49) * math.pi * 2 * 2);
          }

          TextStyle titleStyle(Color color) => GoogleFonts.barlowCondensed(
                fontSize: jcplSize,
                fontWeight: FontWeight.w900,
                color: color,
                letterSpacing: 8,
                height: 0.9,
                shadows: [
                  Shadow(
                    color: AppTheme.accentColor.withOpacity(0.8 * glow),
                    blurRadius: 30,
                  ),
                  Shadow(
                    color: AppTheme.secondaryColor
                        .withOpacity(0.9 * glow * (1 - celebrate)),
                    blurRadius: 56,
                  ),
                  Shadow(
                    color: AppTheme.accentLight
                        .withOpacity(0.55 * glow * celebrate),
                    blurRadius: 56,
                  ),
                ],
              );

          return Stack(
            fit: StackFit.expand,
            children: [
              Opacity(
                opacity: 1 - celebrate,
                child: CustomPaint(painter: _StadiumPainter(t)),
              ),
              if (celebrate > 0)
                Opacity(
                  opacity: celebrate,
                  child: CustomPaint(
                    painter: _CelebrationPainter(celebrateSeconds),
                  ),
                ),
              Align(
                alignment: Alignment(0, -0.5 + 0.4 * settle),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Transform.scale(
                      scale: jcplScale.clamp(0.7, 1.18) *
                          (1 + 0.08 * _pulse(t, 0.64, 0.06)) *
                          (1 + 0.05 * burstBeat),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Opacity(
                            opacity: jcplOpacity,
                            child: Text('JCPL', style: titleStyle(Colors.white)),
                          ),
                          const SizedBox(height: 10),
                          Opacity(
                            opacity: seasonOpacity,
                            child: Transform.scale(
                              scale: seasonScale,
                              child: Text(
                                'SEASON 4',
                                style: GoogleFonts.barlowCondensed(
                                  fontSize: jcplSize * 0.4,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.accentColor,
                                  letterSpacing: 8,
                                  shadows: [
                                    Shadow(
                                      color: AppTheme.accentColor
                                          .withOpacity(0.8),
                                      blurRadius: 24,
                                    ),
                                    const Shadow(
                                      color: Colors.black87,
                                      blurRadius: 10,
                                      offset: Offset(0, 4),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Align(
                alignment: const Alignment(0, 0.92),
                child: Opacity(
                  opacity: (umpireIn * (1 - umpireOut)).clamp(0.0, 1.0),
                  child: Transform.translate(
                    offset: Offset(0, 24 * (1 - umpireIn) + 30 * umpireOut),
                    child: Transform.scale(
                      scale: umpireScale,
                      alignment: Alignment.bottomCenter,
                      child: SizedBox(
                        width: 240,
                        height: 300,
                        child: CustomPaint(
                          painter: _UmpirePainter(
                            armLift: armLift,
                            armWave: armWave,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              IgnorePointer(
                child: ColoredBox(color: Colors.white.withOpacity(flash)),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Spark {
  final double angle;
  final double speed;
  final double width;
  final Color color;

  const _Spark(this.angle, this.speed, this.width, this.color);
}

class _Burst {
  final double time;
  final double x;
  final double y;
  final List<_Spark> sparks;

  const _Burst(this.time, this.x, this.y, this.sparks);
}

class _Confetto {
  final double delay;
  final bool fromLeft;
  final double vx;
  final double vy;
  final double spin;
  final double wobble;
  final double w;
  final double h;
  final Color color;

  const _Confetto(this.delay, this.fromLeft, this.vx, this.vy, this.spin,
      this.wobble, this.w, this.h, this.color);
}

/// Dark, gold-lit celebration backdrop: sweeping light beams and blinking
/// bulbs along the top, fireworks, and party-popper confetti fired from both
/// bottom corners. [s] is seconds since it started.
class _CelebrationPainter extends CustomPainter {
  final double s;

  _CelebrationPainter(this.s);

  static const _palette = [
    Color(0xFFEC4899),
    Color(0xFFF9A8D4),
    Color(0xFFFFFFFF),
    Color(0xFFC4B5FD),
    Color(0xFF7C3AED),
    Color(0xFF60A5FA),
    Color(0xFF2563EB),
  ];

  static final List<_Burst> _bursts = _buildBursts();
  static final List<_Confetto> _confetti = _buildConfetti();

  static List<_Burst> _buildBursts() {
    final r = math.Random(7);
    const times = [0.15, 0.35, 0.55, 0.8, 1.05, 1.3, 1.6, 1.9, 2.2];
    return [
      for (final time in times)
        () {
          final tint = _palette[r.nextInt(_palette.length)];
          const count = 40;
          return _Burst(
            time,
            0.12 + r.nextDouble() * 0.76,
            0.08 + r.nextDouble() * 0.28,
            [
              for (var i = 0; i < count; i++)
                _Spark(
                  i / count * math.pi * 2 + r.nextDouble() * 0.12,
                  0.20 + r.nextDouble() * 0.16,
                  1.6 + r.nextDouble() * 1.8,
                  r.nextDouble() < 0.7
                      ? tint
                      : _palette[r.nextInt(_palette.length)],
                ),
            ],
          );
        }(),
    ];
  }

  static List<_Confetto> _buildConfetti() {
    final r = math.Random(11);
    final pieces = <_Confetto>[];
    for (final wave in [0.05, 1.1]) {
      for (final fromLeft in [true, false]) {
        for (var i = 0; i < 60; i++) {
          pieces.add(_Confetto(
            wave + r.nextDouble() * 0.12,
            fromLeft,
            0.12 + r.nextDouble() * 0.45,
            1.0 + r.nextDouble() * 0.6,
            (r.nextDouble() - 0.5) * 14,
            4 + r.nextDouble() * 6,
            5 + r.nextDouble() * 6,
            8 + r.nextDouble() * 8,
            _palette[r.nextInt(_palette.length)],
          ));
        }
      }
    }
    return pieces;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final m = math.min(w, h);
    final rect = Offset.zero & size;

    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF05031A), Color(0xFF1A1050), Color(0xFF05031A)],
          stops: [0, 0.55, 1],
        ).createShader(rect),
    );
    canvas.drawRect(
      rect,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(0, -0.1),
          radius: 0.75,
          colors: [
            const Color(0xFF8B5CF6)
                .withOpacity(0.20 + 0.05 * math.sin(s * 3)),
            const Color(0xFFEC4899).withOpacity(0.05),
            Colors.transparent,
          ],
          stops: const [0, 0.45, 1],
        ).createShader(rect),
    );

    // Sweeping coloured light beams from the top edge.
    const beams = 6;
    for (var i = 0; i < beams; i++) {
      final origin = Offset(w * (0.08 + i * (0.84 / (beams - 1))), -8);
      final angle = math.sin(s * 1.7 + i * 1.3) * 0.55;
      final intensity = 0.6 + 0.4 * math.sin(s * 9 + i * 2).abs();
      final length = h * 1.15;
      final spread = length * 0.09;
      canvas.save();
      canvas.translate(origin.dx, origin.dy);
      canvas.rotate(angle);
      final beam = Path()
        ..moveTo(-4, 0)
        ..lineTo(4, 0)
        ..lineTo(spread, length)
        ..lineTo(-spread, length)
        ..close();
      canvas.drawPath(
        beam,
        Paint()
          ..blendMode = BlendMode.plus
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              _palette[i % _palette.length].withOpacity(0.22 * intensity),
              Colors.transparent,
            ],
          ).createShader(Rect.fromLTWH(-spread, 0, spread * 2, length)),
      );
      canvas.restore();
    }

    // Blinking bulbs along the top.
    const bulbs = 12;
    for (var i = 0; i < bulbs; i++) {
      final on = math.sin(s * 10 + i * 1.9) > -0.2;
      final c = Offset(w * (i + 0.5) / bulbs, 16);
      final color = _palette[i % _palette.length];
      if (on) {
        canvas.drawCircle(
          c,
          16,
          Paint()
            ..color = color.withOpacity(0.55)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10),
        );
      }
      canvas.drawCircle(
        c,
        5,
        Paint()..color = on ? Colors.white : color.withOpacity(0.45),
      );
    }

    // Fireworks: a rocket climbs, then bursts into drooping streaks.
    for (final burst in _bursts) {
      final age = s - burst.time;
      if (age < -0.45 || age > 1.7) continue;
      final center = Offset(burst.x * w, burst.y * h);
      if (age < 0) {
        final p = Curves.easeOut.transform((age + 0.45) / 0.45);
        final start = Offset(center.dx, h + 10);
        final pos = Offset.lerp(start, center, p)!;
        canvas.drawLine(
          pos,
          Offset(pos.dx, pos.dy + 46),
          Paint()
            ..strokeWidth = 3
            ..strokeCap = StrokeCap.round
            ..shader = LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.white, Colors.white.withOpacity(0)],
            ).createShader(Rect.fromLTWH(pos.dx - 2, pos.dy, 4, 46)),
        );
        canvas.drawCircle(pos, 3.5, Paint()..color = Colors.white);
        continue;
      }

      if (age < 0.25) {
        canvas.drawCircle(
          center,
          48 * (1 - age / 0.25) + 6,
          Paint()
            ..color = Colors.white.withOpacity(0.8 * (1 - age / 0.25))
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14),
        );
      }

      final fade = (1 - age / 1.7).clamp(0.0, 1.0);
      for (final spark in burst.sparks) {
        Offset at(double a) {
          final dist = spark.speed * m * (1 - math.exp(-3.2 * a));
          return center +
              Offset(math.cos(spark.angle), math.sin(spark.angle)) * dist +
              Offset(0, 0.07 * h * a * a);
        }

        final head = at(age);
        final tail = at(math.max(0, age - 0.12));
        final twinkle = 0.65 + 0.35 * math.sin(age * 40 + spark.angle * 9);
        final paint = Paint()
          ..color = spark.color.withOpacity(fade * twinkle)
          ..strokeWidth = spark.width
          ..strokeCap = StrokeCap.round;
        canvas.drawLine(tail, head, paint);
        canvas.drawCircle(head, spark.width * 0.9, paint);
      }
    }

    // Party poppers: confetti shoots up and inward from both bottom corners.
    for (final piece in _confetti) {
      final age = s - piece.delay;
      if (age < 0 || age > 2.6) continue;
      final dir = piece.fromLeft ? 1.0 : -1.0;
      final origin = Offset(piece.fromLeft ? 0 : w, h);
      final x = origin.dx +
          dir * piece.vx * w * age * (1 - 0.25 * age) +
          math.sin(age * piece.wobble) * 10;
      final y = origin.dy - piece.vy * h * age + 0.75 * h * age * age;
      if (y > h + 20) continue;
      final alpha = (1 - (age - 1.9) / 0.7).clamp(0.0, 1.0);

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(age * piece.spin);
      final flip = math.cos(age * piece.wobble * 1.6).abs();
      canvas.drawRect(
        Rect.fromCenter(
          center: Offset.zero,
          width: piece.w,
          height: piece.h * (0.25 + 0.75 * flip),
        ),
        Paint()..color = piece.color.withOpacity(alpha),
      );
      canvas.restore();
    }

    // Popper cones in the corners.
    for (final fromLeft in [true, false]) {
      final kick = math.max(_kick(s - 0.05), _kick(s - 1.1));
      canvas.save();
      canvas.translate(fromLeft ? 26 : w - 26, h - 22);
      canvas.rotate((fromLeft ? 0.7 : -0.7) + (fromLeft ? -1 : 1) * 0.15 * kick);
      final cone = Path()
        ..moveTo(-16, -40)
        ..lineTo(16, -40)
        ..lineTo(0, 22)
        ..close();
      canvas.drawPath(
        cone,
        Paint()
          ..shader = const LinearGradient(
            colors: [Color(0xFF7C3AED), Color(0xFFEC4899)],
          ).createShader(const Rect.fromLTWH(-16, -40, 32, 62)),
      );
      final stripe = Paint()
        ..color = Colors.white.withOpacity(0.8)
        ..strokeWidth = 3;
      canvas.drawLine(const Offset(-11, -24), const Offset(11, -24), stripe);
      canvas.drawLine(const Offset(-6, -6), const Offset(6, -6), stripe);
      canvas.restore();
    }
  }

  double _kick(double age) {
    if (age < 0 || age > 0.35) return 0;
    return 1 - age / 0.35;
  }

  @override
  bool shouldRepaint(covariant _CelebrationPainter oldDelegate) =>
      oldDelegate.s != s;
}

class _Fan {
  final double x;
  final int row;
  final Color color;
  final double seed;

  const _Fan(this.x, this.row, this.color, this.seed);
}

class _StadiumPainter extends CustomPainter {
  final double t;

  _StadiumPainter(this.t);

  static const _rows = 9;
  static final List<_Fan> _fans = _buildFans();

  static List<_Fan> _buildFans() {
    final r = math.Random(42);
    const colors = [
      Color(0xFFEC4899),
      Color(0xFFF9A8D4),
      Color(0xFF60A5FA),
      Color(0xFF2563EB),
      Color(0xFFA78BFA),
      Color(0xFFECEFF1),
      Color(0xFF7C3AED),
    ];
    final fans = <_Fan>[];
    for (var row = 0; row < _rows; row++) {
      final count = 44 + row * 5;
      for (var i = 0; i < count; i++) {
        fans.add(_Fan(
          (i + 0.2 + r.nextDouble() * 0.6) / count,
          row,
          colors[r.nextInt(colors.length)],
          r.nextDouble(),
        ));
      }
    }
    return fans;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final horizon = h * 0.40;
    final standsBottom = h * 0.58;
    final boardsBottom = standsBottom + h * 0.028;

    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF05031A), Color(0xFF110B3D), Color(0xFF231A66)],
          stops: [0, 0.6, 1],
        ).createShader(Rect.fromLTWH(0, 0, w, standsBottom)),
    );

    _drawFloodlight(canvas, size, Offset(w * 0.10, h * 0.09), horizon, left: true);
    _drawFloodlight(canvas, size, Offset(w * 0.90, h * 0.09), horizon, left: false);

    final stands = Path()
      ..moveTo(0, horizon + h * 0.02)
      ..quadraticBezierTo(w / 2, horizon - h * 0.04, w, horizon + h * 0.02)
      ..lineTo(w, standsBottom)
      ..lineTo(0, standsBottom)
      ..close();
    canvas.drawPath(
      stands,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0D0A26), Color(0xFF1A1640)],
        ).createShader(Rect.fromLTWH(0, horizon - h * 0.04, w, standsBottom)),
    );

    final crowdPaint = Paint();
    for (final fan in _fans) {
      final rowT = fan.row / (_rows - 1);
      final curve = (1 - math.pow((fan.x - 0.5) * 2, 2)) * h * 0.035 * (1 - rowT);
      final y = horizon + h * 0.012 + (standsBottom - horizon - h * 0.03) * rowT - curve;
      final x = fan.x * w;
      final bob = math.sin(t * 40 + fan.seed * 12) * (t > 0.55 ? 1.6 : 0.5);
      final radius = 1.8 + rowT * 1.6;
      crowdPaint.color = fan.color.withOpacity(0.55 + rowT * 0.25);
      canvas.drawCircle(Offset(x, y + bob), radius, crowdPaint);

      if (fan.seed > 0.9) {
        final phase = (t * 7 + fan.seed * 13) % 1;
        if (phase < 0.05) {
          canvas.drawCircle(
            Offset(x, y + bob),
            radius * 3,
            Paint()
              ..color = Colors.white.withOpacity(0.85)
              ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
          );
        }
      }
    }

    const boardColors = [
      Color(0xFF2563EB),
      Color(0xFF1E1B4B),
      Color(0xFFEC4899),
      Color(0xFF7C3AED),
    ];
    const segments = 6;
    final segW = w / segments;
    final shift = (t * segW * 2) % (segW * boardColors.length);
    for (var i = -boardColors.length; i < segments + boardColors.length; i++) {
      final x = i * segW + shift - segW * boardColors.length;
      final color = boardColors[(i % boardColors.length + boardColors.length) % boardColors.length];
      canvas.drawRect(
        Rect.fromLTWH(x, standsBottom, segW, boardsBottom - standsBottom),
        Paint()..color = color,
      );
      final tp = TextPainter(
        text: TextSpan(
          text: 'JCPL-4',
          style: TextStyle(
            color: Colors.white,
            fontSize: (boardsBottom - standsBottom) * 0.62,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(
        canvas,
        Offset(
          x + (segW - tp.width) / 2,
          standsBottom + (boardsBottom - standsBottom - tp.height) / 2,
        ),
      );
    }

    final fieldRect = Rect.fromLTWH(0, boardsBottom, w, h - boardsBottom);
    canvas.drawRect(
      fieldRect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0B5E2C), Color(0xFF12873F)],
        ).createShader(fieldRect),
    );
    const stripes = 12;
    for (var i = 0; i < stripes; i += 2) {
      final y0 = boardsBottom + fieldRect.height * math.pow(i / stripes, 1.5);
      final y1 = boardsBottom + fieldRect.height * math.pow((i + 1) / stripes, 1.5);
      canvas.drawRect(
        Rect.fromLTRB(0, y0.toDouble(), w, y1.toDouble()),
        Paint()..color = Colors.white.withOpacity(0.05),
      );
    }

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w / 2, h * 1.02),
        width: w * 1.5,
        height: fieldRect.height * 1.75,
      ),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = Colors.white.withOpacity(0.45),
    );

    final pitchTop = boardsBottom + fieldRect.height * 0.16;
    final pitch = Path()
      ..moveTo(w / 2 - w * 0.035, pitchTop)
      ..lineTo(w / 2 + w * 0.035, pitchTop)
      ..lineTo(w / 2 + w * 0.16, h)
      ..lineTo(w / 2 - w * 0.16, h)
      ..close();
    canvas.drawPath(
      pitch,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFB9A26A), Color(0xFFD2BC85)],
        ).createShader(Rect.fromLTWH(0, pitchTop, w, h - pitchTop)),
    );
    final crease = Paint()
      ..color = Colors.white.withOpacity(0.85)
      ..strokeWidth = 1.5;
    canvas.drawLine(
      Offset(w / 2 - w * 0.06, pitchTop + fieldRect.height * 0.05),
      Offset(w / 2 + w * 0.06, pitchTop + fieldRect.height * 0.05),
      crease,
    );
    canvas.drawLine(
      Offset(w / 2 - w * 0.22, h - fieldRect.height * 0.08),
      Offset(w / 2 + w * 0.22, h - fieldRect.height * 0.08),
      crease..strokeWidth = 2.5,
    );

    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(0, -0.1),
          radius: 1.1,
          colors: [Colors.transparent, Colors.black.withOpacity(0.55)],
          stops: const [0.55, 1],
        ).createShader(Offset.zero & size),
    );
  }

  void _drawFloodlight(
    Canvas canvas,
    Size size,
    Offset head,
    double horizon, {
    required bool left,
  }) {
    final w = size.width;
    final h = size.height;
    final intensity = 0.85 + 0.15 * math.sin(t * 30 + (left ? 0 : 1.7));

    final sway = math.sin(t * math.pi * 3 + (left ? 0 : math.pi)) * w * 0.06;
    final target = left ? w * 0.62 + sway : w * 0.38 + sway;
    final beam = Path()
      ..moveTo(head.dx - 14, head.dy)
      ..lineTo(head.dx + 14, head.dy)
      ..lineTo(target + w * 0.28, h)
      ..lineTo(target - w * 0.28, h)
      ..close();
    canvas.drawPath(
      beam,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withOpacity(0.16 * intensity),
            Colors.white.withOpacity(0.0),
          ],
        ).createShader(Rect.fromLTWH(0, head.dy, w, h - head.dy)),
    );

    final mast = Paint()
      ..color = const Color(0xFF1C2D40)
      ..strokeWidth = 4;
    canvas.drawLine(Offset(head.dx, head.dy + 12), Offset(head.dx, horizon + h * 0.03), mast);

    canvas.drawCircle(
      head,
      110,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Colors.white.withOpacity(0.55 * intensity),
            const Color(0xFFBFE6FF).withOpacity(0.18 * intensity),
            Colors.transparent,
          ],
          stops: const [0, 0.35, 1],
        ).createShader(Rect.fromCircle(center: head, radius: 110)),
    );

    final panel = Rect.fromCenter(center: head, width: 56, height: 26);
    canvas.drawRRect(
      RRect.fromRectAndRadius(panel, const Radius.circular(3)),
      Paint()..color = const Color(0xFF2A3B50),
    );
    final bulb = Paint()..color = Colors.white.withOpacity(0.95);
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 5; col++) {
        canvas.drawCircle(
          Offset(panel.left + 7 + col * 10.5, panel.top + 7 + row * 11),
          3.6,
          bulb,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _StadiumPainter oldDelegate) => oldDelegate.t != t;
}

class _UmpirePainter extends CustomPainter {
  /// 0 = arm hanging down, 1 = arm raised to chest height.
  final double armLift;

  /// 1 = arm pointing out to the side, -1 = arm swept across the body.
  final double armWave;

  _UmpirePainter({required this.armLift, required this.armWave});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final skin = Paint()..color = const Color(0xFFE2B48C);
    final coat = const Color(0xFFF7F4EC);
    final coatPaint = Paint()..color = coat;
    final coatShade = Paint()..color = const Color(0xFFD5CEC0);
    final trousers = Paint()..color = const Color(0xFF111827);
    final shoes = Paint()..color = const Color(0xFF050A12);

    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, size.height - 12), width: 120, height: 18),
      Paint()
        ..color = Colors.black.withOpacity(0.38)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
    );

    for (final dx in [-30.0, 8.0]) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(Rect.fromLTWH(cx + dx, 186, 22, 88), const Radius.circular(8)),
        trousers,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(Rect.fromLTWH(cx + dx - 4, 268, 30, 12), const Radius.circular(6)),
        shoes,
      );
    }

    _drawArm(
      canvas,
      shoulder: Offset(cx - 38, 100),
      dir: const _V3(-0.2, 1, 0.05),
      coat: coat,
      skin: skin,
    );

    final body = Path()
      ..moveTo(cx - 44, 90)
      ..quadraticBezierTo(cx - 54, 150, cx - 42, 192)
      ..lineTo(cx + 42, 192)
      ..quadraticBezierTo(cx + 54, 150, cx + 44, 90)
      ..quadraticBezierTo(cx, 80, cx - 44, 90)
      ..close();
    canvas.drawPath(body, coatPaint);
    canvas.drawPath(
      body,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = const Color(0xFFBDB5A6),
    );
    canvas.drawLine(
      Offset(cx, 98),
      Offset(cx, 188),
      Paint()
        ..color = const Color(0xFFCFC7B8)
        ..strokeWidth = 2,
    );
    for (var i = 0; i < 3; i++) {
      canvas.drawCircle(Offset(cx + 6, 116 + i * 22.0), 2.6, Paint()..color = const Color(0xFF9AA3AF));
    }
    final collar = Path()
      ..moveTo(cx - 14, 86)
      ..lineTo(cx, 106)
      ..lineTo(cx + 14, 86)
      ..close();
    canvas.drawPath(collar, Paint()..color = const Color(0xFF1F2937));
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(cx - 3, 92, 6, 26), const Radius.circular(2)),
      Paint()..color = AppTheme.secondaryColor,
    );

    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(cx, 80), width: 18, height: 14), const Radius.circular(4)),
      skin,
    );
    canvas.drawCircle(Offset(cx, 58), 22, skin);
    final eye = Paint()..color = const Color(0xFF1F2937);
    canvas.drawCircle(Offset(cx - 7, 58), 2.2, eye);
    canvas.drawCircle(Offset(cx + 7, 58), 2.2, eye);
    canvas.drawArc(
      Rect.fromCenter(center: Offset(cx, 66), width: 12, height: 7),
      0.2,
      math.pi - 0.4,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8
        ..color = const Color(0xFF7C2D12),
    );

    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, 41), width: 66, height: 15),
      coatShade,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(cx, 31), width: 38, height: 22), const Radius.circular(10)),
      coatPaint,
    );
    canvas.drawRect(
      Rect.fromCenter(center: Offset(cx, 38), width: 38, height: 4),
      Paint()..color = const Color(0xFF1F2937),
    );

    // FOUR: the arm is held out at chest height and swept from side to side
    // horizontally in front of the body. A horizontal sweep seen from the
    // front reads as the hand travelling left-right at a fixed height,
    // with the arm foreshortening as it points toward the viewer.
    final theta = 0.25 + 1.05 * armWave;
    final horizontal = _V3(math.sin(theta), 0.12, math.cos(theta));
    const hanging = _V3(0.2, 1, 0.05);
    _drawArm(
      canvas,
      shoulder: Offset(cx + 38, 100),
      dir: hanging.lerp(horizontal, armLift).normalized(),
      coat: coat,
      skin: skin,
      elbowDrop: 8 * armLift,
    );
  }

  void _drawArm(
    Canvas canvas, {
    required Offset shoulder,
    required _V3 dir,
    required Color coat,
    required Paint skin,
    double elbowDrop = 0,
  }) {
    const length = 92.0;
    final reach = Offset(dir.x, dir.y) * length;
    final hand = shoulder + reach;
    final elbow = shoulder + reach * 0.5 + Offset(0, elbowDrop);
    final depth = dir.z.clamp(0.0, 1.0);
    final width = 18 * (1 + 0.14 * depth);

    final outline = Paint()
      ..color = const Color(0xFFB8AF9F)
      ..strokeWidth = width + 3
      ..strokeCap = StrokeCap.round;
    final sleeve = Paint()
      ..color = coat
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(shoulder, elbow, outline);
    canvas.drawLine(elbow, hand, outline);
    canvas.drawLine(shoulder, elbow, sleeve);
    canvas.drawLine(elbow, hand, sleeve);
    canvas.drawCircle(hand, 10.5 * (1 + 0.25 * depth), skin);
  }

  @override
  bool shouldRepaint(covariant _UmpirePainter oldDelegate) {
    return oldDelegate.armLift != armLift || oldDelegate.armWave != armWave;
  }
}

class _V3 {
  final double x;
  final double y;
  final double z;

  const _V3(this.x, this.y, this.z);

  _V3 lerp(_V3 other, double t) => _V3(
        x + (other.x - x) * t,
        y + (other.y - y) * t,
        z + (other.z - z) * t,
      );

  _V3 normalized() {
    final len = math.sqrt(x * x + y * y + z * z);
    if (len == 0) return this;
    return _V3(x / len, y / len, z / len);
  }
}
