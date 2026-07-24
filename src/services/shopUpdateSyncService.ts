import { openOfflineDB, type PendingShopUpdate } from '../lib/offlineDb';
import { api } from '../lib/api';

export type { PendingShopUpdate };

const STORE_NAME = 'pendingShopUpdates';

/**
 * Save a pending shop update request to IndexedDB when offline.
 */
export async function savePendingShopUpdate(params: {
  payload: Record<string, any>;
  updateType?: string;
  shopId?: string;
}): Promise<number> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const newItem: PendingShopUpdate = {
      shopId: params.shopId || '22222222-2222-2222-2222-222222222222',
      updateType: params.updateType || 'general',
      payload: params.payload,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    const request = store.add(newItem);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const generatedId = request.result as number;
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('pending-shop-updates-changed'));
        resolve(generatedId);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save pending shop update to IndexedDB:', err);
    throw err;
  }
}

/**
 * Retrieve all pending shop update requests from IndexedDB.
 */
export async function getPendingShopUpdates(): Promise<PendingShopUpdate[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve pending shop updates from IndexedDB:', err);
    return [];
  }
}

/**
 * Get count of pending shop update requests stored in IndexedDB.
 */
export async function getPendingShopUpdateCount(): Promise<number> {
  try {
    const items = await getPendingShopUpdates();
    return items.length;
  } catch {
    return 0;
  }
}

/**
 * Remove a single pending shop update request by ID after synchronization.
 */
export async function removePendingShopUpdate(id: number): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('pending-shop-updates-changed'));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to delete pending shop update ${id}:`, err);
  }
}

/**
 * Clear all pending shop update requests from IndexedDB.
 */
export async function clearPendingShopUpdates(): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('pending-shop-updates-changed'));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to clear pending shop updates from IndexedDB:', err);
  }
}

/**
 * Synchronization mechanism that reads all pending shop updates from IndexedDB
 * and sends them to the backend / Supabase service.
 */
export async function syncPendingShopUpdates(): Promise<{
  syncedCount: number;
  failedCount: number;
  remainingCount: number;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const count = await getPendingShopUpdateCount();
    return { syncedCount: 0, failedCount: 0, remainingCount: count };
  }

  const pendingUpdates = await getPendingShopUpdates();

  if (pendingUpdates.length === 0) {
    return { syncedCount: 0, failedCount: 0, remainingCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pendingUpdates) {
    if (!item.id) continue;

    try {
      // Execute the sync request via the API service layer
      await api.updateShop(item.payload);

      // On successful sync, remove item from IndexedDB
      await removePendingShopUpdate(item.id);
      syncedCount++;
    } catch (err) {
      console.warn(`Failed to sync shop update record ID ${item.id}:`, err);
      failedCount++;
    }
  }

  const remainingCount = await getPendingShopUpdateCount();

  // Notify the app of completed sync
  window.dispatchEvent(
    new CustomEvent('shop-updates-synced', {
      detail: { syncedCount, failedCount, remainingCount }
    })
  );

  return { syncedCount, failedCount, remainingCount };
}

/**
 * Smart wrapper function: attempts online API update directly, or queues request in IndexedDB if offline/failed.
 * CRITICAL: Do not queue critical updates (publishing, editing bookings/services/staff) if offline.
 */
export async function updateShopWithOfflineSupport(
  payload: Record<string, any>,
  updateType = 'general',
  isCritical = false
): Promise<{ status: 'synced' | 'queued' | 'error'; data?: any; message?: string }> {
  // Define critical update types that should NOT be queued
  const criticalTypes = ['publish', 'edit_booking', 'edit_service', 'edit_staff', 'edit_customer', 'update_profile', 'payout', 'refund'];
  
  if (isCritical || criticalTypes.includes(updateType)) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return {
            status: 'error',
            message: 'Critical actions cannot be performed offline. Please restore your network connection.'
        };
    }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const result = await api.updateShop(payload);
      return { status: 'synced', data: result };
    } catch (err) {
      console.warn('Online shop update failed, queuing request in IndexedDB:', err);
      // Only queue non-critical
      if (!isCritical && !criticalTypes.includes(updateType)) {
        await savePendingShopUpdate({ payload, updateType });
        return {
          status: 'queued',
          message: 'Network issue encountered. Request saved offline in IndexedDB and queued for sync.'
        };
      }
      return { status: 'error', message: 'Failed to update. Please try again.' };
    }
  } else {
    // Offline
    if (!isCritical && !criticalTypes.includes(updateType)) {
      await savePendingShopUpdate({ payload, updateType });
      return {
        status: 'queued',
        message: 'You are offline. Update stored in IndexedDB and queued for auto-sync.'
      };
    }
    return {
        status: 'error',
        message: 'You are offline. Critical actions require a network connection.'
    };
  }
}
