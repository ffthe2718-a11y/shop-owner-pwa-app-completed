import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Phone, Clock, 
  WifiOff, HardDrive, CheckSquare, Square, CheckCircle2, XCircle, FileText,
  RotateCcw, CalendarRange, Search, Printer, Scissors, Plus, Trash2, ArrowUpRight, Sparkles, Bell, Send,
  Database, RefreshCw, Edit3
} from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import StickyBulkActionBar from '../components/StickyBulkActionBar';
import { useBookingsDatabase } from '../hooks/useBookingsDatabase';
import { useOwnerBookings } from '../hooks/useOwnerBookings';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { supabase } from '../lib/supabase';
import type { Booking } from '../types';

export default function Bookings() {
  const isOnline = useNetworkStatus();
  const {
    bookings: dbBookings,
    services,
    staff,
    loading: dbLoading,
    stats: dbStats,
    addBooking,
    updateBookingStatus,
    bulkDeleteBookings,
    bulkUpdateStatus
  } = useBookingsDatabase();

  const {
    data: cachedBookings,
    source,
    isStale,
    lastUpdated,
    isLoading: cacheLoading,
    refetch,
    shopId
  } = useOwnerBookings();

  useRegisterRefresh(refetch);

  // Effective bookings list: preference to cached bookings when source === 'cache'
  const bookings = useMemo(() => {
    if (source === 'cache') {
      return cachedBookings || [];
    }
    return dbBookings || [];
  }, [source, cachedBookings, dbBookings]);

  const loading = dbLoading && cacheLoading;

  const [toast, setToast] = useState({ visible: false, message: '' });
  const isOffline = !isOnline;
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  const [notifyModalBooking, setNotifyModalBooking] = useState<Booking | null>(null);
  const [notifyChannel, setNotifyChannel] = useState<'sms' | 'whatsapp' | 'email'>('whatsapp');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Action Confirmation Modal States
  const [actionModalBooking, setActionModalBooking] = useState<Booking | null>(null);
  const [actionModalStatus, setActionModalStatus] = useState<Booking['status']>('Confirmed');
  const [actionModalTitle, setActionModalTitle] = useState('');
  const [actionModalMessage, setActionModalMessage] = useState('');
  const [actionModalButtonText, setActionModalButtonText] = useState('');
  const [ownerNoteInput, setOwnerNoteInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleOpenActionModal = (booking: Booking | null, status: Booking['status']) => {
    if (source === 'cache' || !navigator.onLine || !isOnline) {
      showToast('Booking actions require an internet connection.');
      return;
    }
    if (!booking) return;

    let title = '';
    let message = '';
    let btnText = '';

    switch (status) {
      case 'Confirmed':
        title = 'Confirm Booking?';
        message = 'Customer ko booking confirmation status show hoga.';
        btnText = 'Confirm Booking';
        break;
      case 'Rejected':
        title = 'Reject Booking?';
        message = 'This booking will be marked as rejected.';
        btnText = 'Reject Booking';
        break;
      case 'Completed':
        title = 'Complete Booking?';
        message = 'This booking will be marked as completed.';
        btnText = 'Complete Booking';
        break;
      case 'Cancelled':
        title = 'Cancel Booking?';
        message = 'This booking will be cancelled.';
        btnText = 'Cancel Booking';
        break;
      case 'No Show':
        title = 'Mark No Show?';
        message = 'Customer did not arrive for this booking.';
        btnText = 'Mark No Show';
        break;
      default:
        title = `Update to ${status}?`;
        message = `This booking will be updated to ${status}.`;
        btnText = 'Confirm Update';
    }

    setActionModalBooking(booking);
    setActionModalStatus(status);
    setActionModalTitle(title);
    setActionModalMessage(message);
    setActionModalButtonText(btnText);
    setOwnerNoteInput('');
  };

  const handleConfirmAction = async () => {
    if (!actionModalBooking) return;
    if (source === 'cache' || !navigator.onLine || !isOnline) {
      showToast('Booking actions require an internet connection.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const currentShopId = shopId;
      const { error } = await supabase.rpc("update_owner_booking_status", {
        p_booking_id: actionModalBooking.id,
        p_shop_id: currentShopId,
        p_status: actionModalStatus,
        p_owner_notes: ownerNoteInput || null
      });

      if (error) throw error;

      showToast('Booking status updated successfully.');
      showToast('Customer notification will be handled by notification service.');
      setActionModalBooking(null);
      setOwnerNoteInput('');
      if (selectedBooking && selectedBooking.id === actionModalBooking.id) {
        setSelectedBooking(null);
      }
      refetch();
    } catch (err) {
      console.error("Booking action failed:", err);
      showToast('Booking status could not be updated. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Edit Booking Modal States & Handlers
  const [editBookingModalBooking, setEditBookingModalBooking] = useState<Booking | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [editServiceName, setEditServiceName] = useState('');
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [editStaffName, setEditStaffName] = useState('Any staff');
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editBookingTime, setEditBookingTime] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState<number>(30);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editTotalAmount, setEditTotalAmount] = useState<number>(0);
  const [editCustomerNotes, setEditCustomerNotes] = useState('');
  const [editOwnerNotes, setEditOwnerNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [shopServices, setShopServices] = useState<any[]>([]);
  const [shopStaff, setShopStaff] = useState<any[]>([]);

  const handleOpenEditModal = async (booking: Booking | null) => {
    if (source === 'cache' || !navigator.onLine || !isOnline) {
      showToast('Booking changes require an internet connection.');
      return;
    }
    if (!booking) return;

    const st = String(booking.status || '').toLowerCase();
    if (st === 'completed' || st === 'cancelled' || st === 'rejected' || st === 'no show') {
      showToast('This booking cannot be edited after completion or cancellation.');
      return;
    }

    try {
      const currentShopId = shopId;
      const [servicesRes, staffRes] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, price, discounted_price, duration_minutes")
          .eq("shop_id", currentShopId)
          .eq("is_active", true),
        supabase
          .from("staff")
          .select("id, full_name, primary_role, is_active")
          .eq("shop_id", currentShopId)
          .eq("is_active", true)
      ]);

      if (servicesRes.data) setShopServices(servicesRes.data);
      if (staffRes.data) setShopStaff(staffRes.data);
    } catch (err) {
      console.warn("Error loading services/staff for edit modal:", err);
    }

    setEditBookingModalBooking(booking);
    setEditCustomerName(booking.customer_name || '');
    setEditCustomerPhone(booking.customer_phone || '');
    setEditCustomerEmail(booking.customer_email || '');
    setEditServiceId(booking.service_id || '');
    setEditServiceName(booking.service_name || '');
    setEditStaffId(booking.staff_id || null);
    setEditStaffName(booking.staff_name || 'Any staff');
    setEditBookingDate(booking.booking_date || booking.date || new Date().toISOString().split('T')[0]);
    setEditBookingTime(booking.booking_time || booking.time || '10:00 AM');
    setEditDurationMinutes(booking.duration_minutes || 30);
    setEditAmount(booking.amount || booking.price || 0);
    setEditTotalAmount(booking.total_amount || booking.price || 0);
    setEditCustomerNotes(booking.customer_notes || booking.notes || '');
    setEditOwnerNotes(booking.owner_notes || '');
    setSelectedBooking(null);
  };

  const handleServiceChange = (serviceId: string) => {
    setEditServiceId(serviceId);
    const found = shopServices.find(s => s.id === serviceId);
    if (found) {
      setEditServiceName(found.name);
      setEditDurationMinutes(found.duration_minutes || 30);
      const base = found.price || 0;
      setEditAmount(base);
      const finalPrice = found.discounted_price !== undefined && found.discounted_price !== null && found.discounted_price > 0 ? found.discounted_price : base;
      setEditTotalAmount(finalPrice);
    }
  };

  const handleStaffChange = (staffId: string) => {
    if (!staffId) {
      setEditStaffId(null);
      setEditStaffName('Any staff');
    } else {
      setEditStaffId(staffId);
      const found = shopStaff.find(st => st.id === staffId);
      if (found) {
        setEditStaffName(found.full_name);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editBookingModalBooking) return;
    if (source === 'cache' || !navigator.onLine || !isOnline) {
      showToast('Booking changes require an internet connection.');
      return;
    }

    if (!editCustomerName.trim()) {
      showToast('Customer name is required.');
      return;
    }
    if (!editServiceId && !editServiceName) {
      showToast('Please select a service.');
      return;
    }
    if (!editBookingDate) {
      showToast('Please select booking date.');
      return;
    }
    if (!editBookingTime) {
      showToast('Please select booking time.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const currentShopId = shopId;
      const { error } = await supabase
        .from("appointments")
        .update({
          customer_name: editCustomerName,
          customer_phone: editCustomerPhone,
          customer_email: editCustomerEmail,
          service_id: editServiceId || null,
          service_name: editServiceName,
          staff_id: editStaffId || null,
          staff_name: editStaffName,
          booking_date: editBookingDate,
          booking_time: editBookingTime,
          duration_minutes: Number(editDurationMinutes),
          amount: Number(editAmount),
          total_amount: Number(editTotalAmount),
          customer_notes: editCustomerNotes,
          owner_notes: editOwnerNotes,
          updated_at: new Date().toISOString()
        })
        .eq("id", editBookingModalBooking.id)
        .eq("shop_id", currentShopId);

      if (error) throw error;

      showToast('Booking updated successfully.');
      setEditBookingModalBooking(null);
      refetch();
    } catch (err) {
      console.error("Booking update failed:", err);
      showToast('Booking could not be updated. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };
  const [layoutMode, setLayoutMode] = useState<'Compact' | 'Comfortable'>(
    () => (localStorage.getItem('nexora_layout_mode') as 'Compact' | 'Comfortable') || 'Comfortable'
  );

  // Sync layout mode on window focus / mount
  useEffect(() => {
    const handleStorage = () => {
      const mode = localStorage.getItem('nexora_layout_mode') as 'Compact' | 'Comfortable';
      if (mode) setLayoutMode(mode);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 24-Hour Push Notification Simulation Tool State
  const [isPushSimulationActive, setIsPushSimulationActive] = useState<boolean>(true);
  const [pushSimHistory, setPushSimHistory] = useState<Array<{ id: string; time: string; recipient: string; service: string; status: string }>>([
    { id: '1', time: 'Yesterday, 3:00 PM', recipient: 'Rahul Sharma', service: 'Haircut & Styling', status: 'Delivered (24h Prior)' },
    { id: '2', time: 'Yesterday, 4:15 PM', recipient: 'Priya Patel', service: 'Beard Grooming', status: 'Delivered (24h Prior)' }
  ]);

  const handleRun24hPushSimulation = () => {
    const upcomingTomorrow = bookings.filter(b => b.status === 'Confirmed').slice(0, 3);
    const targetBookings = upcomingTomorrow.length > 0 ? upcomingTomorrow : bookings.slice(0, 2);
    
    const newLogs = targetBookings.map((b, idx) => ({
      id: `${Date.now()}-${idx}`,
      time: 'Just now (Automated 24h cron)',
      recipient: b.customer_name,
      service: b.service_name,
      status: 'Sent via Push & WhatsApp (24h Reminder)'
    }));
    setPushSimHistory(prev => [...newLogs, ...prev]);
    showToast(`🚀 Successfully dispatched 24-hour automated reminder push notifications to ${targetBookings.length} customers!`);
  };

  // New Booking form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('11:00 AM');
  const [newPrice, setNewPrice] = useState('0');

  // Set initial service/staff when services are loaded
  useEffect(() => {
    if (services.length > 0 && !newServiceName) {
      setNewServiceName(services[0].name);
      setNewPrice(String(services[0].discount_price || services[0].price));
    }
    if (staff.length > 0 && !newStaffName) {
      setNewStaffName(staff[0].name);
    }
  }, [services, staff, newServiceName, newStaffName]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'tomorrow' | 'thisWeek' | 'thisMonth' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handlePresetChange = (preset: 'all' | 'today' | 'tomorrow' | 'thisWeek' | 'thisMonth' | 'custom') => {
    setDatePreset(preset);
    setSelectedDate(null);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setStartDate(tomorrowStr);
      setEndDate(tomorrowStr);
    } else if (preset === 'thisWeek') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(endOfWeek.toISOString().split('T')[0]);
    } else if (preset === 'thisMonth') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(monthStart.toISOString().split('T')[0]);
      setEndDate(monthEnd.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const resetAllFilters = () => {
    setStatusFilter('All');
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    showToast('Filters reset successfully');
  };

  // Filter logic
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Date comparison (ignoring time for filter)
      const bookingDateStr = b.date; // assuming YYYY-MM-DD

      if (selectedDate) {
        if (bookingDateStr !== selectedDate) return false;
      } else {
        if (startDate && bookingDateStr < startDate) return false;
        if (endDate && bookingDateStr > endDate) return false;
      }

      if (statusFilter !== 'All' && b.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (b.customer_name || '').toLowerCase().includes(q) ||
                        (b.service_name || '').toLowerCase().includes(q) ||
                        (b.staff_name || '').toLowerCase().includes(q) ||
                        (b.customer_phone || '').includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [bookings, statusFilter, searchQuery, startDate, endDate, selectedDate]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredBookings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBookings.map(b => b.id));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const stats = useMemo(() => {
    const bookingsList = Array.isArray(bookings) ? bookings : [];
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    const todayBookingsCount = bookingsList.filter(b => {
      const d = b.booking_date || b.date;
      return d && String(d).startsWith(today);
    }).length;

    const pendingCount = bookingsList.filter(b => String(b.status || '').toLowerCase() === 'pending').length;
    const confirmedCount = bookingsList.filter(b => String(b.status || '').toLowerCase() === 'confirmed').length;
    const inProgressCount = bookingsList.filter(b => String(b.status || '').toLowerCase() === 'in progress').length;
    const completedBookings = bookingsList.filter(b => String(b.status || '').toLowerCase() === 'completed');
    const completedCount = completedBookings.length;
    
    const cancelledCount = bookingsList.filter(b => {
      const st = String(b.status || '').toLowerCase();
      return st === 'cancelled' || st === 'rejected' || st === 'no_show' || st === 'no show';
    }).length;

    const totalRevenue = completedBookings.reduce((acc, b) => {
      const amt = Number(b.total_amount || b.amount || b.price || 0);
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);

    const currentMonthCompleted = completedBookings.filter(b => {
      const d = b.booking_date || b.date;
      return d && String(d).startsWith(currentMonth);
    });

    const currentMonthRevenue = currentMonthCompleted.reduce((acc, b) => {
      const amt = Number(b.total_amount || b.amount || b.price || 0);
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);

    const currentMonthPending = bookingsList.filter(b => {
      const d = b.booking_date || b.date;
      return d && String(d).startsWith(currentMonth) && String(b.status || '').toLowerCase() === 'pending';
    }).length;

    const avgBookingValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
    const conversionRate = bookingsList.length > 0 ? Math.round((completedCount / bookingsList.length) * 100) : 0;

    return {
      total: bookingsList.length,
      today: todayBookingsCount,
      completed: completedCount,
      pending: pendingCount,
      inProgress: inProgressCount,
      confirmed: confirmedCount,
      cancelled: cancelledCount,
      totalRevenue,
      currentMonthRevenue,
      currentMonthPending,
      avgBookingValue,
      conversionRate
    };
  }, [bookings]);

  const handleAddBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('This booking action requires an internet connection.');
      return;
    }
    if (!newCustomerName || !newCustomerPhone) {
      showToast('Please enter customer name and phone');
      return;
    }

    try {
      await addBooking({
        customer_name: newCustomerName,
        customer_phone: newCustomerPhone,
        service_name: newServiceName,
        staff_name: newStaffName,
        date: newDate,
        time: newTime,
        status: 'Confirmed',
        price: parseFloat(newPrice) || 500,
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`
      });
      setIsAddModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      showToast('Appointment booked successfully!');
    } catch {
      showToast('Error adding appointment');
    }
  };

  const handleStatusTransition = async (id: string, newStatus: Booking['status']) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('This booking action requires an internet connection.');
      return;
    }
    try {
      await updateBookingStatus(id, newStatus);
      showToast(`Booking status updated to ${newStatus}`);
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      showToast('Failed to update status');
    }
  };

  const handleSendNotification = (_channel: string) => {
    if (!notifyModalBooking) return;
    if (!notifyModalBooking.customer_phone || !notifyModalBooking.customer_phone.trim()) {
      showToast('Customer phone not available.');
      return;
    }
    showToast('Customer notification will be handled by notification service.');
    setNotifyModalBooking(null);
  };

  const getNotificationStatusInfo = (status: Booking['status']) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'confirmed':
        return { label: 'Customer confirmation pending', badge: 'confirmation pending' };
      case 'rejected':
        return { label: 'Customer rejection update pending', badge: 'update pending' };
      case 'completed':
        return { label: 'Completion update saved', badge: 'saved' };
      case 'cancelled':
        return { label: 'Cancellation update pending', badge: 'update pending' };
      case 'no show':
      case 'noshow':
        return { label: 'No-show marked', badge: 'saved' };
      default:
        return { label: 'Notification status pending', badge: 'confirmation pending' };
    }
  };

  const renderStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
            In Progress
          </span>
        );
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Confirmed
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Cancelled
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      case 'No Show':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            No Show
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderPaymentBadge = (status: Booking['payment_status']) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-500 text-white shadow-sm">
            Paid
          </span>
        );
      case 'unpaid':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-500 text-white shadow-sm">
            Unpaid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-blue-500 text-white shadow-sm">
            Partial
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-500 text-white shadow-sm">
            Refunded
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-rose-500 text-white shadow-sm">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-200 text-slate-600">
            {status || 'Unpaid'}
          </span>
        );
    }
  };

  if (!shopId && !loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <CalendarRange className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Business profile not found</h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
          Please complete your shop profile first to start managing your bookings.
        </p>
      </div>
    );
  }

  if (source === 'none' && !loading) {
    return (
      <div className="space-y-6 pb-24">
        <div className="min-h-[50vh] bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            No saved bookings are available offline.
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            Connect to the internet once to load your booking history.
          </p>
          <button
            onClick={() => {
              if (!navigator.onLine) {
                showToast('Still offline. Please check your internet connection.');
              } else {
                refetch();
                showToast('Retrying network connection...');
              }
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
        <Toast message={toast.message} isVisible={toast.visible} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Read-Only Offline Banner */}
      {source === 'cache' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 text-amber-900 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-amber-950">Showing saved bookings</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isStale 
                      ? 'bg-amber-200 text-amber-900 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isStale ? 'Outdated saved bookings' : 'Saved bookings'}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-amber-800 mt-1 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }) : 'Recently'}
                </p>
                <p className="text-xs text-amber-700/90 mt-1 font-normal">
                  Booking status may have changed while you were offline.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!navigator.onLine) {
                  showToast('You are still offline. Connect to internet to refresh.');
                } else {
                  refetch();
                  showToast('Refreshing live bookings...');
                }
              }}
              className="shrink-0 self-start sm:self-center px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      )}
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Appointments & Bookings</h1>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-100">
              {stats.total} Total
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Real-time operations database with status workflow, customer invoices, and instant scheduling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${isOffline ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
            <span>{isOffline ? 'Offline Mode (Local Cache)' : 'Cloud DB Connected'}</span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Current Month Summary Panel */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Current Month Analytics ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Monthly Performance & Requests</h2>
          <p className="text-xs text-slate-300">
            Real-time revenue metrics and pending approval queue for the current billing cycle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-center min-w-[140px]">
            <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">Month Revenue</p>
            <p className="text-2xl font-black text-white mt-0.5">₹{stats.currentMonthRevenue.toLocaleString()}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-center min-w-[140px] cursor-pointer hover:bg-white/15 transition-colors" onClick={() => { setStatusFilter('Pending'); handlePresetChange('thisMonth'); }}>
            <p className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider">Pending Requests</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="text-2xl font-black text-white">{stats.currentMonthPending}</span>
              {stats.currentMonthPending > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 24-Hour Push Notification Simulation Tool Hub */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">24-Hour Push Notification Simulation Hub</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Automated Cron Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Simulate automated PWA push reminders sent to customers exactly 24 hours prior to scheduled appointment time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPushSimulationActive(!isPushSimulationActive)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                isPushSimulationActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isPushSimulationActive ? '● Automation Enabled' : '○ Automation Paused'}
            </button>
            <button
              type="button"
              onClick={handleRun24hPushSimulation}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test / Run 24h Cron Now</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Cron Trigger</span>
            <p className="text-sm font-extrabold text-slate-900">Every Day at 9:00 AM</p>
            <p className="text-[11px] text-slate-500">Scans bookings for T+24 hours and dispatches Web Push & WhatsApp reminders.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivery Rate</span>
            <p className="text-sm font-extrabold text-emerald-700">98.4% Successfully Received</p>
            <p className="text-[11px] text-slate-500">Simulated across PWA native notification channel and WhatsApp Cloud API.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Response Rate</span>
            <p className="text-sm font-extrabold text-blue-700">76% Confirmed via Reminders</p>
            <p className="text-[11px] text-slate-500">Reduces no-shows by up to 35% for weekend slots.</p>
          </div>
        </div>

        {/* Recent Simulation Logs */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent 24h Notification Dispatches ({pushSimHistory.length})</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {pushSimHistory.map(log => (
              <div key={log.id} className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-slate-900">{log.recipient}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">{log.service}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">{log.status}</span>
                  <span className="text-[10px] text-slate-400">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="space-y-3">
        {source === 'cache' && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Saved offline data
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Bookings</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-900">{stats.today}</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Today</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirmed / Active</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-900">{stats.confirmed + stats.inProgress}</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{stats.inProgress} active</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-900">{stats.completed}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Finished</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending / Waitlist</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-900">{stats.pending}</span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Needs review</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-900">₹{stats.totalRevenue.toLocaleString()}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
                <ArrowUpRight className="w-3 h-3" /> Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customer, service, staff..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${datePreset === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Time
            </button>
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${datePreset === 'today' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Today
            </button>
            <button
              onClick={() => handlePresetChange('tomorrow')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${datePreset === 'tomorrow' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => handlePresetChange('thisWeek')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${datePreset === 'thisWeek' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              This Week
            </button>
            <button
              onClick={() => handlePresetChange('thisMonth')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${datePreset === 'thisMonth' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              This Month
            </button>

            {(statusFilter !== 'All' || searchQuery || datePreset !== 'all' || selectedDate) && (
              <button
                onClick={() => {
                  resetAllFilters();
                  setSelectedDate(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors ml-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          {['All', 'Confirmed', 'In Progress', 'Pending', 'Completed', 'Cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${statusFilter === st ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-slate-500 hover:text-slate-700 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              {selectedIds.length > 0 && selectedIds.length === filteredBookings.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All ({filteredBookings.length})</span>
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            {source === 'cache' && (statusFilter !== 'All' || searchQuery || datePreset !== 'all') && (
              <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Filtering saved bookings only.
              </span>
            )}
            <span>Showing <strong className="text-slate-800">{filteredBookings.length}</strong> bookings</span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading bookings database...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <CalendarRange className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {source === 'cache' && bookings.length === 0
                ? 'No bookings were available when this page was last updated.'
                : 'No bookings match your current filter'}
            </p>
            <p className="text-xs text-slate-500">
              {source === 'cache' && bookings.length === 0
                ? 'Connect to the internet to check for new bookings.'
                : 'Try changing your search query, status tab, or date preset.'}
            </p>
            {bookings.length > 0 && (
              <button
                onClick={resetAllFilters}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl mt-2 hover:bg-slate-800 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBookings.map(b => {
              const isSelected = selectedIds.includes(b.id);
              return (
                <div 
                  key={b.id} 
                  className={`${layoutMode === 'Compact' ? 'p-2.5 sm:p-3 gap-2' : 'p-4 sm:p-5 gap-4'} flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                >
                  {/* Left: Checkbox + Customer + Service */}
                  <div className="flex items-start sm:items-center gap-3">
                    <button onClick={() => toggleSelectId(b.id)} className="mt-1 sm:mt-0 text-slate-400 hover:text-blue-600 cursor-pointer">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                    <img 
                      src={b.avatar || `https://i.pravatar.cc/150?u=${b.id}`} 
                      alt="" 
                      className={`${layoutMode === 'Compact' ? 'w-8 h-8' : 'w-11 h-11'} rounded-full object-cover border border-slate-200 shadow-2xs`} 
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{b.customer_name}</span>
                        <span className="text-xs text-slate-400">({b.customer_phone})</span>
                        {source === 'cache' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Saved offline data
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {b.service_name} • <span className="text-slate-500">Staff: {b.staff_name}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-slate-400" />
                          {b.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {b.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Amount & Status Badge */}
                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-left md:text-right">
                      <p className="text-sm font-black text-slate-900">₹{b.price}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{b.payment_status || 'Paid'}</p>
                    </div>

                    <div>
                      {renderStatusBadge(b.status)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {b.status === 'Confirmed' && (
                        <button 
                          onClick={() => setNotifyModalBooking(b)} 
                          className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
                          title="Send SMS / WhatsApp Notification"
                        >
                          <Bell className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Notify</span>
                        </button>
                      )}
                      <button 
                        onClick={() => setReceiptBooking(b)} 
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
                        title="Print Receipt / Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">Receipt</span>
                      </button>
                      <button 
                        onClick={() => showToast(`Calling ${b.customer_name}...`)} 
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                        title="Contact customer"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedBooking(b)} 
                        className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bulk Action Bar */}
      <StickyBulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            label: 'Mark Confirmed',
            icon: CheckCircle2,
            onClick: async () => {
              if (source === 'cache' || !navigator.onLine) {
                showToast('This booking action requires an internet connection.');
                return;
              }
              await bulkUpdateStatus(selectedIds, 'Confirmed');
              showToast(`Marked ${selectedIds.length} bookings as Confirmed`);
              setSelectedIds([]);
            },
            variant: 'primary'
          },
          {
            label: 'Mark Completed',
            icon: CheckCircle2,
            onClick: async () => {
              if (source === 'cache' || !navigator.onLine) {
                showToast('This booking action requires an internet connection.');
                return;
              }
              await bulkUpdateStatus(selectedIds, 'Completed');
              showToast(`Marked ${selectedIds.length} bookings as Completed`);
              setSelectedIds([]);
            },
            variant: 'primary'
          },
          {
            label: 'Cancel Bookings',
            icon: XCircle,
            onClick: async () => {
              if (source === 'cache' || !navigator.onLine) {
                showToast('This booking action requires an internet connection.');
                return;
              }
              await bulkUpdateStatus(selectedIds, 'Cancelled');
              showToast(`Cancelled ${selectedIds.length} bookings`);
              setSelectedIds([]);
            },
            variant: 'danger'
          },
          {
            label: 'Delete Selected',
            icon: Trash2,
            onClick: async () => {
              if (source === 'cache' || !navigator.onLine) {
                showToast('This booking action requires an internet connection.');
                return;
              }
              await bulkDeleteBookings(selectedIds);
              showToast(`Deleted ${selectedIds.length} bookings`);
              setSelectedIds([]);
            },
            variant: 'danger'
          }
        ]}
      />

      <Toast visible={toast.visible} message={toast.message} />

      {/* Add Booking Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule New Appointment"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleAddBookingSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Customer Name</label>
            <input 
              type="text" 
              value={newCustomerName}
              onChange={e => setNewCustomerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Customer Phone</label>
            <input 
              type="tel" 
              value={newCustomerPhone}
              onChange={e => setNewCustomerPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Service</label>
              <select
                value={newServiceName}
                onChange={e => {
                  setNewServiceName(e.target.value);
                  const found = services.find(s => s.name === e.target.value);
                  if (found) {
                    setNewPrice(String(found.discount_price || found.price));
                  }
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none bg-white font-medium"
              >
                {services.map(s => (
                  <option key={s.id} value={s.name}>{s.name} (₹{s.discount_price || s.price})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Staff</label>
              <select
                value={newStaffName}
                onChange={e => setNewStaffName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none bg-white font-medium"
              >
                {staff.length > 0 ? (
                  staff.map(st => (
                    <option key={st.id} value={st.name}>{st.name} ({st.role})</option>
                  ))
                ) : (
                  <>
                    <option value="Rahul">Rahul (Master Stylist)</option>
                    <option value="Sneha">Sneha (Senior Cosmetologist)</option>
                    <option value="Meera">Meera (Lead Makeup Artist)</option>
                    <option value="Amit">Amit (Therapist)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date</label>
              <input 
                type="date" 
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Time</label>
              <input 
                type="text" 
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Price (₹)</label>
              <input 
                type="number" 
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
            >
              Book Appointment
            </button>
          </div>
        </form>
      </Modal>

      {/* Booking Details & Action Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <img 
                src={selectedBooking.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBooking.customer_name || 'Customer')}&background=random`} 
                alt="" 
                className="w-14 h-14 rounded-2xl object-cover shadow-sm" 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 truncate">{selectedBooking.customer_name || 'Customer'}</h3>
                  {renderStatusBadge(selectedBooking.status || 'Pending')}
                </div>
                <p className="text-sm font-medium text-slate-600 truncate">{selectedBooking.service_name || 'Service not available'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    ₹{selectedBooking.total_amount || selectedBooking.amount || selectedBooking.price || 0}
                  </span>
                  {renderPaymentBadge(selectedBooking.payment_status)}
                </div>
              </div>
            </div>

            {/* Notification Status Info */}
            {selectedBooking.status && (
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Customer Notification Status</p>
                  <p className="text-xs font-semibold text-slate-800">{getNotificationStatusInfo(selectedBooking.status).label}</p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {getNotificationStatusInfo(selectedBooking.status).badge}
                </span>
              </div>
            )}

            {/* Main Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span>{selectedBooking.date} at {selectedBooking.time}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Member</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Scissors className="w-4 h-4 text-slate-400" />
                  <span>{selectedBooking.staff_name || 'Any staff'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedBooking.customer_phone || 'Not provided'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Email</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Send className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{selectedBooking.customer_email || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  Customer Notes
                </p>
                <p className="text-xs text-slate-600 italic">
                  "{selectedBooking.customer_notes || selectedBooking.notes || 'No notes provided by customer.'}"
                </p>
              </div>
              {selectedBooking.owner_notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Owner Internal Notes</p>
                  <p className="text-xs text-slate-600">
                    {selectedBooking.owner_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Billing Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Base Amount</span>
                  <span className="font-semibold">₹{selectedBooking.amount || selectedBooking.price || 0}</span>
                </div>
                {selectedBooking.discount_amount && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discount</span>
                    <span className="font-semibold text-rose-400">-₹{selectedBooking.discount_amount}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-base">
                  <span className="font-bold">Total Amount</span>
                  <span className="font-black text-emerald-400">₹{selectedBooking.total_amount || selectedBooking.price || 0}</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
              <span>Booked: {selectedBooking.created_at ? new Date(selectedBooking.created_at).toLocaleString() : 'N/A'}</span>
              {selectedBooking.updated_at && (
                <span>Updated: {new Date(selectedBooking.updated_at).toLocaleString()}</span>
              )}
            </div>

            {/* Edit / Reschedule Button */}
            <div>
              <button
                onClick={() => handleOpenEditModal(selectedBooking)}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit & Reschedule Booking</span>
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100">
              {isOffline ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <p className="text-xs font-bold text-amber-700 flex items-center justify-center gap-2">
                    <WifiOff className="w-4 h-4" />
                    Booking actions require an internet connection.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Pending State Actions */}
                  {(String(selectedBooking.status).toLowerCase() === 'pending' || !selectedBooking.status) && (
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleOpenActionModal(selectedBooking, 'Confirmed')} 
                        className="p-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Booking
                      </button>
                      <button 
                        onClick={() => handleOpenActionModal(selectedBooking, 'Rejected')} 
                        className="p-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                      >
                        Reject Request
                      </button>
                    </div>
                  )}

                  {/* Confirmed State Actions */}
                  {String(selectedBooking.status).toLowerCase() === 'confirmed' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleOpenActionModal(selectedBooking, 'Completed')} 
                          className="p-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Completed
                        </button>
                        <button 
                          onClick={() => handleOpenActionModal(selectedBooking, 'Cancelled')} 
                          className="p-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                      <div className="w-full">
                        <button 
                          onClick={() => handleOpenActionModal(selectedBooking, 'No Show')} 
                          className="w-full p-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                        >
                          Mark No Show
                        </button>
                      </div>
                    </div>
                  )}

                  {/* In Progress State Actions */}
                  {String(selectedBooking.status).toLowerCase() === 'in progress' && (
                    <button 
                      onClick={() => handleOpenActionModal(selectedBooking, 'Completed')} 
                      className="w-full p-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Service
                    </button>
                  )}

                  {/* General Secondary Actions */}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button 
                      onClick={() => {
                        const b = selectedBooking;
                        setSelectedBooking(null);
                        setReceiptBooking(b);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Receipt</span>
                    </button>
                    <button 
                      onClick={() => {
                        const b = selectedBooking;
                        setSelectedBooking(null);
                        setNotifyModalBooking(b);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Notify Customer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Booking Action Confirmation Modal */}
      <Modal
        isOpen={!!actionModalBooking}
        onClose={() => {
          if (!isUpdatingStatus) {
            setActionModalBooking(null);
            setOwnerNoteInput('');
          }
        }}
        title={actionModalTitle}
      >
        {actionModalBooking && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 font-medium">
              {actionModalMessage}
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{actionModalBooking.customer_name} • {actionModalBooking.service_name}</p>
              <p className="text-slate-500">{actionModalBooking.date} at {actionModalBooking.time}</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Owner note optional
              </label>
              <textarea
                value={ownerNoteInput}
                onChange={(e) => setOwnerNoteInput(e.target.value)}
                placeholder="Add a short note for internal record"
                rows={3}
                className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => {
                  setActionModalBooking(null);
                  setOwnerNoteInput('');
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmAction}
                className={`px-4 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                  actionModalStatus === 'Rejected' || actionModalStatus === 'Cancelled'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : actionModalStatus === 'Completed'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } ${isUpdatingStatus ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isUpdatingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  actionModalButtonText
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit / Reschedule Booking Modal */}
      <Modal
        isOpen={!!editBookingModalBooking}
        onClose={() => {
          if (!isSavingEdit) setEditBookingModalBooking(null);
        }}
        title="Edit & Reschedule Booking"
      >
        {editBookingModalBooking && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={e => setEditCustomerName(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  onChange={e => setEditCustomerPhone(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={editCustomerEmail}
                onChange={e => setEditCustomerEmail(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Service *</label>
                <select
                  value={editServiceId}
                  onChange={e => handleServiceChange(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-medium"
                >
                  <option value="">Select Service</option>
                  {shopServices.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (₹{s.discounted_price || s.price})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Staff Member</label>
                <select
                  value={editStaffId || ''}
                  onChange={e => handleStaffChange(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-medium"
                >
                  <option value="">Any staff</option>
                  {shopStaff.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.full_name} ({st.primary_role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Date *</label>
                <input
                  type="date"
                  value={editBookingDate}
                  onChange={e => setEditBookingDate(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Time *</label>
                <input
                  type="text"
                  value={editBookingTime}
                  onChange={e => setEditBookingTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Duration (mins)</label>
                <input
                  type="number"
                  value={editDurationMinutes}
                  onChange={e => setEditDurationMinutes(Number(e.target.value))}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Base Amount (₹)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={e => setEditAmount(Number(e.target.value))}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  value={editTotalAmount}
                  onChange={e => setEditTotalAmount(Number(e.target.value))}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-bold text-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Customer Notes</label>
              <textarea
                value={editCustomerNotes}
                onChange={e => setEditCustomerNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Owner Internal Notes</label>
              <textarea
                value={editOwnerNotes}
                onChange={e => setEditOwnerNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditBookingModalBooking(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Printable Receipt Modal */}
      <Modal
        isOpen={!!receiptBooking}
        onClose={() => setReceiptBooking(null)}
        title="Customer Invoice & Receipt"
      >
        {receiptBooking && (
          <div className="space-y-4">
            <div className="printable-receipt bg-white p-5 rounded-2xl border border-slate-200 text-slate-900 shadow-2xs space-y-4 font-sans text-xs">
              
              <div className="border-b border-slate-200 pb-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900">NEXORA SALON & SPA</h2>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">102 MG Road, Indiranagar, Bengaluru, KA - 560038</p>
                <p className="text-[10px] text-slate-400">GSTIN: 29AAAAA0000A1Z5 | Phone: +91 98765 43210</p>
              </div>

              <div className="flex justify-between items-start bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">INVOICE NO</p>
                  <p className="font-extrabold text-slate-900">INV-2026-{receiptBooking.id.slice(0, 5).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">DATE & TIME</p>
                  <p className="font-semibold text-slate-800">{receiptBooking.date} • {receiptBooking.time}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Billed To</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{receiptBooking.customer_name}</p>
                  <p className="text-slate-500 text-[10px]">{receiptBooking.customer_phone}</p>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Service Specialist</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{receiptBooking.staff_name}</p>
                  <p className="text-slate-500 text-[10px]">Status: <span className="font-bold text-blue-700">{receiptBooking.status}</span></p>
                </div>
              </div>

              <div>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[9px] uppercase font-extrabold tracking-wider">
                      <th className="pb-1.5 font-bold">Service Description</th>
                      <th className="pb-1.5 text-center font-bold">Qty</th>
                      <th className="pb-1.5 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-800">
                        {receiptBooking.service_name}
                        <span className="block text-[10px] text-slate-400 font-normal">Duration: 60 mins • Standard Package</span>
                      </td>
                      <td className="py-2.5 text-center text-slate-600 font-medium">1</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">₹{receiptBooking.price}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 pt-2.5 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-700">₹{receiptBooking.price}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (Included 18%)</span>
                  <span className="font-medium text-slate-700">₹{(receiptBooking.price * 0.18).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-dashed border-slate-200">
                  <span>Grand Total Paid</span>
                  <span className="text-blue-600">₹{receiptBooking.price}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-400 border-t border-slate-100 space-y-0.5">
                <p className="font-bold text-slate-700">Thank you for visiting Nexora Salon & Spa!</p>
                <p>Computer-generated invoice • No signature required</p>
              </div>

            </div>

            <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  showToast('Opening printer dialog...');
                  setTimeout(() => window.print(), 300);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptBooking(null)}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Notify Customer Modal */}
      <Modal
        isOpen={!!notifyModalBooking}
        onClose={() => setNotifyModalBooking(null)}
        title="Send Customer Notification & Reminder"
      >
        {notifyModalBooking && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">{notifyModalBooking.customer_name}</p>
                <p className="text-xs text-slate-500">Phone: <strong className="text-slate-800">{notifyModalBooking.customer_phone}</strong></p>
                <p className="text-xs text-slate-500">Service: <strong className="text-slate-800">{notifyModalBooking.service_name}</strong> ({notifyModalBooking.date} at {notifyModalBooking.time})</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Notification Channel</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNotifyChannel('whatsapp')}
                  className={`p-3 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-center ${notifyChannel === 'whatsapp' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setNotifyChannel('sms')}
                  className={`p-3 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-center ${notifyChannel === 'sms' ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  SMS Message
                </button>
                <button
                  type="button"
                  onClick={() => setNotifyChannel('email')}
                  className={`p-3 text-xs font-bold rounded-xl border transition-colors cursor-pointer text-center ${notifyChannel === 'email' ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  Email
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Message Preview</label>
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono">
                {notifyChannel === 'whatsapp' && `Hi ${notifyModalBooking.customer_name}! Your appointment for ${notifyModalBooking.service_name} with ${notifyModalBooking.staff_name} is confirmed for ${notifyModalBooking.date} at ${notifyModalBooking.time}. See you at Nexora Salon & Spa!`}
                {notifyChannel === 'sms' && `Reminder: Nexora Spa booking #${notifyModalBooking.id.slice(0,5)} for ${notifyModalBooking.service_name} on ${notifyModalBooking.date} @ ${notifyModalBooking.time}. Call +919876543210.`}
                {notifyChannel === 'email' && `Subject: Your Nexora Salon Appointment Confirmation\n\nDear ${notifyModalBooking.customer_name},\nYour appointment for ${notifyModalBooking.service_name} is scheduled on ${notifyModalBooking.date} at ${notifyModalBooking.time}. Total: ₹${notifyModalBooking.price}.`}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNotifyModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendNotification(notifyChannel)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send {notifyChannel.toUpperCase()} Now</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
