export interface OwnerCustomersState {
  data: any[] | null;
  source: 'network' | 'cache' | 'none';
  isStale: boolean;
  lastUpdated?: string;
  error?: string | null;
  isLoading: boolean;
}
