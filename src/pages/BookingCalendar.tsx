import { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, User,
  Database, RefreshCw
} from 'lucide-react';
import { useBookingsDatabase } from '../hooks/useBookingsDatabase';
import { useOwnerBookings } from '../hooks/useOwnerBookings';
import type { Booking } from '../types';

export default function BookingCalendar() {
  const {
    bookings: dbBookings,
    loading: dbLoading,
  } = useBookingsDatabase();

  const {
    data: cachedBookings,
    source,
    isLoading: cacheLoading,
    refetch
  } = useOwnerBookings();

  const bookingsList = useMemo(() => {
    const raw = source === 'cache' ? cachedBookings : dbBookings;
    return Array.isArray(raw) ? raw : [];
  }, [source, cachedBookings, dbBookings]);

  const loading = dbLoading && cacheLoading;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      days.push(date.toISOString().split('T')[0]);
    }

    return days;
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookingsList.forEach(b => {
      const d = b.booking_date || b.date;
      if (!d) return;
      const dateKey = String(d).split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(b);
    });
    return map;
  }, [bookingsList]);

  const selectedDateBookings = useMemo(() => {
    return bookingsByDate[selectedDate] || [];
  }, [bookingsByDate, selectedDate]);

  const renderStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Confirmed</span>;
      case 'Completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'Pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case 'Cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-600">Loading Calendar Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Offline Banner */}
      {source === 'cache' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-amber-700" />
            <div>
              <p className="font-bold text-sm text-amber-950">Showing saved bookings (Offline Mode)</p>
              <p className="text-xs text-amber-800">Actions are disabled while offline.</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
            Refresh
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Side */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Manage and view appointments by date</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-slate-50 p-3 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="bg-white min-h-[100px]" />;
                
                const isSelected = day === selectedDate;
                const isToday = day === new Date().toISOString().split('T')[0];
                const dayBookings = bookingsByDate[day] || [];
                
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={`bg-white min-h-[100px] p-2 flex flex-col items-start transition-all hover:bg-slate-50 cursor-pointer relative ${isSelected ? 'ring-2 ring-blue-600 z-10' : ''}`}
                  >
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg ${isToday ? 'bg-blue-600 text-white' : isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                      {new Date(day).getDate()}
                    </span>
                    
                    <div className="mt-2 space-y-1 w-full">
                      {dayBookings.slice(0, 2).map(b => (
                        <div key={b.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 truncate w-full text-left">
                          {b.customer_name}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[9px] font-black text-slate-400 pl-1">
                          + {dayBookings.length - 2} more
                        </div>
                      )}
                    </div>

                    {dayBookings.length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bookings List Side */}
        <div className="w-full lg:w-96 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">{selectedDateBookings.length} Bookings scheduled</p>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {selectedDateBookings.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-500">No bookings found for this date.</p>
              </div>
            ) : (
              selectedDateBookings.map(b => (
                <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                        <img src={b.avatar || `https://i.pravatar.cc/150?u=${b.id}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-none">{b.customer_name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1">{b.service_name}</p>
                      </div>
                    </div>
                    {renderStatusBadge(b.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {b.time}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {b.staff_name}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-black text-slate-900">₹{b.price}</p>
                    <button 
                      onClick={() => window.location.href = `/app/owner/bookings?id=${b.id}`}
                      className="text-[11px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
