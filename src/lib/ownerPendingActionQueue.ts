import type { OwnerPendingAction } from '../types/ownerOffline';
import { getOwnerOfflineDB, savePendingOwnerAction, getPendingOwnerActions, deletePendingOwnerAction } from './ownerOfflineDb';
import { logSyncFailure, logSyncSuccess, getRetryCount, clearRetryCount } from '../services/preferenceSyncTracker';

export const ALLOWED_OFFLINE_ACTION_TYPES = [
  "owner_ui_preference_update",
  "owner_dashboard_filter_preference",
  "owner_booking_filter_preference",
  "owner_service_filter_preference",
  "owner_staff_filter_preference",
  "owner_customer_filter_preference",
  "owner_last_opened_page",
  "owner_collapsed_section_state"
] as const;

export type AllowedOfflineActionType = typeof ALLOWED_OFFLINE_ACTION_TYPES[number];

/**
 * Helper to extract preferenceKey from the action payload to build unique identities.
 */
function getPreferenceKey(payload: Record<string, unknown>): string {
  if (typeof payload.key === 'string' && payload.key) return payload.key;
  if (typeof payload.preferenceKey === 'string' && payload.preferenceKey) return payload.preferenceKey;
  if (typeof payload.filter === 'string' && payload.filter) return payload.filter;
  if (typeof payload.section === 'string' && payload.section) return payload.section;
  
  // Fallback to the first key or stringified keys
  const keys = Object.keys(payload);
  if (keys.length > 0) {
    return keys[0];
  }
  return 'default_pref';
}

/**
 * 5. Duplicate Preference Handling
 * Ensures we don't have multiple pending entries in the queue for the same preference.
 * Keeps only the latest state by removing the obsolete older entry.
 * 
 * 6. Owner and Shop Isolation
 * Verifies that record.ownerId === currentOwnerId and record.shopId === currentShopId.
 */
export async function replaceDuplicatePreferenceAction(
  ownerId: string,
  shopId: string,
  actionType: OwnerPendingAction['actionType'],
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<void> {
  if (!ownerId || !shopId) {
    throw new Error("Missing owner ID or shop ID for duplicate preference handling.");
  }

  try {
    const db = await getOwnerOfflineDB();
    const tx = db.transaction('owner_pending_actions', 'readonly');
    const store = tx.objectStore('owner_pending_actions');
    const index = store.index('by_owner_shop');
    const actions: OwnerPendingAction[] = await index.getAll([ownerId, shopId]);

    const targetPrefKey = getPreferenceKey(payload);

    for (const action of actions) {
      // Enforce strict isolation within the loop
      if (action.ownerId !== ownerId || action.shopId !== shopId) {
        continue;
      }

      const existingPrefKey = getPreferenceKey(action.payload);
      
      // Determine if this is a duplicate preference update
      const isDuplicate = 
        action.actionType === actionType && 
        (action.idempotencyKey === idempotencyKey || existingPrefKey === targetPrefKey);

      if (isDuplicate) {
        console.log(`[OwnerPendingActionQueue] Replacing duplicate/obsolete action: ${action.id} of type ${actionType}`);
        // Delete directly using the delete helper
        await deletePendingOwnerAction(action.id, ownerId);
      }
    }
  } catch (err) {
    console.error('[OwnerPendingActionQueue] Error in replaceDuplicatePreferenceAction:', err);
  }
}

/**
 * 12. Data Safety: Validate that pending actions only contain small, safe UI preferences
 * and strictly do not contain passwords, tokens, customer personal data, booking details, 
 * payments, bank, KYC, API keys, full forms, or files/images.
 */
export function validatePreferencePayload(payload: Record<string, unknown>): void {
  if (!payload || typeof payload !== 'object') {
    throw new Error("Invalid payload: Payload must be an object.");
  }

  // Limit total serialization length of payload to prevent large forms or files
  const serialized = JSON.stringify(payload);
  if (serialized.length > 500) {
    throw new Error("Data Safety violation: Payload exceeds size limits for small UI preference values.");
  }

  const forbiddenPartials = [
    'password', 'pwd', 'token', 'jwt', 'auth', 'session', 'secret', 'credential', 'apikey', 'api_key',
    'email', 'phone', 'address', 'customer', 'client', 'personal', 'ssn', 'dob',
    'booking', 'schedule', 'appointment', 'payment', 'amount', 'card', 'cvv', 'stripe', 'price',
    'bank', 'routing', 'iban', 'kyc', 'passport', 'license', 'form', 'business',
    'image', 'file', 'photo', 'avatar', 'blob', 'base64', 'binary'
  ];

  const forbiddenExacts = ['key', 'name', 'fname', 'lname', 'first', 'last'];

  const checkValue = (val: unknown): void => {
    if (typeof val === 'string') {
      // Prevent data URLs, base64 strings, or extremely long strings
      if (val.startsWith('data:') || val.length > 150) {
        throw new Error("Data Safety violation: Long strings, base64 data, or files/images are not allowed in preference payloads.");
      }
      // Check if string looks like an email
      if (val.includes('@') && val.includes('.')) {
        throw new Error("Data Safety violation: Emails are not allowed in preference payloads.");
      }
    }
    if (val !== null && typeof val === 'object') {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === 'object' && item !== null) {
            throw new Error("Data Safety violation: Nested complex structures are not allowed in preference payloads.");
          }
          checkValue(item);
        }
      } else {
        const obj = val as Record<string, unknown>;
        for (const [k, v] of Object.entries(obj)) {
          const lowerKey = k.toLowerCase();
          // Partial matches
          for (const forbidden of forbiddenPartials) {
            if (lowerKey.includes(forbidden)) {
              throw new Error(`Data Safety violation: Sensitive or forbidden key "${k}" found in preference payload.`);
            }
          }
          // Exact matches
          for (const forbidden of forbiddenExacts) {
            if (lowerKey === forbidden) {
              throw new Error(`Data Safety violation: Sensitive or forbidden key "${k}" found in preference payload.`);
            }
          }
          checkValue(v);
        }
      }
    }
  };

  // Run the deep validation check
  checkValue(payload);
}

/**
 * Enqueue a safe non-critical preference action.
 * Strict checks ensure that critical actions like bookings, payments, and profile updates are never queued.
 * 
 * 6. Owner and Shop Isolation
 * Missing owner ID or shop ID will prevent queueing and throw an error.
 */
export async function enqueueOwnerPendingAction(
  actionData: Omit<OwnerPendingAction, 'id' | 'createdAt' | 'updatedAt' | 'retryCount' | 'status' | 'idempotencyKey'> & {
    idempotencyKey?: string;
  }
): Promise<OwnerPendingAction> {
  const { ownerId, shopId, actionType, payload } = actionData;

  // 6. Owner and Shop Isolation: Missing IDs must fail immediately
  if (!ownerId || !shopId) {
    throw new Error("Action queuing failed: ownerId and shopId are required.");
  }

  // 1 & 2. Strictly validate action type (only safe local UI preferences)
  if (!ALLOWED_OFFLINE_ACTION_TYPES.includes(actionType as any)) {
    throw new Error(`Critical operations of type "${actionType}" require a live network connection and cannot be queued offline.`);
  }

  // 12. Data Safety check on the payload
  validatePreferencePayload(payload);

  // Generate preference key identity
  const prefKey = getPreferenceKey(payload);
  const idempotencyKey = actionData.idempotencyKey || `${ownerId}:${shopId}:${actionType}:${prefKey}`;

  // 5. Handle duplicate preference actions first to keep the queue clean
  await replaceDuplicatePreferenceAction(ownerId, shopId, actionType, payload, idempotencyKey);

  const timestamp = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 11);
  const actionId = `owner_action_${Date.now()}_${randomSuffix}`;

  const action: OwnerPendingAction = {
    id: actionId,
    ownerId,
    shopId,
    actionType: actionType as AllowedOfflineActionType,
    payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    retryCount: 0,
    status: "pending",
    idempotencyKey
  };

  try {
    await savePendingOwnerAction(action);
    console.log(`[OwnerPendingActionQueue] Successfully queued action ${actionId} of type ${actionType}`);
    
    // Notify application window of pending action queue change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('owner-pending-actions-changed', {
        detail: { actionId, actionType }
      }));
    }

    return action;
  } catch (err) {
    console.error(`[OwnerPendingActionQueue] Failed to save pending action ${actionId}:`, err);
    throw err;
  }
}

/**
 * Retrieve all pending actions for the current owner and shop.
 * 
 * 6. Owner and Shop Isolation
 * Verifies that record.ownerId === currentOwnerId and record.shopId === currentShopId.
 */
export async function getOwnerPendingActions(
  ownerId: string,
  shopId: string
): Promise<OwnerPendingAction[]> {
  if (!ownerId || !shopId) {
    throw new Error("Retrieving pending actions failed: ownerId and shopId are required.");
  }

  try {
    const actions = await getPendingOwnerActions(ownerId, shopId);
    
    // Strictly isolate and verify ownerId and shopId matches
    const isolatedActions = actions.filter(
      (a) => a.ownerId === ownerId && a.shopId === shopId
    );

    // Return them ordered by creation timestamp
    return isolatedActions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (err) {
    console.error('[OwnerPendingActionQueue] Error retrieving pending actions:', err);
    return [];
  }
}

/**
 * Update a pending action's status to "processing".
 * 
 * 6. Owner and Shop Isolation
 * Verifies that record.ownerId === currentOwnerId and record.shopId === currentShopId.
 */
export async function markOwnerActionProcessing(
  id: string,
  ownerId: string,
  shopId: string
): Promise<OwnerPendingAction | null> {
  if (!id) return null;
  if (!ownerId || !shopId) {
    throw new Error("Owner ID and Shop ID are required to mark action processing.");
  }

  try {
    const db = await getOwnerOfflineDB();
    const action: OwnerPendingAction | undefined = await db.get('owner_pending_actions', id);

    if (action) {
      // 6. Owner and Shop Isolation Verification
      if (action.ownerId !== ownerId || action.shopId !== shopId) {
        console.warn(`[OwnerPendingActionQueue] Isolation check failed for action ${id}. Rejecting process action.`);
        return null;
      }

      action.status = 'processing';
      action.updatedAt = new Date().toISOString();
      await db.put('owner_pending_actions', action);
      return action;
    }
    return null;
  } catch (err) {
    console.error(`[OwnerPendingActionQueue] Error marking action ${id} processing:`, err);
    return null;
  }
}

/**
 * Update a pending action's status to "failed" and record the error message.
 * 
 * 6. Owner and Shop Isolation
 * Verifies that record.ownerId === currentOwnerId and record.shopId === currentShopId.
 */
export async function markOwnerActionFailed(
  id: string,
  ownerId: string,
  shopId: string,
  error?: string
): Promise<OwnerPendingAction | null> {
  if (!id) return null;
  if (!ownerId || !shopId) {
    throw new Error("Owner ID and Shop ID are required to mark action failed.");
  }

  try {
    const db = await getOwnerOfflineDB();
    const action: OwnerPendingAction | undefined = await db.get('owner_pending_actions', id);

    if (action) {
      // 6. Owner and Shop Isolation Verification
      if (action.ownerId !== ownerId || action.shopId !== shopId) {
        console.warn(`[OwnerPendingActionQueue] Isolation check failed for action ${id}. Rejecting fail action.`);
        return null;
      }

      // Log sync failure and track retry count in localStorage
      logSyncFailure(id, ownerId, shopId, action.actionType, error || 'Unknown processing error');
      
      const localRetryCount = getRetryCount(id);
      action.retryCount = localRetryCount;
      
      // 10. Retry Rules: Maximum 3 retries, status = failed only after 3 failures, otherwise pending
      if (action.retryCount >= 3) {
        action.status = 'failed';
      } else {
        action.status = 'pending';
      }
      action.lastError = error || 'Unknown processing error';
      action.updatedAt = new Date().toISOString();
      await db.put('owner_pending_actions', action);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('owner-pending-actions-changed'));
      }
      return action;
    }
    return null;
  } catch (err) {
    console.error(`[OwnerPendingActionQueue] Error marking action ${id} failed:`, err);
    return null;
  }
}

/**
 * Remove a specific pending action from the queue.
 * 
 * 6. Owner and Shop Isolation
 * Verifies that record.ownerId === currentOwnerId and record.shopId === currentShopId.
 */
export async function removeOwnerPendingAction(
  id: string,
  ownerId: string,
  shopId: string
): Promise<boolean> {
  if (!id) return false;
  if (!ownerId || !shopId) {
    throw new Error("Owner ID and Shop ID are required to remove pending action.");
  }

  try {
    const db = await getOwnerOfflineDB();
    const action: OwnerPendingAction | undefined = await db.get('owner_pending_actions', id);

    if (action) {
      // 6. Owner and Shop Isolation Verification
      if (action.ownerId !== ownerId || action.shopId !== shopId) {
        console.warn(`[OwnerPendingActionQueue] Isolation check failed for action ${id}. Rejecting delete action.`);
        return false;
      }

      const result = await deletePendingOwnerAction(id, ownerId);
      if (result) {
        // Clear tracked retry count on success
        clearRetryCount(id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('owner-pending-actions-changed'));
        }
      }
      return result;
    }
    return false;
  } catch (err) {
    console.error(`[OwnerPendingActionQueue] Error removing action ${id}:`, err);
    return false;
  }
}

/**
 * 10. Retry Rules & Synchronization
 * Non-blocking synchronization of pending owner actions.
 * Only retries actions with status !== 'failed' or retryCount < 3.
 * Maximum retry count is 3. If it fails 3 times, status remains 'failed'.
 * It does not block other business workflows or other action syncs.
 */
export async function syncOwnerPendingActions(
  ownerId: string,
  shopId: string
): Promise<{ syncedCount: number; failedCount: number; remainingCount: number }> {
  const { processOwnerPreferenceQueue } = await import('./ownerPreferenceSyncProcessor');
  return processOwnerPreferenceQueue(ownerId, shopId);
}

/**
 * Resets failed status flags and retry counts for all pending owner actions
 * belonging to a specific ownerId and shopId.
 */
export async function resetFailedOwnerActions(ownerId: string, shopId: string): Promise<void> {
  if (!ownerId || !shopId) return;
  try {
    const db = await getOwnerOfflineDB();
    const actions = await getOwnerPendingActions(ownerId, shopId);

    for (const action of actions) {
      if (action.ownerId === ownerId && action.shopId === shopId) {
        if (action.status === 'failed' || action.retryCount > 0) {
          action.status = 'pending';
          action.retryCount = 0;
          action.lastError = undefined;
          action.updatedAt = new Date().toISOString();
          await db.put('owner_pending_actions', action);
          
          // Also clear from localStorage tracker
          clearRetryCount(action.id);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('owner-pending-actions-changed'));
    }
  } catch (err) {
    console.error('[OwnerPendingActionQueue] Error resetting failed owner actions:', err);
  }
}
