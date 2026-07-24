import type { Service } from '../types';

export interface OwnerServicesState {
  data: Service[] | null;
  source: 'network' | 'cache' | 'none';
  isStale: boolean;
  lastUpdated?: string;
  error?: string | null;
  isLoading: boolean;
}
