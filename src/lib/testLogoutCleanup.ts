import { saveOwnerCache, getOwnerCache, clearOwnerOfflineData } from './ownerOfflineDb';
import { logoutOwner } from '../services/ownerAuthService';

/**
 * Verification utility for Step 5: Shop Owner Logout Offline Data Cleanup
 */
export async function testLogoutCleanupProcess(): Promise<{
  success: boolean;
  logs: string[];
}> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[LogoutCleanupTest] ${msg}`);
  };

  try {
    log('Starting Step 5 Logout Offline Data Cleanup Tests...');

    const ownerA = 'owner_alpha_111';
    const ownerB = 'owner_beta_222';
    const shopA = 'shop_alpha_111';
    const shopB = 'shop_beta_222';

    // 1. Seed IndexedDB with private offline records for Owner A and Owner B
    log('Seeding IndexedDB with private records for Owner A and Owner B...');
    
    await saveOwnerCache(ownerA, shopA, 'owner_dashboard_cache', {
      revenue: 15000,
      bookingsCount: 25,
      secretOwnerNotes: 'Owner A Private Financial Overview'
    });

    await saveOwnerCache(ownerA, shopA, 'owner_customers_cache', [
      { id: 'c1', name: 'Customer VIP A', phone: '9999911111' }
    ]);

    await saveOwnerCache(ownerB, shopB, 'owner_dashboard_cache', {
      revenue: 45000,
      bookingsCount: 80,
      secretOwnerNotes: 'Owner B Confidential Data'
    });

    await saveOwnerCache(ownerB, shopB, 'owner_customers_cache', [
      { id: 'c2', name: 'Customer VIP B', phone: '8888822222' }
    ]);

    // Verify initial state
    const ownerADashBefore = await getOwnerCache(ownerA, 'owner_dashboard_cache');
    const ownerBDashBefore = await getOwnerCache(ownerB, 'owner_dashboard_cache');

    if (!ownerADashBefore || !ownerBDashBefore) {
      throw new Error('Failed to seed initial IndexedDB records.');
    }
    log('Initial state confirmed: Owner A and Owner B both have cached data.');

    // 2. Perform Owner A Logout Cleanup
    log('Executing logout cleanup for Owner A...');
    await clearOwnerOfflineData(ownerA);

    // 3. Verify Scenario A: Owner A's cached data is cleared
    const ownerADashAfter = await getOwnerCache(ownerA, 'owner_dashboard_cache');
    const ownerACustAfter = await getOwnerCache(ownerA, 'owner_customers_cache');

    if (ownerADashAfter === null && ownerACustAfter === null) {
      log('✅ Scenario A Passed: Owner A private IndexedDB data successfully cleared upon logout.');
    } else {
      throw new Error('Scenario A Failed: Owner A data was not completely cleared.');
    }

    // 4. Verify Scenario B: Owner B's cached data remains intact
    const ownerBDashAfter = await getOwnerCache(ownerB, 'owner_dashboard_cache');
    const ownerBCustAfter = await getOwnerCache(ownerB, 'owner_customers_cache');

    if (ownerBDashAfter !== null && ownerBCustAfter !== null) {
      log('✅ Scenario B Passed: Owner B data is completely untouched and isolated.');
    } else {
      throw new Error('Scenario B Failed: Owner B data was inadvertently affected.');
    }

    // 5. Verify Scenario C: Account switching & Browser Back protection check
    // Ensure logoutOwner handles null/missing ownerId safely without clearing everything
    log('Testing logout handling with missing/null ownerId...');
    await logoutOwner({ ownerId: null });

    const ownerBDashAfterNullLogout = await getOwnerCache(ownerB, 'owner_dashboard_cache');
    if (ownerBDashAfterNullLogout !== null) {
      log('✅ Scenario C Passed: Null ownerId logout did not erase remaining database stores.');
    } else {
      throw new Error('Scenario C Failed: Null ownerId logout erased data across other owners.');
    }

    // Cleanup test data for Owner B
    await clearOwnerOfflineData(ownerB);

    log('All Step 5 Logout Offline Data Cleanup tests passed successfully! 🎉');
    return { success: true, logs };
  } catch (err: any) {
    log(`❌ Test failed with error: ${err?.message || err}`);
    return { success: false, logs };
  }
}
