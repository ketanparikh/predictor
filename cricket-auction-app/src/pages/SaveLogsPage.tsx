import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  Database,
  History,
  FileCheck,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';

export const SaveLogsPage: React.FC = () => {
  const {
    saveLogs,
    saveSnapshots,
    lastSavedTimestamp,
    triggerManualSave,
    restoreFromSnapshot,
    teams,
    players,
    transactions,
    rules,
    tournament,
    importBackupJSON,
  } = useAuction();

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saveDescription, setSaveDescription] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualSave = () => {
    const desc = saveDescription.trim() || 'Manual checkpoint triggered by organizer';
    const res = triggerManualSave(desc);
    if (res.success) {
      showToast(res.message, 'success');
      setSaveDescription('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleRequestRestore = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmRestore = () => {
    if (!selectedSnapshotId) return;
    const res = restoreFromSnapshot(selectedSnapshotId);
    setIsConfirmModalOpen(false);
    setSelectedSnapshotId(null);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleExportFullJSON = () => {
    const exportData = {
      version: '4.0.0',
      exportedAt: new Date().toISOString(),
      tournament,
      rules,
      teams,
      players,
      transactions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JCPL_4_Auction_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Auction backup file downloaded successfully', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importBackupJSON(content);
        if (ok) {
          showToast('Backup successfully imported and restored!', 'success');
        } else {
          showToast('Failed to parse backup JSON file. Ensure correct format.', 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formattedLastSaved = lastSavedTimestamp
    ? new Date(lastSavedTimestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : 'Never / Fresh Session';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border ${
            toastMessage.type === 'success'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/30'
              : 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-400/30'
          } animate-bounce`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Database className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide">Data Save & Recovery Center</h1>
                <p className="text-xs text-slate-400">
                  Manual checkpoints, automated mutation audit logs, and instant snapshot rollback
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Last Saved</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 justify-center">
                <Clock className="w-3.5 h-3.5" />
                {formattedLastSaved}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Snapshots</span>
              <span className="text-lg font-black text-white">{saveSnapshots.length}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Log Events</span>
              <span className="text-lg font-black text-amber-400">{saveLogs.length}</span>
            </div>
          </div>
        </div>

        {/* Manual Checkpoint Form */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Enter an optional note for this manual save (e.g. 'After Round 1 Lot 25')..."
            value={saveDescription}
            onChange={(e) => setSaveDescription(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full"
          />
          <button
            onClick={handleManualSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2 transition-all flex-shrink-0"
          >
            <Save className="w-4 h-4" />
            Save State Now
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFullJSON}
              title="Download offline JSON backup file"
              className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <label
              title="Import JSON backup file"
              className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Snapshots on Left, Save Audit Logs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Restore Snapshots (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-base">Saved Version Snapshots</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {saveSnapshots.length} available
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Select any prior checkpoint below to rollback and restore full auction state safely.
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
            {saveSnapshots.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No saved snapshots recorded yet. Click "Save State Now" to create your first manual checkpoint.
              </div>
            ) : (
              saveSnapshots.map((snap) => {
                const snapDate = new Date(snap.timestamp).toLocaleString('en-IN', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                });

                return (
                  <div
                    key={snap.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col gap-2 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {(snap.type || 'snapshot').toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {snap.description}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                          {snapDate}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRequestRestore(snap.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 transition-colors flex items-center gap-1 shadow flex-shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60">
                      <span>Teams: {snap.teamsCount ?? snap.state?.teams?.length ?? 0}</span>
                      <span>Players: {snap.playersCount ?? snap.state?.players?.length ?? 0}</span>
                      <span>Sold: {snap.soldCount ?? snap.state?.players?.filter(p => p.status === 'sold').length ?? 0}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Save Operation Logs (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-white text-base">Save Operation Audit Logs</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Live chronological trace
            </span>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[520px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Time</th>
                  <th className="py-2.5 px-3 font-bold">Type</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                  <th className="py-2.5 px-3 font-bold">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {saveLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No save log events recorded yet.
                    </td>
                  </tr>
                ) : (
                  saveLogs.map((log) => {
                    const timeFormatted = new Date(log.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {timeFormatted}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.type === 'manual'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : log.type === 'snapshot'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {log.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {log.description}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Snapshot Rollback */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <RotateCcw className="w-6 h-6" />
              <h3 className="font-bold text-lg text-white">Restore Saved Snapshot</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Are you sure you want to restore this saved snapshot? The current auction state (teams, squads, budgets, player statuses, and queue) will be rolled back to that exact point in time.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20"
              >
                Yes, Restore Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
