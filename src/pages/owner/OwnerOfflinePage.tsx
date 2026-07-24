import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, RefreshCw, LayoutDashboard, ShieldAlert, Download, Database, FileJson, Check, Activity, Trash2 } from 'lucide-react';
import { getActiveOwnerAndShopIds } from '../../lib/ownerDashboardRepository';
import { getPendingOwnerActions } from '../../lib/ownerOfflineDb';
import type { OwnerPendingAction } from '../../types/ownerOffline';
import { getOwnerOfflineStorageEstimate, type StorageEstimate, clearOwnerShopCache } from '../../lib/ownerOfflineStorageManager';


import { getSyncSuccessLogs, getSyncFailureLogs } from '../../services/preferenceSyncTracker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, format } from 'date-fns';

export default function OwnerOfflinePage() {
  const navigate = useNavigate();
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<OwnerPendingAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    if (clearStatus) {
      const timer = setTimeout(() => setClearStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [clearStatus]);

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(format(subDays(new Date(), i), 'MMM dd'));
    }
    
    const dataMap: Record<string, { date: string, success: number, failure: number }> = {};
    days.forEach(day => {
      dataMap[day] = { date: day, success: 0, failure: 0 };
    });

    const successLogs = getSyncSuccessLogs();
    const failureLogs = getSyncFailureLogs();

    successLogs.forEach(log => {
      const day = format(new Date(log.timestamp), 'MMM dd');
      if (dataMap[day]) {
        dataMap[day].success += 1;
      }
    });

    failureLogs.forEach(log => {
      const day = format(new Date(log.timestamp), 'MMM dd');
      if (dataMap[day]) {
        dataMap[day].failure += 1;
      }
    });

    setChartData(Object.values(dataMap));
  }, []);

  const getQueueSizeInBytes = () => {
    try {
      const dataStr = JSON.stringify(pendingActions);
      return new Blob([dataStr]).size;
    } catch {
      return 0;
    }
  };


  const handleClearData = async () => {
    setIsClearing(true);
    try {
      const { ownerId, shopId } = await getActiveOwnerAndShopIds();
      await clearOwnerShopCache(ownerId, shopId);
      const estimate = await getOwnerOfflineStorageEstimate();
      setStorageEstimate(estimate);
      setClearStatus({type: 'success', message: 'Saved offline data cleared from this device.'});
    } catch (err) {
      console.error('Failed to clear data', err);
      setClearStatus({type: 'error', message: 'Some offline data could not be cleared. Please try again.'});
    } finally {
      setIsClearing(false);
      setShowClearModal(false);
    }
  };

  const queueSizeBytes = getQueueSizeInBytes();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Standard safe Web Storage allocation reference
  const maxSafeSize = 5 * 1024 * 1024; // 5 MB
  const usagePercentage = Math.min(100, Math.max(0.1, (queueSizeBytes / maxSafeSize) * 100));

  // Load pending actions from database
  useEffect(() => {
    let isMounted = true;
    async function loadPending() {
      try {
        const { ownerId, shopId } = await getActiveOwnerAndShopIds();
        if (!isMounted) return;
        const actions = await getPendingOwnerActions(ownerId, shopId);
        const estimate = await getOwnerOfflineStorageEstimate();
        if (isMounted) {
          setPendingActions(actions);
          setStorageEstimate(estimate);
        }
      } catch (err) {
        console.error('[OwnerOfflinePage] Error loading pending actions for export:', err);
      } finally {
        if (isMounted) {
          setIsLoadingActions(false);
        }
      }
    }
    loadPending();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify(pendingActions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `nexora_offline_actions_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('[OwnerOfflinePage] Failed to export pending actions:', err);
    }
  };

  const handleRetry = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/icon-192.png?cacheBust=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store'
      });

      if (response.ok || response.status === 200 || response.status === 304) {
        setIsTesting(false);
        navigate('/app/owner');
        return;
      } else {
        throw new Error('Network check failed');
      }
    } catch {
      setIsTesting(false);
      setStatusMessage('Still offline. Please check your internet connection.');
    }
  };

  const handleGoDashboard = () => {
    navigate('/app/owner');
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 text-center flex flex-col items-center">
        {/* Logo / Branding */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/icon-192.png"
            alt="Nexora Shop Owner"
            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="text-left">
            <h2 className="text-base font-bold text-slate-900 leading-tight">Nexora</h2>
            <p className="text-xs font-semibold text-blue-600">Shop Owner</p>
          </div>
        </div>

        {/* Offline Icon Illustration */}
        <div className="w-20 h-20 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mb-6 shadow-inner">
          <WifiOff className="w-10 h-10" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          You’re Offline
        </h1>

        {/* Primary Message */}
        <p className="text-sm font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60 mb-3 w-full">
          Internet connection is currently unavailable.
        </p>

        {/* Supporting Text */}
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Previously loaded pages may still work. Live bookings, payments and business updates require internet.
        </p>

        {/* Status feedback message when retry fails */}
        {statusMessage && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2 justify-center animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Clear Status Message */}
        {clearStatus && (
          <div className={`w-full mb-4 p-3 border text-xs font-medium rounded-xl flex items-center gap-2 justify-center ${clearStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {clearStatus.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
            <span>{clearStatus.message}</span>
          </div>
        )}

        {/* Export Data Utility Card */}
        <div id="offline-backup-card" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <div id="offline-backup-icon-container" className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="offline-backup-title" className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-0.5">
                Backup Offline Actions
              </h3>
              <p id="offline-backup-description" className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                Download your unsynced local offline actions as a JSON backup file for support or safety.
              </p>
              
              <div id="offline-backup-status-row" className="flex items-center justify-between gap-2 bg-white border border-slate-200/60 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileJson className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span id="offline-backup-count-text" className="text-xs font-semibold text-slate-700 truncate">
                    {isLoadingActions ? (
                      'Checking database...'
                    ) : (
                      `${pendingActions.length} local actions ready`
                    )}
                  </span>
                </div>
                
                <button
                  id="offline-backup-export-btn"
                  onClick={handleExportData}
                  disabled={isLoadingActions}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 leading-none ${
                    exportSuccess
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  title="Download backup file"
                >
                  {exportSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Exported!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export JSON</span>
                    </>
                  )}
                </button>
              </div>

              {/* Clear Offline Data */}
              <div className="mt-4 pt-4 border-t border-slate-200/60">
                <button
                  onClick={() => setShowClearModal(true)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear saved offline data
                </button>
              </div>

              {/* Local Storage Usage Indicator */}
              <div id="offline-storage-usage-container" className="mt-3 pt-3 border-t border-slate-200/60">
                {storageEstimate?.quota ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-semibold text-slate-500">Offline storage used</span>
                      <span className="font-bold text-slate-700 tabular-nums">
                        {isLoadingActions ? 'Calculating...' : `${formatBytes(storageEstimate.usage)} of ${formatBytes(storageEstimate.quota)}`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden flex">
                      <div
                        id="offline-storage-progress-bar"
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0.1, (storageEstimate.usage / storageEstimate.quota) * 100))}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-start justify-center text-[11px] text-slate-500">
                     <span className="font-semibold mb-0.5">Offline data saved for faster access</span>
                     <span className="text-[10px]">Storage usage details are not available on this browser.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sync History Chart */}
        <div id="offline-sync-history-card" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-600">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              7-Day Sync History
            </h3>
          </div>
          
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="success" name="Success" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={30} />
                <Bar dataKey="failure" name="Failure" fill="#f43f5e" radius={[2, 2, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3 mb-6">
          <button
            onClick={handleRetry}
            disabled={isTesting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing connection...' : 'Retry Connection'}</span>
          </button>

          <button
            onClick={handleGoDashboard}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
        </div>

        {/* Small status footer text */}
        <p className="text-[11px] text-slate-400 font-medium">
          Live data is unavailable while offline.
        </p>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Clear Offline Data</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will remove saved offline data from this device only. Your live Nexora data will not be deleted.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear Offline Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
