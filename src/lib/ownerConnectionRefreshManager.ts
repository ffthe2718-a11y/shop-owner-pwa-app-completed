import { supabase } from './supabase';
import { getActiveOwnerAndShopIds } from './ownerDashboardRepository';
import { logoutOwner } from '../services/ownerAuthService';

export type OwnerRefreshStatus = "idle" | "verifying" | "refreshing" | "success" | "failed";

export type OwnerRefreshState = {
  status: OwnerRefreshStatus;
  refreshedAt?: string;
  error?: string;
};

type RefreshCallback = () => Promise<any>;

// 2. Real Connection Verification
export async function verifyConnection(): Promise<boolean> {
  try {
    const response = await fetch('/favicon.ico', {
      method: 'HEAD',
      cache: 'no-store'
    });
    return response.ok;
  } catch (err) {
    try {
      const response = await fetch('/favicon.ico', {
        method: 'GET',
        cache: 'no-store'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 14. Authentication Safety
export async function verifySupabaseSession(): Promise<{ isValid: boolean; ownerId?: string; shopId?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const localAuth = localStorage.getItem('nexora_auth_active') === 'true';
    if (!session && !localAuth) {
      return { isValid: false };
    }

    const { ownerId, shopId } = await getActiveOwnerAndShopIds();
    if (!ownerId || !shopId) {
      return { isValid: false };
    }

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profile && profile.role && profile.role !== 'shop_owner' && profile.role !== 'Shop Owner') {
        console.warn('Invalid role detected:', profile.role);
        return { isValid: false };
      }
    }

    return { isValid: true, ownerId, shopId };
  } catch (err) {
    console.warn('Session verification failed:', err);
    return { isValid: false };
  }
}

export async function handleSessionExpiry() {
  try {
    await logoutOwner();
  } catch (err) {
    console.error('Logout cleanup failed:', err);
  } finally {
    window.location.href = '/login';
  }
}

class OwnerConnectionRefreshManager {
  private activeRefetch: RefreshCallback | null = null;
  private currentPath: string = '';
  private lastRefreshId: number = 0;
  
  private state: OwnerRefreshState = {
    status: 'idle'
  };

  private listeners = new Set<(state: OwnerRefreshState) => void>();

  register(path: string, refetch: RefreshCallback) {
    this.currentPath = path;
    this.activeRefetch = refetch;
  }

  unregister(path: string) {
    if (this.currentPath === path) {
      this.activeRefetch = null;
      // If we unregister, reset state back to idle if we were verifying/refreshing
      if (this.state.status === 'verifying' || this.state.status === 'refreshing') {
        this.updateState({ status: 'idle' });
      }
    }
  }

  getState(): OwnerRefreshState {
    return this.state;
  }

  updateState(newState: Partial<OwnerRefreshState>) {
    this.state = {
      ...this.state,
      ...newState
    };
    this.listeners.forEach(l => l(this.state));
  }

  subscribe(listener: (state: OwnerRefreshState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrentPath() {
    return this.currentPath;
  }

  async triggerRefresh(): Promise<boolean> {
    // 11. Refresh Concurrency Protection
    if (this.state.status === 'verifying' || this.state.status === 'refreshing') {
      return false;
    }

    const refreshId = ++this.lastRefreshId;
    const pathAtStart = this.currentPath;

    this.updateState({ status: 'verifying', error: undefined });

    const isConnected = await verifyConnection();
    
    // 12. Check if route changed during verification
    if (refreshId !== this.lastRefreshId || this.currentPath !== pathAtStart) {
      return false;
    }

    if (!isConnected) {
      this.updateState({
        status: 'failed',
        error: 'Connection detected, but Nexora server is still unreachable.'
      });
      return false;
    }

    const sessionCheck = await verifySupabaseSession();
    
    // 12. Check if route changed during session check
    if (refreshId !== this.lastRefreshId || this.currentPath !== pathAtStart) {
      return false;
    }

    if (!sessionCheck.isValid || !sessionCheck.ownerId || !sessionCheck.shopId) {
      this.updateState({
        status: 'failed',
        error: 'Your session has expired. Please sign in again.'
      });
      await handleSessionExpiry();
      return false;
    }

    // Attempt offline preference sync
    try {
      const { syncOwnerPendingActions } = await import('./ownerPendingActionQueue');
      await syncOwnerPendingActions(sessionCheck.ownerId, sessionCheck.shopId);
    } catch (syncErr) {
      console.warn('Non-blocking offline preference sync failed:', syncErr);
    }

    // If no refetch function registered for this path, complete as success
    if (!this.activeRefetch) {
      this.updateState({
        status: 'success',
        refreshedAt: new Date().toISOString()
      });
      this.scheduleIdleReset();
      return true;
    }

    this.updateState({ status: 'refreshing' });

    try {
      await this.activeRefetch();

      // 12. Check if route changed during actual refetch
      if (refreshId !== this.lastRefreshId || this.currentPath !== pathAtStart) {
        return false;
      }

      this.updateState({
        status: 'success',
        refreshedAt: new Date().toISOString()
      });

      this.scheduleIdleReset();
      return true;
    } catch (err: any) {
      if (refreshId !== this.lastRefreshId || this.currentPath !== pathAtStart) {
        return false;
      }

      this.updateState({
        status: 'failed',
        error: err?.message || String(err)
      });
      return false;
    }
  }

  private scheduleIdleReset() {
    setTimeout(() => {
      if (this.state.status === 'success') {
        this.updateState({ status: 'idle' });
      }
    }, 3000);
  }
}

export const ownerConnectionRefreshManager = new OwnerConnectionRefreshManager();

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useRegisterRefresh(refetch: () => Promise<any>) {
  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    ownerConnectionRefreshManager.register(path, refetch);
    return () => {
      ownerConnectionRefreshManager.unregister(path);
    };
  }, [path, refetch]);
}

