import type { Booking } from '../types';

export interface OwnerBookingsState {
  data: Booking[] | null;
  source: 'network' | 'cache' | 'none';
  isStale: boolean;
  lastUpdated?: string;
  error?: string | null;
  isLoading: boolean;
}
