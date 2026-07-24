/**
 * Diagnostic utility for logging component mount status and checking critical dependencies.
 */

export function logComponentMount(componentName: string, details?: Record<string, any>) {
  console.log(`[Diagnostic] Component Mounted: ${componentName}`, details || {});
}

export function logComponentError(componentName: string, error: unknown) {
  console.error(`[Diagnostic Error] ${componentName} failed to render or initialize:`, error);
}

export function checkDependenciesAvailability(deps: Record<string, any>): Record<string, boolean> {
  const report: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(deps)) {
    report[key] = value !== undefined && value !== null;
    if (value === undefined || value === null) {
      console.warn(`[Diagnostic Warning] Dependency '${key}' is missing or undefined.`);
    }
  }
  return report;
}

export interface CustomerFetchDiagnosticParams {
  dbLoading?: boolean;
  cacheLoading?: boolean;
  source?: string;
  customersCount?: number;
  dbCustomersCount?: number;
  cachedCustomersCount?: number;
  filteredCount?: number;
  searchQuery?: string;
  selectedStatus?: string;
  error?: unknown;
}

export function logCustomerFetchState(stage: string, params: CustomerFetchDiagnosticParams) {
  try {
    console.log(`[Customer Fetch Diagnostic - ${stage}]`, {
      timestamp: new Date().toISOString(),
      source: params.source || 'unknown',
      loading: { dbLoading: params.dbLoading, cacheLoading: params.cacheLoading },
      counts: {
        effectiveCount: params.customersCount ?? 0,
        dbCount: params.dbCustomersCount ?? 0,
        cachedCount: params.cachedCustomersCount ?? 0,
        filteredCount: params.filteredCount ?? 'N/A',
      },
      filters: { query: params.searchQuery || '', status: params.selectedStatus || 'All' },
      error: params.error ? (params.error instanceof Error ? params.error.message : String(params.error)) : null,
    });
    if (params.error) {
      console.error(`[Customer Fetch Exception - ${stage}]`, params.error);
    }
  } catch (logErr) {
    console.error('Failed to log customer fetch diagnostic state:', logErr);
  }
}
