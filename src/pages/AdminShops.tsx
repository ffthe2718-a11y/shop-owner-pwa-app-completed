import { useState, useEffect } from 'react';
import { adminState } from '../lib/adminState';
import type { AdminShop } from '../types';
import { 
  Search, 
  Filter, 
  Store, 
  Check, 
  X, 
  Star, 
  Phone, 
  Mail, 
  CalendarDays, 
  Sparkles, 
  Slash,
  AlertOctagon,
  Power
} from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminShops() {
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const loadData = () => {
    setShops(adminState.getShops());
    setCategories(adminState.getCategories());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('nexora_admin_state_changed', loadData);
    return () => window.removeEventListener('nexora_admin_state_changed', loadData);
  }, []);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleStatusChange = (shopId: string, status: 'active' | 'suspended' | 'pending') => {
    const actionName = status === 'active' ? 'Activated/Approved' : status === 'suspended' ? 'Suspended' : 'Set to Pending';
    adminState.updateShopStatus(shopId, status);
    showToast(`Shop ${actionName} successfully!`);
  };

  const handleToggleFeatured = (shopId: string) => {
    adminState.toggleShopFeatured(shopId);
    showToast(`Featured status toggled!`);
  };

  // Filtered shops
  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          shop.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          shop.email_address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shop.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || shop.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shop & Vendor Directory</h1>
        <p className="text-slate-500 mt-1 text-sm">Review, approve, suspend, and promote partner merchant outlets</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop name, owner, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending Approval</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none bg-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Shops Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredShops.map(shop => (
          <div 
            key={shop.id} 
            className={`bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between transition-all ${
              shop.status === 'suspended' ? 'border-red-200 bg-red-50/5' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Upper part of card */}
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                    shop.status === 'active' 
                      ? 'bg-blue-50 text-blue-600 border-blue-200' 
                      : shop.status === 'pending'
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      {shop.name}
                      {shop.is_featured && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold uppercase">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Featured</span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Category: {shop.category}</p>
                  </div>
                </div>

                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  shop.status === 'active' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : shop.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {shop.status}
                </span>
              </div>

              {/* Vendor & Contact information */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">Owner Name:</span>
                  <span className="font-bold text-slate-800">{shop.owner_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">Mobile:</span>
                  <a href={`tel:${shop.mobile_number}`} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{shop.mobile_number}</span>
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">Email:</span>
                  <a href={`mailto:${shop.email_address}`} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{shop.email_address}</span>
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">Signed Up:</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-slate-400" />
                    {new Date(shop.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Statistics Row */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Rating</p>
                  <p className="text-sm font-extrabold text-slate-800 flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span>{shop.rating > 0 ? shop.rating : 'N/A'}</span>
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Bookings</p>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">{shop.total_bookings}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Revenue</p>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">₹{(shop.total_revenue).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center gap-2">
              <button
                onClick={() => handleToggleFeatured(shop.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  shop.is_featured
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{shop.is_featured ? 'Unfeature' : 'Promote/Feature'}</span>
              </button>

              <div className="flex gap-2">
                {shop.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(shop.id, 'active')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {shop.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange(shop.id, 'suspended')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Suspend</span>
                  </button>
                ) : shop.status === 'suspended' ? (
                  <button
                    onClick={() => handleStatusChange(shop.id, 'active')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Activate</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {filteredShops.length === 0 && (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            No shops matched your current filters. Try relaxing your searches.
          </div>
        )}
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
