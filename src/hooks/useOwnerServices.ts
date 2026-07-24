import { useState, useEffect, useCallback } from 'react';
import type { OwnerServicesState } from '../types/ownerServices';
import {
  getOwnerServicesData,
  getActiveOwnerAndShopIds
} from '../lib/ownerServicesRepository';

export function useOwnerServices() {
  const [state, setState] = useState<OwnerServicesState>({
    data: null,
    source: 'none',
    isStale: false,
    lastUpdated: undefined,
    error: null,
    isLoading: true
  });

  const [shopId, setShopId] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { ownerId, shopId: activeShopId } = await getActiveOwnerAndShopIds();
      setShopId(activeShopId);
      const result = await getOwnerServicesData(ownerId, activeShopId);
      setState(result);
    } catch (err: any) {
      console.error('Failed to load owner services:', err);
      setState({
        data: null,
        source: 'none',
        isStale: true,
        error: err?.message || 'Failed to load services',
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  return {
    ...state,
    shopId,
    refetch: loadServices
  };
}
