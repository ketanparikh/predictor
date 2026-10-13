import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Pushes a full-screen game page with a visible back button.
void pushGamePage(
  BuildContext context, {
  required String title,
  required Widget body,
}) {
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: GameAppBar(title: title),
        body: body,
      ),
    ),
  );
}

/// App bar with an explicit back control so it stays visible on web
/// (theme icons are white; a plain surface AppBar made them disappear).
class GameAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;

  const GameAppBar({
    super.key,
    required this.title,
    this.actions,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      automaticallyImplyLeading: false,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.white),
        tooltip: 'Back',
        onPressed: () {
          if (Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          }
        },
      ),
      title: Text(
        title,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        overflow: TextOverflow.ellipsis,
      ),
      actions: actions,
      flexibleSpace: const IgnorePointer(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: AppTheme.stadiumGradient,
          ),
        ),
      ),
    );
  }
}
