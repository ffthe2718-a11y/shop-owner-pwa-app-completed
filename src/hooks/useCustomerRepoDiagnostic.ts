import { useEffect, useState } from 'react';
import * as ownerCustomersRepo from '../lib/ownerCustomersRepository';
import { api } from '../lib/api';

export interface CustomerRepoDiagnosticState {
  hasRepoModule: boolean;
  hasApiService: boolean;
  isFetchingRepo: boolean;
  repoDataCount: number;
  apiDataCount: number;
  lastDiagnosticCheck: string | null;
  error: string | null;
}

/**
 * Diagnostic hook to fetch and log the state of the customer data repository and API service.
 */
export function useCustomerRepoDiagnostic() {
  const [diagnostic, setDiagnostic] = useState<CustomerRepoDiagnosticState>({
    hasRepoModule: typeof ownerCustomersRepo.getOwnerCustomersData === 'function',
    hasApiService: typeof api.getCustomers === 'function',
    isFetchingRepo: true,
    repoDataCount: 0,
    apiDataCount: 0,
    lastDiagnosticCheck: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function runDiagnostics() {
      console.log('[Customer Repo Diagnostic] Starting repository check...');
      
      const hasRepoModule = typeof ownerCustomersRepo.getOwnerCustomersData === 'function';
      const hasApiService = typeof api.getCustomers === 'function';

      console.log(`[Customer Repo Diagnostic] ownerCustomersRepo imported: ${hasRepoModule}`);
      console.log(`[Customer Repo Diagnostic] api.getCustomers imported: ${hasApiService}`);

      let repoCount = 0;
      let apiCount = 0;
      let diagError: string | null = null;

      try {
        if (hasRepoModule) {
          const repoResult = await ownerCustomersRepo.getOwnerCustomersData();
          if (repoResult && Array.isArray(repoResult.data)) {
            repoCount = repoResult.data.length;
            console.log(`[Customer Repo Diagnostic] Repository returned ${repoCount} customers (source: ${repoResult.source})`);
          }
        }
      } catch (err: any) {
        diagError = `Repository check error: ${err?.message || err}`;
        console.error('[Customer Repo Diagnostic] Repository error:', err);
      }

      try {
        if (hasApiService) {
          const apiResult = await api.getCustomers();
          if (Array.isArray(apiResult)) {
            apiCount = apiResult.length;
            console.log(`[Customer Repo Diagnostic] API service returned ${apiCount} customers.`);
          }
        }
      } catch (err: any) {
        console.warn('[Customer Repo Diagnostic] API fetch warning:', err);
      }

      if (isMounted) {
        setDiagnostic({
          hasRepoModule,
          hasApiService,
          isFetchingRepo: false,
          repoDataCount: repoCount,
          apiDataCount: apiCount,
          lastDiagnosticCheck: new Date().toISOString(),
          error: diagError,
        });
      }
    }

    runDiagnostics();

    return () => {
      isMounted = false;
    };
  }, []);

  return diagnostic;
}
