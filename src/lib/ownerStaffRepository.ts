import { saveOwnerCache, getOwnerCache, getOwnerOfflineDB } from './ownerOfflineDb';
import type { OwnerStaffState } from '../types/ownerStaff';
import { api } from './api';
import { getActiveOwnerAndShopIds } from './ownerDashboardRepository';

const STAFF_FRESHNESS_THRESHOLD_MS = 7200000; // 2 hours

export { getActiveOwnerAndShopIds };

/**
 * Get cached staff from IndexedDB for a given owner and shop
 */
export async function getStaffCache(
  ownerId: string,
  shopId: string
) {
  if (!ownerId || !shopId) return null;
  const cacheKey = `${ownerId}:${shopId}:staff`;
  return await getOwnerCache<any[]>(
    'owner_staff_cache',
    cacheKey,
    ownerId,
    shopId
  );
}

/**
 * Save staff array to IndexedDB cache
 */
export async function saveStaffCache(
  ownerId: string,
  shopId: string,
  staffList: any[]
) {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:staff`;
  const nowIso = new Date().toISOString();
  await saveOwnerCache('owner_staff_cache', {
    id: cacheKey,
    ownerId,
    shopId,
    data: staffList,
    cachedAt: nowIso,
    updatedAt: nowIso
  });
}

/**
 * Clear owner cached staff record from IndexedDB
 */
export async function clearOwnerStaff(
  ownerId: string,
  shopId: string
) {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:staff`;
  try {
    const db = await getOwnerOfflineDB();
    await db.delete('owner_staff_cache', cacheKey);
  } catch (err) {
    console.error(`Failed to clear owner staff cache for ${cacheKey}:`, err);
  }
}

/**
 * Delete cached staff record for a given owner and shop
 */
export async function deleteStaffCache(
  ownerId: string,
  shopId: string
) {
  await clearOwnerStaff(ownerId, shopId);
}

/**
 * Primary staff loader with offline fallback and IndexedDB owner cache
 */
export async function getOwnerStaffData(
  ownerId: string,
  shopId: string,
  forceOffline = false
): Promise<OwnerStaffState> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine && !forceOffline;

  // 1. If online, attempt to fetch live staff list from API
  if (isOnline) {
    try {
      const liveStaff = await api.getStaff();

      // Guard: Ensure we got a valid array response before caching
      if (Array.isArray(liveStaff)) {
        await saveStaffCache(ownerId, shopId, liveStaff);
        const nowIso = new Date().toISOString();

        return {
          data: liveStaff,
          source: 'network',
          isStale: false,
          lastUpdated: nowIso,
          isLoading: false
        };
      }
    } catch (err) {
      console.warn('Network fetch for owner staff failed. Falling back to cached data:', err);
      // Fall through to cache load without overwriting existing cache
    }
  }

  // 2. Offline or Network Fetch Failed -> Fall back to IndexedDB Cache
  try {
    const cachedRecord = await getStaffCache(ownerId, shopId);

    if (cachedRecord && Array.isArray(cachedRecord.data)) {
      const cachedTime = new Date(cachedRecord.cachedAt).getTime();
      const ageMs = Date.now() - cachedTime;
      const isStale = ageMs > STAFF_FRESHNESS_THRESHOLD_MS;

      return {
        data: cachedRecord.data,
        source: 'cache',
        isStale,
        lastUpdated: cachedRecord.cachedAt,
        isLoading: false
      };
    }
  } catch (cacheErr) {
    console.error('Error reading staff cache from IndexedDB:', cacheErr);
  }

  // 3. Neither network nor cache available
  return {
    data: null,
    source: 'none',
    isStale: true,
    error: 'No saved staff information is available offline.',
    isLoading: false
  };
}
