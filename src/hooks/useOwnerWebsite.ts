import { useState, useEffect, useCallback } from 'react';
import type { WebsiteConfig } from '../types/ownerWebsite';
import {
  getOwnerWebsiteData,
  getActiveOwnerAndShopIds,
  saveWebsiteCache,
  DEFAULT_WEBSITE_CONFIG
} from '../lib/ownerWebsiteRepository';
import { useNetworkStatus } from './useNetworkStatus';

export interface OwnerWebsiteState {
  data: WebsiteConfig | null;
  source: 'network' | 'cache' | 'none';
  isStale: boolean;
  lastUpdated: string | null;
  error: string | null;
  isLoading: boolean;
}

export function useOwnerWebsite() {
  const { isOffline, isOnline } = useNetworkStatus();
  const [state, setState] = useState<OwnerWebsiteState>({
    data: null,
    source: 'none',
    isStale: false,
    lastUpdated: null,
    error: null,
    isLoading: true
  });

  const loadWebsiteConfig = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { ownerId, shopId } = await getActiveOwnerAndShopIds();
      const result = await getOwnerWebsiteData(ownerId, shopId);
      setState({
        ...result,
        isLoading: false
      });
    } catch (err: any) {
      console.error('Failed to load owner website config:', err);
      setState({
        data: null,
        source: 'none',
        isStale: true,
        lastUpdated: null,
        error: err?.message || 'Failed to load website configuration',
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    loadWebsiteConfig();
  }, [loadWebsiteConfig, isOffline]); // Trigger refetch on network state change

  const updateConfig = useCallback(async (newConfig: Partial<WebsiteConfig>) => {
    if (isOffline) {
      throw new Error('Website changes require an internet connection.');
    }

    try {
      const { ownerId, shopId } = await getActiveOwnerAndShopIds();
      const currentData = state.data || DEFAULT_WEBSITE_CONFIG;
      const updated: WebsiteConfig = {
        ...currentData,
        ...newConfig,
        lastUpdated: new Date().toISOString()
      };

      // Save to mock database (localStorage)
      localStorage.setItem(`nexora_website_config_${ownerId}_${shopId}`, JSON.stringify(updated));
      
      // Save to IndexedDB cache
      await saveWebsiteCache(ownerId, shopId, updated);

      setState((prev) => ({
        ...prev,
        data: updated,
        source: 'network',
        lastUpdated: updated.lastUpdated
      }));
    } catch (err: any) {
      console.error('Failed to save website config:', err);
      throw err;
    }
  }, [isOffline, state.data]);

  const togglePublish = useCallback(async () => {
    if (isOffline) {
      throw new Error('Website changes require an internet connection.');
    }
    const currentPublish = state.data ? state.data.isPublished : DEFAULT_WEBSITE_CONFIG.isPublished;
    await updateConfig({ isPublished: !currentPublish });
  }, [isOffline, state.data, updateConfig]);

  return {
    ...state,
    isOffline,
    isOnline,
    updateConfig,
    togglePublish,
    refetch: loadWebsiteConfig
  };
}
