import { useState, useEffect, useCallback } from 'react';
import type { OwnerStaffState } from '../types/ownerStaff';
import {
  getOwnerStaffData,
  getActiveOwnerAndShopIds
} from '../lib/ownerStaffRepository';

export function useOwnerStaff() {
  const [state, setState] = useState<OwnerStaffState>({
    data: null,
    source: 'none',
    isStale: false,
    lastUpdated: undefined,
    error: null,
    isLoading: true
  });
  const [shopId, setShopId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { ownerId, shopId: activeShopId } = await getActiveOwnerAndShopIds();
      setShopId(activeShopId);
      const result = await getOwnerStaffData(ownerId, activeShopId);
      setState(result);
    } catch (err: any) {
      console.error('Failed to load owner staff:', err);
      setState({
        data: null,
        source: 'none',
        isStale: true,
        error: err?.message || 'Failed to load staff list',
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return {
    ...state,
    shopId,
    refetch: loadStaff
  };
}
