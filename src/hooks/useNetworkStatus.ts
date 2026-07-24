import { useState, useEffect } from 'react';
import { syncPendingShopUpdates } from '../services/shopUpdateSyncService';
import { ownerConnectionRefreshManager } from '../lib/ownerConnectionRefreshManager';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionRestored: boolean;
  restoredAt?: number;
}

let isOnlineStore = typeof navigator !== 'undefined' ? navigator.onLine : true;
let connectionRestoredStore = false;
let restoredAtStore: number | undefined = undefined;
let hasBeenOffline = false;

if (typeof navigator !== 'undefined' && !navigator.onLine) {
  hasBeenOffline = true;
}

const subscribers = new Set<(status: NetworkStatus) => void>();

function notifySubscribers() {
  const status: NetworkStatus = {
    isOnline: isOnlineStore,
    isOffline: !isOnlineStore,
    connectionRestored: connectionRestoredStore,
    restoredAt: restoredAtStore,
  };
  subscribers.forEach((callback) => callback(status));
}

let isGlobalSetup = false;
let globalTimerId: NodeJS.Timeout | null = null;

function setupGlobalListeners() {
  if (isGlobalSetup) return;
  isGlobalSetup = true;

  if (typeof window === 'undefined') return;

  const handleOnline = () => {
    isOnlineStore = true;
    
    if (hasBeenOffline) {
      connectionRestoredStore = true;
      restoredAtStore = Date.now();
      
      // Trigger verification and page-specific refresh on verified restoration
      ownerConnectionRefreshManager.triggerRefresh().catch((err) => {
        console.warn('Auto connection restore refresh failed:', err);
      });
    }

    // Automatically trigger sync when 'online' event is detected
    syncPendingShopUpdates().catch((err) => {
      console.warn('Automatic offline sync failed on reconnection:', err);
    });

    notifySubscribers();

    if (globalTimerId) clearTimeout(globalTimerId);
    globalTimerId = setTimeout(() => {
      connectionRestoredStore = false;
      notifySubscribers();
    }, 5000);
  };

  const handleOffline = () => {
    isOnlineStore = false;
    connectionRestoredStore = false;
    hasBeenOffline = true;
    if (globalTimerId) clearTimeout(globalTimerId);
    notifySubscribers();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    setupGlobalListeners();
    return {
      isOnline: isOnlineStore,
      isOffline: !isOnlineStore,
      connectionRestored: connectionRestoredStore,
      restoredAt: restoredAtStore,
    };
  });

  useEffect(() => {
    const callback = (newStatus: NetworkStatus) => {
      setStatus(newStatus);
    };
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  return status;
}
