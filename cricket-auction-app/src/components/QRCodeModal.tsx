import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Copy, Check, ExternalLink, Tv, Eye, Wifi, Download, Globe, RefreshCw, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProjector: () => void;
  onOpenSpectator: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  onOpenProjector,
  onOpenSpectator,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [isDetectingTunnel, setIsDetectingTunnel] = useState(false);

  // Dynamic live Cloudflare tunnel URL (auto-detects current domain or queries /api/tunnel-url)
  const [worldwideUrl, setWorldwideUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('.loca.lt') || window.location.hostname.includes('.ngrok'))) {
      return window.location.origin;
    }
    return '';
  });

  // Default connection mode: Default to 'wifi' for instant local network / hotspot scanning
  const [connectionMode, setConnectionMode] = useState<'worldwide' | 'wifi' | 'localhost'>(() => {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('.loca.lt') || window.location.hostname.includes('.ngrok'))) {
      return 'worldwide';
    }
    return 'wifi';
  });

  const [customHost, setCustomHost] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('trycloudflare.com')) {
      return window.location.hostname;
    }
    return '10.24.68.105';
  });
  const [customPort, setCustomPort] = useState(() => {
    if (typeof window !== 'undefined' && window.location.port) {
      return window.location.port;
    }
    return '5173';
  });

  // Auto-fetch latest active tunnel from server
  const fetchActiveTunnel = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('trycloudflare.com')) {
      setWorldwideUrl(window.location.origin);
      return;
    }

    setIsDetectingTunnel(true);
    const apiUrl = typeof window !== 'undefined' && window.location.pathname.startsWith('/auction')
      ? '/auction/api/tunnel-url'
      : '/api/tunnel-url';

    fetch(apiUrl)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (data.tunnelUrl) {
            setWorldwideUrl(data.tunnelUrl);
          }
          if (data.localIp && (!customHost || customHost === '192.168.0.214' || customHost === 'localhost')) {
            setCustomHost(data.localIp);
          }
          if (data.port) {
            setCustomPort(String(data.port));
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsDetectingTunnel(false);
      });
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchActiveTunnel();
    }
  }, [isOpen, fetchActiveTunnel]);

  // Compute active base URL based on mode
  let activeOrigin = `http://${customHost}:${customPort}`;
  if (connectionMode === 'wifi') {
    activeOrigin = customHost.startsWith('http') ? customHost : `http://${customHost}:${customPort}`;
  } else if (connectionMode === 'localhost') {
    activeOrigin = `http://localhost:${customPort}`;
  } else if (connectionMode === 'worldwide') {
    activeOrigin = worldwideUrl || (customHost.startsWith('http') ? customHost : `http://${customHost}:${customPort}`);
  }

  const cleanOrigin = activeOrigin.replace(/\/+$/, '');
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/auction') ? '/auction/' : '/auction/';
  const spectatorUrl = `${cleanOrigin}${basePath}#spectator`;
  const projectorUrl = `${cleanOrigin}${basePath}#projector`;

  // Generate QR Code locally via QRCode library with high contrast black-on-white for 100% scanner compatibility
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    QRCode.toDataURL(spectatorUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#000000', // Pure black modules for instant phone camera & Google Lens recognition
        light: '#ffffff', // Pure white background for maximum ISO/camera contrast
      },
      errorCorrectionLevel: 'Q', // High error tolerance for screens and reflections
    })
      .then(url => {
        if (isMounted) {
          setQrDataUrl(url);
          setQrError(null);
        }
      })
      .catch(err => {
        console.error('Local QR Code generation failed:', err);
        if (isMounted) {
          setQrError('Failed to generate QR code.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [spectatorUrl, isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2200);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `cricket_auction_spectator_qr_${connectionMode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Live Spectator QR & Share Links</h2>
              <p className="text-xs text-slate-400">Scan or share to follow live bidding on mobile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Connection Mode Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Access Mode:</span>
              <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setConnectionMode('wifi')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    connectionMode === 'wifi'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Same Wi-Fi / Hotspot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConnectionMode('worldwide')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    connectionMode === 'worldwide'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Internet / Tunnel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConnectionMode('localhost')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    connectionMode === 'localhost'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Local
                </button>
              </div>
            </div>

            {connectionMode === 'worldwide' && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={worldwideUrl}
                      onChange={e => setWorldwideUrl(e.target.value.trim())}
                      placeholder="https://xxx.trycloudflare.com or public URL"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchActiveTunnel}
                    title="Detect active tunnel URL"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isDetectingTunnel ? 'animate-spin' : ''}`} />
                    <span>Auto-Detect</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Allows anyone around the world on mobile data (4G/5G) or outside the hall to view the live auction.
                </p>
              </div>
            )}

            {connectionMode === 'wifi' && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customHost}
                      onChange={e => setCustomHost(e.target.value.trim())}
                      placeholder="e.g. 192.168.29.153"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={customPort}
                    onChange={e => setCustomPort(e.target.value.trim())}
                    placeholder="Port"
                    className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 flex items-start gap-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span>
                    Ensure mobile phone is connected to the <strong className="text-emerald-300">same Wi-Fi router</strong> or your laptop's <strong className="text-emerald-300">Mobile Hotspot</strong>. Anyone in the hall can scan and follow live bids instantly!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* QR Code Display with High-Contrast White Background for 100% Instant Camera Scanning */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner space-y-3">
            {qrError ? (
              <div className="p-8 text-rose-400 text-xs font-semibold">{qrError}</div>
            ) : qrDataUrl ? (
              <div className="relative group">
                <div className="p-3.5 bg-white rounded-2xl shadow-2xl border-4 border-slate-700/50 flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="Spectator QR Code"
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <button
                  onClick={handleDownloadQR}
                  title="Download QR code image"
                  className="absolute bottom-2 right-2 p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-lg text-xs flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            ) : (
              <div className="w-56 h-56 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs font-mono animate-pulse">
                Generating QR...
              </div>
            )}

            <div className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 text-center">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Point any phone camera or Google Lens to open:</span>
            </div>
            <div className="text-[11px] font-mono text-cyan-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 max-w-full truncate">
              {spectatorUrl}
            </div>
          </div>

          {/* Share Links */}
          <div className="space-y-3 text-left">
            {/* Spectator URL Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Public Spectator Link</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      Read-Only
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[210px] font-mono mt-0.5">
                    {spectatorUrl}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => copyToClipboard(spectatorUrl, 'spectator')}
                  title="Copy spectator link"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 font-semibold transition-colors"
                >
                  {copiedType === 'spectator' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.open(spectatorUrl, '_blank')}
                  title="Test link in new tab"
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </button>
              </div>
            </div>

            {/* Projector URL Card */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex-shrink-0">
                  <Tv className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">Projector / Venue Big Screen</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[210px] font-mono mt-0.5">
                    {projectorUrl}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => copyToClipboard(projectorUrl, 'projector')}
                  title="Copy projector link"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 font-semibold transition-colors"
                >
                  {copiedType === 'projector' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onOpenProjector}
                  title="Launch projector"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Cloudflare Global HTTPS Tunnel Active</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
