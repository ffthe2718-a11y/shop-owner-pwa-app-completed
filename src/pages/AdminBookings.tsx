import { useState, useEffect } from 'react';
import { adminState } from '../lib/adminState';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  CheckCircle,
  AlertCircle,
  XCircle,
  Store,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { scheduleData } from '../data/mock';

// We can supplement the core bookings with some extra shops info to make it cross-platform
const platformBookingsFeed = [
  { id: 'BK-4501', shopName: 'Royal Glow Salon', customer: 'Anita Sharma', service: 'Bridal Makeup', staff: 'Meera', date: 'Jul 23, 2026', time: '10:00 AM', status: 'In Progress', amount: '₹3,500' },
  { id: 'BK-4502', shopName: 'Royal Glow Salon', customer: 'Vikram Singh', service: 'Haircut & Beard', staff: 'Rahul', date: 'Jul 23, 2026', time: '11:30 AM', status: 'Pending', amount: '₹450' },
  { id: 'BK-4503', shopName: 'Royal Glow Salon', customer: 'Priya Patel', service: 'Hair Spa', staff: 'Sneha', date: 'Jul 23, 2026', time: '01:00 PM', status: 'Confirmed', amount: '₹1,200' },
  { id: 'BK-3908', shopName: 'Cut & Style Barbers', customer: 'Karan Johar', service: 'Luxury Shave & Facial', staff: 'Amit', date: 'Jul 22, 2026', time: '04:15 PM', status: 'Completed', amount: '₹950' },
  { id: 'BK-3907', shopName: 'Cut & Style Barbers', customer: 'Rohan Das', service: 'Classic Haircut', staff: 'Amit', date: 'Jul 22, 2026', time: '02:00 PM', status: 'Completed', amount: '₹400' },
  { id: 'BK-3504', shopName: 'Bliss Wellness & Yoga', customer: 'Neha Gupta', service: 'Deep Tissue Massage', staff: 'Meenakshi', date: 'Jul 20, 2026', time: '11:00 AM', status: 'Cancelled', amount: '₹2,200' },
  { id: 'BK-3502', shopName: 'Royal Glow Salon', customer: 'Rohan Das', service: 'Facial', staff: 'Amit', date: 'Jul 19, 2026', time: '03:00 PM', status: 'Completed', amount: '₹800' },
];

export default function AdminBookings() {
  const [bookings, setBookings] = useState(platformBookingsFeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');

  const shopsList = Array.from(new Set(bookings.map(b => b.shopName)));

  const handleRefresh = () => {
    // Simulate checking for new offline syncs
    const updated = [...bookings];
    setBookings(updated);
  };

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.service.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesShop = shopFilter === 'all' || b.shopName === shopFilter;
    return matchesSearch && matchesStatus && matchesShop;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cross-Platform Bookings</h1>
          <p className="text-slate-500 mt-1 text-sm">System-wide audit trail of customer reservations and service fulfilment</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-3xs cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Sync Log</span>
        </button>
      </div>

      {/* Query filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reservation ID, customer, or service..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Shop filters */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <select
              value={shopFilter}
              onChange={e => setShopFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none bg-white cursor-pointer"
            >
              <option value="all">All Outlets</option>
              {shopsList.map(shop => (
                <option key={shop} value={shop}>{shop}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Booking Audit List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-blue-600" />
            <span>Booking Ledger</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">ID & Outlet</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Service Details</th>
                <th className="p-4">Time Slot</th>
                <th className="p-4">Amount</th>
                <th className="p-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  
                  {/* ID & Shop */}
                  <td className="p-4 pl-6">
                    <p className="font-bold text-slate-900">{b.id}</p>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.shopName}</span>
                    </p>
                  </td>

                  {/* Customer */}
                  <td className="p-4">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.customer}</span>
                    </p>
                  </td>

                  {/* Service & Staff */}
                  <td className="p-4">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.service}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Staff: {b.staff}</p>
                  </td>

                  {/* Time slot */}
                  <td className="p-4 text-slate-700">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.date}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.time}</span>
                    </p>
                  </td>

                  {/* Amount */}
                  <td className="p-4 font-extrabold text-slate-900">
                    {b.amount}
                  </td>

                  {/* Status */}
                  <td className="p-4 pr-6 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      b.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : b.status === 'Cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : b.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : b.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {b.status === 'Completed' ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                      {b.status === 'Cancelled' ? <XCircle className="w-3.5 h-3.5" /> : null}
                      <span>{b.status}</span>
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBookings.length === 0 && (
          <div className="p-8 text-center text-slate-400 border-t border-slate-100 bg-white">
            No booking trails matched your filtering search.
          </div>
        )}
      </div>
    </div>
  );
}
