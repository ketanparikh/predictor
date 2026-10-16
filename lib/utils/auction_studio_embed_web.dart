import 'dart:html' as html;
import 'dart:ui_web' as ui;

import 'package:flutter/material.dart';

const _viewType = 'jcpl-auction-studio';
html.IFrameElement? _iframe;
var _registered = false;

class AuctionStudioEmbed extends StatefulWidget {
  final bool showAdminStudio;

  const AuctionStudioEmbed({super.key, required this.showAdminStudio});

  @override
  State<AuctionStudioEmbed> createState() => _AuctionStudioEmbedState();
}

class _AuctionStudioEmbedState extends State<AuctionStudioEmbed> {
  @override
  void initState() {
    super.initState();
    _ensureIframe(_srcFor(widget.showAdminStudio));
  }

  @override
  void didUpdateWidget(AuctionStudioEmbed oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.showAdminStudio != widget.showAdminStudio) {
      _setMode(widget.showAdminStudio);
    }
  }

  String _srcFor(bool admin) => admin ? '/auction/#admin' : '/auction/#spectator';

  void _ensureIframe(String src) {
    if (_iframe == null) {
      _iframe = html.IFrameElement()
        ..src = src
        ..allow = 'clipboard-read; clipboard-write'
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%';
    }
    if (!_registered) {
      ui.platformViewRegistry.registerViewFactory(
        _viewType,
        (int viewId) => _iframe!,
      );
      _registered = true;
    }
  }

  void _setMode(bool admin) {
    final iframe = _iframe;
    if (iframe == null) return;
    iframe.src = _srcFor(admin);
  }

  @override
  Widget build(BuildContext context) {
    return const HtmlElementView(viewType: _viewType);
  }
}
