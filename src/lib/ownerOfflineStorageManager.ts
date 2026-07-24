import { getOwnerOfflineDB, OWNER_STORES, getPendingOwnerActions, deletePendingOwnerAction } from './ownerOfflineDb';

export interface StorageEstimate {
  usage: number;
  quota: number;
  usageDetails: Record<string, number>;
}

export async function getOwnerOfflineStorageEstimate(): Promise<StorageEstimate> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageDetails: estimate.usageDetails || {}
      };
    } catch (e) {
      console.warn('[OfflineStorageManager] Storage estimation failed', e);
    }
  }
  return { usage: 0, quota: 0, usageDetails: {} };
}

export async function getOwnerIndexedDbUsageSummary(ownerId: string, shopId: string): Promise<Record<string, number>> {
  const summary: Record<string, number> = {};
  if (!ownerId) return summary;

  try {
    const db = await getOwnerOfflineDB();
    for (const storeName of OWNER_STORES) {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        let count = 0;
        
        if (store.indexNames.contains('by_owner_shop')) {
          const index = store.index('by_owner_shop');
          if (shopId) {
            count = await index.count([ownerId, shopId]);
          } else {
            // Count all for this owner if no shopId is provided or if by_owner_shop only supports arrays
            // Just get all for owner via fallback if needed
            const indexOwner = store.indexNames.contains('by_owner') ? store.index('by_owner') : store;
            if (store.indexNames.contains('by_owner')) {
               count = await store.index('by_owner').count(ownerId);
            } else {
               const all = await store.getAll();
               count = all.filter(r => r.ownerId === ownerId).length;
            }
          }
        } else if (store.indexNames.contains('by_owner')) {
          const index = store.index('by_owner');
          const records = await index.getAll(ownerId);
          count = records.filter(r => !r.shopId || !shopId || r.shopId === shopId).length;
        } else {
          const records = await store.getAll();
          count = records.filter(r => r.ownerId === ownerId && (!r.shopId || !shopId || r.shopId === shopId)).length;
        }
        
        summary[storeName] = count;
      } catch (e) {
        console.warn(`[OfflineStorageManager] Could not get count for store ${storeName}`, e);
        summary[storeName] = 0;
      }
    }
  } catch (err) {
    console.error('[OfflineStorageManager] Failed to get IndexedDB summary', err);
  }
  return summary;
}

export async function getOwnerCacheStorageSummary(): Promise<Record<string, number>> {
  const summary: Record<string, number> = {};
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes('nexora')) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          summary[name] = keys.length;
        }
      }
    } catch (e) {
      console.warn('[OfflineStorageManager] Failed to get cache storage summary', e);
    }
  }
  return summary;
}

export async function cleanupExpiredOwnerCache(ownerId: string, shopId: string): Promise<number> {
  let cleanedCount = 0;
  if (!ownerId) return cleanedCount;
  
  try {
    const db = await getOwnerOfflineDB();
    const now = Date.now();
    // Use a 7-day TTL for general cache data
    const TTL_MS = 7 * 24 * 60 * 60 * 1000;
    
    for (const storeName of OWNER_STORES) {
      // Don't arbitrarily delete pending actions, metadata, wallet, bookings or customer cache
      if (
        storeName === 'owner_pending_actions' || 
        storeName === 'owner_sync_metadata' ||
        storeName === 'owner_wallet_cache' ||
        storeName === 'owner_bookings_cache' ||
        storeName === 'owner_customers_cache'
      ) {
        continue;
      }
      
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let records: any[] = [];
        
        if (store.indexNames.contains('by_owner_shop') && shopId) {
          const index = store.index('by_owner_shop');
          records = await index.getAll([ownerId, shopId]);
        } else if (store.indexNames.contains('by_owner')) {
          const index = store.index('by_owner');
          records = await index.getAll(ownerId);
        } else {
          records = await store.getAll();
        }

        for (const record of records) {
          if (record.ownerId === ownerId && (!record.shopId || !shopId || record.shopId === shopId)) {
            const cachedTime = new Date(record.cachedAt || record.updatedAt || Date.now()).getTime();
            if (now - cachedTime > TTL_MS) {
              await store.delete(record.id);
              cleanedCount++;
            }
          }
        }
        await tx.done;
      } catch (e) {
        console.warn(`[OfflineStorageManager] Failed to cleanup expired cache in ${storeName}`, e);
      }
    }
  } catch (err) {
    console.error('[OfflineStorageManager] Failed to cleanup expired owner cache', err);
  }
  return cleanedCount;
}

export async function cleanupOldPreferenceSyncHistory(ownerId: string, shopId: string): Promise<number> {
  if (typeof window === 'undefined' || !ownerId) return 0;
  
  let cleanedCount = 0;
  try {
    const successKey = 'preference_sync_success_logs';
    const savedSuccess = localStorage.getItem(successKey);
    if (savedSuccess) {
      let logs = JSON.parse(savedSuccess);
      const originalLen = logs.length;
      
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      logs = logs.filter((log: any) => {
        if (log.ownerId === ownerId && (!shopId || log.shopId === shopId)) {
          if (now - new Date(log.timestamp).getTime() > thirtyDays) {
            return false;
          }
        }
        return true;
      });
      cleanedCount += (originalLen - logs.length);
      localStorage.setItem(successKey, JSON.stringify(logs));
    }
  } catch(e) {
    console.error('[OfflineStorageManager] Failed to cleanup old sync success history', e);
  }
  return cleanedCount;
}

export async function cleanupFailedPreferenceActions(ownerId: string, shopId: string): Promise<number> {
  if (typeof window === 'undefined' || !ownerId) return 0;
  let cleanedCount = 0;
  
  try {
    // 1. Clear from localStorage failed logs
    const failureKey = 'preference_sync_failure_logs';
    const savedFailure = localStorage.getItem(failureKey);
    if (savedFailure) {
      let logs = JSON.parse(savedFailure);
      const originalLen = logs.length;
      
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      logs = logs.filter((log: any) => {
        if (log.ownerId === ownerId && (!shopId || log.shopId === shopId)) {
            // Delete if failed 3 times and older than 7 days
            if (log.retryCount >= 3 && (now - new Date(log.timestamp).getTime() > sevenDays)) {
                return false;
            }
        }
        return true;
      });
      cleanedCount += (originalLen - logs.length);
      localStorage.setItem(failureKey, JSON.stringify(logs));
    }
    
    // 2. Remove permanently failed actions from IndexedDB
    const pendingActions = await getPendingOwnerActions(ownerId, shopId);
    for (const action of pendingActions) {
      // Delete if failed 3 times and older than 7 days
      const createdAt = new Date(action.createdAt).getTime();
      if (action.status === 'failed' && action.retryCount >= 3 && (Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000)) {
        await deletePendingOwnerAction(action.id, ownerId);
        cleanedCount++;
      }
    }
    
  } catch(e) {
    console.error('[OfflineStorageManager] Failed to cleanup failed preference actions', e);
  }
  
  return cleanedCount;
}

export async function clearOwnerShopCache(ownerId: string, shopId: string): Promise<number> {
  let cleanedCount = 0;
  if (!ownerId || !shopId) return 0;
  try {
    const db = await getOwnerOfflineDB();
    for (const storeName of OWNER_STORES) {
      if (storeName === 'owner_pending_actions' || storeName === 'owner_sync_metadata' || storeName === 'owner_booking_drafts') {
        continue;
      }
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let records: any[] = [];
        if (store.indexNames.contains('by_owner_shop')) {
          const index = store.index('by_owner_shop');
          records = await index.getAll([ownerId, shopId]);
        } else if (store.indexNames.contains('by_owner')) {
          const index = store.index('by_owner');
          records = await index.getAll(ownerId);
        } else {
          records = await store.getAll();
        }

        for (const record of records) {
          if (record.ownerId === ownerId && (!record.shopId || record.shopId === shopId)) {
            await store.delete(record.id);
            cleanedCount++;
          }
        }
        await tx.done;
      } catch (e) {
        console.warn(`[OfflineStorageManager] Failed to clear store ${storeName}`, e);
      }
    }

    // Explicitly clear pending actions and sync metadata for owner/shop
    const pendingActions = await getPendingOwnerActions(ownerId, shopId);
    for (const action of pendingActions) {
      await deletePendingOwnerAction(action.id, ownerId);
      cleanedCount++;
    }
    // Metadata usually keyed by owner_shop, check clearOwnerStore logic if it exists
    await clearOwnerStore('owner_sync_metadata', ownerId, shopId);
    cleanedCount++; // Simple count increment for metadata clear

    // Preference sync history
    const successKey = 'preference_sync_success_logs';
    const failureKey = 'preference_sync_failure_logs';
    
    [successKey, failureKey].forEach(key => {
        const saved = localStorage.getItem(key);
        if (saved) {
            let logs = JSON.parse(saved);
            const originalLen = logs.length;
            logs = logs.filter((log: any) => !(log.ownerId === ownerId && log.shopId === shopId));
            cleanedCount += (originalLen - logs.length);
            localStorage.setItem(key, JSON.stringify(logs));
        }
    });

  } catch (err) {
    console.error('[OfflineStorageManager] Failed to clear owner shop cache', err);
  }
  return cleanedCount;
}
