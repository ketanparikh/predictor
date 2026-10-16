import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../providers/admin_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/auction_studio_embed.dart';

class AuctionsTab extends StatefulWidget {
  const AuctionsTab({super.key});

  @override
  State<AuctionsTab> createState() => _AuctionsTabState();
}

class _AuctionsTabState extends State<AuctionsTab> {
  bool? _adminWantsStudio;

  @override
  Widget build(BuildContext context) {
    final adminProvider = Provider.of<AdminProvider>(context);
    if (adminProvider.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final isAdmin = adminProvider.isAdmin;
    final showAdminStudio = isAdmin && (_adminWantsStudio ?? true);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (isAdmin)
          Material(
            color: const Color(0xFF0F172A),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
              child: Row(
                children: [
                  Text(
                    'AUCTION MODE',
                    style: GoogleFonts.outfit(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(
                          value: false,
                          label: Text('Viewing'),
                          icon: Icon(Icons.visibility_outlined, size: 16),
                        ),
                        ButtonSegment(
                          value: true,
                          label: Text('Admin'),
                          icon: Icon(Icons.gavel, size: 16),
                        ),
                      ],
                      selected: {showAdminStudio},
                      onSelectionChanged: (value) {
                        setState(() => _adminWantsStudio = value.first);
                      },
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          Material(
            color: AppTheme.primaryColor.withValues(alpha: 0.08),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'Live auction feed · read only',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              ),
            ),
          ),
        Expanded(
          child: AuctionStudioEmbed(showAdminStudio: showAdminStudio),
        ),
      ],
    );
  }
}
