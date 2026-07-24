import { api } from '../lib/api';
import * as ownerCustomersRepo from '../lib/ownerCustomersRepository';
import { getActiveOwnerAndShopIds } from '../lib/ownerDashboardRepository';

export interface Customer {
  id: string;
  name: string;
  mobile?: string;
  phone?: string;
  email?: string;
  status?: string;
  visits?: number;
  spent?: string;
  lastVisit?: string;
  last_visit?: string;
  avatar?: string;
  avatar_url?: string;
  [key: string]: any;
}

export interface CustomerFetchResult {
  data: Customer[];
  source: 'network' | 'cache' | 'fallback' | 'none';
  isStale: boolean;
  lastUpdated: string | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Service to manage customer data retrieval, updates, and offline fallback logic
 * with comprehensive error handling and logging.
 */
export class CustomerService {
  /**
   * Fetches the complete list of customers with fallback support and diagnostic logging.
   */
  static async getCustomers(options?: {
    ownerId?: string;
    shopId?: string;
    forceRefresh?: boolean;
  }): Promise<CustomerFetchResult> {
    console.log('[CustomerService] Initiating customer data retrieval...', options);

    try {
      let ownerId = options?.ownerId;
      let shopId = options?.shopId;

      if (!ownerId || !shopId) {
        const activeIds = await getActiveOwnerAndShopIds();
        ownerId = ownerId || activeIds.ownerId;
        shopId = shopId || activeIds.shopId;
      }

      // First try repository strategy (handles online network vs offline IndexedDB cache)
      if (ownerId && shopId && typeof ownerCustomersRepo.getOwnerCustomersData === 'function') {
        try {
          const repoState = await ownerCustomersRepo.getOwnerCustomersData(
            ownerId,
            shopId,
            options?.forceRefresh === false
          );

          const safeData = Array.isArray(repoState.data) ? repoState.data : [];
          console.log(`[CustomerService] Loaded ${safeData.length} customers via repository (source: ${repoState.source})`);

          return {
            data: safeData,
            source: repoState.source || 'cache',
            isStale: repoState.isStale || false,
            lastUpdated: repoState.lastUpdated || new Date().toISOString(),
            error: repoState.error || null,
            isLoading: false,
          };
        } catch (repoErr: any) {
          console.warn('[CustomerService] Repository fetch failed, falling back to direct API:', repoErr);
        }
      }

      // Direct API fallback if repository not available or failed
      const directData = await api.getCustomers();
      const safeDirectData = Array.isArray(directData) ? directData : [];
      console.log(`[CustomerService] Direct API returned ${safeDirectData.length} customer records.`);

      return {
        data: safeDirectData,
        source: 'network',
        isStale: false,
        lastUpdated: new Date().toISOString(),
        error: null,
        isLoading: false,
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to retrieve customer records';
      console.error('[CustomerService Error] Customer fetch error:', err);

      return {
        data: [],
        source: 'none',
        isStale: true,
        lastUpdated: null,
        error: errorMessage,
        isLoading: false,
      };
    }
  }

  /**
   * Adds a new customer record or updates an existing one.
   */
  static async saveCustomer(customerData: Partial<Customer>, id?: string): Promise<Customer> {
    console.log(`[CustomerService] ${id ? 'Updating' : 'Adding'} customer record:`, customerData);
    try {
      if (id) {
        return await api.updateCustomer(id, customerData);
      } else {
        return await api.addCustomer(customerData);
      }
    } catch (err: any) {
      console.error(`[CustomerService Error] Failed to save customer (${id || 'new'}):`, err);
      throw err;
    }
  }

  /**
   * Deletes a customer record by ID.
   */
  static async deleteCustomer(id: string): Promise<void> {
    console.log(`[CustomerService] Deleting customer: ${id}`);
    try {
      await api.deleteCustomer(id);
    } catch (err: any) {
      console.error(`[CustomerService Error] Failed to delete customer (${id}):`, err);
      throw err;
    }
  }

  /**
   * Performs bulk deletion of customers.
   */
  static async bulkDeleteCustomers(ids: string[]): Promise<void> {
    console.log(`[CustomerService] Bulk deleting ${ids.length} customers.`);
    try {
      await api.bulkDeleteCustomers(ids);
    } catch (err: any) {
      console.error('[CustomerService Error] Bulk delete failed:', err);
      throw err;
    }
  }

  /**
   * Performs bulk status updates for customers.
   */
  static async bulkUpdateStatus(ids: string[], newStatus: string): Promise<void> {
    console.log(`[CustomerService] Bulk updating status for ${ids.length} customers to '${newStatus}'.`);
    try {
      await api.bulkUpdateCustomersStatus(ids, newStatus);
    } catch (err: any) {
      console.error('[CustomerService Error] Bulk status update failed:', err);
      throw err;
    }
  }
}
