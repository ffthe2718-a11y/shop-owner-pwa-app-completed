import { useState, useEffect, useCallback } from 'react';
import type { OwnerCustomersState } from '../types/ownerCustomers';
import {
  getOwnerCustomersData,
  getActiveOwnerAndShopIds
} from '../lib/ownerCustomersRepository';

export function useOwnerCustomers() {
  const [state, setState] = useState<OwnerCustomersState>({
    data: null,
    source: 'none',
    isStale: false,
    lastUpdated: undefined,
    error: null,
    isLoading: true
  });

  const loadCustomers = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { ownerId, shopId } = await getActiveOwnerAndShopIds();
      const result = await getOwnerCustomersData(ownerId, shopId);
      setState(result);
    } catch (err: any) {
      console.error('Failed to load owner customers:', err);
      setState({
        data: null,
        source: 'none',
        isStale: true,
        error: err?.message || 'Failed to load customers list',
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return {
    ...state,
    refetch: loadCustomers
  };
}
