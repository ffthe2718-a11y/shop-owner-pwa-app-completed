import { saveOwnerCache } from './ownerOfflineDb';
import { getOwnerBookingsData } from './ownerBookingsRepository';
import type { Booking } from '../types';

export async function testBookingsCacheProcess(): Promise<{
  success: boolean;
  logs: string[];
}> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[BookingsCacheTest] ${msg}`);
  };

  try {
    log('Starting Step 7 Owner Bookings Cache & Isolation Tests...');

    const ownerA = 'owner_alpha_777';
    const shopA = 'shop_alpha_777';

    const ownerB = 'owner_beta_888';
    const shopB = 'shop_beta_888';

    // 1. Test Online Load and Cache Saving
    log('Test 1: Online Load & Cache Persistence for Owner A...');
    const resultOnlineA = await getOwnerBookingsData(ownerA, shopA, false);

    if (resultOnlineA.source !== 'network' || !resultOnlineA.data) {
      throw new Error(`Test 1 Failed: Expected network source, got ${resultOnlineA.source}`);
    }
    log(`✅ Test 1 Passed: Loaded ${resultOnlineA.data.length} bookings online and cached into owner_bookings_cache.`);

    // 2. Test Offline Read-Only Fallback
    log('Test 2: Offline Fallback Retrieval for Owner A...');
    const resultOfflineA = await getOwnerBookingsData(ownerA, shopA, true);

    if (resultOfflineA.source !== 'cache' || !resultOfflineA.data) {
      throw new Error(`Test 2 Failed: Expected cache source, got ${resultOfflineA.source}`);
    }
    if (resultOfflineA.data.length !== resultOnlineA.data.length) {
      throw new Error('Test 2 Failed: Cached bookings count mismatch.');
    }
    log('✅ Test 2 Passed: Offline read-only bookings retrieved accurately.');

    // 3. Test Freshness Calculation (<30 mins = fresh, >30 mins = stale)
    log('Test 3: Freshness & Stale Calculation...');
    const oldDate = new Date(Date.now() - 2400000).toISOString(); // 40 minutes ago
    await saveOwnerCache('owner_bookings_cache', {
      id: `${ownerA}:${shopA}:bookings`,
      ownerId: ownerA,
      shopId: shopA,
      data: resultOnlineA.data,
      cachedAt: oldDate,
      updatedAt: oldDate
    });

    const resultStale = await getOwnerBookingsData(ownerA, shopA, true);
    if (!resultStale.isStale) {
      throw new Error('Test 3 Failed: 40-minute-old cache was not flagged as stale.');
    }
    log('✅ Test 3 Passed: Stale cache (>30 minutes) correctly identified.');

    // 4. Test Owner & Shop Isolation
    log('Test 4: Owner & Shop Isolation Verification...');
    const resultOwnerB = await getOwnerBookingsData(ownerB, shopB, true);
    if (resultOwnerB.source !== 'none') {
      throw new Error('Test 4 Failed: Owner B accessed Owner A cached bookings!');
    }
    log('✅ Test 4 Passed: Owner B cannot view Owner A cached bookings.');

    // 5. Test No Cache State
    log('Test 5: No Cache Offline State...');
    const unseededOwner = 'owner_ghost_999';
    const unseededShop = 'shop_ghost_999';
    const noCacheResult = await getOwnerBookingsData(unseededOwner, unseededShop, true);

    if (noCacheResult.source !== 'none' || noCacheResult.data !== null) {
      throw new Error('Test 5 Failed: Expected source "none" for unseeded offline query.');
    }
    log('✅ Test 5 Passed: No cache state correctly returned for offline query without cache.');

    // Cleanup test records
    const db = await (await import('./ownerOfflineDb')).getOwnerOfflineDB();
    await db.delete('owner_bookings_cache', `${ownerA}:${shopA}:bookings`);

    log('All Step 7 Bookings Cache tests completed successfully! 🎉');
    return { success: true, logs };
  } catch (err: any) {
    log(`❌ Test failed with error: ${err?.message || err}`);
    return { success: false, logs };
  }
}
