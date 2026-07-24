import { saveOwnerCache, getOwnerCache } from './ownerOfflineDb';
import { getOwnerDashboardData } from './ownerDashboardRepository';

export async function testDashboardCacheProcess(): Promise<{
  success: boolean;
  logs: string[];
}> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[DashboardCacheTest] ${msg}`);
  };

  try {
    log('Starting Step 6 Owner Dashboard Cache & Isolation Tests...');

    const ownerA = 'owner_alpha_666';
    const shopA = 'shop_alpha_666';

    const ownerB = 'owner_beta_777';
    const shopB = 'shop_beta_777';

    // 1. Test Online Load and Cache Saving
    log('Test 1: Online Load & Cache Persistence for Owner A...');
    const resultOnlineA = await getOwnerDashboardData(ownerA, shopA, false);

    if (resultOnlineA.source !== 'network' || !resultOnlineA.data) {
      throw new Error(`Test 1 Failed: Expected network source, got ${resultOnlineA.source}`);
    }
    log('✅ Test 1 Passed: Online dashboard data loaded and saved to owner_dashboard_cache.');

    // 2. Test Offline Read-Only Fallback
    log('Test 2: Offline Fallback Retrieval for Owner A...');
    const resultOfflineA = await getOwnerDashboardData(ownerA, shopA, true);

    if (resultOfflineA.source !== 'cache' || !resultOfflineA.data) {
      throw new Error(`Test 2 Failed: Expected cache source, got ${resultOfflineA.source}`);
    }
    if (resultOfflineA.data.shopName !== resultOnlineA.data.shopName) {
      throw new Error('Test 2 Failed: Cached dashboard content mismatch.');
    }
    log('✅ Test 2 Passed: Offline read-only dashboard fallback retrieved accurately.');

    // 3. Test Freshness Calculation (<1hr = fresh, >1hr = stale)
    log('Test 3: Freshness & Stale Calculation...');
    const oldDate = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago
    await saveOwnerCache('owner_dashboard_cache', {
      id: `${ownerA}:${shopA}:dashboard`,
      ownerId: ownerA,
      shopId: shopA,
      data: resultOnlineA.data,
      cachedAt: oldDate,
      updatedAt: oldDate
    });

    const resultStale = await getOwnerDashboardData(ownerA, shopA, true);
    if (!resultStale.isStale) {
      throw new Error('Test 3 Failed: 2-hour-old cache was not flagged as stale.');
    }
    log('✅ Test 3 Passed: Stale cache (>1 hour) correctly identified.');

    // 4. Test Owner & Shop Isolation
    log('Test 4: Owner & Shop Isolation Verification...');
    const resultOwnerB = await getOwnerDashboardData(ownerB, shopB, true);
    if (resultOwnerB.source !== 'none') {
      throw new Error('Test 4 Failed: Owner B accessed Owner A cached dashboard data!');
    }
    log('✅ Test 4 Passed: Owner B cannot view Owner A cached dashboard.');

    // 5. Test No Cache State
    log('Test 5: No Cache Offline State...');
    const unseededOwner = 'owner_ghost_999';
    const unseededShop = 'shop_ghost_999';
    const noCacheResult = await getOwnerDashboardData(unseededOwner, unseededShop, true);

    if (noCacheResult.source !== 'none' || noCacheResult.data !== null) {
      throw new Error('Test 5 Failed: Expected source "none" for unseeded offline query.');
    }
    log('✅ Test 5 Passed: No cache state correctly returned for offline query without cache.');

    // Cleanup test records
    const db = await (await import('./ownerOfflineDb')).getOwnerOfflineDB();
    await db.delete('owner_dashboard_cache', `${ownerA}:${shopA}:dashboard`);

    log('All Step 6 Dashboard Cache tests completed successfully! 🎉');
    return { success: true, logs };
  } catch (err: any) {
    log(`❌ Test failed with error: ${err?.message || err}`);
    return { success: false, logs };
  }
}
