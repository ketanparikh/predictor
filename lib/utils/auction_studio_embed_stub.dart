import 'package:flutter/material.dart';

class AuctionStudioEmbed extends StatelessWidget {
  final bool showAdminStudio;

  const AuctionStudioEmbed({super.key, required this.showAdminStudio});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          'The JCPL auction studio is available in the web app.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
