import { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getOwnerPendingActions, syncOwnerPendingActions, resetFailedOwnerActions } from '../../lib/ownerPendingActionQueue';
import { getActiveOwnerAndShopIds } from '../../lib/ownerDashboardRepository';
import { useSyncManager } from '../../hooks/useSyncManager';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { OwnerPendingAction } from '../../types/ownerOffline';

export default function OwnerSyncStatus() {
  const { isOffline, isOnline } = useNetworkStatus();
  const { isSyncing, syncPendingOperations } = useSyncManager();
  const [pendingActions, setPendingActions] = useState<OwnerPendingAction[]>([]);
  const [ownerAndShop, setOwnerAndShop] = useState<{ ownerId: string; shopId: string } | null>(null);

  // 1. Fetch active owner and shop IDs
  useEffect(() => {
    let active = true;
    async function loadIds() {
      try {
        const ids = await getActiveOwnerAndShopIds();
        if (active) {
          setOwnerAndShop(ids);
        }
      } catch (err) {
        console.error('[OwnerSyncStatus] Failed to load active owner/shop IDs:', err);
      }
    }
    loadIds();
    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch pending actions and listen to changes
  useEffect(() => {
    if (!ownerAndShop?.ownerId || !ownerAndShop?.shopId) return;

    let active = true;
    async function fetchPending() {
      try {
        const actions = await getOwnerPendingActions(ownerAndShop.ownerId, ownerAndShop.shopId);
        if (active) {
          setPendingActions(actions);
        }
      } catch (err) {
        console.error('[OwnerSyncStatus] Failed to fetch pending actions:', err);
      }
    }

    fetchPending();

    const handleActionChanged = () => {
      fetchPending();
    };

    window.addEventListener('owner-pending-actions-changed', handleActionChanged);
    window.addEventListener('online', handleActionChanged);

    return () => {
      active = false;
      window.removeEventListener('owner-pending-actions-changed', handleActionChanged);
      window.removeEventListener('online', handleActionChanged);
    };
  }, [ownerAndShop]);

  // 3. Compute status and label
  let status: 'synced' | 'syncing' | 'offline_pending' | 'failed' = 'synced';
  let label = 'Synced';
  let subtext = 'All changes saved to cloud';
  let icon = <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  let colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-100';

  if (isSyncing) {
    status = 'syncing';
    label = 'Syncing';
    subtext = 'Synchronizing preferences…';
    icon = <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />;
    colorClass = 'bg-blue-50 text-blue-800 border-blue-100';
  } else if (isOffline) {
    if (pendingActions.length > 0) {
      // Find the action with retries left
      const eligible = pendingActions.filter(a => a.status !== 'failed');
      const minRetriesLeft = eligible.length > 0
        ? Math.min(...eligible.map(a => Math.max(0, 3 - (a.retryCount || 0))))
        : 0;

      status = 'offline_pending';
      label = `Offline - ${minRetriesLeft} retries left`;
      subtext = `${pendingActions.length} preference update${pendingActions.length > 1 ? 's' : ''} queued`;
      icon = <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />;
      colorClass = 'bg-amber-50 text-amber-800 border-amber-100';
    } else {
      status = 'offline_pending';
      label = 'Offline';
      subtext = 'Working in offline mode';
      icon = <WifiOff className="w-4 h-4 text-slate-500 shrink-0" />;
      colorClass = 'bg-slate-50 text-slate-700 border-slate-100';
    }
  } else {
    // Online, check if we have failed/stuck actions
    const failedActions = pendingActions.filter(a => a.status === 'failed');
    if (failedActions.length > 0) {
      status = 'failed';
      label = 'Sync Stuck';
      subtext = `${failedActions.length} action${failedActions.length > 1 ? 's' : ''} failed after 3 retries`;
      icon = <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      colorClass = 'bg-rose-50 text-rose-800 border-rose-100';
    } else if (pendingActions.length > 0) {
      status = 'syncing';
      label = 'Sync Pending';
      subtext = `${pendingActions.length} update${pendingActions.length > 1 ? 's' : ''} to upload`;
      icon = <RefreshCw className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />;
      colorClass = 'bg-blue-50 text-blue-800 border-blue-100';
    }
  }

  const hasFailedActions = pendingActions.some(a => a.status === 'failed' || (a.retryCount && a.retryCount >= 3));
  const [timeLeft, setTimeLeft] = useState(30);

  // Automatic retry countdown timer
  useEffect(() => {
    if (pendingActions.length === 0 || isSyncing) {
      setTimeLeft(30);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingActions.length, isSyncing]);

  // Handle when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0) {
      const triggerAutoSync = async () => {
        try {
          if (hasFailedActions && ownerAndShop?.ownerId && ownerAndShop?.shopId) {
            await resetFailedOwnerActions(ownerAndShop.ownerId, ownerAndShop.shopId);
          }
          await syncPendingOperations();
        } catch (err) {
          console.error('[OwnerSyncStatus] Auto retry failed:', err);
        } finally {
          setTimeLeft(30);
        }
      };
      triggerAutoSync();
    }
  }, [timeLeft, hasFailedActions, ownerAndShop, syncPendingOperations]);

  const handleManualSync = async () => {
    if (isOffline) return;
    try {
      await syncPendingOperations();
    } catch (err) {
      console.error('[OwnerSyncStatus] Manual sync trigger failed:', err);
    }
  };

  const handleForceSync = async () => {
    if (isOffline || !ownerAndShop?.ownerId || !ownerAndShop?.shopId) return;
    try {
      await resetFailedOwnerActions(ownerAndShop.ownerId, ownerAndShop.shopId);
      await syncPendingOperations();
    } catch (err) {
      console.error('[OwnerSyncStatus] Force sync failed:', err);
    }
  };

  return (
    <div className={`p-3.5 rounded-xl border ${colorClass} transition-all duration-200`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-xs font-semibold truncate leading-none">
            {label}
          </span>
        </div>
        
        {isOnline && pendingActions.length > 0 && !isSyncing && (
          <button
            onClick={hasFailedActions ? handleForceSync : handleManualSync}
            className={`text-[10px] px-2 py-1 rounded font-bold transition-all cursor-pointer whitespace-nowrap leading-none border ${
              hasFailedActions
                ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title={hasFailedActions ? "Clear failure flags and retry sync" : "Sync actions now"}
          >
            {hasFailedActions ? 'Force Sync' : 'Sync Now'}
          </button>
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
        {subtext}
      </p>

      {pendingActions.length > 0 && !isSyncing && (
        <div id="sync-retry-progress-container" className="mt-2.5 pt-2 border-t border-slate-200/40 dark:border-white/10 animate-fade-in">
          <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1 font-medium">
            <span>Next retry attempt</span>
            <span className="font-semibold tabular-nums">{timeLeft}s remaining</span>
          </div>
          <div className="w-full h-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
            <div
              id="sync-retry-progress-bar"
              className={`h-full transition-all duration-1000 ease-linear ${
                isOffline
                  ? 'bg-amber-500'
                  : hasFailedActions
                  ? 'bg-rose-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
