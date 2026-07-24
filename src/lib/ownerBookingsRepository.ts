import { saveOwnerCache, getOwnerCache, getOwnerOfflineDB } from './ownerOfflineDb';
import type { Booking } from '../types';
import type { OwnerBookingsState } from '../types/ownerBookings';
import { api } from './api';
import { getActiveOwnerAndShopIds } from './ownerDashboardRepository';

const BOOKINGS_FRESHNESS_THRESHOLD_MS = 1800000; // 30 minutes

export { getActiveOwnerAndShopIds };

/**
 * Get cached bookings from IndexedDB for a given owner and shop
 */
export async function getBookingsCache(
  ownerId: string,
  shopId: string
) {
  const cacheKey = `${ownerId}:${shopId}:bookings`;
  return await getOwnerCache<Booking[]>(
    'owner_bookings_cache',
    cacheKey,
    ownerId,
    shopId
  );
}

/**
 * Save bookings array to IndexedDB cache
 */
export async function saveBookingsCache(
  ownerId: string,
  shopId: string,
  bookings: Booking[]
) {
  const cacheKey = `${ownerId}:${shopId}:bookings`;
  const nowIso = new Date().toISOString();
  await saveOwnerCache('owner_bookings_cache', {
    id: cacheKey,
    ownerId,
    shopId,
    data: bookings,
    cachedAt: nowIso,
    updatedAt: nowIso
  });
}

/**
 * Clear owner cached bookings record from IndexedDB
 */
export async function clearOwnerBookings(
  ownerId: string,
  shopId: string
) {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:bookings`;
  try {
    const db = await getOwnerOfflineDB();
    await db.delete('owner_bookings_cache', cacheKey);
  } catch (err) {
    console.error(`Failed to clear owner bookings cache for ${cacheKey}:`, err);
  }
}

/**
 * Delete cached bookings record for a given owner and shop
 */
export async function deleteBookingsCache(
  ownerId: string,
  shopId: string
) {
  await clearOwnerBookings(ownerId, shopId);
}

/**
 * Primary bookings loader with offline fallback and IndexedDB owner cache
 */
export async function getOwnerBookingsData(
  ownerId: string,
  shopId: string,
  forceOffline = false
): Promise<OwnerBookingsState> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine && !forceOffline;

  // 1. If online, attempt to fetch live appointments from API/Supabase
  if (isOnline) {
    try {
      const liveBookings = await api.getAppointments();

      // Guard: Ensure we got a valid array response before caching
      if (Array.isArray(liveBookings)) {
        await saveBookingsCache(ownerId, shopId, liveBookings as Booking[]);
        const nowIso = new Date().toISOString();

        return {
          data: liveBookings as Booking[],
          source: 'network',
          isStale: false,
          lastUpdated: nowIso,
          isLoading: false
        };
      }
    } catch (err) {
      console.warn('Network fetch for owner bookings failed. Falling back to cached data:', err);
      // Fall through to cache load without overwriting existing cache
    }
  }

  // 2. Offline or Network Fetch Failed -> Fall back to IndexedDB Cache
  try {
    const cachedRecord = await getBookingsCache(ownerId, shopId);

    if (cachedRecord && Array.isArray(cachedRecord.data)) {
      const cachedTime = new Date(cachedRecord.cachedAt).getTime();
      const ageMs = Date.now() - cachedTime;
      const isStale = ageMs > BOOKINGS_FRESHNESS_THRESHOLD_MS;

      return {
        data: cachedRecord.data,
        source: 'cache',
        isStale,
        lastUpdated: cachedRecord.cachedAt,
        isLoading: false
      };
    }
  } catch (cacheErr) {
    console.error('Error reading bookings cache from IndexedDB:', cacheErr);
  }

  // 3. Neither network nor cache available
  return {
    data: null,
    source: 'none',
    isStale: true,
    error: 'No saved bookings are available offline.',
    isLoading: false
  };
}
