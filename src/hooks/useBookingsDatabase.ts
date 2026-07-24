import { useState, useEffect, useCallback } from 'react';
import type { Booking, Service, Staff } from '../types';
import { api } from '../lib/api';

export function useBookingsDatabase() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDatabase = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedBookings, fetchedServices, fetchedStaff] = await Promise.all([
        api.getAppointments(),
        api.getServices(),
        api.getStaff()
      ]);
      setBookings(fetchedBookings as Booking[]);
      setServices(fetchedServices as Service[]);
      setStaff(fetchedStaff as Staff[]);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load database simulation:', err);
      setError(err?.message || 'Failed to load bookings database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabase();

    // Listen for sync messages from the Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'BOOKINGS_SYNCED') {
        console.log('Bookings synced from service worker! Refreshing database...');
        fetchDatabase();
      }
    };

    // When we go online, proactively notify the service worker to trigger a sync
    const handleOnline = () => {
      console.log('Browser is back online! Triggering offline queue sync...');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          if ('sync' in reg) {
            (reg as any).sync.register('sync-bookings').catch((err: any) => {
              console.warn('Background sync registration failed:', err);
            });
          }
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SYNC_BOOKINGS' });
          }
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    window.addEventListener('online', handleOnline);

    // If starting up already online, check/trigger sync
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchDatabase]);

  const addBooking = async (newBookingData: Omit<Booking, 'id' | 'created_at'>) => {
    try {
      const created = await api.addAppointment(newBookingData);
      setBookings(prev => [created as Booking, ...prev]);
      return created;
    } catch (err: any) {
      console.error('Error adding booking:', err);
      throw err;
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    try {
      const updated = await api.updateAppointment(id, updates);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
      return updated;
    } catch (err: any) {
      console.error('Error updating booking:', err);
      throw err;
    }
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    try {
      await api.updateAppointmentStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (err: any) {
      console.error('Error updating booking status:', err);
      throw err;
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      await api.deleteAppointment(id);
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      throw err;
    }
  };

  const bulkDeleteBookings = async (ids: string[]) => {
    try {
      await api.bulkDeleteAppointments(ids);
      setBookings(prev => prev.filter(b => !ids.includes(b.id)));
    } catch (err: any) {
      console.error('Error bulk deleting bookings:', err);
      throw err;
    }
  };

  const bulkUpdateStatus = async (ids: string[], status: Booking['status']) => {
    try {
      await api.bulkUpdateAppointmentsStatus(ids, status);
      setBookings(prev => prev.map(b => ids.includes(b.id) ? { ...b, status } : b));
    } catch (err: any) {
      console.error('Error bulk updating status:', err);
      throw err;
    }
  };

  // Database stats simulation
  const stats = (() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return {
      total: bookings.length,
      completed: bookings.filter(b => b.status === 'Completed').length,
      pending: bookings.filter(b => b.status === 'Pending').length,
      inProgress: bookings.filter(b => b.status === 'In Progress').length,
      confirmed: bookings.filter(b => b.status === 'Confirmed').length,
      cancelled: bookings.filter(b => b.status === 'Cancelled').length,
      totalRevenue: bookings
        .filter(b => b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'In Progress')
        .reduce((acc, b) => acc + (typeof b.price === 'number' ? b.price : 0), 0),
      currentMonthRevenue: bookings
        .filter(b => (b.date?.startsWith(currentMonth)) && (b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'In Progress'))
        .reduce((acc, b) => acc + (typeof b.price === 'number' ? b.price : 0), 0),
      currentMonthPending: bookings
        .filter(b => (b.date?.startsWith(currentMonth)) && b.status === 'Pending').length
    };
  })();

  return {
    bookings,
    services,
    staff,
    loading,
    error,
    stats,
    refresh: fetchDatabase,
    addBooking,
    updateBooking,
    updateBookingStatus,
    deleteBooking,
    bulkDeleteBookings,
    bulkUpdateStatus
  };
}
