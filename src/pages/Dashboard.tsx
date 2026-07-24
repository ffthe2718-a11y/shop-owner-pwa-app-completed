import { useState, useEffect } from 'react';
import { Calendar, IndianRupee, Users, Clock, Star, Wallet, Phone, Plus, Scissors, Image, Globe, ChevronRight, Sparkles, Percent, Copy, Check, ArrowUpRight, Activity, TrendingUp, BarChart3, Database, WifiOff, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { shopInfo, kpiData } from '../data/mock';
import { api } from '../lib/api';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import OnboardingTour from '../components/OnboardingTour';
import InstallAppBanner from '../components/InstallAppBanner';
import { useOwnerDashboard } from '../hooks/useOwnerDashboard';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';

const revenueData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 8900 },
  { name: 'Sat', revenue: 12450 },
  { name: 'Sun', revenue: 15000 },
];

const monthlyRevenueData = [
  { month: 'Feb 2026', revenue: 142000, bookings: 165 },
  { month: 'Mar 2026', revenue: 168500, bookings: 192 },
  { month: 'Apr 2026', revenue: 185000, bookings: 210 },
  { month: 'May 2026', revenue: 174000, bookings: 198 },
  { month: 'Jun 2026', revenue: 210000, bookings: 235 },
  { month: 'Jul 2026', revenue: 245000, bookings: 278 },
];

export default function Dashboard() {
  const { data: dashboard, source, isStale, lastUpdated, isLoading, refetch } = useOwnerDashboard();
  useRegisterRefresh(refetch);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Quick Action form states
  const [serviceForm, setServiceForm] = useState({ name: '', category: 'Hair Cut & Styling', price: '', duration: '30 mins' });
  const [promoForm, setPromoForm] = useState({ code: 'SUMMER20', discount: '20', minSpend: '500' });
  const [bookingForm, setBookingForm] = useState({ customer: '', phone: '', service: 'Haircut & Beard Styling', time: '12:00 PM' });
  const [photoForm, setPhotoForm] = useState({ title: '', imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Revenue Growth comparison state
  const [growthComparisonMonth, setGrowthComparisonMonth] = useState<'Jul vs Jun' | 'Jun vs May' | 'May vs Apr'>('Jul vs Jun');

  const growthDataMap = {
    'Jul vs Jun': { currentMonth: 'July 2026', currentRev: 245000, prevMonth: 'June 2026', prevRev: 210000, diff: 35000, percentage: 16.7, isIncrease: true },
    'Jun vs May': { currentMonth: 'June 2026', currentRev: 210000, prevMonth: 'May 2026', prevRev: 174000, diff: 36000, percentage: 20.7, isIncrease: true },
    'May vs Apr': { currentMonth: 'May 2026', currentRev: 174000, prevMonth: 'April 2026', prevRev: 185000, diff: -11000, percentage: -5.9, isIncrease: false },
  };

  const activeGrowth = growthDataMap[growthComparisonMonth];

  // Quick Capture Drawer State & Handlers
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickCaptureTab, setQuickCaptureTab] = useState<'booking' | 'reminder'>('booking');
  const [qcBooking, setQcBooking] = useState({ customerName: '', phone: '', service: 'Haircut & Styling', date: '2026-07-22', time: '03:00 PM', price: '₹750' });
  const [qcReminder, setQcReminder] = useState({ title: '', dueDate: 'Today', priority: 'Medium', notes: '' });

  const handleSaveQuickBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('This action requires an internet connection.');
      return;
    }
    if (!qcBooking.customerName || !qcBooking.phone) {
      showToast('Please enter customer name and phone number.');
      return;
    }
    showToast(`Successfully created quick booking for ${qcBooking.customerName}!`);
    setIsQuickCaptureOpen(false);
    setQcBooking({ customerName: '', phone: '', service: 'Haircut & Styling', date: '2026-07-22', time: '03:00 PM', price: '₹750' });
  };

  const handleSaveQuickReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('This action requires an internet connection.');
      return;
    }
    if (!qcReminder.title) {
      showToast('Please enter a reminder title.');
      return;
    }
    showToast(`Reminder "${qcReminder.title}" created successfully!`);
    setIsQuickCaptureOpen(false);
    setQcReminder({ title: '', dueDate: 'Today', priority: 'Medium', notes: '' });
  };

  // Recent Activity State
  const [activityFilter, setActivityFilter] = useState<'All' | 'Bookings' | 'Reviews' | 'Payouts'>('All');
  const [revenueTimeframe, setRevenueTimeframe] = useState<'monthly' | 'weekly'>('monthly');
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>('area');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<any | null>(null);
  const [activities, setActivities] = useState([
    {
      id: 'act-1',
      category: 'Bookings',
      title: 'New booking from Vikram Singh',
      detail: 'Haircut & Beard Styling • Today at 3:30 PM with Barber Rahul',
      time: '10 mins ago',
      badge: '₹850',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Calendar,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      id: 'act-2',
      category: 'Reviews',
      title: 'Anita Sharma left a 5-star review',
      detail: '"Amazing service as always! Loved the royal hair spa treatment."',
      time: '45 mins ago',
      badge: '5.0 ★',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Star,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      id: 'act-3',
      category: 'Payouts',
      title: 'Payout of ₹18,450 processed',
      detail: 'Transferred directly to HDFC Bank (A/C ending in 4821)',
      time: '2 hours ago',
      badge: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Wallet,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'act-4',
      category: 'Bookings',
      title: 'Booking confirmed for Priya Patel',
      detail: 'Royal Hair Spa • Tomorrow at 11:00 AM with Sneha',
      time: '4 hours ago',
      badge: '₹1,200',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Calendar,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      id: 'act-5',
      category: 'Reviews',
      title: 'Karan Johar left a review',
      detail: '"Quick turnaround, clean salon, highly recommended!"',
      time: '6 hours ago',
      badge: '5.0 ★',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Star,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      id: 'act-6',
      category: 'Payouts',
      title: 'Weekly store settlement payout',
      detail: 'Ref #PAY-2026-88190 processed to registered UPI ID',
      time: '1 day ago',
      badge: '₹24,100',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Wallet,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'act-7',
      category: 'Bookings',
      title: 'Walk-in booking for Rohan Das',
      detail: 'Classic Beard Trim • Yesterday at 5:00 PM',
      time: '1 day ago',
      badge: '₹450',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Calendar,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    }
  ]);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('nexora_tour_completed');
    if (!tourCompleted) {
      const timer = setTimeout(() => setIsTourOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleTourComplete = () => {
    localStorage.setItem('nexora_tour_completed', 'true');
    showToast("🎉 Tour completed! You're ready to manage your shop.");
  };

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('This action requires an internet connection.');
      return;
    }
    if (!serviceForm.name || !serviceForm.price) {
      showToast('Please enter service name and price');
      return;
    }
    setIsSaving(true);
    try {
      await api.addService({
        name: serviceForm.name,
        category: serviceForm.category,
        duration: parseInt(serviceForm.duration) || 30,
        price: parseFloat(serviceForm.price) || 0,
        is_active: true
      });
      showToast(`✨ Service '${serviceForm.name}' added successfully!`);
      setActiveAction(null);
      setServiceForm({ name: '', category: 'Hair Cut & Styling', price: '', duration: '30 mins' });
    } catch {
      showToast('Error creating service');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('This action requires an internet connection.');
      return;
    }
    if (!promoForm.code || !promoForm.discount) {
      showToast('Please fill in promo details');
      return;
    }
    showToast(`🎉 Promo Code '${promoForm.code}' (${promoForm.discount}% OFF) activated!`);
    setActiveAction(null);
  };

  const handleAddBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('This action requires an internet connection.');
      return;
    }
    if (!bookingForm.customer || !bookingForm.phone) {
      showToast('Please enter customer details');
      return;
    }
    const newAct = {
      id: `act-${Date.now()}`,
      category: 'Bookings' as const,
      title: `Walk-in booking for ${bookingForm.customer}`,
      detail: `${bookingForm.service} • Today at ${bookingForm.time}`,
      time: 'Just now',
      badge: 'Confirmed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Calendar,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    };
    setActivities(prev => [newAct, ...prev]);
    showToast(`📅 Booking for ${bookingForm.customer} confirmed at ${bookingForm.time}!`);
    setActiveAction(null);
    setBookingForm({ customer: '', phone: '', service: 'Haircut & Beard Styling', time: '12:00 PM' });
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('This action requires an internet connection.');
      return;
    }
    showToast('📸 Showcase photo added to gallery!');
    setActiveAction(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${shopInfo.id}.nexorastores.com`);
    setCopiedLink(true);
    showToast('🔗 Store link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentKpis = dashboard?.kpis || kpiData;
  const currentOwnerName = dashboard?.ownerName || shopInfo.owner.name;
  const currentShopName = dashboard?.shopName || shopInfo.name;

  const kpis = [
    { label: "Today's Bookings", value: currentKpis.todayBookings, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", isFinancial: false },
    { label: "Today's Revenue", value: currentKpis.todayRevenue, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50", isFinancial: true },
    { label: "Customers", value: currentKpis.customers, icon: Users, color: "text-purple-600", bg: "bg-purple-50", isFinancial: false },
    { label: "Pending", value: currentKpis.pendingRequests, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", isFinancial: false },
    { label: "Rating", value: currentKpis.rating, icon: Star, color: "text-yellow-600", bg: "bg-yellow-50", isFinancial: false },
    { label: "Wallet", value: currentKpis.wallet, icon: Wallet, color: "text-indigo-600", bg: "bg-indigo-50", isFinancial: true },
  ];

  if (source === 'none' && !isLoading) {
    return (
      <div className="space-y-6">
        <InstallAppBanner />
        <div className="min-h-[50vh] bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            No saved dashboard data is available offline.
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            Connect to the internet once to load your business dashboard.
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
    <div className="space-y-6">
      {/* PWA Mobile Install Banner */}
      <InstallAppBanner />

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
                  <span className="font-bold text-base text-amber-950">Showing saved dashboard data</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isStale 
                      ? 'bg-amber-200 text-amber-900 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isStale ? 'Outdated saved data' : 'Saved data'}
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
                  Live bookings, revenue and wallet values may have changed.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!navigator.onLine) {
                  showToast('You are still offline. Connect to internet to refresh.');
                } else {
                  refetch();
                  showToast('Refreshing live dashboard data...');
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

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Good morning, {currentOwnerName}</h1>
          </div>
          <p className="text-slate-500 mt-1">Here is what is happening at {currentShopName} today.</p>
          <div className="mt-4 flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Open Now
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => setIsTourOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            Take Guided Tour
          </button>
        </div>
      </div>

      <div id="kpi-grid" className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} onClick={() => showToast(`View ${kpi.label} details`)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${kpi.bg} ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{kpi.value}</p>
            {source === 'cache' && kpi.isFinancial && (
              <p className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-2 inline-block">
                Saved value — connect to refresh
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div id="schedule-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
              <Link to="/app/owner/bookings" className="text-sm text-blue-600 font-medium hover:underline flex items-center">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(dashboard?.scheduleData || []).map(booking => (
                <div key={booking.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="text-center w-16 shrink-0">
                    <p className="text-sm font-bold text-slate-900">{booking.time.split(' ')[0]}</p>
                    <p className="text-xs text-slate-500 font-medium">{booking.time.split(' ')[1]}</p>
                  </div>
                  <img src={booking.avatar} alt={booking.customer} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{booking.customer}</h3>
                    <p className="text-sm text-slate-500 truncate">{booking.service} • {booking.staff}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      booking.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      booking.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                      booking.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {booking.status}
                    </span>
                    <button onClick={() => showToast(`Calling ${booking.customer}...`)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full">
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="revenue-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            {/* Header with Title and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Revenue & Income Trends</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                    <TrendingUp className="w-3 h-3 text-blue-600" /> +16.7% MoM
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {revenueTimeframe === 'monthly' ? 'Last 6 Months Booking Revenue (Feb 2026 - Jul 2026)' : '7-Day Weekly Breakdown'}
                </p>
              </div>

              {/* Timeframe & Chart Style Selectors */}
              <div className="flex items-center gap-2">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setRevenueTimeframe('monthly')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      revenueTimeframe === 'monthly' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly (6M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevenueTimeframe('weekly')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      revenueTimeframe === 'weekly' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Weekly
                  </button>
                </div>

                {revenueTimeframe === 'monthly' && (
                  <button
                    type="button"
                    onClick={() => setChartStyle(prev => prev === 'area' ? 'bar' : 'area')}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 transition-colors"
                    title={`Switch to ${chartStyle === 'area' ? 'Bar Chart' : 'Area Chart'}`}
                  >
                    <BarChart3 className="w-4 h-4 text-slate-700" />
                  </button>
                )}
              </div>
            </div>

            {/* Monthly Summary KPI Row */}
            {revenueTimeframe === 'monthly' && (
              <div className="grid grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">6M Total Income</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">₹11,24,500</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Monthly Avg</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">₹1,87,417</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Total Bookings</p>
                  <p className="text-sm font-extrabold text-blue-600 mt-0.5">1,278 Clients</p>
                </div>
              </div>
            )}

            {/* Recharts Visualisation */}
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {revenueTimeframe === 'monthly' ? (
                  chartStyle === 'area' ? (
                    <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMonthlyRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(val) => `₹${val/1000}k`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1">
                                <p className="font-bold text-slate-300 text-[11px] border-b border-slate-800 pb-1">{data.month}</p>
                                <p className="font-extrabold text-emerald-400 text-sm">₹{data.revenue.toLocaleString('en-IN')}</p>
                                <p className="text-slate-400 text-[10px]">Total Bookings: <span className="font-bold text-white">{data.bookings}</span></p>
                                <p className="text-slate-400 text-[10px]">Avg Ticket: <span className="font-bold text-white">₹{Math.round(data.revenue / data.bookings)}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorMonthlyRev)" activeDot={{r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2}} />
                    </AreaChart>
                  ) : (
                    <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(val) => `₹${val/1000}k`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1">
                                <p className="font-bold text-slate-300 text-[11px] border-b border-slate-800 pb-1">{data.month}</p>
                                <p className="font-extrabold text-emerald-400 text-sm">₹{data.revenue.toLocaleString('en-IN')}</p>
                                <p className="text-slate-400 text-[10px]">Total Bookings: <span className="font-bold text-white">{data.bookings}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )
                ) : (
                  <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Daily Revenue']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2}} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div id="quick-actions-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
              <button 
                onClick={() => setActiveAction('service')} 
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/70 transition-all text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Scissors className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">Add Service</span>
                <span className="text-xs text-slate-500 mt-0.5">New treatment</span>
              </button>

              <button 
                onClick={() => setActiveAction('promo')} 
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-amber-600 hover:bg-amber-50/70 transition-all text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Percent className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-amber-700">Create Promo</span>
                <span className="text-xs text-slate-500 mt-0.5">Discount code</span>
              </button>

              <button 
                onClick={() => setActiveAction('booking')} 
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/70 transition-all text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">Add Booking</span>
                <span className="text-xs text-slate-500 mt-0.5">Walk-in client</span>
              </button>

              <button 
                onClick={() => setActiveAction('photo')} 
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-purple-600 hover:bg-purple-50/70 transition-all text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Image className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-purple-700">Add Photo</span>
                <span className="text-xs text-slate-500 mt-0.5">Showcase asset</span>
              </button>

              <button 
                onClick={handleCopyLink} 
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/70 transition-all text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">Share Store</span>
                <span className="text-xs text-slate-500 mt-0.5">Copy web link</span>
              </button>

              <Link 
                to="/app/owner/website" 
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-cyan-600 hover:bg-cyan-50/70 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-cyan-700">Edit Site</span>
                <span className="text-xs text-slate-500 mt-0.5">Theme & layout</span>
              </Link>
            </div>
          </div>

          {/* AI-Powered Occupancy & Optimal Slot Insights Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white rounded-2xl border border-indigo-500/30 shadow-lg p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">AI Occupancy Advisor</h2>
                  <p className="text-xs text-indigo-200">Optimizing slot utilization via historical ML</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 94% Accuracy
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-indigo-200 font-semibold">
                  <span>Peak Busy Hours (High Demand)</span>
                  <span className="text-amber-300 font-bold">Sat & Sun • 3PM - 7PM</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Slots are 92% booked on weekends. Consider raising prime-time pricing or adding staff.
                </p>
              </div>

              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-xs space-y-2 backdrop-blur-md">
                <div className="flex items-center justify-between text-emerald-200 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Optimal Slot Recommendation
                  </span>
                  <span className="text-emerald-300 font-bold">Tue & Wed • 2PM - 4PM</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Only 34% occupancy. AI suggests launching a <strong>&quot;Happy Hours 15% Off&quot;</strong> flash promo to fill 6 empty slots today.
                </p>
                <button
                  onClick={() => showToast("⚡ AI Flash Deal deployed! Sent to 42 loyal customers via WhatsApp & SMS.")}
                  className="w-full mt-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Deploy Happy Hours Flash Deal
                </button>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-indigo-300 border-t border-white/10">
              <span>Based on 1,278 past bookings</span>
              <button
                onClick={() => showToast("🤖 AI Model refreshed with latest weekly booking patterns.")}
                className="hover:text-white underline cursor-pointer font-medium"
              >
                Re-analyze Slots
              </button>
            </div>
          </div>

          {/* Revenue Growth Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Revenue Growth Widget</h2>
                  <p className="text-xs text-slate-500">Monthly comparative financial performance</p>
                </div>
              </div>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                {(['Jul vs Jun', 'Jun vs May', 'May vs Apr'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGrowthComparisonMonth(item)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      growthComparisonMonth === item ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{activeGrowth.currentMonth} Revenue</span>
                <p className="text-lg font-extrabold text-slate-900">₹{activeGrowth.currentRev.toLocaleString('en-IN')}</p>
                <span className="text-[11px] text-slate-500">Current target period</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{activeGrowth.prevMonth} Revenue</span>
                <p className="text-lg font-extrabold text-slate-700">₹{activeGrowth.prevRev.toLocaleString('en-IN')}</p>
                <span className="text-[11px] text-slate-500">Baseline comparison</span>
              </div>
              <div className="space-y-1 flex flex-col justify-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MoM Growth Rate</span>
                <div className="flex items-center gap-2">
                  <span className={`text-base font-extrabold ${activeGrowth.isIncrease ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {activeGrowth.isIncrease ? '+' : ''}{activeGrowth.percentage}%
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeGrowth.isIncrease ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {activeGrowth.isIncrease ? '▲ Growth' : '▼ Dip'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {activeGrowth.isIncrease ? `+₹${activeGrowth.diff.toLocaleString('en-IN')} gain vs previous` : `-₹{Math.abs(activeGrowth.diff).toLocaleString('en-IN')} vs previous`}
                </p>
              </div>
            </div>

            {/* Growth Driver Insights */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-blue-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Primary Revenue Growth Drivers
                </span>
                <span className="text-blue-700 font-bold">Top Driver: Weekend Prime Slots</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {activeGrowth.isIncrease
                  ? `Strong demand for premium hair styling and beard grooming packages contributed ${activeGrowth.percentage}% higher yield compared to ${activeGrowth.prevMonth}.`
                  : `Seasonal dip observed during mid-week off-peak hours. Recommended deploying flash deals to recover occupancy.`}
              </p>
            </div>
          </div>

          {/* Recent Activity Widget */}
          <div id="recent-activity-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
              >
                View Log <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
              {(['All', 'Bookings', 'Reviews', 'Payouts'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActivityFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activityFilter === filter
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Activity Events Feed */}
            <div className="space-y-3">
              {(dashboard?.activities || activities)
                .filter(act => activityFilter === 'All' || act.category === activityFilter)
                .slice(0, 5)
                .map((act) => {
                  const IconComp = act.icon || Calendar;
                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivityDetail(act)}
                      className="group p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all cursor-pointer flex items-start gap-3"
                    >
                      <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${act.iconColor}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {act.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{act.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5 line-clamp-1">{act.detail}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${act.badgeClass}`}>
                            {act.badge}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
                            Details <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {activities.filter(act => activityFilter === 'All' || act.category === activityFilter).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  No activity found in &quot;{activityFilter}&quot;
                </div>
              )}
            </div>

            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-slate-500" /> Complete Audit Log ({activities.length})
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Modals */}
      {/* 1. Add Service Modal */}
      <Modal
        isOpen={activeAction === 'service'}
        onClose={() => setActiveAction(null)}
        title="Add New Service"
      >
        <form onSubmit={handleAddServiceSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Beard Trim & Spa"
              value={serviceForm.name}
              onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={serviceForm.category}
              onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="Hair Cut & Styling">Hair Cut & Styling</option>
              <option value="Beard & Shave">Beard & Shave</option>
              <option value="Facial & Skin Care">Facial & Skin Care</option>
              <option value="Hair Color">Hair Color</option>
              <option value="Spa & Massage">Spa & Massage</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
              <input
                type="number"
                required
                placeholder="499"
                value={serviceForm.price}
                onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
              <select
                value={serviceForm.duration}
                onChange={e => setServiceForm({ ...serviceForm, duration: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="15 mins">15 mins</option>
                <option value="30 mins">30 mins</option>
                <option value="45 mins">45 mins</option>
                <option value="60 mins">60 mins</option>
                <option value="90 mins">90 mins</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="w-1/2 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-1/2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save Service'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Create Promo Modal */}
      <Modal
        isOpen={activeAction === 'promo'}
        onClose={() => setActiveAction(null)}
        title="Create Promo Code"
      >
        <form onSubmit={handleCreatePromoSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Promo Code</label>
            <input
              type="text"
              required
              placeholder="e.g. FESTIVE20"
              value={promoForm.code}
              onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discount (%)</label>
              <input
                type="number"
                required
                placeholder="20"
                value={promoForm.discount}
                onChange={e => setPromoForm({ ...promoForm, discount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Spend (₹)</label>
              <input
                type="number"
                placeholder="500"
                value={promoForm.minSpend}
                onChange={e => setPromoForm({ ...promoForm, minSpend: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="w-1/2 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors shadow-xs"
            >
              Activate Promo
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Add Booking Modal */}
      <Modal
        isOpen={activeAction === 'booking'}
        onClose={() => setActiveAction(null)}
        title="Walk-in Client Booking"
      >
        <form onSubmit={handleAddBookingSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Kumar"
              value={bookingForm.customer}
              onChange={e => setBookingForm({ ...bookingForm, customer: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={bookingForm.phone}
              onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Service</label>
              <select
                value={bookingForm.service}
                onChange={e => setBookingForm({ ...bookingForm, service: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="Haircut & Beard Styling">Haircut & Beard</option>
                <option value="Royal Hair Spa">Royal Hair Spa</option>
                <option value="De-Tan Facial">De-Tan Facial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time Slot</label>
              <select
                value={bookingForm.time}
                onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="11:30 AM">11:30 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="01:30 PM">01:30 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="05:00 PM">05:00 PM</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="w-1/2 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Add Photo Modal */}
      <Modal
        isOpen={activeAction === 'photo'}
        onClose={() => setActiveAction(null)}
        title="Add Showcase Photo"
      >
        <form onSubmit={handleAddPhotoSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo Title</label>
            <input
              type="text"
              placeholder="e.g. Modern Fade Style"
              value={photoForm.title}
              onChange={e => setPhotoForm({ ...photoForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
            <input
              type="url"
              required
              value={photoForm.imageUrl}
              onChange={e => setPhotoForm({ ...photoForm, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          {photoForm.imageUrl && (
            <div className="rounded-xl overflow-hidden h-36 border border-slate-200">
              <img src={photoForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="w-1/2 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-xs"
            >
              Add to Gallery
            </button>
          </div>
        </form>
      </Modal>

      {/* Activity Log Full Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Store Recent Activity Log"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
              {(['All', 'Bookings', 'Reviews', 'Payouts'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActivityFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activityFilter === filter
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 shrink-0 font-medium">{activities.filter(a => activityFilter === 'All' || a.category === activityFilter).length} Events</span>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {activities
              .filter(act => activityFilter === 'All' || act.category === activityFilter)
              .map((act) => {
                const IconComp = act.icon;
                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setSelectedActivityDetail(act);
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer flex items-start gap-3 group"
                  >
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${act.iconColor}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{act.title}</p>
                        <span className="text-xs text-slate-400 font-medium shrink-0">{act.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{act.detail}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold border ${act.badgeClass}`}>
                          {act.badge}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          View details →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setIsActivityModalOpen(false)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Close Activity Log
            </button>
          </div>
        </div>
      </Modal>

      {/* Selected Activity Event Detail Modal */}
      <Modal
        isOpen={!!selectedActivityDetail}
        onClose={() => setSelectedActivityDetail(null)}
        title="Activity Event Details"
      >
        {selectedActivityDetail && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className={`p-2.5 rounded-xl border shrink-0 ${selectedActivityDetail.iconColor}`}>
                <selectedActivityDetail.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{selectedActivityDetail.category} Event</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedActivityDetail.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Occurred {selectedActivityDetail.time}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 border border-slate-100 rounded-xl bg-white">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Event Information</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{selectedActivityDetail.detail}</p>
              </div>

              <div className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-white">
                <span className="text-xs font-medium text-slate-500">Status / Amount</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${selectedActivityDetail.badgeClass}`}>
                  {selectedActivityDetail.badge}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  showToast(`Event #${selectedActivityDetail.id} acknowledged`);
                  setSelectedActivityDetail(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Acknowledge Event
              </button>
            </div>
          </div>
        )}
      </Modal>

      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={handleTourComplete}
      />

      {/* Floating Action Button (FAB) for Quick Capture */}
      <div className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-40">
        <button
          onClick={() => setIsQuickCaptureOpen(true)}
          className="group relative inline-flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl font-bold text-sm transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400/30 cursor-pointer"
          title="Quick Capture Booking or Reminder"
        >
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white"></span>
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
          <span>Quick Capture</span>
        </button>
      </div>

      {/* Quick-Capture Drawer / Modal */}
      {isQuickCaptureOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Quick Capture</h3>
                  <p className="text-[11px] text-slate-400">Add bookings or reminders instantly</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickCaptureOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setQuickCaptureTab('booking')}
                className={`py-2 rounded-xl transition-all cursor-pointer ${quickCaptureTab === 'booking' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                📅 New Booking
              </button>
              <button
                type="button"
                onClick={() => setQuickCaptureTab('reminder')}
                className={`py-2 rounded-xl transition-all cursor-pointer ${quickCaptureTab === 'reminder' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                ⏰ Reminder / Note
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              {quickCaptureTab === 'booking' ? (
                <form onSubmit={handleSaveQuickBooking} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={qcBooking.customerName}
                      onChange={(e) => setQcBooking({ ...qcBooking, customerName: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={qcBooking.phone}
                      onChange={(e) => setQcBooking({ ...qcBooking, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Service</label>
                      <select
                        value={qcBooking.service}
                        onChange={(e) => setQcBooking({ ...qcBooking, service: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option>Haircut & Styling</option>
                        <option>Beard Grooming</option>
                        <option>Hair Spa Treatment</option>
                        <option>Facial & Clean-up</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Price</label>
                      <input
                        type="text"
                        value={qcBooking.price}
                        onChange={(e) => setQcBooking({ ...qcBooking, price: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date</label>
                      <input
                        type="date"
                        value={qcBooking.date}
                        onChange={(e) => setQcBooking({ ...qcBooking, date: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Time Slot</label>
                      <input
                        type="text"
                        placeholder="03:00 PM"
                        value={qcBooking.time}
                        onChange={(e) => setQcBooking({ ...qcBooking, time: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsQuickCaptureOpen(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                    >
                      Create Quick Booking
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveQuickReminder} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Reminder Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Order shampoo inventory from distributor"
                      value={qcReminder.title}
                      onChange={(e) => setQcReminder({ ...qcReminder, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Due Date</label>
                      <input
                        type="text"
                        placeholder="Today / Tomorrow"
                        value={qcReminder.dueDate}
                        onChange={(e) => setQcReminder({ ...qcReminder, dueDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                      <select
                        value={qcReminder.priority}
                        onChange={(e) => setQcReminder({ ...qcReminder, priority: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notes / Details</label>
                    <textarea
                      rows={3}
                      placeholder="Add any extra notes or checklist items..."
                      value={qcReminder.notes}
                      onChange={(e) => setQcReminder({ ...qcReminder, notes: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsQuickCaptureOpen(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                    >
                      Save Reminder
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast visible={toast.message ? true : false} message={toast.message} />
    </div>
  );
}