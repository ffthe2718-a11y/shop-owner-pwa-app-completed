import { supabase } from '../lib/supabase';
import { clearOwnerOfflineData } from '../lib/ownerOfflineDb';

export interface LogoutOwnerOptions {
  ownerId?: string | null;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Executes secure owner logout in correct order:
 * 1. Obtains current owner ID if not provided
 * 2. Runs owner-specific IndexedDB data cleanup (clearOwnerOfflineData)
 * 3. Clears protected Cache Storage entries (preserves app shell / public assets)
 * 4. Executes Supabase auth signOut
 * 5. Clears local storage auth keys
 * 6. Safely handles errors without blocking session termination
 */
export async function logoutOwner(options?: LogoutOwnerOptions): Promise<void> {
  let ownerId = options?.ownerId;

  // 1. Get current authenticated owner ID if not explicitly passed
  if (!ownerId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        ownerId = user.id;
      } else {
        // Fallback check for simulated local profile
        const profStr = localStorage.getItem('nexora_local_profile');
        if (profStr) {
          const prof = JSON.parse(profStr);
          if (prof?.id) ownerId = prof.id;
        }
      }
    } catch (err) {
      console.warn('Could not fetch active user ID before logout:', err);
    }
  }

  // 2. Execute Owner-specific IndexedDB Cleanup
  if (ownerId) {
    try {
      await clearOwnerOfflineData(ownerId);
    } catch (error) {
      console.error('Owner offline data cleanup failed:', error);
    }
  } else {
    console.warn('Logout called without valid ownerId. Skipping IndexedDB store cleanup.');
  }

  // 3. Protected Cache Storage Cleanup
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        // Delete protected/owner/api response caches while leaving static PWA shell untouched
        if (
          name.includes('owner') ||
          name.includes('api') ||
          name.includes('protected') ||
          name.includes('supabase')
        ) {
          await caches.delete(name);
        }
      }
    } catch (cacheErr) {
      console.warn('Cache Storage cleanup note:', cacheErr);
    }
  }

  // 4. Supabase signOut & Local Storage Clear
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Supabase signOut error:', err);
  } finally {
    // Clear auth keys and local cached profiles
    localStorage.removeItem('nexora_auth_active');
    localStorage.removeItem('nexora_local_profile');
    localStorage.removeItem('nexora_local_shop');

    if (options?.onSuccess) {
      options.onSuccess();
    }
  }
}
