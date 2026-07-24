import { useState, useEffect, useCallback } from 'react';
import type { OwnerDashboardState } from '../types/ownerDashboard';
import {
  getOwnerDashboardData,
  getActiveOwnerAndShopIds
} from '../lib/ownerDashboardRepository';

export function useOwnerDashboard() {
  const [state, setState] = useState<OwnerDashboardState>({
    data: null,
    source: 'none',
    isStale: false,
    lastUpdated: undefined,
    error: null,
    isLoading: true
  });

  const loadDashboard = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { ownerId, shopId } = await getActiveOwnerAndShopIds();
      const result = await getOwnerDashboardData(ownerId, shopId);
      setState(result);
    } catch (err: any) {
      console.error('Failed to load owner dashboard:', err);
      setState({
        data: null,
        source: 'none',
        isStale: true,
        error: err?.message || 'Failed to load dashboard',
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    ...state,
    refetch: loadDashboard
  };
}
