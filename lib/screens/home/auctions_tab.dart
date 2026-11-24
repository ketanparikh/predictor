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
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: _AuctionModeButton(
                              selected: !showAdminStudio,
                              icon: Icons.visibility_outlined,
                              label: 'Viewing',
                              onTap: () =>
                                  setState(() => _adminWantsStudio = false),
                            ),
                          ),
                          Expanded(
                            child: _AuctionModeButton(
                              selected: showAdminStudio,
                              icon: Icons.gavel,
                              label: 'Auction',
                              onTap: () =>
                                  setState(() => _adminWantsStudio = true),
                            ),
                          ),
                        ],
                      ),
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

class _AuctionModeButton extends StatelessWidget {
  final bool selected;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AuctionModeButton({
    required this.selected,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = selected ? Colors.white : Colors.white70;
    return Material(
      color: selected ? const Color(0xFF1D4ED8) : Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: selected ? null : onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
