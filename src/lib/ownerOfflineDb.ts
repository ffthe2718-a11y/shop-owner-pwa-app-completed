import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type {
  OwnerOfflineRecord,
  OwnerPendingAction,
  OwnerSyncMetadata,
  OwnerStoreName
} from '../types/ownerOffline';

const DB_NAME = 'nexora-owner-offline-db';
const DB_VERSION = 2;

export const OWNER_STORES: OwnerStoreName[] = [
  'owner_dashboard_cache',
  'owner_bookings_cache',
  'owner_services_cache',
  'owner_staff_cache',
  'owner_customers_cache',
  'owner_profile_cache',
  'owner_booking_drafts',
  'owner_pending_actions',
  'owner_sync_metadata',
  'owner_website_cache'
];

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getOwnerOfflineDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only supported in browser environments.');
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        OWNER_STORES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('by_owner', 'ownerId', { unique: false });
            store.createIndex('by_shop', 'shopId', { unique: false });
            store.createIndex('by_owner_shop', ['ownerId', 'shopId'], { unique: false });
          }
        });
      }
    });
  }

  return dbPromise;
}

/**
 * Save or update a generic cached record in an owner store.
 * Validates presence of ownerId and shopId.
 */
export async function saveOwnerCache<T = any>(
  storeName: OwnerStoreName,
  record: OwnerOfflineRecord<T>
): Promise<string> {
  if (!record.ownerId || !record.shopId) {
    throw new Error('Owner data isolation violation: record must contain both ownerId and shopId.');
  }

  try {
    const db = await getOwnerOfflineDB();
    await db.put(storeName, record);
    return record.id;
  } catch (err) {
    console.error(`Failed to save cache record to store ${storeName}:`, err);
    throw err;
  }
}

/**
 * Get a single cached record by ID with strict owner & shop isolation verification.
 */
export async function getOwnerCache<T = any>(
  storeName: OwnerStoreName,
  id: string,
  ownerId: string,
  shopId: string
): Promise<OwnerOfflineRecord<T> | null> {
  if (!ownerId || !shopId) return null;

  try {
    const db = await getOwnerOfflineDB();
    const record: OwnerOfflineRecord<T> | undefined = await db.get(storeName, id);

    if (!record) return null;

    // Strict Owner & Shop Isolation
    if (record.ownerId === ownerId && record.shopId === shopId) {
      return record;
    }

    return null;
  } catch (err) {
    console.error(`Failed to get cache record ${id} from ${storeName}:`, err);
    return null;
  }
}

/**
 * Get all cached records for a specific store filtered strictly by current ownerId and shopId.
 */
export async function getAllOwnerCache<T = any>(
  storeName: OwnerStoreName,
  ownerId: string,
  shopId: string
): Promise<OwnerOfflineRecord<T>[]> {
  if (!ownerId || !shopId) return [];

  try {
    const db = await getOwnerOfflineDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('by_owner_shop');

    const results: OwnerOfflineRecord<T>[] = await index.getAll([ownerId, shopId]);

    // Safety verification check
    return results.filter((r) => r.ownerId === ownerId && r.shopId === shopId);
  } catch (err) {
    console.error(`Failed to get all cache records from ${storeName}:`, err);
    return [];
  }
}

/**
 * Delete a single cached record after verifying owner and shop ownership.
 */
export async function deleteOwnerCache(
  storeName: OwnerStoreName,
  id: string,
  ownerId: string,
  shopId: string
): Promise<boolean> {
  if (!ownerId || !shopId) return false;

  try {
    const record = await getOwnerCache(storeName, id, ownerId, shopId);
    if (!record) return false;

    const db = await getOwnerOfflineDB();
    await db.delete(storeName, id);
    return true;
  } catch (err) {
    console.error(`Failed to delete cache record ${id} from ${storeName}:`, err);
    return false;
  }
}

/**
 * Clear all records in a store belonging strictly to a specific owner and shop.
 */
export async function clearOwnerStore(
  storeName: OwnerStoreName,
  ownerId: string,
  shopId?: string
): Promise<number> {
  if (!ownerId) return 0;

  try {
    const db = await getOwnerOfflineDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    let records: any[] = [];
    if (shopId) {
      const index = store.index('by_owner_shop');
      records = await index.getAll([ownerId, shopId]);
    } else {
      const index = store.index('by_owner');
      records = await index.getAll(ownerId);
    }

    let deletedCount = 0;
    for (const record of records) {
      if (record.ownerId === ownerId && (!shopId || record.shopId === shopId)) {
        await store.delete(record.id);
        deletedCount++;
      }
    }

    await tx.done;
    return deletedCount;
  } catch (err) {
    console.error(`Failed to clear owner store ${storeName}:`, err);
    return 0;
  }
}

/**
 * Helper for logout cleanup: safely removes all private offline data belonging to a specific logged-out owner.
 */
export async function clearOwnerOfflineData(ownerId: string): Promise<{ [key in OwnerStoreName]?: number }> {
  if (!ownerId) return {};

  const summary: { [key in OwnerStoreName]?: number } = {};

  for (const storeName of OWNER_STORES) {
    try {
      const count = await clearOwnerStore(storeName, ownerId);
      summary[storeName] = count;
    } catch (err) {
      console.error(`Failed cleanup for store ${storeName} and owner ${ownerId}:`, err);
    }
  }

  return summary;
}

/**
 * Save a pending owner action for offline queueing.
 */
export async function savePendingOwnerAction(action: OwnerPendingAction): Promise<string> {
  if (!action.ownerId || !action.shopId) {
    throw new Error('Owner data isolation violation: action must include ownerId and shopId.');
  }

  try {
    const db = await getOwnerOfflineDB();
    await db.put('owner_pending_actions', action);
    return action.id;
  } catch (err) {
    console.error('Failed to save pending owner action:', err);
    throw err;
  }
}

/**
 * Get pending actions for current owner and shop.
 */
export async function getPendingOwnerActions(
  ownerId: string,
  shopId?: string
): Promise<OwnerPendingAction[]> {
  if (!ownerId) return [];

  try {
    const db = await getOwnerOfflineDB();
    const tx = db.transaction('owner_pending_actions', 'readonly');
    const store = tx.objectStore('owner_pending_actions');

    let actions: OwnerPendingAction[] = [];
    if (shopId) {
      const index = store.index('by_owner_shop');
      actions = await index.getAll([ownerId, shopId]);
    } else {
      const index = store.index('by_owner');
      actions = await index.getAll(ownerId);
    }

    return actions.filter((a) => a.ownerId === ownerId && (!shopId || a.shopId === shopId));
  } catch (err) {
    console.error('Failed to get pending owner actions:', err);
    return [];
  }
}

/**
 * Delete a specific pending action after owner validation.
 */
export async function deletePendingOwnerAction(id: string, ownerId: string): Promise<boolean> {
  if (!ownerId) return false;

  try {
    const db = await getOwnerOfflineDB();
    const action: OwnerPendingAction | undefined = await db.get('owner_pending_actions', id);

    if (action && action.ownerId === ownerId) {
      await db.delete('owner_pending_actions', id);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to delete pending action ${id}:`, err);
    return false;
  }
}

/**
 * Save or update sync metadata for owner.
 */
export async function saveOwnerSyncMetadata(metadata: OwnerSyncMetadata): Promise<string> {
  if (!metadata.ownerId || !metadata.shopId) {
    throw new Error('Owner data isolation violation: sync metadata requires ownerId and shopId.');
  }

  try {
    const db = await getOwnerOfflineDB();
    await db.put('owner_sync_metadata', metadata);
    return metadata.id;
  } catch (err) {
    console.error('Failed to save sync metadata:', err);
    throw err;
  }
}

/**
 * Get sync metadata for owner & shop.
 */
export async function getOwnerSyncMetadata(
  ownerId: string,
  shopId: string
): Promise<OwnerSyncMetadata | null> {
  if (!ownerId || !shopId) return null;

  try {
    const record = await getOwnerCache<OwnerSyncMetadata>(
      'owner_sync_metadata',
      `${ownerId}_${shopId}`,
      ownerId,
      shopId
    );

    if (record) {
      return record.data;
    }
    return null;
  } catch (err) {
    console.error('Failed to get sync metadata:', err);
    return null;
  }
}

/**
 * Development-only test suite to verify store creation, owner data isolation, and cleanup logic.
 */
export async function testOwnerOfflineDb(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];

  try {
    log.push('Starting Owner Offline DB Test Suite...');

    const ownerA = 'owner_A_test_123';
    const ownerB = 'owner_B_test_456';
    const shop1 = 'shop_1_test_789';

    // 1. Save sample record for Owner A
    const sampleRecordA: OwnerOfflineRecord = {
      id: 'dashboard_test_record_1',
      ownerId: ownerA,
      shopId: shop1,
      data: { revenue: 1500, appointmentsCount: 5 },
      cachedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveOwnerCache('owner_dashboard_cache', sampleRecordA);
    log.push('1. Saved record for Owner A successfully.');

    // 2. Read record with correct Owner A
    const retrievedA = await getOwnerCache('owner_dashboard_cache', sampleRecordA.id, ownerA, shop1);
    if (!retrievedA || retrievedA.data.revenue !== 1500) {
      throw new Error('Test failed: Could not retrieve record for Owner A.');
    }
    log.push('2. Verified retrieval for Owner A.');

    // 3. Verify Owner B cannot access Owner A record
    const retrievedB = await getOwnerCache('owner_dashboard_cache', sampleRecordA.id, ownerB, shop1);
    if (retrievedB !== null) {
      throw new Error('Isolation failed: Owner B was able to access Owner A record.');
    }
    log.push('3. Owner isolation verified: Owner B blocked from Owner A data.');

    // 4. Update record
    sampleRecordA.data.revenue = 2000;
    await saveOwnerCache('owner_dashboard_cache', sampleRecordA);
    const updatedA = await getOwnerCache('owner_dashboard_cache', sampleRecordA.id, ownerA, shop1);
    if (!updatedA || updatedA.data.revenue !== 2000) {
      throw new Error('Update test failed.');
    }
    log.push('4. Record update verified.');

    // 5. Test pending action save & retrieval
    const pendingActionA: OwnerPendingAction = {
      id: 'action_test_1',
      ownerId: ownerA,
      shopId: shop1,
      actionType: 'owner_ui_preference_update',
      payload: { theme: 'dark' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
      idempotencyKey: 'key_123'
    };
    await savePendingOwnerAction(pendingActionA);
    const actionsA = await getPendingOwnerActions(ownerA, shop1);
    const actionsB = await getPendingOwnerActions(ownerB, shop1);
    if (actionsA.length !== 1 || actionsB.length !== 0) {
      throw new Error('Pending action isolation test failed.');
    }
    log.push('5. Pending action save & owner isolation verified.');

    // 6. Cleanup Owner A
    await clearOwnerOfflineData(ownerA);
    const clearedA = await getOwnerCache('owner_dashboard_cache', sampleRecordA.id, ownerA, shop1);
    if (clearedA !== null) {
      throw new Error('Cleanup failed: Owner A data still exists.');
    }
    log.push('6. Owner A cleanup verified.');

    log.push('All tests passed successfully!');
    return { success: true, log };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    log.push(`Test suite failed with error: ${errorMsg}`);
    console.error('Owner Offline DB Test Failed:', err);
    return { success: false, log };
  }
}
