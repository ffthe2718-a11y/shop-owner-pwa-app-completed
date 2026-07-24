// IndexedDB Helper for Offline PWA Storage & Schedule Synchronization

const DB_NAME = 'NexoraOfflineDB';
const DB_VERSION = 2;

export interface PendingShopUpdate {
  id?: number;
  shopId?: string;
  updateType: string;
  payload: Record<string, any>;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
  retryCount?: number;
}

export interface OfflineAppointment {
  id: string;
  customer_name: string;
  customer_phone?: string;
  service_name: string;
  staff_name?: string;
  date: string;
  time: string;
  status: string;
  price: number;
  syncedAt?: number;
}

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for Appointments / Schedule
      if (!db.objectStoreNames.contains('appointments')) {
        const apptStore = db.createObjectStore('appointments', { keyPath: 'id' });
        apptStore.createIndex('date', 'date', { unique: false });
        apptStore.createIndex('status', 'status', { unique: false });
      }

      // Store for Staff
      if (!db.objectStoreNames.contains('staff')) {
        db.createObjectStore('staff', { keyPath: 'id' });
      }

      // Store for Services
      if (!db.objectStoreNames.contains('services')) {
        db.createObjectStore('services', { keyPath: 'id' });
      }

      // Store for Customers
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }

      // Store for Pending Offline Mutations (to sync when back online)
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
      }

      // Dedicated Store for Pending Shop Update Requests
      if (!db.objectStoreNames.contains('pendingShopUpdates')) {
        const store = db.createObjectStore('pendingShopUpdates', { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Cache Appointments to IndexedDB
export async function cacheAppointmentsLocally(appointments: OfflineAppointment[]): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('appointments', 'readwrite');
    const store = tx.objectStore('appointments');

    // Store each appointment with timestamp
    const now = Date.now();
    for (const appt of appointments) {
      store.put({ ...appt, syncedAt: now });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to cache appointments in IndexedDB:', err);
  }
}

// Get Cached Appointments from IndexedDB
export async function getCachedAppointmentsLocally(): Promise<OfflineAppointment[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('appointments', 'readonly');
    const store = tx.objectStore('appointments');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve appointments from IndexedDB:', err);
    return [];
  }
}

// Cache Generic Key-Value / Store data
export async function cacheStoreData(storeName: 'staff' | 'services' | 'customers', items: any[]): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const item of items) {
      if (item && item.id) {
        store.put(item);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`Failed to cache ${storeName} in IndexedDB:`, err);
  }
}

// Get Cached Store Data
export async function getCachedStoreData(storeName: 'staff' | 'services' | 'customers'): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`Failed to read ${storeName} from IndexedDB:`, err);
    return [];
  }
}
