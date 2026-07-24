import { saveOwnerCache, getOwnerCache } from './ownerOfflineDb';
import type { WebsiteConfig } from '../types/ownerWebsite';
import { getActiveOwnerAndShopIds } from './ownerDashboardRepository';

export { getActiveOwnerAndShopIds };

export const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  slug: 'royalglow.nexora.in',
  isPublished: true,
  businessName: 'Royal Glow Salon',
  templateName: 'Royal Luxe',
  lastUpdated: new Date().toISOString(),
  sections: [
    { name: 'Hero Section', status: 'Completed', visible: true },
    { name: 'About Business', status: 'Completed', visible: true },
    { name: 'Services List', status: 'Completed', visible: true },
    { name: 'Staff Members', status: 'Completed', visible: true },
    { name: 'Photo Gallery', status: 'Needs Update', visible: true },
    { name: 'Customer Reviews', status: 'Completed', visible: false },
  ]
};

/**
 * Retrieve the cached website configuration for a specific owner and shop.
 */
export async function getWebsiteCache(
  ownerId: string,
  shopId: string
): Promise<WebsiteConfig | null> {
  if (!ownerId || !shopId) return null;
  const cacheKey = `${ownerId}:${shopId}:website`;
  const record = await getOwnerCache<WebsiteConfig>(
    'owner_website_cache',
    cacheKey,
    ownerId,
    shopId
  );
  return record ? record.data : null;
}

/**
 * Save a website configuration to the IndexedDB cache.
 */
export async function saveWebsiteCache(
  ownerId: string,
  shopId: string,
  config: WebsiteConfig
): Promise<void> {
  if (!ownerId || !shopId) return;
  const cacheKey = `${ownerId}:${shopId}:website`;
  const nowIso = new Date().toISOString();
  await saveOwnerCache<WebsiteConfig>('owner_website_cache', {
    id: cacheKey,
    ownerId,
    shopId,
    data: config,
    cachedAt: nowIso,
    updatedAt: nowIso
  });
}

/**
 * High-level repository function to retrieve website configuration.
 * It returns the active config, indicating whether it was loaded online or offline.
 */
export async function getOwnerWebsiteData(
  ownerId: string,
  shopId: string,
  forceRefresh = false
): Promise<{
  data: WebsiteConfig;
  source: 'network' | 'cache' | 'none';
  isStale: boolean;
  lastUpdated: string | null;
  error: string | null;
}> {
  if (!ownerId || !shopId) {
    return {
      data: DEFAULT_WEBSITE_CONFIG,
      source: 'none',
      isStale: true,
      lastUpdated: null,
      error: 'Missing ownerId or shopId context'
    };
  }

  try {
    // If online, simulate network loading and retrieve from storage
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      // In a real app we'd fetch from Supabase.
      // Here, we load from localStorage as the "online" source, or fallback to mock
      const localStr = localStorage.getItem(`nexora_website_config_${ownerId}_${shopId}`);
      let onlineConfig: WebsiteConfig;
      if (localStr) {
        onlineConfig = JSON.parse(localStr);
      } else {
        onlineConfig = { ...DEFAULT_WEBSITE_CONFIG };
      }

      // Save to IndexedDB cache
      await saveWebsiteCache(ownerId, shopId, onlineConfig);

      return {
        data: onlineConfig,
        source: 'network',
        isStale: false,
        lastUpdated: onlineConfig.lastUpdated,
        error: null
      };
    } else {
      // Offline: read from IndexedDB cache
      const cached = await getWebsiteCache(ownerId, shopId);
      if (cached) {
        // Compute staleness (e.g., older than 24 hours)
        const updatedDate = new Date(cached.lastUpdated);
        const hoursDiff = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60);
        const isStale = hoursDiff >= 24;

        return {
          data: cached,
          source: 'cache',
          isStale,
          lastUpdated: cached.lastUpdated,
          error: null
        };
      }

      // No cache state
      return {
        data: DEFAULT_WEBSITE_CONFIG,
        source: 'none',
        isStale: true,
        lastUpdated: null,
        error: 'No saved website configuration is available offline.'
      };
    }
  } catch (err: any) {
    console.error('getOwnerWebsiteData error:', err);
    // Attempt fallback to cache on exception
    const cachedFallback = await getWebsiteCache(ownerId, shopId);
    if (cachedFallback) {
      return {
        data: cachedFallback,
        source: 'cache',
        isStale: true,
        lastUpdated: cachedFallback.lastUpdated,
        error: err?.message || String(err)
      };
    }

    return {
      data: DEFAULT_WEBSITE_CONFIG,
      source: 'none',
      isStale: true,
      lastUpdated: null,
      error: err?.message || String(err)
    };
  }
}
