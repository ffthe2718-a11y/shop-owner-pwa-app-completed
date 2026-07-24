import { useState, useEffect } from 'react';
import {
  getPendingShopUpdates,
  type PendingShopUpdate
} from '../services/shopUpdateSyncService';

export function usePendingShopUpdates() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingUpdates, setPendingUpdates] = useState<PendingShopUpdate[]>([]);

  const refreshPending = async () => {
    try {
      const items = await getPendingShopUpdates();
      setPendingUpdates(items);
      setPendingCount(items.length);
    } catch {
      setPendingUpdates([]);
      setPendingCount(0);
    }
  };

  useEffect(() => {
    refreshPending();

    const handleChanged = () => {
      refreshPending();
    };

    window.addEventListener('pending-shop-updates-changed', handleChanged);
    window.addEventListener('shop-updates-synced', handleChanged);

    return () => {
      window.removeEventListener('pending-shop-updates-changed', handleChanged);
      window.removeEventListener('shop-updates-synced', handleChanged);
    };
  }, []);

  return {
    pendingCount,
    pendingUpdates,
    refreshPending
  };
}
