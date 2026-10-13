import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Faint floodlight tint painted above every screen. Kept at very low
/// opacity so text and controls underneath stay fully readable.
class StadiumHue extends StatelessWidget {
  const StadiumHue({super.key});

  @override
  Widget build(BuildContext context) {
    return const IgnorePointer(
      child: RepaintBoundary(
        child: CustomPaint(painter: _StadiumHuePainter(), size: Size.infinite),
      ),
    );
  }
}

class _StadiumHuePainter extends CustomPainter {
  const _StadiumHuePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final rect = Offset.zero & size;
    final radius = (w > h ? w : h) * 0.7;

    for (final corner in [Offset(w * 0.04, -h * 0.04), Offset(w * 0.96, -h * 0.04)]) {
      canvas.drawCircle(
        corner,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [
              AppTheme.accentColor.withOpacity(0.10),
              AppTheme.secondaryColor.withOpacity(0.05),
              Colors.transparent,
            ],
            stops: const [0, 0.4, 1],
          ).createShader(Rect.fromCircle(center: corner, radius: radius)),
      );
    }

    void beam(Offset from, double toX) {
      final path = Path()
        ..moveTo(from.dx - 8, from.dy)
        ..lineTo(from.dx + 8, from.dy)
        ..lineTo(toX + w * 0.22, h)
        ..lineTo(toX - w * 0.22, h)
        ..close();
      canvas.drawPath(
        path,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              const Color(0xFFEDE9FE).withOpacity(0.09),
              Colors.transparent,
            ],
          ).createShader(rect),
      );
    }

    beam(Offset(w * 0.06, 0), w * 0.68);
    beam(Offset(w * 0.94, 0), w * 0.32);

    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.transparent,
            AppTheme.electricBlue.withOpacity(0.07),
          ],
          stops: const [0.6, 1],
        ).createShader(rect),
    );

    canvas.drawRect(
      rect,
      Paint()
        ..shader = RadialGradient(
          radius: 1.15,
          colors: [
            Colors.transparent,
            AppTheme.primaryColor.withOpacity(0.10),
          ],
          stops: const [0.65, 1],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(covariant _StadiumHuePainter oldDelegate) => false;
}
