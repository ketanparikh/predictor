import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { ActiveNavTab, Player } from './types/auction';
import { ProjectorView } from './pages/ProjectorView';
import { SpectatorView } from './pages/SpectatorView';

// Lazily load heavy admin pages so the spectator window bundle is ultra-lightweight and opens in milliseconds!
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const LiveAuction = lazy(() => import('./pages/LiveAuction').then(m => ({ default: m.LiveAuction })));
const PlayersPage = lazy(() => import('./pages/PlayersPage').then(m => ({ default: m.PlayersPage })));
const TeamsPage = lazy(() => import('./pages/TeamsPage').then(m => ({ default: m.TeamsPage })));
const AuctionHistoryPage = lazy(() => import('./pages/AuctionHistoryPage').then(m => ({ default: m.AuctionHistoryPage })));
const UnsoldPlayersPage = lazy(() => import('./pages/UnsoldPlayersPage').then(m => ({ default: m.UnsoldPlayersPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })));
const ExcelImportPage = lazy(() => import('./pages/ExcelImportPage').then(m => ({ default: m.ExcelImportPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AuctionCompletePage = lazy(() => import('./pages/AuctionCompletePage').then(m => ({ default: m.AuctionCompletePage })));
const AuctionOrderPage = lazy(() => import('./pages/AuctionOrderPage').then(m => ({ default: m.AuctionOrderPage })));
const CaptainManagementPage = lazy(() => import('./pages/CaptainManagementPage').then(m => ({ default: m.CaptainManagementPage })));
const SaveLogsPage = lazy(() => import('./pages/SaveLogsPage').then(m => ({ default: m.SaveLogsPage })));
const Navbar = lazy(() => import('./components/Navbar').then(m => ({ default: m.Navbar })));
const Sidebar = lazy(() => import('./components/Sidebar').then(m => ({ default: m.Sidebar })));
const QRCodeModal = lazy(() => import('./components/QRCodeModal').then(m => ({ default: m.QRCodeModal })));

const AdminLoadingFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-mono text-xs">
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
      <span>Loading Studio...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { startAuctionForPlayer } = useAuction();

  const [currentTab, setCurrentTab] = useState<ActiveNavTab>('dashboard');
  const [viewMode, setViewMode] = useState<'admin' | 'projector' | 'spectator'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#projector') return 'projector';
      if (hash === '#admin') return 'admin';
    }
    return 'spectator';
  });
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // URL Hash-based routing: spectators and public tunnel are strictly locked to spectator mode
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const isRemoteTunnel = typeof window !== 'undefined' && window.location.hostname.includes('trycloudflare.com');

      if (hash === '#projector') {
        setViewMode('projector');
      } else if (hash === '#admin' && !isRemoteTunnel) {
        setViewMode('admin');
      } else {
        setViewMode('spectator');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleStartAuction = (player: Player) => {
    startAuctionForPlayer(player.id);
    setCurrentTab('live_auction');
  };

  const handleOpenProjector = () => {
    window.location.hash = 'projector';
    setViewMode('projector');
  };

  const handleOpenSpectator = () => {
    window.location.hash = 'spectator';
    setViewMode('spectator');
  };

  const handleCloseProjector = () => {
    window.location.hash = 'admin';
    setViewMode('admin');
  };

  if (viewMode === 'projector') {
    return <ProjectorView onClose={handleCloseProjector} />;
  }

  if (viewMode === 'spectator') {
    // Spectator view is strictly read-only with no admin controls or exit buttons
    return <SpectatorView />;
  }

  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Top Navigation */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenProjector={handleOpenProjector}
          onOpenQRCode={() => setIsQRCodeModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Main Layout Area */}
        <div className="flex-1 flex">
          {/* Navigation Sidebar */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Dynamic Page Content */}
          <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
            <Suspense fallback={<AdminLoadingFallback />}>
              {currentTab === 'dashboard' && (
                <Dashboard
                  onNavigate={setCurrentTab}
                  onStartAuction={handleStartAuction}
                  onOpenProjector={handleOpenProjector}
                />
              )}

              {currentTab === 'live_auction' && (
                <LiveAuction onOpenProjector={handleOpenProjector} />
              )}

              {currentTab === 'players' && (
                <PlayersPage
                  onStartAuction={handleStartAuction}
                  onNavigate={setCurrentTab}
                />
              )}

              {currentTab === 'teams' && <TeamsPage />}

              {currentTab === 'history' && <AuctionHistoryPage />}

              {currentTab === 'unsold' && (
                <UnsoldPlayersPage onStartAuction={handleStartAuction} />
              )}

              {currentTab === 'analytics' && <AnalyticsPage />}

              {currentTab === 'ai_assistant' && <AIAssistantPage />}

              {currentTab === 'import_excel' && (
                <ExcelImportPage onNavigateToPlayers={() => setCurrentTab('players')} />
              )}

              {currentTab === 'settings' && <SettingsPage />}

              {currentTab === 'auction_order' && (
                <AuctionOrderPage onStartAuction={handleStartAuction} />
              )}

              {currentTab === 'captain_management' && (
                <CaptainManagementPage />
              )}

              {currentTab === 'save_logs' && (
                <SaveLogsPage />
              )}

              {currentTab === 'complete' && <AuctionCompletePage />}
            </Suspense>
          </main>
        </div>

        {/* QR Code / Spectator Share Modal */}
        {isQRCodeModalOpen && (
          <QRCodeModal
            isOpen={isQRCodeModalOpen}
            onClose={() => setIsQRCodeModalOpen(false)}
            onOpenProjector={handleOpenProjector}
            onOpenSpectator={handleOpenSpectator}
          />
        )}
      </div>
    </Suspense>
  );
};


export const App: React.FC = () => {
  return (
    <AuctionProvider>
      <AppContent />
    </AuctionProvider>
  );
};

export default App;
