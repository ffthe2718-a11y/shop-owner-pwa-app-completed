export interface PreferenceSyncFailureLog {
  id: string; // Unique ID for this log entry
  actionId: string; // ID of the preference action
  ownerId: string;
  shopId: string;
  actionType: string;
  error: string;
  timestamp: string;
  retryCount: number;
}

export interface PreferenceSyncSuccessLog {
  id: string;
  actionId: string;
  ownerId: string;
  shopId: string;
  actionType: string;
  timestamp: string;
}

const RETRY_COUNTS_KEY = 'preference_sync_retry_counts';
const FAILURE_LOGS_KEY = 'preference_sync_failure_logs';
const SUCCESS_LOGS_KEY = 'preference_sync_success_logs';
const MAX_ATTEMPTS = 3;

/**
 * Retrieves all tracked retry counts from localStorage.
 */
export function getRetryCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(RETRY_COUNTS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to read retry counts:', err);
    return {};
  }
}

/**
 * Retrieves the current retry count for a specific preference action.
 */
export function getRetryCount(actionId: string): number {
  const counts = getRetryCounts();
  return counts[actionId] || 0;
}

/**
 * Increments and saves the retry count for a specific preference action.
 * Returns the updated retry count.
 */
export function incrementRetryCount(actionId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const counts = getRetryCounts();
    const nextCount = (counts[actionId] || 0) + 1;
    counts[actionId] = nextCount;
    localStorage.setItem(RETRY_COUNTS_KEY, JSON.stringify(counts));
    return nextCount;
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to increment retry count:', err);
    return 0;
  }
}

/**
 * Clears/removes the retry count tracking for a specific action ID.
 */
export function clearRetryCount(actionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const counts = getRetryCounts();
    if (actionId in counts) {
      delete counts[actionId];
      localStorage.setItem(RETRY_COUNTS_KEY, JSON.stringify(counts));
    }
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to clear retry count:', err);
  }
}

/**
 * Checks if a specific action ID has exceeded the 3-attempt limit.
 */
export function hasExceededAttemptLimit(actionId: string): boolean {
  return getRetryCount(actionId) >= MAX_ATTEMPTS;
}

/**
 * Logs a preference action synchronization failure to localStorage.
 * Automatically keeps track of the failure details.
 */
export function logSyncFailure(
  actionId: string,
  ownerId: string,
  shopId: string,
  actionType: string,
  error: string
): PreferenceSyncFailureLog | null {
  if (typeof window === 'undefined') return null;

  try {
    const retryCount = incrementRetryCount(actionId);
    
    const logs: PreferenceSyncFailureLog[] = getSyncFailureLogs();
    const newLog: PreferenceSyncFailureLog = {
      id: `${actionId}_failed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actionId,
      ownerId,
      shopId,
      actionType,
      error: error || 'Unknown sync error',
      timestamp: new Date().toISOString(),
      retryCount,
    };

    logs.push(newLog);
    // Keep last 100 logs to prevent localStorage bloat
    if (logs.length > 100) {
      logs.shift();
    }

    localStorage.setItem(FAILURE_LOGS_KEY, JSON.stringify(logs));
    console.log(`[PreferenceSyncTracker] Logged sync failure for action ${actionId} (Attempt ${retryCount}/${MAX_ATTEMPTS})`);
    
    // Dispatch custom event to notify components if needed
    window.dispatchEvent(new CustomEvent('preference-sync-failure-logged', { detail: newLog }));

    return newLog;
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to log sync failure:', err);
    return null;
  }
}

/**
 * Retrieves sync failure logs from localStorage, optionally filtered by ownerId and/or shopId.
 */
export function getSyncFailureLogs(ownerId?: string, shopId?: string): PreferenceSyncFailureLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(FAILURE_LOGS_KEY);
    const logs: PreferenceSyncFailureLog[] = saved ? JSON.parse(saved) : [];
    
    if (ownerId && shopId) {
      return logs.filter((log) => log.ownerId === ownerId && log.shopId === shopId);
    }
    if (ownerId) {
      return logs.filter((log) => log.ownerId === ownerId);
    }
    if (shopId) {
      return logs.filter((log) => log.shopId === shopId);
    }
    
    return logs;
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to read failure logs:', err);
    return [];
  }
}

/**
 * Clears all logged sync failures from localStorage.
 */
export function clearSyncFailureLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(FAILURE_LOGS_KEY);
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to clear failure logs:', err);
  }
}

/**
 * Logs a preference action synchronization success to localStorage.
 */
export function logSyncSuccess(
  actionId: string,
  ownerId: string,
  shopId: string,
  actionType: string
): PreferenceSyncSuccessLog | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem(SUCCESS_LOGS_KEY);
    const logs: PreferenceSyncSuccessLog[] = saved ? JSON.parse(saved) : [];
    const newLog: PreferenceSyncSuccessLog = {
      id: `${actionId}_success_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actionId,
      ownerId,
      shopId,
      actionType,
      timestamp: new Date().toISOString(),
    };

    logs.push(newLog);
    // Keep last 100 logs
    if (logs.length > 100) {
      logs.shift();
    }

    localStorage.setItem(SUCCESS_LOGS_KEY, JSON.stringify(logs));
    console.log(`[PreferenceSyncTracker] Logged sync success for action ${actionId}`);
    
    return newLog;
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to log sync success:', err);
    return null;
  }
}

/**
 * Retrieves sync success logs from localStorage.
 */
export function getSyncSuccessLogs(ownerId?: string, shopId?: string): PreferenceSyncSuccessLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(SUCCESS_LOGS_KEY);
    const logs: PreferenceSyncSuccessLog[] = saved ? JSON.parse(saved) : [];
    
    if (ownerId && shopId) {
      return logs.filter((log) => log.ownerId === ownerId && log.shopId === shopId);
    }
    if (ownerId) {
      return logs.filter((log) => log.ownerId === ownerId);
    }
    if (shopId) {
      return logs.filter((log) => log.shopId === shopId);
    }
    
    return logs;
  } catch (err) {
    console.error('[PreferenceSyncTracker] Failed to read success logs:', err);
    return [];
  }
}

export interface SyncMetrics {
  successCount: number;
  failedCount: number;
  lastSyncTime: string | null;
  processedActionTypes: string[];
  ownerId: string;
  shopId: string;
}

/**
 * Exposes aggregated sync metrics for UI visualization, 
 * ensuring sensitive payloads are entirely excluded.
 */
export function getSyncMetrics(ownerId: string, shopId: string): SyncMetrics {
  if (!ownerId || !shopId) {
    return { successCount: 0, failedCount: 0, lastSyncTime: null, processedActionTypes: [], ownerId: '', shopId: '' };
  }

  const successLogs = getSyncSuccessLogs(ownerId, shopId);
  const failureLogs = getSyncFailureLogs(ownerId, shopId);

  const allLogs = [...successLogs, ...failureLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const actionTypes = new Set<string>();
  allLogs.forEach(log => actionTypes.add(log.actionType));

  return {
    successCount: successLogs.length,
    failedCount: failureLogs.length,
    lastSyncTime: allLogs.length > 0 ? allLogs[0].timestamp : null,
    processedActionTypes: Array.from(actionTypes),
    ownerId,
    shopId
  };
}
