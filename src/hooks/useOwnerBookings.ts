import { useState, useEffect, useCallback } from 'react';
import type { OwnerBookingsState } from '../types/ownerBookings';
import {
  getOwnerBookingsData,
  getActiveOwnerAndShopIds
} from '../lib/ownerBookingsRepository';

export function useOwnerBookings() {
  const [state, setState] = useState<OwnerBookingsState>({
    data: null,
    source: 'none',
    isStale: false,
    lastUpdated: undefined,
    error: null,
    isLoading: true
  });

  const [shopId, setShopId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { ownerId, shopId: activeShopId } = await getActiveOwnerAndShopIds();
      setShopId(activeShopId);
      const result = await getOwnerBookingsData(ownerId, activeShopId);
      setState(result);
    } catch (err: any) {
      console.error('Failed to load owner bookings:', err);
      setState({
        data: null,
        source: 'none',
        isStale: true,
        error: err?.message || 'Failed to load bookings',
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return {
    ...state,
    shopId,
    refetch: loadBookings
  };
}
