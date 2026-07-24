import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { enqueueOwnerPendingAction } from '../lib/ownerPendingActionQueue';
import { getActiveOwnerAndShopIds } from '../lib/ownerDashboardRepository';

export function useOfflinePreferences<T extends Record<string, any>>(
  actionType:
    | "owner_ui_preference_update"
    | "owner_dashboard_filter_preference"
    | "owner_booking_filter_preference"
    | "owner_service_filter_preference"
    | "owner_staff_filter_preference"
    | "owner_customer_filter_preference"
    | "owner_last_opened_page"
    | "owner_collapsed_section_state",
  initialValue: T,
  storageKey: string
) {
  const { isOffline } = useNetworkStatus();
  const [preferences, setPreferences] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [notification, setNotification] = useState<string | null>(null);

  // Synchronize localStorage with state
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (err) {
      console.warn('[OfflinePreferences] Failed to write to localStorage:', err);
    }
  }, [preferences, storageKey]);

  // Listen to owner-pending-actions-changed for this action type if needed
  useEffect(() => {
    const handleActionChanged = (e: any) => {
      if (e.detail && e.detail.actionType === actionType && isOffline) {
        setNotification("Saved on this device. It will sync when you reconnect.");
        const timer = setTimeout(() => {
          setNotification(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener('owner-pending-actions-changed', handleActionChanged);
    return () => {
      window.removeEventListener('owner-pending-actions-changed', handleActionChanged);
    };
  }, [actionType, isOffline]);

  const updatePreference = async (newPref: Partial<T>) => {
    // 1. Instantly update UI local state
    const updated = { ...preferences, ...newPref };
    setPreferences(updated);

    // 2. Fetch current isolation IDs
    const { ownerId, shopId } = await getActiveOwnerAndShopIds();
    if (!ownerId || !shopId) {
      console.warn('[OfflinePreferences] Missing ownerId or shopId. Skipping queue.');
      return;
    }

    // 3. Queue if offline
    if (isOffline) {
      try {
        await enqueueOwnerPendingAction({
          ownerId,
          shopId,
          actionType,
          payload: { ...newPref }
        });
      } catch (err) {
        console.error('[OfflinePreferences] Failed to queue preference offline:', err);
      }
    } else {
      console.log(`[OfflinePreferences] Online. Preference updated immediately:`, newPref);
    }
  };

  return {
    preferences,
    updatePreference,
    notification,
    clearNotification: () => setNotification(null)
  };
}
