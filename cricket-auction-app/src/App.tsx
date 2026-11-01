import React, { useState, useEffect } from 'react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { ActiveNavTab, Player } from './types/auction';
import { ProjectorView } from './pages/ProjectorView';
import { SpectatorView } from './pages/SpectatorView';
import { Dashboard } from './pages/Dashboard';
import { LiveAuction } from './pages/LiveAuction';
import { PlayersPage } from './pages/PlayersPage';
import { TeamsPage } from './pages/TeamsPage';
import { AuctionHistoryPage } from './pages/AuctionHistoryPage';
import { UnsoldPlayersPage } from './pages/UnsoldPlayersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ExcelImportPage } from './pages/ExcelImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuctionCompletePage } from './pages/AuctionCompletePage';
import { AuctionOrderPage } from './pages/AuctionOrderPage';
import { CaptainManagementPage } from './pages/CaptainManagementPage';
import { SaveLogsPage } from './pages/SaveLogsPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { QRCodeModal } from './components/QRCodeModal';

class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || 'Auction studio failed to load' };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-3">
            <p className="font-mono text-amber-400 text-sm">Auction studio error</p>
            <p className="text-slate-300 text-sm">{this.state.error}</p>
            <button
              className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-sm font-bold"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { startAuctionForPlayer } = useAuction();

  const [currentTab, setCurrentTab] = useState<ActiveNavTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin' || hash === '#auction' || hash === '#live_auction') {
        return 'live_auction';
      }
    }
    return 'live_auction';
  });
  const [viewMode, setViewMode] = useState<'admin' | 'projector' | 'spectator'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#spectator') return 'spectator';
      if (hash === '#projector') return 'projector';
      const isRemoteTunnel = window.location.hostname.includes('trycloudflare.com');
      if (isRemoteTunnel && hash !== '#admin') return 'spectator';
    }
    return 'admin';
  });
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const isRemoteTunnel = typeof window !== 'undefined' && window.location.hostname.includes('trycloudflare.com');

      if (hash === '#projector') {
        setViewMode('projector');
      } else if (hash === '#spectator' || (isRemoteTunnel && hash !== '#admin')) {
        setViewMode('spectator');
      } else {
        setViewMode('admin');
        if (hash === '#admin' || hash === '#auction' || hash === '#live_auction') {
          setCurrentTab('live_auction');
        }
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
    return <SpectatorView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenProjector={handleOpenProjector}
        onOpenQRCode={() => setIsQRCodeModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigate={setCurrentTab}
              onStartAuction={handleStartAuction}
              onOpenProjector={handleOpenProjector}
              onOpenQRCode={() => setIsQRCodeModalOpen(true)}
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
        </main>
      </div>

      {isQRCodeModalOpen && (
        <QRCodeModal
          isOpen={isQRCodeModalOpen}
          onClose={() => setIsQRCodeModalOpen(false)}
          onOpenProjector={handleOpenProjector}
          onOpenSpectator={handleOpenSpectator}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuctionProvider>
      <AdminErrorBoundary>
        <AppContent />
      </AdminErrorBoundary>
    </AuctionProvider>
  );
};

export default App;
