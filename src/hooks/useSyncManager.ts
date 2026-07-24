import { useState, useEffect, useCallback } from 'react';
import { syncPendingShopUpdates } from '../services/shopUpdateSyncService';
import { syncOwnerPendingActions } from '../lib/ownerPendingActionQueue';
import { getActiveOwnerAndShopIds } from '../lib/ownerDashboardRepository';

export interface SyncManagerResult {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  syncPendingOperations: () => Promise<void>;
}

export function useSyncManager(): SyncManagerResult {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncPendingOperations = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Sync shop updates
      await syncPendingShopUpdates();

      // 2. Non-blocking sync for owner pending preferences queue
      try {
        const { ownerId, shopId } = await getActiveOwnerAndShopIds();
        if (ownerId && shopId) {
          await syncOwnerPendingActions(ownerId, shopId);
        }
      } catch (err) {
        console.warn('[useSyncManager] Non-blocking owner preferences sync failed:', err);
      }

      setLastSyncTime(Date.now());
    } catch (err) {
      console.error('Failed to process pending IndexedDB operations:', err);
      setSyncError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      syncPendingOperations();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingOperations]);

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    syncPendingOperations
  };
}
