import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, CheckSquare, Square, LayoutGrid, Table as TableIcon, X, 
  Sliders, Clock, IndianRupee, ArrowRight, RotateCcw, Check, Sparkles, Tag,
  Database, RefreshCw, WifiOff, Upload, Image, Activity, Users, BarChart3, CheckCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import StickyBulkActionBar from '../components/StickyBulkActionBar';
import { useOwnerServices } from '../hooks/useOwnerServices';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';
import { resizeImage } from '../lib/imageResize';

export default function Services() {
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingService, setViewingService] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const {
    data: cachedServices,
    source,
    isStale,
    lastUpdated,
    isLoading: cacheLoading,
    shopId: currentShopId,
    refetch
  } = useOwnerServices();

  useRegisterRefresh(refetch);

  // Effective services list: preference to cached services when source === 'cache'
  const services = useMemo(() => {
    if (source === 'cache') {
      return cachedServices || [];
    }
    return dbServices || [];
  }, [source, cachedServices, dbServices]);

  const categories = useMemo(() => {
    const rawCategories = services.map(s => s.category || 'Uncategorized');
    const unique = Array.from(new Set(rawCategories)).sort();
    return ['All', ...unique, 'Inactive'];
  }, [services]);

  const stats = useMemo(() => {
    const activeSvcs = services.filter(s => s.is_active !== false);
    const uniqueCats = new Set(services.map(s => s.category || 'Uncategorized')).size;
    const totalP = activeSvcs.reduce((acc, s) => acc + (s.price || 0), 0);
    return {
      total: services.length,
      active: activeSvcs.length,
      avgPrice: activeSvcs.length > 0 ? Math.round(totalP / activeSvcs.length) : 0,
      categories: uniqueCats
    };
  }, [services]);

  const isLoading = dbLoading && cacheLoading;

  // Bulk Edit Modal States
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkTargetIds, setBulkTargetIds] = useState<string[]>([]);
  const [priceMode, setPriceMode] = useState<'none' | 'fixed' | 'percent_inc' | 'percent_dec' | 'flat_add' | 'flat_sub'>('none');
  const [priceVal, setPriceVal] = useState<string>('');
  const [durationMode, setDurationMode] = useState<'none' | 'fixed' | 'add' | 'sub'>('none');
  const [durationVal, setDurationVal] = useState<string>('');
  const [categoryVal, setCategoryVal] = useState<string>('no_change');
  const [statusVal, setStatusVal] = useState<string>('no_change');
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivatingServiceId, setDeactivatingServiceId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setDbLoading(true);
      const data = await api.getServices();
      setDbServices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDbLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    // Inactive filter
    if (selectedCategory === 'Inactive') {
      if (service.is_active !== false) return false;
    } else {
      if (service.is_active === false) return false;
    }

    // Gender Filter
    if (selectedGender !== 'All') {
      const svcGender = (service.gender || 'unisex').toLowerCase();
      if (svcGender !== selectedGender.toLowerCase()) return false;
    }

    // Category Filter (if not Inactive)
    if (selectedCategory !== 'Inactive' && selectedCategory !== 'All') {
      const svcCat = service.category || 'Uncategorized';
      if (svcCat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }

    // Search
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      service.name?.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query) ||
      (service.category || 'Uncategorized').toLowerCase().includes(query) ||
      (service.gender || 'unisex').toLowerCase().includes(query) ||
      String(service.price).includes(query) ||
      String(service.duration_minutes || service.duration || '').includes(query)
    );
  });

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedGender('All');
  };

  const isAllSelected = filteredServices.length > 0 && filteredServices.every(s => selectedIds.includes(s.id));
  const isSomeSelected = filteredServices.some(s => selectedIds.includes(s.id)) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      const filteredSet = new Set(filteredServices.map(s => s.id));
      setSelectedIds(selectedIds.filter(id => !filteredSet.has(id)));
    } else {
      const allFilteredIds = filteredServices.map(s => s.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const openDeactivateModal = (id: string) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }
    setDeactivatingServiceId(id);
    setIsDeactivateModalOpen(true);
  };

  const handleSoftDeactivate = async () => {
    if (!deactivatingServiceId || !currentShopId) {
      if (!currentShopId) showToast('Business profile not found. Please refresh and try again.');
      setIsDeactivateModalOpen(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("services")
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", deactivatingServiceId)
        .eq("shop_id", currentShopId);

      if (error) throw error;

      showToast('Service deactivated successfully.');
      setIsDeactivateModalOpen(false);
      setDeactivatingServiceId(null);
      refetch(); // Refresh list
      loadServices(); // Also load to local state
      setSelectedIds(selectedIds.filter(i => i !== deactivatingServiceId));
    } catch (error) {
      console.error("Service deactivate failed:", error);
      showToast('Service could not be deactivated. Please try again.');
    }
  };

  // Bulk Operations
  const handleBulkDelete = async () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }
    if (selectedIds.length === 0 || !currentShopId) {
      if (!currentShopId) showToast('Business profile not found. Please refresh and try again.');
      return;
    }

    if (confirm(`Are you sure you want to deactivate ${selectedIds.length} selected service(s)?`)) {
      try {
        const { error } = await supabase
          .from("services")
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .in("id", selectedIds)
          .eq("shop_id", currentShopId);

        if (error) throw error;

        showToast(`Successfully deactivated ${selectedIds.length} service(s)`);
        setSelectedIds([]);
        refetch(); // Refresh list
        loadServices(); // Also load to local state
      } catch (error) {
        console.error("Bulk deactivate failed:", error);
        showToast('Error deactivating selected services');
      }
    }
  };

  const handleBulkStatusChange = async (isActive: boolean) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }
    if (selectedIds.length === 0) return;
    try {
      await api.bulkUpdateServicesStatus(selectedIds, isActive);
      setDbServices(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, is_active: isActive } : s));
      showToast(`Updated status for ${selectedIds.length} service(s) to ${isActive ? 'Active' : 'Inactive'}`);
      setSelectedIds([]);
    } catch {
      showToast('Error updating status for selected services');
    }
  };

  // Bulk Edit Dialog Logic
  const openBulkEditModal = (overrideIds?: string[]) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }
    let target = overrideIds;
    if (!target || target.length === 0) {
      if (selectedIds.length > 0) {
        target = selectedIds;
      } else {
        target = filteredServices.map(s => s.id);
      }
    }
    setBulkTargetIds(target);
    setPriceMode('none');
    setPriceVal('');
    setDurationMode('none');
    setDurationVal('');
    setCategoryVal('no_change');
    setStatusVal('no_change');
    setIsBulkEditModalOpen(true);
  };

  const getProjectedService = (service: any) => {
    let price = service.price;
    let duration = service.duration;
    let category = service.category;
    let is_active = service.is_active;

    // Price calculation
    const numP = parseFloat(priceVal) || 0;
    if (priceMode === 'fixed' && priceVal !== '') {
      price = Math.max(0, numP);
    } else if (priceMode === 'percent_inc' && priceVal !== '') {
      price = Math.round(service.price * (1 + numP / 100));
    } else if (priceMode === 'percent_dec' && priceVal !== '') {
      price = Math.max(0, Math.round(service.price * (1 - numP / 100)));
    } else if (priceMode === 'flat_add' && priceVal !== '') {
      price = Math.max(0, service.price + numP);
    } else if (priceMode === 'flat_sub' && priceVal !== '') {
      price = Math.max(0, service.price - numP);
    }

    // Duration calculation
    const numD = parseInt(durationVal) || 0;
    if (durationMode === 'fixed' && durationVal !== '') {
      duration = Math.max(5, numD);
    } else if (durationMode === 'add' && durationVal !== '') {
      duration = Math.max(5, service.duration + numD);
    } else if (durationMode === 'sub' && durationVal !== '') {
      duration = Math.max(5, service.duration - numD);
    }

    // Category
    if (categoryVal !== 'no_change') {
      category = categoryVal;
    }

    // Status
    if (statusVal === 'active') {
      is_active = true;
    } else if (statusVal === 'inactive') {
      is_active = false;
    }

    return { ...service, price, duration, category, is_active };
  };

  const handleApplyBulkEdit = async () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }
    if (bulkTargetIds.length === 0) {
      showToast('No services selected for bulk update');
      return;
    }

    if (priceMode === 'none' && durationMode === 'none' && categoryVal === 'no_change' && statusVal === 'no_change') {
      showToast('Please specify at least one price, duration, or property change');
      return;
    }

    setIsBulkApplying(true);
    try {
      const targetSvcs = services.filter(s => bulkTargetIds.includes(s.id));
      const updates = targetSvcs.map(svc => {
        const proj = getProjectedService(svc);
        return {
          id: svc.id,
          price: proj.price,
          duration: proj.duration,
          category: proj.category,
          is_active: proj.is_active
        };
      });

      await api.bulkUpdateServices(updates);

      // Local state update
      const updateMap = new Map(updates.map(u => [u.id, u]));
      setDbServices(prev => prev.map(s => {
        const u = updateMap.get(s.id);
        return u ? { ...s, ...u } : s;
      }));

      showToast(`Successfully updated ${updates.length} service(s)!`);
      setIsBulkEditModalOpen(false);
      setSelectedIds([]);
    } catch {
      showToast('Failed to apply bulk service changes');
    } finally {
      setIsBulkApplying(false);
    }
  };

  const openEditModal = (service: any) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }
    setEditingService(service);
    setImagePreviewUrl(service.image_url || null);
    setImageFile(null);
    setIsAddModalOpen(true);
  };

  const openAddModal = () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }
    setEditingService(null);
    setImagePreviewUrl(null);
    setImageFile(null);
    setIsAddModalOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload JPG, PNG or WebP image.');
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      showToast('Image size must be under 2 MB.');
      return;
    }

    try {
      // Auto resize
      const resizedFile = await resizeImage(file, 800, 600);
      setImageFile(resizedFile);
      setImagePreviewUrl(URL.createObjectURL(resizedFile));
    } catch (err) {
      console.error("Resize failed:", err);
      showToast('Failed to process image.');
    }
  };

  const uploadServiceImage = async (file: File, shopId: string, serviceId: string) => {
    const fileExt = 'webp';
    const fileName = `${Date.now()}-service.${fileExt}`;
    const filePath = `services/${shopId}/${serviceId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('salon-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('salon-media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'cache' || !navigator.onLine) {
      showToast('Service changes require an internet connection.');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      showToast('Please sign in again to save services.');
      return;
    }

    if (!currentShopId) {
      showToast('Business profile not found. Please refresh.');
      return;
    }

    const form = e.target as HTMLFormElement;
    
    // Validation
    const name = form.svcName.value.trim();
    const price = parseFloat(form.svcPrice.value);
    const discountPrice = form.svcDiscount.value ? parseFloat(form.svcDiscount.value) : null;
    const duration = parseInt(form.svcDur.value);
    const gender = form.svcGender.value;

    if (!name) {
      showToast('Service name is required.');
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast('Service price cannot be negative.');
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      showToast('Service duration must be greater than zero.');
      return;
    }
    if (discountPrice !== null && discountPrice > price) {
      showToast('Discounted price cannot be greater than regular price.');
      return;
    }

    setIsSaving(true);
    
    try {
      let finalImageUrl = editingService?.image_url || null;

      // Handle image upload if a new file is selected
      if (imageFile) {
        setIsUploading(true);
        try {
          // If it's a new service, we need a temp ID for storage folder
          const storageId = editingService?.id || `temp-${Date.now()}`;
          finalImageUrl = await uploadServiceImage(imageFile, currentShopId, storageId);
          showToast('Service image uploaded successfully.');
        } catch (uploadErr) {
          console.error("Upload failed:", uploadErr);
          showToast('Service image could not be uploaded. Please try again.');
          setIsSaving(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const { error } = await supabase.rpc('upsert_shop_service', {
        p_service_id: editingService?.id || null,
        p_shop_id: currentShopId,
        p_name: name,
        p_description: form.svcDesc.value,
        p_category: form.svcCat.value,
        p_price: price,
        p_discounted_price: discountPrice,
        p_duration_minutes: duration,
        p_gender: gender,
        p_image_url: finalImageUrl,
        p_display_order: parseInt(form.svcDisplayOrder.value) || 0,
        p_is_active: (form.elements.namedItem('active-toggle') as HTMLInputElement).checked
      });

      if (error) throw error;

      showToast('Service saved successfully.');
      setIsAddModalOpen(false);
      setImageFile(null);
      setImagePreviewUrl(null);
      refetch(); // Refresh list
      loadServices(); // Also load to local state if needed
    } catch (error) {
      console.error("Service save failed:", error);
      showToast('Service could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (source === 'none' && !isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="min-h-[50vh] bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            No saved services are available offline.
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            Connect to the internet once to load your service list.
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
                  <span className="font-bold text-base text-amber-950">Showing saved services</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isStale 
                      ? 'bg-amber-200 text-amber-900 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isStale ? 'Outdated saved services' : 'Saved services'}
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
                  Prices, availability and service status may have changed.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!navigator.onLine) {
                  showToast('You are still offline. Connect to internet to refresh.');
                } else {
                  refetch();
                  showToast('Refreshing live services...');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services Directory</h1>
          <p className="text-slate-500 mt-1">Manage your treatment menu, prices, and availability</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => openBulkEditModal(selectedIds.length > 0 ? selectedIds : filteredServices.map(s => s.id))} 
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200/80 transition-colors shadow-2xs text-sm"
            title="Bulk edit prices or durations across services"
          >
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Bulk Edit {selectedIds.length > 0 ? `(${selectedIds.length})` : 'Services'}</span>
          </button>
          <button onClick={openAddModal} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs text-sm">
            <Plus className="w-5 h-5" /> Add Service
          </button>
        </div>
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Services</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Services</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.active}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Price</span>
          </div>
          <div className="text-2xl font-black text-slate-900">₹{stats.avgPrice}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Tag className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categories</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.categories}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search services by name, category, or price..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm shadow-2xs" 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {source === 'cache' && (searchQuery || selectedCategory !== 'All' || selectedGender !== 'All') && (
            <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
              Filtering saved services only.
            </span>
          )}

          {/* Gender Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs shrink-0">
            {['All', 'Men', 'Women', 'Child', 'Unisex'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGender(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGender === g
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto py-1 hide-scrollbar shrink-0 max-w-[300px] md:max-w-none">
            {categories.map((filter) => (
              <button 
                key={filter} 
                onClick={() => setSelectedCategory(filter)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  selectedCategory === filter 
                    ? filter === 'Inactive' ? 'bg-slate-500 text-white shadow-2xs' : 'bg-slate-900 text-white shadow-2xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedCategory !== 'All' || selectedGender !== 'All') && (
            <button
              onClick={resetFilters}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear all filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
            <button 
              onClick={() => setViewMode('table')} 
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bulk Action Bar */}
      <StickyBulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredServices.length}
        itemLabel="service"
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        customActions={
          <button
            type="button"
            onClick={() => openBulkEditModal(selectedIds)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Bulk Edit ({selectedIds.length})</span>
          </button>
        }
        statusOptions={[
          { label: 'Set Active', value: 'active', color: 'emerald' },
          { label: 'Set Inactive', value: 'inactive', color: 'slate' },
        ]}
        onStatusUpdate={(val) => handleBulkStatusChange(val === 'active')}
      />

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading services...</div>
      ) : filteredServices.length === 0 ? (
        <div className="min-h-[40vh] bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {services.length === 0 ? "No services added yet" : "No services found"}
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
            {services.length === 0 
              ? "Start by adding your first service to your menu."
              : "We couldn't find any services matching your current filters or search criteria."}
          </p>
          {services.length === 0 ? (
            <button 
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" /> Add First Service
            </button>
          ) : (
            <button 
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW WITH BULK CHECKBOX COLUMN */
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
                  <th className="py-3.5 px-4">Service Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">
                    {selectedIds.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          onChange={(e) => {
                            if (e.target.value === 'active') handleBulkStatusChange(true);
                            if (e.target.value === 'inactive') handleBulkStatusChange(false);
                            e.target.value = '';
                          }}
                          defaultValue=""
                          className="bg-blue-600 text-white border border-blue-700 rounded-lg text-xs font-bold px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-2xs"
                        >
                          <option value="" disabled>Bulk Status Update ▼</option>
                          <option value="active" className="text-slate-900 bg-white">🟢 Set Active</option>
                          <option value="inactive" className="text-slate-900 bg-white">⚪ Set Inactive</option>
                        </select>
                      </div>
                    ) : (
                      "Status"
                    )}
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredServices.map(service => {
                  const isSelected = selectedIds.includes(service.id);
                  return (
                    <tr 
                      key={service.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <button 
                          onClick={() => handleSelectOne(service.id)} 
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <button 
                          onClick={() => {
                            setViewingService(service);
                            setIsDetailsModalOpen(true);
                          }}
                          className="flex flex-col text-left hover:text-blue-600 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{service.name}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded border ${
                              service.gender === 'men' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              service.gender === 'women' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                              service.gender === 'child' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                              {service.gender || 'unisex'}
                            </span>
                          </div>
                          {source === 'cache' && (
                            <span className="block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">
                              Saved offline data
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {service.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {service.duration_minutes || service.duration} Min
                      </td>
                      <td className="py-3.5 px-4">
                        {service.discounted_price || service.discount_price ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-slate-900">₹{service.discounted_price || service.discount_price}</span>
                            <span className="text-xs text-slate-400 line-through">₹{service.price}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">₹{service.price}</span>
                        )}
                        {source === 'cache' && (
                          <span className="block text-[10px] text-amber-800 font-medium mt-0.5">
                            Saved price — connect to verify
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${service.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${service.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openEditModal(service)} 
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openDeactivateModal(service.id)} 
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                      {source === 'cache' && services.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <p className="text-slate-800 font-bold text-sm">No services were available when this page was last updated.</p>
                          <p className="text-xs text-slate-500">Connect to the internet to check for new services.</p>
                        </div>
                      ) : searchQuery ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-slate-700 font-semibold text-sm">No services found matching &quot;{searchQuery}&quot;</p>
                          <p className="text-xs text-slate-500">Try searching with a different keyword or category</p>
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Clear Search
                          </button>
                        </div>
                      ) : (
                        "No services match your filter criteria."
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW WITH CHECKBOXES */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => {
            const isSelected = selectedIds.includes(service.id);
            return (
              <div 
                key={service.id} 
                className={`bg-white p-5 rounded-2xl border transition-all relative group shadow-xs ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleSelectOne(service.id)} 
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        setViewingService(service);
                        setIsDetailsModalOpen(true);
                      }}
                      className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex-shrink-0">
                        {service.image_url ? (
                          <img 
                            src={service.image_url} 
                            alt={service.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Service';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">
                            {service.category}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            service.gender === 'men' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            service.gender === 'women' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                            service.gender === 'child' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            {service.gender || 'unisex'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1 truncate">{service.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {service.duration_minutes || service.duration || 0} Min
                        </p>
                        {source === 'cache' && (
                          <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1">
                            Saved offline data
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(service)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDeactivateModal(service.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2 pl-9">
                  {service.duration_minutes || service.duration || 0} Min
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between pl-9">
                  <div>
                    {service.discounted_price || service.discount_price ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-slate-900">₹{service.discounted_price || service.discount_price}</span>
                        <span className="text-xs text-slate-400 line-through">₹{service.price}</span>
                      </div>
                    ) : (
                      <span className="text-base font-bold text-slate-900">₹{service.price}</span>
                    )}
                    {source === 'cache' && (
                      <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                        Saved price — connect to verify
                      </p>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${service.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {service.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredServices.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
              {source === 'cache' && services.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1">
                  <p className="text-slate-800 font-bold text-sm">No services were available when this page was last updated.</p>
                  <p className="text-xs text-slate-500">Connect to the internet to check for new services.</p>
                </div>
              ) : searchQuery ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-slate-700 font-semibold text-sm">No services found matching &quot;{searchQuery}&quot;</p>
                  <p className="text-xs text-slate-500">Try searching with a different keyword or category</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Search
                  </button>
                </div>
              ) : (
                "No services found."
              )}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editingService ? "Edit Service" : "Add New Service"}>
        <form onSubmit={handleAddOrEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
            <input name="svcName" defaultValue={editingService?.name} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              name="svcDesc" 
              defaultValue={editingService?.description} 
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm resize-none" 
              placeholder="Describe the service details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select name="svcCat" defaultValue={editingService?.category || 'Hair'} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm">
                <option value="Hair">Hair</option>
                <option value="Makeup">Makeup</option>
                <option value="Spa">Spa</option>
                <option value="Nail">Nail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select name="svcGender" defaultValue={editingService?.gender || 'unisex'} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm">
                <option value="unisex">Unisex</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="child">Child</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Min)</label>
              <select name="svcDur" defaultValue={editingService?.duration_minutes || editingService?.duration || 30} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm">
                <option value="15">15 Min</option>
                <option value="30">30 Min</option>
                <option value="45">45 Min</option>
                <option value="60">60 Min</option>
                <option value="90">90 Min</option>
                <option value="120">120 Min</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
              <input name="svcDisplayOrder" defaultValue={editingService?.display_order || 0} type="number" className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
              <input name="svcPrice" defaultValue={editingService?.price} type="number" className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discount Price (Optional)</label>
              <input name="svcDiscount" defaultValue={editingService?.discounted_price || editingService?.discount_price} type="number" className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Image</label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-inner">
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                {(isUploading || isSaving) && isUploading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input 
                  type="file" 
                  id="service-image-upload" 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={isUploading || isSaving}
                />
                <label 
                  htmlFor="service-image-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm ${isUploading || isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Upload className="w-3.5 h-3.5" /> 
                  {editingService?.image_url || imagePreviewUrl ? 'Change Image' : 'Upload Image'}
                </label>
                <p className="text-[10px] text-slate-400 mt-2">Max 2MB (JPG, PNG, WebP)</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" name="active-toggle" id="active-toggle" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600" defaultChecked={editingService ? editingService.is_active : true} />
            <label htmlFor="active-toggle" className="text-sm font-medium text-slate-700">Active (Visible to customers)</label>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs">
              {isSaving ? 'Saving...' : (editingService ? 'Update Service' : 'Save Service')}
            </button>
          </div>
        </form>
      </Modal>

      {/* BULK EDIT SERVICES MODAL */}
      <Modal 
        isOpen={isBulkEditModalOpen} 
        onClose={() => setIsBulkEditModalOpen(false)} 
        title="Bulk Edit Services"
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Top Target Selection Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Target Services ({bulkTargetIds.length} Selected)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkTargetIds(filteredServices.map(s => s.id))}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Select All Filtered ({filteredServices.length})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setBulkTargetIds([])}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Target Pills */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {services.filter(s => bulkTargetIds.includes(s.id)).map(svc => (
                <span 
                  key={svc.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-medium shadow-2xs"
                >
                  <span className="font-semibold text-blue-600">{svc.name}</span>
                  <span className="text-[10px] text-slate-400">({svc.duration}m, ₹{svc.price})</span>
                  <button 
                    type="button"
                    onClick={() => setBulkTargetIds(bulkTargetIds.filter(id => id !== svc.id))}
                    className="text-slate-400 hover:text-red-500 p-0.5"
                    title="Remove from bulk update"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {bulkTargetIds.length === 0 && (
                <p className="text-xs text-red-500 italic">No services selected. Click &quot;Select All Filtered&quot; above or select services in the list.</p>
              )}
            </div>
          </div>

          {/* Form Controls: Price & Duration */}
          <div className="grid md:grid-cols-2 gap-4">
            
            {/* PRICE UPDATE BOX */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Update Price</h4>
                  <p className="text-[11px] text-slate-500">Adjust standard pricing</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Adjustment Type</label>
                <select
                  value={priceMode}
                  onChange={(e: any) => {
                    setPriceMode(e.target.value);
                    if (e.target.value === 'none') setPriceVal('');
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                >
                  <option value="none">Do Not Change Price</option>
                  <option value="percent_inc">Increase Price by % (+%)</option>
                  <option value="percent_dec">Decrease Price by % (-%)</option>
                  <option value="flat_add">Add Flat Amount (+₹)</option>
                  <option value="flat_sub">Subtract Flat Amount (-₹)</option>
                  <option value="fixed">Set Fixed Price for All (₹)</option>
                </select>
              </div>

              {priceMode !== 'none' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {priceMode === 'percent_inc' && 'Percentage Increase (%)'}
                    {priceMode === 'percent_dec' && 'Percentage Discount (%)'}
                    {priceMode === 'flat_add' && 'Amount to Add (₹)'}
                    {priceMode === 'flat_sub' && 'Amount to Subtract (₹)'}
                    {priceMode === 'fixed' && 'New Fixed Price (₹)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder={priceMode.includes('percent') ? '10' : '100'}
                      value={priceVal}
                      onChange={(e) => setPriceVal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {priceMode.includes('percent') ? '%' : '₹'}
                    </span>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {priceMode === 'percent_inc' && ['5', '10', '15', '20'].map(p => (
                      <button key={p} type="button" onClick={() => setPriceVal(p)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">+{p}%</button>
                    ))}
                    {priceMode === 'percent_dec' && ['5', '10', '15', '20'].map(p => (
                      <button key={p} type="button" onClick={() => setPriceVal(p)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">-{p}%</button>
                    ))}
                    {(priceMode === 'flat_add' || priceMode === 'flat_sub') && ['50', '100', '200', '500'].map(a => (
                      <button key={a} type="button" onClick={() => setPriceVal(a)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">₹{a}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DURATION UPDATE BOX */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Update Duration</h4>
                  <p className="text-[11px] text-slate-500">Adjust service appointment length</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Adjustment Type</label>
                <select
                  value={durationMode}
                  onChange={(e: any) => {
                    setDurationMode(e.target.value);
                    if (e.target.value === 'none') setDurationVal('');
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                >
                  <option value="none">Do Not Change Duration</option>
                  <option value="add">Add Minutes (+Mins)</option>
                  <option value="sub">Subtract Minutes (-Mins)</option>
                  <option value="fixed">Set Fixed Duration (Mins)</option>
                </select>
              </div>

              {durationMode !== 'none' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {durationMode === 'add' && 'Minutes to Add (+m)'}
                    {durationMode === 'sub' && 'Minutes to Subtract (-m)'}
                    {durationMode === 'fixed' && 'New Fixed Duration (Mins)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="15"
                      value={durationVal}
                      onChange={(e) => setDurationVal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Mins
                    </span>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {durationMode === 'add' && ['15', '30', '45', '60'].map(m => (
                      <button key={m} type="button" onClick={() => setDurationVal(m)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">+{m}m</button>
                    ))}
                    {durationMode === 'sub' && ['15', '30'].map(m => (
                      <button key={m} type="button" onClick={() => setDurationVal(m)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">-{m}m</button>
                    ))}
                    {durationMode === 'fixed' && ['15', '30', '45', '60', '90', '120'].map(m => (
                      <button key={m} type="button" onClick={() => setDurationVal(m)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">{m}m</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Category & Status Controls */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Category Change
              </label>
              <select 
                value={categoryVal}
                onChange={(e) => setCategoryVal(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="no_change">No Change</option>
                <option value="Hair">Move to Hair</option>
                <option value="Makeup">Move to Makeup</option>
                <option value="Spa">Move to Spa</option>
                <option value="Nail">Move to Nail</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                Status Change
              </label>
              <select 
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="no_change">No Change</option>
                <option value="active">Set Active (Visible)</option>
                <option value="inactive">Set Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          {/* LIVE IMPACT PREVIEW TABLE */}
          {bulkTargetIds.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Live Impact Preview ({bulkTargetIds.length} Services)
                </h4>
                <span className="text-[11px] text-slate-400">Verify changes before applying</span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Service</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {services.filter(s => bulkTargetIds.includes(s.id)).map(svc => {
                      const proj = getProjectedService(svc);
                      const isPriceChanged = proj.price !== svc.price;
                      const isDurChanged = proj.duration !== svc.duration;
                      const isCatChanged = proj.category !== svc.category;
                      const isStatChanged = proj.is_active !== svc.is_active;

                      return (
                        <tr key={svc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900">{svc.name}</td>
                          <td className="p-2.5">
                            {isCatChanged ? (
                              <span className="inline-flex items-center gap-1 font-bold text-blue-600">
                                <span className="line-through text-slate-400 font-normal">{svc.category}</span>
                                <ArrowRight className="w-3 h-3" />
                                {proj.category}
                              </span>
                            ) : (
                              <span className="text-slate-600">{svc.category}</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {isPriceChanged ? (
                              <div className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block">
                                <span className="line-through text-slate-400 font-normal">₹{svc.price}</span>
                                <ArrowRight className="w-3 h-3 text-emerald-500" />
                                <span>₹{proj.price}</span>
                              </div>
                            ) : (
                              <span className="font-semibold text-slate-800">₹{svc.price}</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {isDurChanged ? (
                              <div className="flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md inline-block">
                                <span className="line-through text-slate-400 font-normal">{svc.duration}m</span>
                                <ArrowRight className="w-3 h-3 text-blue-500" />
                                <span>{proj.duration}m</span>
                              </div>
                            ) : (
                              <span className="text-slate-700">{svc.duration}m</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            {isStatChanged ? (
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${proj.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                                {proj.is_active ? 'Active' : 'Inactive'}
                              </span>
                            ) : (
                              <span className={`text-[11px] ${svc.is_active ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                {svc.is_active ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Action Footer */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setPriceMode('none');
                setPriceVal('');
                setDurationMode('none');
                setDurationVal('');
                setCategoryVal('no_change');
                setStatusVal('no_change');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Form
            </button>

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setIsBulkEditModalOpen(false)} 
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleApplyBulkEdit}
                disabled={isBulkApplying || bulkTargetIds.length === 0 || (priceMode === 'none' && durationMode === 'none' && categoryVal === 'no_change' && statusVal === 'no_change')} 
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                {isBulkApplying ? 'Applying Updates...' : `Apply Bulk Updates (${bulkTargetIds.length})`}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Service Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setViewingService(null);
        }}
        title="Service Details"
        maxWidthClass="max-w-xl"
      >
        {viewingService && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-48 h-48 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shrink-0 shadow-sm relative">
                {viewingService.image_url ? (
                  <img 
                    src={viewingService.image_url} 
                    alt={viewingService.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Service';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <Image className="w-12 h-12 text-slate-200" />
                  </div>
                )}
                {source === 'cache' && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <WifiOff className="w-2.5 h-2.5" /> Offline
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {viewingService.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      viewingService.gender === 'men' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      viewingService.gender === 'women' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                      viewingService.gender === 'child' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {viewingService.gender || 'unisex'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{viewingService.name}</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {viewingService.duration_minutes || viewingService.duration} Min
                    </div>
                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className={`w-4 h-4 ${viewingService.is_active ? 'text-emerald-500' : 'text-slate-300'}`} />
                      {viewingService.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pricing</div>
                  <div className="flex items-baseline gap-2">
                    {viewingService.discounted_price || viewingService.discount_price ? (
                      <>
                        <span className="text-2xl font-black text-slate-900">₹{viewingService.discounted_price || viewingService.discount_price}</span>
                        <span className="text-base text-slate-400 line-through">₹{viewingService.price}</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">
                          {Math.round(((viewingService.price - (viewingService.discounted_price || viewingService.discount_price)) / viewingService.price) * 100)}% OFF
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-black text-slate-900">₹{viewingService.price}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</div>
              <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-100 p-4 rounded-2xl">
                {viewingService.description || "No description provided for this service."}
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openEditModal(viewingService);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm text-sm"
              >
                <Edit2 className="w-4 h-4" /> Edit Service
              </button>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast visible={toast.visible} message={toast.message} />
      {/* Deactivate Confirmation Modal */}
      <Modal 
        isOpen={isDeactivateModalOpen} 
        onClose={() => setIsDeactivateModalOpen(false)} 
        title="Deactivate Service?"
      >
        <div className="p-1">
          <p className="text-sm text-slate-600 leading-relaxed">
            This service will be removed from your active service list, but old bookings and records will remain safe.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={() => setIsDeactivateModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSoftDeactivate}
              className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-sm active:scale-95"
            >
              Deactivate Service
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}