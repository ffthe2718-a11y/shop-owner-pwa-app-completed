import { saveOwnerCache, getOwnerCache, getOwnerOfflineDB } from './ownerOfflineDb';
import type { OwnerCustomersState } from '../types/ownerCustomers';
import { api } from './api';
import { getActiveOwnerAndShopIds } from './ownerDashboardRepository';

const CUSTOMER_FRESHNESS_THRESHOLD_MS = 21600000; // 6 hours

export { getActiveOwnerAndShopIds };

/**
 * Get cached customers from IndexedDB for a given owner and shop
 */
export async function getCustomersCache(
  ownerId: string,
  shopId: string
) {
  if (!ownerId || !shopId) return null;
  const cacheKey = `${ownerId}:${shopId}:customers`;
  return await getOwnerCache<any[]>(
    'owner_customers_cache',
    cacheKey,
    ownerId,
    shopId
  );
}

/**
 * Save customer array to IndexedDB cache
 */
export async function saveCustomersCache(
  ownerId: string,
  shopId: string,
  customerList: any[]
) {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:customers`;
  const nowIso = new Date().toISOString();
  await saveOwnerCache('owner_customers_cache', {
    id: cacheKey,
    ownerId,
    shopId,
    data: customerList,
    cachedAt: nowIso,
    updatedAt: nowIso
  });
}

/**
 * Clear owner cached customers record from IndexedDB
 */
export async function clearOwnerCustomers(
  ownerId: string,
  shopId: string
) {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:customers`;
  try {
    const db = await getOwnerOfflineDB();
    await db.delete('owner_customers_cache', cacheKey);
  } catch (err) {
    console.error(`Failed to clear owner customers cache for ${cacheKey}:`, err);
  }
}

/**
 * Delete cached customers record for a given owner and shop
 */
export async function deleteCustomersCache(
  ownerId: string,
  shopId: string
) {
  await clearOwnerCustomers(ownerId, shopId);
}

/**
 * Primary customers loader with offline fallback and IndexedDB owner cache
 */
export async function getOwnerCustomersData(
  ownerId: string,
  shopId: string,
  forceOffline = false
): Promise<OwnerCustomersState> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine && !forceOffline;

  // 1. If online, attempt to fetch live customer list from API
  if (isOnline) {
    try {
      const liveCustomers = await api.getCustomers();

      // Guard: Ensure we got a valid array response before caching
      if (Array.isArray(liveCustomers)) {
        await saveCustomersCache(ownerId, shopId, liveCustomers);
        const nowIso = new Date().toISOString();

        return {
          data: liveCustomers,
          source: 'network',
          isStale: false,
          lastUpdated: nowIso,
          isLoading: false
        };
      }
    } catch (err) {
      console.warn('Network fetch for owner customers failed. Falling back to cached data:', err);
      // Fall through to cache load without overwriting existing cache
    }
  }

  // 2. Offline or Network Fetch Failed -> Fall back to IndexedDB Cache
  try {
    const cachedRecord = await getCustomersCache(ownerId, shopId);

    if (cachedRecord && Array.isArray(cachedRecord.data)) {
      const cachedTime = new Date(cachedRecord.cachedAt).getTime();
      const ageMs = Date.now() - cachedTime;
      const isStale = ageMs > CUSTOMER_FRESHNESS_THRESHOLD_MS;

      return {
        data: cachedRecord.data,
        source: 'cache',
        isStale,
        lastUpdated: cachedRecord.cachedAt,
        isLoading: false
      };
    }
  } catch (cacheErr) {
    console.error('Error reading customers cache from IndexedDB:', cacheErr);
  }

  // 3. Neither network nor cache available
  return {
    data: null,
    source: 'none',
    isStale: true,
    error: 'No saved customer information is available offline.',
    isLoading: false
  };
}
