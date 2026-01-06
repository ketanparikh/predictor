import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'dart:async';
import 'dart:html' as html;
import 'dart:ui_web' as ui;

class JcplHomeTab extends StatefulWidget {
  final Function(int) onNavigateToTab;

  const JcplHomeTab({super.key, required this.onNavigateToTab});

  @override
  State<JcplHomeTab> createState() => _JcplHomeTabState();
}

class _JcplHomeTabState extends State<JcplHomeTab> {
  Map<String, dynamic>? _scheduleData;
  bool _isLoading = true;
  final PageController _adPageController = PageController();
  final PageController _sponsorPageController = PageController();
  int _currentAdIndex = 0;
  int _currentSponsorIndex = 0;
  Timer? _adTimer;
  Timer? _sponsorTimer;
  Timer? _countdownTimer;

  // Tournament start date - 10th Jan 2026
  final DateTime _tournamentDate = DateTime(2026, 1, 10, 9, 0, 0);
  Duration _timeRemaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _loadScheduleData();
    _startAdAutoScroll();
    _startSponsorAutoScroll();
    _startCountdown();
  }

  void _startCountdown() {
    _updateTimeRemaining();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _updateTimeRemaining();
    });
  }

  void _updateTimeRemaining() {
    final now = DateTime.now();
    if (mounted) {
      setState(() {
        _timeRemaining = _tournamentDate.difference(now);
        if (_timeRemaining.isNegative) {
          _timeRemaining = Duration.zero;
        }
      });
    }
  }

  @override
  void dispose() {
    _adPageController.dispose();
    _sponsorPageController.dispose();
    _adTimer?.cancel();
    _sponsorTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startAdAutoScroll() {
    _adTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (mounted && _adPageController.hasClients) {
        final ads = _scheduleData?['advertisements'] as List? ?? [];
        final totalItems = ads.isEmpty ? 1 : ads.length;
        if (totalItems > 1) {
          final nextIndex = (_currentAdIndex + 1) % totalItems;
          _adPageController.animateToPage(
            nextIndex,
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeInOut,
          );
        }
      }
    });
  }

  void _startSponsorAutoScroll() {
    _sponsorTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (_scheduleData != null && mounted) {
        final sponsors = _scheduleData!['sponsors'] as List? ?? [];
        if (sponsors.isNotEmpty) {
          final nextIndex = (_currentSponsorIndex + 1) % sponsors.length;
          _sponsorPageController.animateToPage(
            nextIndex,
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeInOut,
          );
        }
      }
    });
  }

  Future<void> _loadScheduleData() async {
    try {
      final String response =
          await rootBundle.loadString('assets/config/schedule.json');
      final data = json.decode(response);
      setState(() {
        _scheduleData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadScheduleData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCountdownSection(context),
            _buildHeroCarousel(context),
            _buildGlimpsesSection(context),
            _buildSponsorsSection(context),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // Countdown Section - Above hero
  Widget _buildCountdownSection(BuildContext context) {
    final theme = Theme.of(context);
    final days = _timeRemaining.inDays;
    final hours = _timeRemaining.inHours.remainder(24);
    final minutes = _timeRemaining.inMinutes.remainder(60);
    final seconds = _timeRemaining.inSeconds.remainder(60);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.deepPurple.shade700,
            Colors.purple.shade500,
          ],
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Colors.white, Colors.amber, Colors.white],
                ).createShader(bounds),
                child: const Text(
                  'JCPL',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.amber,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Season 3',
                  style: TextStyle(
                    color: Colors.black87,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Tournament Starts In',
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildCompactCountdownItem(days.toString().padLeft(2, '0'), 'D'),
              _buildCompactSeparator(),
              _buildCompactCountdownItem(hours.toString().padLeft(2, '0'), 'H'),
              _buildCompactSeparator(),
              _buildCompactCountdownItem(
                  minutes.toString().padLeft(2, '0'), 'M'),
              _buildCompactSeparator(),
              _buildCompactCountdownItem(
                  seconds.toString().padLeft(2, '0'), 'S'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompactCountdownItem(String value, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Text(
            value,
            style: const TextStyle(
              color: Colors.amber,
              fontSize: 20,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(width: 2),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactSeparator() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Text(
        ':',
        style: TextStyle(
          color: Colors.white.withOpacity(0.6),
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  // Hero Carousel with Advertisements
  Widget _buildHeroCarousel(BuildContext context) {
    final ads = _scheduleData?['advertisements'] as List? ?? [];
    final totalItems = ads.isEmpty ? 1 : ads.length;

    return Column(
      children: [
        SizedBox(
          height: 160,
          child: PageView.builder(
            controller: _adPageController,
            onPageChanged: (index) => setState(() => _currentAdIndex = index),
            itemCount: totalItems,
            itemBuilder: (context, index) {
              if (ads.isEmpty) {
                return _buildDefaultAdCard(context);
              }
              return _buildHeroAdCard(context, ads[index]);
            },
          ),
        ),
        if (totalItems > 1)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(totalItems, (index) {
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: _currentAdIndex == index ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _currentAdIndex == index
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }

  Widget _buildHeroAdCard(BuildContext context, Map<String, dynamic> ad) {
    final colorHex = ad['color'] as String? ?? '#1565C0';
    final color = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color, color.withOpacity(0.7)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -15,
            bottom: -15,
            child: Icon(
              Icons.sports_cricket,
              size: 100,
              color: Colors.white.withOpacity(0.1),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  ad['title'] ?? '',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  ad['subtitle'] ?? '',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultAdCard(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.sports_cricket, color: Colors.white, size: 40),
            const SizedBox(height: 8),
            const Text(
              'Welcome to JCPL Season 3!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Registration Bar - Dynamic with animation
  Widget _buildRegistrationBar(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.primary.withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 4),
            spreadRadius: 1,
          ),
        ],
      ),
      child: Stack(
        children: [
          // Decorative elements
          Positioned(
            left: -10,
            top: -10,
            child: Icon(
              Icons.sports_cricket,
              size: 50,
              color: Colors.white.withOpacity(0.15),
            ),
          ),
          Positioned(
            right: 80,
            bottom: -5,
            child: Icon(
              Icons.celebration,
              size: 35,
              color: Colors.white.withOpacity(0.15),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Animated pulse dot
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.8, end: 1.2),
                  duration: const Duration(milliseconds: 800),
                  builder: (context, scale, child) {
                    return Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.white.withOpacity(0.8),
                              blurRadius: 8,
                              spreadRadius: 3,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  onEnd: () {},
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        '🎉 REGISTRATIONS OPEN!',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Join the cricket action now!',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    html.window.open(
                      'https://docs.google.com/forms/d/e/1FAIpQLSeBlMHdbsJVnpRTG3m48LT2IAyyRrJ9z0GriJSNbZFqfr6M2w/viewform',
                      '_blank',
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF00C853),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(25),
                    ),
                    elevation: 4,
                    shadowColor: Colors.black26,
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.sports_cricket, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'JOIN',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Glimpses Section - Card that opens grid
  Widget _buildGlimpsesSection(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: () => _showGlimpsesDialog(context),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: theme.colorScheme.primary.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.photo_library,
                  color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Glimpses of Previous JCPL',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tap to view',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios,
                color: Colors.white.withOpacity(0.7), size: 20),
          ],
        ),
      ),
    );
  }

  void _showGlimpsesDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Theme.of(context).colorScheme.primary,
                      Theme.of(context).colorScheme.secondary,
                    ],
                  ),
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.photo_library, color: Colors.white),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Glimpses of Previous JCPL',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: Colors.white),
                    ),
                  ],
                ),
              ),
              // Grid
              Expanded(
                child: GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 1.3,
                  ),
                  itemCount: _adImages.length,
                  itemBuilder: (context, index) {
                    return GestureDetector(
                      onTap: () => _showFullImage(context, index),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.asset(
                          _adImages[index],
                          fit: BoxFit.cover,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showFullImage(BuildContext context, int initialIndex) {
    Navigator.pop(context); // Close grid dialog
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          children: [
            PageView.builder(
              controller: PageController(initialPage: initialIndex),
              itemCount: _adImages.length,
              itemBuilder: (context, index) {
                return InteractiveViewer(
                  child: Center(
                    child: Image.asset(
                      _adImages[index],
                      fit: BoxFit.contain,
                    ),
                  ),
                );
              },
            ),
            Positioned(
              top: 40,
              right: 16,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // List of advertisement images
  final List<String> _adImages = const [
    'assets/images/DSC_0063.jpg',
    'assets/images/DSC_9814.jpg',
    'assets/images/DSC_9835.jpg',
    'assets/images/DSC_9847.jpg',
    'assets/images/DSC_9950.jpg',
    'assets/images/DSC_9984.jpg',
  ];

  // Keep for future use - commented out
  Widget _buildUpcomingMatchesPreview(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Upcoming Matches',
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              TextButton(
                onPressed: () => widget.onNavigateToTab(2),
                child: const Text('View Schedule'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Coming Soon Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  theme.colorScheme.primary.withOpacity(0.1),
                  theme.colorScheme.secondary.withOpacity(0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: theme.colorScheme.primary.withOpacity(0.2),
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.sports_cricket,
                  size: 48,
                  color: theme.colorScheme.primary.withOpacity(0.5),
                ),
                const SizedBox(height: 12),
                Text(
                  'Coming Soon!',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Match schedules will be announced shortly.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSponsorsSection(BuildContext context) {
    final sponsors = _scheduleData?['sponsors'] as List? ?? [];
    if (sponsors.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Our Sponsors',
            style: theme.textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 160,
          child: PageView.builder(
            controller: _sponsorPageController,
            onPageChanged: (index) =>
                setState(() => _currentSponsorIndex = index),
            itemCount: sponsors.length,
            itemBuilder: (context, index) {
              final sponsor = sponsors[index];
              return _buildSponsorCard(context, sponsor);
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(sponsors.length, (index) {
            return AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: _currentSponsorIndex == index ? 20 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: _currentSponsorIndex == index
                    ? Colors.amber.shade700
                    : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildSponsorCard(BuildContext context, Map<String, dynamic> sponsor) {
    final type = sponsor['type'] as String? ?? 'gold';
    final isTitle = type == 'title';
    final site = sponsor['site'] as String?;
    final owner = sponsor['owner'] as String?;

    // Premium gradients: Gold for Title, Vibrant Teal/Purple for Team Sponsor
    final List<Color> gradientColors = isTitle
        ? [
            const Color(0xFFB8860B), // Dark goldenrod
            const Color(0xFFDAA520), // Goldenrod
            const Color(0xFFFFD700), // Gold
            const Color(0xFFDAA520), // Goldenrod
          ]
        : [
            const Color(0xFF6366F1), // Indigo
            const Color(0xFF8B5CF6), // Purple
            const Color(0xFFA78BFA), // Light purple
          ];

    final Color borderColor = isTitle
        ? const Color(0xFFFFD700) // Gold border
        : const Color(0xFFA78BFA); // Purple border

    final Color shadowColor =
        isTitle ? const Color(0xFFDAA520) : const Color(0xFF6366F1);

    final Color textColor = isTitle
        ? const Color(0xFFB8860B) // Gold text
        : const Color(0xFF4F46E5); // Indigo text

    return GestureDetector(
      onTap: () => _showSponsorDetails(context, sponsor, isTitle: isTitle),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: gradientColors,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor, width: 2),
          boxShadow: [
            BoxShadow(
              color: shadowColor.withOpacity(0.5),
              blurRadius: 15,
              offset: const Offset(0, 6),
              spreadRadius: 2,
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative icons
            Positioned(
              left: 10,
              top: 10,
              child: Icon(
                isTitle ? Icons.star : Icons.sports_cricket,
                size: 20,
                color: Colors.white.withOpacity(0.3),
              ),
            ),
            Positioned(
              right: 50,
              top: 15,
              child: Icon(
                isTitle ? Icons.star : Icons.groups,
                size: 14,
                color: Colors.white.withOpacity(0.25),
              ),
            ),
            Positioned(
              right: -20,
              bottom: -20,
              child: Icon(
                isTitle ? Icons.star : Icons.groups,
                size: 120,
                color: Colors.white.withOpacity(0.15),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  // Logo placeholder with premium styling
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: shadowColor.withOpacity(0.4),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                      border: Border.all(color: borderColor, width: 2),
                    ),
                    child: Center(
                      child: Text(
                        sponsor['logoPlaceholder'] ?? 'SP',
                        style: TextStyle(
                          color: textColor,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.25),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isTitle ? '⭐ TITLE SPONSOR' : '🏏 TEAM SPONSOR',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          sponsor['name'] ?? '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (owner != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            owner,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                        const SizedBox(height: 4),
                        Text(
                          sponsor['description'] ?? 'Tap to view details',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 12,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (site != null)
                          Text(
                            site,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSponsorDetails(
    BuildContext context,
    Map<String, dynamic> sponsor, {
    required bool isTitle,
  }) {
    // For title sponsor, show video dialog
    if (isTitle) {
      _showTitleSponsorVideo(context, sponsor);
      return;
    }

    final color = Colors.amber.shade700;
    final site = sponsor['site'] as String?;
    final owner = sponsor['owner'] as String?;
    final description = sponsor['description'] as String?;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => LayoutBuilder(
        builder: (context, constraints) {
          final maxHeight = MediaQuery.of(context).size.height * 0.9;
          return ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxHeight),
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Sponsor Logo
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [color.withOpacity(0.2), color.withOpacity(0.1)],
                        ),
                        shape: BoxShape.circle,
                        border: Border.all(color: color.withOpacity(0.3), width: 2),
                      ),
                      child: Center(
                        child: Text(
                          sponsor['logoPlaceholder'] ?? 'SP',
                          style: TextStyle(
                            color: color,
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Sponsor Type Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'TEAM SPONSOR',
                        style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Sponsor Name
                    Text(
                      sponsor['name'] ?? '',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    if (owner != null)
                      Text(
                        owner,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.grey.shade900,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    if (owner != null) const SizedBox(height: 10),
                    // Description
                    if (description != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(top: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Text(
                          description,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade800,
                            height: 1.55,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: TextAlign.left,
                        ),
                      ),
                    if (site != null) ...[
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: () {
                          html.window.open(
                            site.startsWith('http') ? site : 'https://$site',
                            '_blank',
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: color.withOpacity(0.3)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.link, size: 16, color: color),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  site,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: color,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    // Thank you message
                    Text(
                      'Thank you for supporting JCPL! 🏏',
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showTitleSponsorVideo(
      BuildContext context, Map<String, dynamic> sponsor) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => _TitleSponsorVideoDialog(sponsor: sponsor),
    );
  }
}

class _TitleSponsorVideoDialog extends StatefulWidget {
  final Map<String, dynamic> sponsor;

  const _TitleSponsorVideoDialog({required this.sponsor});

  @override
  State<_TitleSponsorVideoDialog> createState() =>
      _TitleSponsorVideoDialogState();
}

class _TitleSponsorVideoDialogState extends State<_TitleSponsorVideoDialog> {
  late html.VideoElement _videoElement;
  final String _viewType =
      'ace-prime-video-${DateTime.now().millisecondsSinceEpoch}';
  bool _isRegistered = false;

  @override
  void initState() {
    super.initState();
    _setupVideo();
  }

  void _setupVideo() {
    _videoElement = html.VideoElement()
      ..src = 'assets/ACE_Prime.mp4.mp4'
      ..autoplay = true
      ..controls = true
      ..muted = false
      ..style.width = '100%'
      ..style.height = '100%'
      ..style.objectFit = 'contain'
      ..style.backgroundColor = 'black';

    // Register view factory only once
    if (!_isRegistered) {
      ui.platformViewRegistry.registerViewFactory(
        _viewType,
        (int viewId) => _videoElement,
      );
      _isRegistered = true;
    }
  }

  @override
  void dispose() {
    _videoElement.pause();
    _videoElement.src = '';
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 500),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    theme.colorScheme.primary,
                    theme.colorScheme.secondary
                  ],
                ),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.amber,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      '⭐ TITLE SPONSOR',
                      style: TextStyle(
                        color: Colors.black87,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.sponsor['name'] ?? 'Ace Prime Infra',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),
            // Video Player
            Expanded(
              child: Container(
                color: Colors.black,
                child: HtmlElementView(viewType: _viewType),
              ),
            ),
            // Footer
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    widget.sponsor['description'] ?? '',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Thank you for supporting JCPL Season 3! 🏏',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
