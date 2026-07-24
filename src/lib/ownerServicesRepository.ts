import { saveOwnerCache, getOwnerCache, getOwnerOfflineDB } from './ownerOfflineDb';
import type { Service } from '../types';
import type { OwnerServicesState } from '../types/ownerServices';
import { api } from './api';
import { getActiveOwnerAndShopIds } from './ownerDashboardRepository';

const SERVICES_FRESHNESS_THRESHOLD_MS = 21600000; // 6 hours

export { getActiveOwnerAndShopIds };

/**
 * Get cached services from IndexedDB for a given owner and shop
 */
export async function getServicesCache(
  ownerId: string,
  shopId: string
) {
  if (!ownerId || !shopId) return null;
  const cacheKey = `${ownerId}:${shopId}:services`;
  return await getOwnerCache<Service[]>(
    'owner_services_cache',
    cacheKey,
    ownerId,
    shopId
  );
}

/**
 * Save services array to IndexedDB cache
 */
export async function saveServicesCache(
  ownerId: string,
  shopId: string,
  services: Service[]
) {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:services`;
  const nowIso = new Date().toISOString();
  await saveOwnerCache('owner_services_cache', {
    id: cacheKey,
    ownerId,
    shopId,
    data: services,
    cachedAt: nowIso,
    updatedAt: nowIso
  });
}

/**
 * Clear owner cached services record from IndexedDB
 */
export async function clearOwnerServices(
  ownerId: string,
  shopId: string
) {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:services`;
  try {
    const db = await getOwnerOfflineDB();
    await db.delete('owner_services_cache', cacheKey);
  } catch (err) {
    console.error(`Failed to clear owner services cache for ${cacheKey}:`, err);
  }
}

/**
 * Delete cached services record for a given owner and shop
 */
export async function deleteServicesCache(
  ownerId: string,
  shopId: string
) {
  await clearOwnerServices(ownerId, shopId);
}

/**
 * Primary services loader with offline fallback and IndexedDB owner cache
 */
export async function getOwnerServicesData(
  ownerId: string,
  shopId: string,
  forceOffline = false
): Promise<OwnerServicesState> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine && !forceOffline;

  // 1. If online, attempt to fetch live services from API
  if (isOnline) {
    try {
      const liveServices = await api.getServices();

      // Guard: Ensure we got a valid array response before caching
      if (Array.isArray(liveServices)) {
        await saveServicesCache(ownerId, shopId, liveServices as Service[]);
        const nowIso = new Date().toISOString();

        return {
          data: liveServices as Service[],
          source: 'network',
          isStale: false,
          lastUpdated: nowIso,
          isLoading: false
        };
      }
    } catch (err) {
      console.warn('Network fetch for owner services failed. Falling back to cached data:', err);
      // Fall through to cache load without overwriting existing cache
    }
  }

  // 2. Offline or Network Fetch Failed -> Fall back to IndexedDB Cache
  try {
    const cachedRecord = await getServicesCache(ownerId, shopId);

    if (cachedRecord && Array.isArray(cachedRecord.data)) {
      const cachedTime = new Date(cachedRecord.cachedAt).getTime();
      const ageMs = Date.now() - cachedTime;
      const isStale = ageMs > SERVICES_FRESHNESS_THRESHOLD_MS;

      return {
        data: cachedRecord.data,
        source: 'cache',
        isStale,
        lastUpdated: cachedRecord.cachedAt,
        isLoading: false
      };
    }
  } catch (cacheErr) {
    console.error('Error reading services cache from IndexedDB:', cacheErr);
  }

  // 3. Neither network nor cache available
  return {
    data: null,
    source: 'none',
    isStale: true,
    error: 'No saved services are available offline.',
    isLoading: false
  };
}
