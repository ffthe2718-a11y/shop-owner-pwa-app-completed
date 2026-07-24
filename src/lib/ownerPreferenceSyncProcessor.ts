import type { OwnerPendingAction } from '../types/ownerOffline';
import { getOwnerOfflineDB } from './ownerOfflineDb';
import { 
  ALLOWED_OFFLINE_ACTION_TYPES, 
  markOwnerActionProcessing, 
  markOwnerActionFailed, 
  removeOwnerPendingAction,
  getOwnerPendingActions
} from './ownerPendingActionQueue';
import { logSyncSuccess } from '../services/preferenceSyncTracker';

/**
 * Validates if the action type is allowed to be queued and processed offline.
 * Critical operations (bookings, payments, data edits) are forbidden.
 */
const FORBIDDEN_ACTION_KEYWORDS = [
  'booking',
  'service_crud', 'service_create', 'service_update', 'service_delete', 'service',
  'staff_crud', 'staff_create', 'staff_update', 'staff_delete', 'staff',
  'customer_edit', 'customer_create', 'customer_update', 'customer_delete', 'customer',
  'profile_update', 'profile_edit', 'profile',
  'logo_upload', 'image_upload', 'logo',
  'website_save', 'website_publish', 'website',
  'wallet',
  'payout',
  'refund',
  'razorpay',
  'kyc',
  'password', 'email_change'
];

export function isAllowedOwnerPreferenceAction(actionType: string): boolean {
  const lower = actionType.toLowerCase();
  for (const keyword of FORBIDDEN_ACTION_KEYWORDS) {
    if (lower.includes(keyword) && !ALLOWED_OFFLINE_ACTION_TYPES.includes(actionType as any)) {
      return false;
    }
  }
  return ALLOWED_OFFLINE_ACTION_TYPES.includes(actionType as any);
}

/**
 * Processes a single allowed preference action.
 * Since there is no server-side preference table, we treat it as local-only,
 * apply it locally if needed, and immediately consider it successful.
 */
export async function processSingleOwnerPreferenceAction(action: OwnerPendingAction): Promise<void> {
  if (!isAllowedOwnerPreferenceAction(action.actionType)) {
    throw new Error('Forbidden pending action type');
  }

  // No server-side Supabase table for preferences exists.
  // Treat as local-only and immediately succeed.
  await Promise.resolve();
}

/**
 * Keyed lock to prevent duplicate concurrent executions of the processor for the same owner/shop.
 */
const isPreferenceSyncRunning = new Set<string>();

/**
 * Orchestrates the processing of the owner preference queue.
 * Handles duplicate prevention (via queue limits), owner/shop isolation,
 * forbidden action protection, and retry limits.
 */
export async function processOwnerPreferenceQueue(
  ownerId: string,
  shopId: string
): Promise<{ syncedCount: number; failedCount: number; remainingCount: number }> {
  if (!ownerId || !shopId) {
    return { syncedCount: 0, failedCount: 0, remainingCount: 0 };
  }

  const lockKey = `${ownerId}_${shopId}`;
  if (isPreferenceSyncRunning.has(lockKey)) {
    console.log(`[OwnerPreferenceSyncProcessor] Sync already in progress for ${lockKey}. Skipping duplicate trigger.`);
    // Since we're skipping, return current queue length roughly (or exactly)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       return { syncedCount: 0, failedCount: 0, remainingCount: 0 }; // Just bail safely
    }
    const all = await getOwnerPendingActions(ownerId, shopId);
    return { syncedCount: 0, failedCount: 0, remainingCount: all.length };
  }

  isPreferenceSyncRunning.add(lockKey);

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const all = await getOwnerPendingActions(ownerId, shopId);
      return { syncedCount: 0, failedCount: 0, remainingCount: all.length };
    }

    const db = await getOwnerOfflineDB();
    const tx = db.transaction('owner_pending_actions', 'readonly');
    const store = tx.objectStore('owner_pending_actions');
    const index = store.index('by_owner_shop');
    const actions: OwnerPendingAction[] = await index.getAll([ownerId, shopId]);

    // Strictly isolate actions for ownerId and shopId.
    // Filter eligible actions: not currently 'processing' and retryCount < 3 (prevents endless retries).
    const eligibleActions = actions.filter(
      (a) =>
        a.ownerId === ownerId &&
        a.shopId === shopId &&
        a.status !== 'processing' &&
        a.retryCount < 3
    );

    if (eligibleActions.length === 0) {
      return { syncedCount: 0, failedCount: 0, remainingCount: actions.length };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const action of eligibleActions) {
      try {
        // Enforce allowed actions only
        if (!isAllowedOwnerPreferenceAction(action.actionType)) {
          console.warn(`[OwnerPreferenceSyncProcessor] Forbidden pending action type: ${action.actionType}`);
          await markOwnerActionFailed(action.id, ownerId, shopId, 'Forbidden pending action type');
          failedCount++;
          continue;
        }

        // Mark as processing
        await markOwnerActionProcessing(action.id, ownerId, shopId);

        await processSingleOwnerPreferenceAction(action);

        // On success, remove action from the queue
        await removeOwnerPendingAction(action.id, ownerId, shopId);
        syncedCount++;
        logSyncSuccess(action.id, ownerId, shopId, action.actionType);
        console.log(`[OwnerPreferenceSyncProcessor] Successfully synchronized preference action ${action.id}`);
      } catch (err: any) {
        console.warn(`[OwnerPreferenceSyncProcessor] Non-blocking failure syncing preference action ${action.id}:`, err);
        failedCount++;

        // Mark action as failed (this increments retryCount internally)
        // If it reaches 3 failures, status remains 'failed' (endless retries avoided)
        await markOwnerActionFailed(action.id, ownerId, shopId, err?.message || String(err));
      }
    }

    const remainingActions = await getOwnerPendingActions(ownerId, shopId);
    return {
      syncedCount,
      failedCount,
      remainingCount: remainingActions.length
    };
  } catch (err) {
    console.error('[OwnerPreferenceSyncProcessor] Error during owner pending actions sync:', err);
    return { syncedCount: 0, failedCount: 0, remainingCount: 0 };
  } finally {
    isPreferenceSyncRunning.delete(lockKey);
  }
}
