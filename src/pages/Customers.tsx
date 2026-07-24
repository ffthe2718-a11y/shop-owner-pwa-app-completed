import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, CheckSquare, Square, Crown, UserCheck, ShieldAlert, Phone, Mail, Calendar, X, RotateCcw, Database, RefreshCw, WifiOff, Clock, Download, AlertTriangle, Users } from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import StickyBulkActionBar from '../components/StickyBulkActionBar';
import { useOwnerCustomers } from '../hooks/useOwnerCustomers';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';
import { useCustomerRepoDiagnostic } from '../hooks/useCustomerRepoDiagnostic';
import { getOwnerOfflineDB, saveOwnerCache, getOwnerCache } from '../lib/ownerOfflineDb';
import * as ownerCustomersRepo from '../lib/ownerCustomersRepository';
import { CustomerService } from '../services/customerService';
import { logComponentMount, logComponentError, checkDependenciesAvailability, logCustomerFetchState } from '../utils/debug';

export default function Customers() {
  // Diagnostic dependency & mount logging
  useEffect(() => {
    logComponentMount('Customers', {
      hasOfflineDb: typeof getOwnerOfflineDB === 'function',
      hasRepo: typeof ownerCustomersRepo.getOwnerCustomersData === 'function',
      hasHook: typeof useOwnerCustomers === 'function',
      hasCustomerService: typeof CustomerService.getCustomers === 'function',
    });
    checkDependenciesAvailability({
      getOwnerOfflineDB,
      saveOwnerCache,
      getOwnerCache,
      getOwnerCustomersData: ownerCustomersRepo.getOwnerCustomersData,
      useOwnerCustomers,
      CustomerService,
    });
  }, []);

  try {
    return <CustomersContent />;
  } catch (err) {
    logComponentError('Customers', err);
    return (
      <div className="min-h-[50vh] bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm my-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to load customers</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
          An unexpected initialization error occurred. Please try reloading.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Reload Page
        </button>
      </div>
    );
  }
}

function CustomersContent() {
  const diagnostic = useCustomerRepoDiagnostic();

  // Component lifecycle logs and data fetching service presence check
  useEffect(() => {
    console.log('[CustomersContent] Lifecycle: Component Mounted');
    const isServiceAvailable = typeof api.getCustomers === 'function';
    console.log('[CustomersContent] Diagnostic: Data fetching service verification:', isServiceAvailable ? 'AVAILABLE (api.getCustomers exists)' : 'MISSING');
    
    return () => {
      console.log('[CustomersContent] Lifecycle: Component Unmounted');
    };
  }, []);

  useEffect(() => {
    if (diagnostic) {
      console.log('[Customers Page] Customer diagnostic status:', diagnostic);
    }
  }, [diagnostic]);
  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const {
    data: cachedCustomers,
    source,
    isStale,
    lastUpdated,
    error: cacheError,
    isLoading: cacheLoading,
    refetch
  } = useOwnerCustomers();

  useRegisterRefresh(refetch);

  // Effective customer list: preference to cached customers when source === 'cache'
  const customers = useMemo(() => {
    if (source === 'cache') {
      return Array.isArray(cachedCustomers) ? cachedCustomers : [];
    }
    return Array.isArray(dbCustomers) ? dbCustomers : [];
  }, [source, cachedCustomers, dbCustomers]);

  const isLoading = (dbLoading || cacheLoading) && customers.length === 0;

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const loadCustomers = useCallback(async () => {
    try {
      setDbLoading(true);
      setApiError(null);
      logCustomerFetchState('API Fetch Init', {
        dbLoading: true,
        cacheLoading,
        source,
        dbCustomersCount: dbCustomers.length,
      });
      const data = await api.getCustomers();
      const loaded = Array.isArray(data) ? data : [];
      setDbCustomers(loaded);
      logCustomerFetchState('API Fetch Success', {
        dbLoading: false,
        cacheLoading,
        source,
        dbCustomersCount: loaded.length,
        customersCount: loaded.length,
      });
    } catch (err) {
      logCustomerFetchState('API Fetch Exception', {
        dbLoading: false,
        cacheLoading,
        source,
        error: err,
      });
      setApiError(err instanceof Error ? err.message : String(err));
      setDbCustomers([]);
    } finally {
      setDbLoading(false);
    }
  }, [cacheLoading, source, dbCustomers.length]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    logCustomerFetchState('Render State Updated', {
      dbLoading,
      cacheLoading,
      source,
      customersCount: customers.length,
      dbCustomersCount: dbCustomers.length,
      cachedCustomersCount: Array.isArray(cachedCustomers) ? cachedCustomers.length : 0,
      filteredCount: filteredCustomers.length,
      searchQuery,
      selectedStatus,
    });
  }, [customers, filteredCustomers.length, source, dbLoading, cacheLoading, searchQuery, selectedStatus, dbCustomers.length, cachedCustomers]);

  const filteredCustomers = useMemo(() => {
    return (customers || []).filter(customer => {
      if (!customer) return false;
      const query = (searchQuery || '').toLowerCase().trim();
      const status = (customer.status || 'Regular').toString();
      const matchesStatus = selectedStatus === 'All' || status.toLowerCase() === selectedStatus.toLowerCase();

      if (!query) {
        return matchesStatus;
      }

      const nameMatch = (customer.name || '').toLowerCase().includes(query);
      
      // Mobile matching
      const rawMobile = (customer.mobile || customer.phone || '').toLowerCase();
      const queryDigits = query.replace(/\D/g, '');
      const mobileDigits = rawMobile.replace(/\D/g, '');
      const mobileMatch = rawMobile.includes(query) || (queryDigits.length >= 3 && mobileDigits.includes(queryDigits));
      
      const emailMatch = (customer.email || '').toLowerCase().includes(query);
      
      // Visit history matching
      const visitHistoryMatch = (customer.lastVisit || customer.last_visit || '').toLowerCase().includes(query);

      const matchesSearch = nameMatch || mobileMatch || emailMatch || visitHistoryMatch;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, selectedStatus]);

  const isAllSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => c && c.id && selectedIds.includes(c.id));
  const isSomeSelected = filteredCustomers.some(c => c && c.id && selectedIds.includes(c.id)) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      const filteredSet = new Set(filteredCustomers.map(c => c.id).filter(Boolean));
      setSelectedIds(selectedIds.filter(id => !filteredSet.has(id)));
    } else {
      const allFilteredIds = filteredCustomers.map(c => c.id).filter(Boolean);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    }
  };

  const handleSelectOne = (id: string) => {
    if (!id) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!id) return;
    if (source === 'cache' || !navigator.onLine) {
      showToast('Customer changes require an internet connection.');
      return;
    }
    if (confirm('Are you sure you want to delete this customer record?')) {
      try {
        await api.deleteCustomer(id);
        setDbCustomers(prev => prev.filter(c => c && c.id !== id));
        setSelectedIds(selectedIds.filter(i => i !== id));
        showToast('Customer record deleted successfully');
      } catch {
        showToast('Error deleting customer');
      }
    }
  };

  // Bulk Operations
  const handleBulkDelete = async () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Customer changes require an internet connection.');
      return;
    }
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected customer(s)?`)) {
      try {
        await api.bulkDeleteCustomers(selectedIds);
        setDbCustomers(prev => prev.filter(c => c && !selectedIds.includes(c.id)));
        showToast(`Deleted ${selectedIds.length} customer record(s)`);
        setSelectedIds([]);
      } catch {
        showToast('Error performing bulk deletion');
      }
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Customer changes require an internet connection.');
      return;
    }
    if (selectedIds.length === 0) return;
    try {
      await api.bulkUpdateCustomersStatus(selectedIds, newStatus);
      setDbCustomers(prev => prev.map(c => c && selectedIds.includes(c.id) ? { ...c, status: newStatus } : c));
      showToast(`Updated status for ${selectedIds.length} customer(s) to ${newStatus}`);
      setSelectedIds([]);
    } catch {
      showToast('Error updating status for selected customers');
    }
  };

  const openAddModal = () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Customer changes require an internet connection.');
      return;
    }
    setEditingCustomer(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (customer: any) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Customer changes require an internet connection.');
      return;
    }
    setEditingCustomer(customer);
    setIsAddModalOpen(true);
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('Customer changes require an internet connection.');
      return;
    }
    const form = e.target as HTMLFormElement;
    setIsSaving(true);

    const customerData = {
      name: form.custName.value,
      mobile: form.custMobile.value,
      email: form.custEmail.value,
      status: form.custStatus.value,
    };

    try {
      if (editingCustomer) {
        const updated = await api.updateCustomer(editingCustomer.id, customerData);
        setDbCustomers(prev => prev.map(c => c && c.id === editingCustomer.id ? updated : c));
        showToast('Customer details updated');
      } else {
        const newCust = await api.addCustomer(customerData);
        setDbCustomers(prev => [newCust, ...prev]);
        showToast('New customer added');
      }
      setIsAddModalOpen(false);
    } catch {
      showToast('Error saving customer record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Customer export requires an internet connection to ensure the data is current.');
      return;
    }
    showToast('Customer CRM export initiated successfully.');
  };

  const totalVIPs = (customers || []).filter(c => c && c.status === 'VIP').length;

  if (cacheError && (!cachedCustomers || cachedCustomers.length === 0) && !isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="min-h-[50vh] bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to load customers</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            {cacheError || 'Please try again.'}
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
            Retry
          </button>
        </div>
        <Toast visible={toast.visible} message={toast.message} />
      </div>
    );
  }

  if (source === 'none' && !isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="min-h-[50vh] bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            No saved customer information is available offline.
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            Connect to the internet once to load your customer list.
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
        <Toast visible={toast.visible} message={toast.message} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
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
                  <span className="font-bold text-base text-amber-950">Showing saved customer information</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isStale 
                      ? 'bg-amber-200 text-amber-900 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isStale ? 'Outdated saved customer data' : 'Saved customer data'}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-amber-800 mt-1 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated: {lastUpdated && !isNaN(new Date(lastUpdated).getTime()) ? new Date(lastUpdated).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }) : 'Recently'}
                </p>
                <p className="text-xs text-amber-700/90 mt-1 font-normal">
                  Booking history, spend and contact information may have changed.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!navigator.onLine) {
                  showToast('You are still offline. Connect to internet to refresh.');
                } else {
                  refetch();
                  showToast('Refreshing live customers...');
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers Directory</h1>
          <p className="text-slate-500 mt-1">Manage customer profiles, loyalty tiers, and visit history</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs text-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CRM
          </button>
          <button 
            onClick={openAddModal} 
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Add Customer
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            {customers.length}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Clients</p>
            <p className="text-sm font-bold text-slate-900">Registered</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            {totalVIPs}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">VIP Loyalty Tier</p>
            <p className="text-sm font-bold text-slate-900">Top Spenders</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            {selectedIds.length}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Currently Selected</p>
            <p className="text-sm font-bold text-slate-900">Bulk Ready</p>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by customer name, phone number, or recent visit history..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm shadow-2xs placeholder:text-slate-400" 
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto py-1 hide-scrollbar shrink-0">
            {['All', 'VIP', 'Regular', 'New'].map((status) => (
              <button 
                key={status} 
                onClick={() => setSelectedStatus(status)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  selectedStatus === status 
                    ? 'bg-slate-900 text-white shadow-2xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status} {status === 'VIP' ? '⭐' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Search Parameter Badges & Match Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {source === 'cache' && (searchQuery || selectedStatus !== 'All') && (
              <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
                Filtering saved customers only.
              </span>
            )}
            <span className="font-medium text-slate-400">Search scope:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">Name</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">Phone Number (+91)</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">Recent Visit History</span>
          </div>

          <div>
            Showing <strong className="text-slate-900">{filteredCustomers.length}</strong> of {customers.length} clients
          </div>
        </div>
      </div>

      {/* Sticky Bulk Action Bar */}
      <StickyBulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredCustomers.length}
        itemLabel="customer"
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        statusOptions={[
          { label: 'Mark as VIP', value: 'VIP', color: 'amber', icon: <Crown className="w-3.5 h-3.5 text-amber-400" /> },
          { label: 'Mark as Regular', value: 'Regular', color: 'blue', icon: <UserCheck className="w-3.5 h-3.5 text-blue-400" /> },
          { label: 'Mark as Inactive', value: 'Inactive', color: 'slate', icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> },
        ]}
        onStatusUpdate={(newStatus) => handleBulkStatusChange(newStatus)}
      />

      {/* CUSTOMERS DATA TABLE WITH BULK CHECKBOX COLUMN */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 font-medium">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-3" />
          Loading customers directory...
        </div>
      ) : (apiError || cacheError) && customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-xs my-2 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to Load Customers</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            {apiError || (cacheError instanceof Error ? cacheError.message : String(cacheError)) || 'An error occurred while retrieving customer records from the database.'}
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={() => {
                loadCustomers();
                refetch();
                showToast('Retrying database fetch...');
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-750 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Fetch
            </button>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs my-2 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Customers Available</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            Your customer database currently has no records. Add a new customer profile to manage visit history, contact information, and loyalty tiers.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs text-sm"
            >
              <Plus className="w-4 h-4" />
              Add First Customer
            </button>
            <button
              onClick={() => {
                loadCustomers();
                refetch();
                showToast('Refreshing customer database...');
              }}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer text-sm"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Reload Data
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <button 
                      onClick={handleSelectAll} 
                      className="p-1 text-slate-500 hover:text-blue-600 transition-colors focus:outline-none"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : isSomeSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Total Visits</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map(customer => {
                  if (!customer) return null;
                  const customerId = (customer.id || '').toString();
                  const isSelected = selectedIds.includes(customerId);
                  const custStatus = customer.status || 'Regular';

                  return (
                    <tr 
                      key={customerId || Math.random()} 
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3.5 px-4 text-center">
                        <button 
                          onClick={() => handleSelectOne(customerId)} 
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Customer Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={customer.avatar_url || customer.avatar || `https://i.pravatar.cc/150?u=${customerId}`} 
                            alt={customer.name || 'Customer'} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              {customer.name || 'Unnamed Client'}
                              {source === 'cache' && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Saved offline data
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-slate-500">ID: #{customerId.substring(0, 6)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{customer.mobile || customer.phone || 'N/A'}</span>
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Visits */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {(customer.visits || 0)} {(customer.visits === 1 ? 'visit' : 'visits')}
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{customer.spent || '₹0'}</div>
                        {source === 'cache' && (
                          <div className="text-[10px] text-amber-800 font-medium font-sans">Saved value — connect to refresh</div>
                        )}
                      </td>

                      {/* Last Visit */}
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{customer.lastVisit || customer.last_visit || 'N/A'}</span>
                        </div>
                        {source === 'cache' && (
                          <div className="text-[10px] text-amber-800 font-medium">Saved value — connect to refresh</div>
                        )}
                      </td>

                      {/* Status Tag */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          custStatus === 'VIP' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : custStatus === 'New'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : custStatus === 'Inactive'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {custStatus === 'VIP' && <Crown className="w-3 h-3 text-amber-500" />}
                          {custStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openEditModal(customer)} 
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteCustomer(customerId)} 
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500 font-medium space-y-3">
                      {source === 'cache' && customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-2 p-4">
                          <p className="text-slate-800 font-bold text-sm">No customers were available when this page was last updated.</p>
                          <p className="text-xs text-slate-500">Connect to the internet to check for customer CRM updates.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Search className="w-8 h-8 text-slate-300" />
                          <p className="text-slate-700 font-bold text-sm">No customers matched your search</p>
                          <p className="text-slate-400 text-xs max-w-sm">
                            Try searching with a different name, phone digit sequence (e.g. 9811), or visit timeframe (e.g. "Yesterday", "weeks").
                          </p>
                          {(searchQuery || selectedStatus !== 'All') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setSelectedStatus('All');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors border border-blue-200"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Search & Filters</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title={editingCustomer ? "Edit Customer Record" : "Add New Customer"}
      >
        <form onSubmit={handleAddOrEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              name="custName" 
              defaultValue={editingCustomer?.name} 
              type="text" 
              placeholder="e.g. Rahul Verma"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
            <input 
              name="custMobile" 
              defaultValue={editingCustomer?.mobile || editingCustomer?.phone} 
              type="tel" 
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input 
              name="custEmail" 
              defaultValue={editingCustomer?.email} 
              type="email" 
              placeholder="rahul@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Loyalty Tier Status</label>
            <select 
              name="custStatus" 
              defaultValue={editingCustomer?.status || 'Regular'} 
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm"
            >
              <option value="Regular">Regular</option>
              <option value="VIP">VIP ⭐</option>
              <option value="New">New Client</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)} 
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSaving} 
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs"
            >
              {isSaving ? 'Saving...' : (editingCustomer ? 'Update Profile' : 'Save Customer')}
            </button>
          </div>
        </form>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
