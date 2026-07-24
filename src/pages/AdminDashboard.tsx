import { useState, useEffect } from 'react';
import { adminState } from '../lib/adminState';
import type { AdminShop, AdminPayout } from '../types';
import { 
  Store, 
  CalendarDays, 
  IndianRupee, 
  Percent, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// Simulated platform-wide registration and growth data
const platformChartData = [
  { month: 'Feb', registrations: 1, revenue: 15400, bookings: 42 },
  { month: 'Mar', registrations: 3, revenue: 24800, bookings: 78 },
  { month: 'Apr', registrations: 5, revenue: 49200, bookings: 130 },
  { month: 'May', registrations: 8, revenue: 86400, bookings: 210 },
  { month: 'Jun', registrations: 12, revenue: 112000, bookings: 310 },
  { month: 'Jul', registrations: 15, revenue: 193900, bookings: 360 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const loadData = () => {
      setShops(adminState.getShops());
      setPayouts(adminState.getPayouts());
      setCommissionRate(adminState.getCommission());
      setIsMaintenance(adminState.isMaintenanceMode());
    };

    loadData();
    window.addEventListener('nexora_admin_state_changed', loadData);
    return () => window.removeEventListener('nexora_admin_state_changed', loadData);
  }, []);

  const totalShops = shops.length;
  const activeShops = shops.filter(s => s.status === 'active').length;
  const pendingShops = shops.filter(s => s.status === 'pending').length;

  const totalBookings = shops.reduce((sum, s) => sum + s.total_bookings, 0) + 18; // base offline mock + real-time
  const totalGMV = shops.reduce((sum, s) => sum + s.total_revenue, 0);
  const platformRevenue = Math.round(totalGMV * (commissionRate / 100));

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const pendingPayoutCount = pendingPayouts.length;

  return (
    <div className="space-y-6">
      {/* Welcome & Maintenance Alert Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nexora Admin Operations</h1>
          <p className="text-slate-500 mt-1 text-sm">System statistics, vendor registrations, and settlement metrics</p>
        </div>
        {isMaintenance && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 animate-pulse">
            <AlertCircle className="w-4 h-4" />
            <span>Maintenance Mode Active</span>
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Shops */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Shops</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-900">{totalShops}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-bold text-emerald-600">{activeShops} Active</span> • 
              <span className="font-bold text-amber-600">{pendingShops} Pending</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bookings Run</p>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <CalendarDays className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-900">{totalBookings}</h3>
            <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18% growth this week</span>
            </p>
          </div>
        </div>

        {/* Card 3: Platform GMV */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Merchandise (GMV)</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-900">₹{(totalGMV).toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Processed across all outlets</p>
          </div>
        </div>

        {/* Card 4: Estimated Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Earnings</p>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-900">₹{platformRevenue.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Based on {commissionRate}% commission</p>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Growth Graph & Quick Tasks */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Platform Revenue & Registration Growth Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform Performance Trends</h2>
              <p className="text-xs text-slate-500">Monthly breakdown of gross platform transactions (GMV) and shop sign-ups</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Monthly View</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value) => [`₹${(value as number).toLocaleString()}`, 'Monthly Sales Volume']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center & Pending Queues */}
        <div className="space-y-4 flex flex-col justify-between h-full">
          {/* Box 1: Pending Approvals Action */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-sm font-bold text-slate-900">Pending Registrations</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                We have {pendingShops} shop(s) waiting for credentials & store status verification.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Action Required</span>
              <button 
                onClick={() => navigate('/app/admin/shops')} 
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
              >
                <span>View Shops</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Box 2: Pending Settlements Action */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h4 className="text-sm font-bold text-slate-900">Pending Settlements</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                There are {pendingPayoutCount} withdrawal request(s) waiting for bank transaction clearing.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Settlements queue</span>
              <button 
                onClick={() => navigate('/app/admin/payouts')} 
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
              >
                <span>Go to Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured / Active Shops Spotlight Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Outlets Directory Spotlight</span>
          </h2>
          <button 
            onClick={() => navigate('/app/admin/shops')} 
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Manage All
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {shops.slice(0, 3).map(shop => (
            <div key={shop.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                  {shop.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{shop.name}</h4>
                    {shop.is_featured && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Featured</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Category: {shop.category} • Owner: {shop.owner_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 justify-between sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-400">Total Revenue</p>
                  <p className="text-sm font-bold text-slate-950">₹{shop.total_revenue.toLocaleString()}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-400">Bookings</p>
                  <p className="text-sm font-bold text-slate-950">{shop.total_bookings}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                    shop.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : shop.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {shop.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
