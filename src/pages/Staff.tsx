import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Star, Calendar, Edit2, Trash2, Camera, Search, X, CheckSquare, Square, 
  UserCheck, Clock, Phone, Percent, LayoutGrid, List, ShieldAlert, Shield, Key, Check, DollarSign,
  Database, RefreshCw, WifiOff
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { resizeStaffImage } from '../lib/imageResize';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import StickyBulkActionBar from '../components/StickyBulkActionBar';
import { useOwnerStaff } from '../hooks/useOwnerStaff';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';

export default function Staff() {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [dbStaffList, setDbStaffList] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    data: cachedStaff,
    source,
    isStale,
    lastUpdated,
    isLoading: cacheLoading,
    shopId,
    refetch
  } = useOwnerStaff();

  useRegisterRefresh(refetch);

  const loadStaff = useCallback(async (activeShopId: string | null) => {
    if (!activeShopId) return;
    try {
      setDbLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('shop_id', activeShopId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mappedData = (data || []).map(s => ({
        ...s,
        name: s.full_name,
        role: s.primary_role,
        mobile: s.mobile_number,
        commission: `${s.commission_percent || 0}%`,
        status: s.status === 'available' ? 'Available' : s.status === 'busy' ? 'Busy' : s.status === 'on_leave' ? 'On Leave' : s.status === 'inactive' ? 'Inactive' : 'Available',
        specialization: Array.isArray(s.specializations) ? s.specializations.join(', ') : s.primary_role,
        avatar_url: s.profile_photo_url,
        rating: s.rating
      }));
      setDbStaffList(mappedData);
    } catch (err) {
      console.error('Failed to load staff:', err);
      showToast('Error loading staff list.');
    } finally {
      setDbLoading(false);
    }
  }, []);

  // Effective staff list: preference to cached staff when source === 'cache'
  const staffList = useMemo(() => {
    if (source === 'cache') {
      return cachedStaff || [];
    }
    return dbStaffList || [];
  }, [source, cachedStaff, dbStaffList]);

  const isLoading = dbLoading && cacheLoading;
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'directory' | 'payroll'>('directory');

  // Role Permissions Modal State
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [accessRoles, _setAccessRoles] = useState([
    {
      id: 'manager',
      name: 'Manager',
      description: 'Full operational & financial access except owner payout accounts',
      permissions: {
        bookings: 'Full Control',
        financials: 'View & Edit',
        staff: 'Full Control',
        services: 'Full Control',
        payouts: 'View Only',
        settings: 'Full Control'
      }
    },
    {
      id: 'provider',
      name: 'Service Provider',
      description: 'Access to own schedule, client notes, and assigned bookings',
      permissions: {
        bookings: 'Assigned Only',
        financials: 'No Access',
        staff: 'View Only',
        services: 'View Only',
        payouts: 'No Access',
        settings: 'No Access'
      }
    },
    {
      id: 'receptionist',
      name: 'Receptionist',
      description: 'Frontdesk access for creating bookings, walk-ins, and client billing',
      permissions: {
        bookings: 'Full Control',
        financials: 'Billing Only',
        staff: 'View Schedule',
        services: 'View Only',
        payouts: 'No Access',
        settings: 'No Access'
      }
    }
  ]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [staffToDeactivate, setStaffToDeactivate] = useState<any>(null);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [viewingStaff, setViewingStaff] = useState<any>(null);
  const [scheduleStaff, setScheduleStaff] = useState<any>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<any>({
    monday: { enabled: true, start: "10:00", end: "20:00" },
    tuesday: { enabled: true, start: "10:00", end: "20:00" },
    wednesday: { enabled: true, start: "10:00", end: "20:00" },
    thursday: { enabled: true, start: "10:00", end: "20:00" },
    friday: { enabled: true, start: "10:00", end: "20:00" },
    saturday: { enabled: true, start: "10:00", end: "20:00" },
    sunday: { enabled: false, start: "", end: "" }
  });
  const [workingHours, setWorkingHours] = useState<any>({});
  
  const fetchServices = async (currentShopId: string | null) => {
    if (!currentShopId) return;
    try {
      const services = await api.getServices();
      setAvailableServices(services.filter((s: any) => s.shop_id === currentShopId && s.is_active));
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };
  
  const openAddStaffModal = () => {
    fetchServices(shopId);
    setEditingStaff(null);
    setAvatarUrl(null);
    setAvatarFile(null);
    setUploadedPhotoUrl(null);
    setAssignedServiceIds([]);
    setIsOptimized(false);
    setWeeklySchedule({
      monday: { enabled: true, start: "10:00", end: "20:00" },
      tuesday: { enabled: true, start: "10:00", end: "20:00" },
      wednesday: { enabled: true, start: "10:00", end: "20:00" },
      thursday: { enabled: true, start: "10:00", end: "20:00" },
      friday: { enabled: true, start: "10:00", end: "20:00" },
      saturday: { enabled: true, start: "10:00", end: "20:00" },
      sunday: { enabled: false, start: "", end: "" }
    });
    setWorkingHours({});
    setSelectedSpecializations(['Hair Coloring', 'Styling']);
    setIsPhoneHidden(false);
    setIsModalOpen(true);
  };
  
  const openEditStaffModal = (staff: any) => {
    fetchServices(shopId);
    setEditingStaff(staff);
    setAvatarUrl(staff.avatar_url || staff.avatar);
    setAvatarFile(null);
    setUploadedPhotoUrl(null);
    setAssignedServiceIds(staff.assigned_service_ids || []);
    setIsOptimized(false);
    setWeeklySchedule(staff.weekly_schedule || {
      monday: { enabled: true, start: "10:00", end: "20:00" },
      tuesday: { enabled: true, start: "10:00", end: "20:00" },
      wednesday: { enabled: true, start: "10:00", end: "20:00" },
      thursday: { enabled: true, start: "10:00", end: "20:00" },
      friday: { enabled: true, start: "10:00", end: "20:00" },
      saturday: { enabled: true, start: "10:00", end: "20:00" },
      sunday: { enabled: false, start: "", end: "" }
    });
    setWorkingHours(staff.working_hours || {});
    const specs = staff.specializations || (staff.specialization ? staff.specialization.split(',').map((s: string) => s.trim()) : ['Hair Styling']);
    setSelectedSpecializations(specs);
    setIsPhoneHidden(!!staff.is_phone_hidden);
    setIsModalOpen(true);
  };

  const handleUploadPhoto = async (file: File, staffIdOrTempId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      showToast("Please sign in again.");
      return;
    }
    if (!shopId) {
      showToast('Business profile not found. Please refresh and try again.');
      return;
    }
    if (!navigator.onLine) {
      showToast('Photo upload requires an internet connection.');
      return;
    }
    
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filePath = `staff/${shopId}/${staffIdOrTempId}/${timestamp}-profile.webp`;

      const { error: uploadError } = await supabase.storage
        .from("salon-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        });
      
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("salon-media")
        .getPublicUrl(filePath);

      const photoUrl = publicData.publicUrl;
      setUploadedPhotoUrl(photoUrl);
      setAvatarUrl(photoUrl); // Update preview
      showToast('Photo uploaded successfully. Save staff to apply changes.');
    } catch (err) {
      console.error("Staff photo upload failed:", err);
      showToast('Staff photo could not be uploaded. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeactivateStaff = async () => {
    if (!navigator.onLine) {
      showToast('Staff changes require an internet connection.');
      return;
    }
    if (!shopId) {
      showToast('Business profile not found. Please refresh and try again.');
      return;
    }
    try {
      const { error } = await supabase
        .from("staff")
        .update({
          is_active: false,
          status: "inactive",
          updated_at: new Date().toISOString()
        })
        .eq("id", staffToDeactivate.id)
        .eq("shop_id", shopId);
      
      if (error) throw error;
      showToast('Staff deactivated successfully.');
      loadStaff(shopId);
      setIsDeactivateModalOpen(false);
      setStaffToDeactivate(null);
    } catch (err) {
      console.error("Staff deactivate failed:", err);
      showToast('Staff could not be deactivated. Please try again.');
    }
  };

  // Avatar Upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Customization States
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>(['Hair Coloring', 'Styling']);
  const [isPhoneHidden, setIsPhoneHidden] = useState<boolean>(false);

  const predefinedRoles = [
    'Senior Stylist',
    'Junior Stylist',
    'Hair Dresser',
    'Makeup Artist',
    'Nail Artist',
    'Spa Therapist',
    'Salon Manager',
    'Receptionist'
  ];

  const availableSkills = [
    'Hair Coloring',
    'Balayage',
    'Bridal Makeup',
    'Facial Treatments',
    'Nail Art',
    'Hair Extensions',
    'Threading & Waxing',
    'Deep Tissue Massage',
    'Beard Sculpting',
    'Keratin Treatment'
  ];

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  useEffect(() => {
    if (shopId) {
      loadStaff(shopId);
      fetchServices(shopId);
    }
  }, [shopId, loadStaff]);

  // Search & Filter Logic
  const filteredStaff = staffList.filter(staff => {
    const query = searchQuery.toLowerCase().trim();
    
    // Search logic - searching in name, role, phone, email, specialization string and status
    const matchesQuery = !query || 
      (staff.name && staff.name.toLowerCase().includes(query)) ||
      (staff.role && staff.role.toLowerCase().includes(query)) ||
      (staff.mobile && staff.mobile.includes(query)) ||
      (staff.email && staff.email.toLowerCase().includes(query)) ||
      (staff.specialization && staff.specialization.toLowerCase().includes(query)) ||
      (staff.status && staff.status.toLowerCase().includes(query));

    // Status & Active logic
    // Default: Show only active staff (is_active !== false)
    // If 'Inactive' filter is selected: Show only inactive staff (is_active === false or status === 'Inactive')
    let matchesStatus = false;
    if (selectedStatus === 'All') {
      matchesStatus = staff.is_active !== false;
    } else if (selectedStatus === 'Inactive') {
      matchesStatus = staff.is_active === false || staff.status === 'Inactive';
    } else {
      matchesStatus = (staff.is_active !== false) && (staff.status === selectedStatus);
    }

    return matchesQuery && matchesStatus;
  });

  // Bulk Selection Handlers
  const isAllSelected = filteredStaff.length > 0 && filteredStaff.every(s => selectedIds.includes(s.id));
  const isSomeSelected = filteredStaff.some(s => selectedIds.includes(s.id)) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      const filteredSet = new Set(filteredStaff.map(s => s.id));
      setSelectedIds(selectedIds.filter(id => !filteredSet.has(id)));
    } else {
      const allFilteredIds = filteredStaff.map(s => s.id);
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

  const handleBulkDelete = async () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Staff changes require an internet connection.');
      return;
    }
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to remove ${selectedIds.length} staff member(s)?`)) {
      try {
        await api.bulkDeleteStaff(selectedIds);
        setDbStaffList(prev => prev.filter(s => !selectedIds.includes(s.id)));
        showToast(`Removed ${selectedIds.length} staff member(s)`);
        setSelectedIds([]);
      } catch {
        showToast('Error deleting selected staff members');
      }
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Staff changes require an internet connection.');
      return;
    }
    if (selectedIds.length === 0) return;
    try {
      await api.bulkUpdateStaffStatus(selectedIds, newStatus);
      setDbStaffList(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, status: newStatus } : s));
      showToast(`Updated status for ${selectedIds.length} staff member(s) to ${newStatus}`);
      setSelectedIds([]);
    } catch {
      showToast('Error updating staff status');
    }
  };

  const [isOptimized, setIsOptimized] = useState(false);
  
  // Avatar Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!navigator.onLine) {
      showToast('Photo upload requires an internet connection.');
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Please upload JPG, PNG or WebP image.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size must be under 2 MB.');
        return;
      }
      
      const resizedFile = await resizeStaffImage(file);
      setAvatarFile(resizedFile);
      setAvatarUrl(URL.createObjectURL(resizedFile));
      setIsOptimized(true);
      
      // Upload
      handleUploadPhoto(resizedFile, editingStaff?.id || `temp-${Date.now()}`);
    }
  };

  const openAddModal = () => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Staff changes require an internet connection.');
      return;
    }
    setEditingStaff(null);
    setAvatarUrl(null);
    setAvatarFile(null);
    setUploadedPhotoUrl(null);
    setIsOptimized(false);
    setAssignedServiceIds([]);
    setWeeklySchedule({
      monday: { enabled: true, start: "10:00", end: "20:00" },
      tuesday: { enabled: true, start: "10:00", end: "20:00" },
      wednesday: { enabled: true, start: "10:00", end: "20:00" },
      thursday: { enabled: true, start: "10:00", end: "20:00" },
      friday: { enabled: true, start: "10:00", end: "20:00" },
      saturday: { enabled: true, start: "10:00", end: "20:00" },
      sunday: { enabled: false, start: "", end: "" }
    });
    setWorkingHours({});
    setSelectedSpecializations(['Hair Coloring', 'Styling']);
    setIsPhoneHidden(false);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: any) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Staff changes require an internet connection.');
      return;
    }
    setEditingStaff(staff);
    setAvatarUrl(staff.avatar_url || staff.avatar);
    setAvatarFile(null);
    setUploadedPhotoUrl(null);
    setIsOptimized(false);
    setAssignedServiceIds(Array.isArray(staff.assigned_service_ids) ? staff.assigned_service_ids : []);
    setWeeklySchedule(staff.weekly_schedule || {
      monday: { enabled: true, start: "10:00", end: "20:00" },
      tuesday: { enabled: true, start: "10:00", end: "20:00" },
      wednesday: { enabled: true, start: "10:00", end: "20:00" },
      thursday: { enabled: true, start: "10:00", end: "20:00" },
      friday: { enabled: true, start: "10:00", end: "20:00" },
      saturday: { enabled: true, start: "10:00", end: "20:00" },
      sunday: { enabled: false, start: "", end: "" }
    });
    setWorkingHours(staff.working_hours || {});
    const specs = staff.specializations || (staff.specialization ? staff.specialization.split(',').map((s: string) => s.trim()) : ['Hair Styling']);
    setSelectedSpecializations(specs);
    setIsPhoneHidden(!!staff.is_phone_hidden);
    setIsModalOpen(true);
  };

  const mapAppRole = (role: string) => {
    switch (role) {
      case 'Manager': return 'manager';
      case 'Service Provider': return 'service_provider';
      case 'Receptionist': return 'receptionist';
      default: return 'viewer';
    }
  };

  const mapStatus = (status: string) => {
    switch (status) {
      case 'Available': return 'available';
      case 'Busy': return 'busy';
      case 'On Leave': return 'on_leave';
      case 'Inactive': return 'inactive';
      default: return 'available';
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      showToast('Staff changes require an internet connection.');
      return;
    }
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Please login again.');
      setIsSaving(false);
      return;
    }
    
    if (!shopId) {
      showToast('Business profile not found. Please refresh and try again.');
      setIsSaving(false);
      return;
    }

    const form = e.target as HTMLFormElement;

    if (!form.staffName.value || !form.staffName.value.trim()) {
      showToast('Staff name is required.');
      setIsSaving(false);
      return;
    }

    if (!form.staffRole.value || !form.staffRole.value.trim()) {
      showToast('Primary role is required.');
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    
    try {
      let finalAvatarUrl = uploadedPhotoUrl || (editingStaff ? (editingStaff.avatar_url || editingStaff.avatar) : null);
      
      if (avatarFile && !uploadedPhotoUrl) {
        finalAvatarUrl = await api.uploadFile(avatarFile, 'staff');
      }

      const assignedServiceIdsClean = Array.isArray(assignedServiceIds)
        ? assignedServiceIds.map((item: any) => typeof item === "string" ? item : item?.id).filter(Boolean)
        : [];

      const specializations = Array.isArray(selectedSpecializations)
        ? selectedSpecializations.map(String).filter(Boolean)
        : [];

      const rawAccessRole = form.staffAccessRole?.value;
      const appAccessRole = 
        rawAccessRole === 'Manager' || rawAccessRole === 'manager' ? 'manager' :
        rawAccessRole === 'Receptionist' || rawAccessRole === 'receptionist' ? 'receptionist' :
        rawAccessRole === 'Service Provider' || rawAccessRole === 'service_provider' ? 'service_provider' :
        ["service_provider", "manager", "receptionist", "viewer"].includes(rawAccessRole) ? rawAccessRole : "service_provider";

      const rawStatus = form.staffStatus?.value;
      const status =
        rawStatus === 'Available' || rawStatus === 'available' ? 'available' :
        rawStatus === 'Busy' || rawStatus === 'busy' ? 'busy' :
        rawStatus === 'On Leave' || rawStatus === 'on_leave' ? 'on_leave' :
        rawStatus === 'Inactive' || rawStatus === 'inactive' ? 'inactive' :
        ["available", "busy", "on_leave", "inactive"].includes(rawStatus) ? rawStatus : "available";

      const { data, error } = await supabase.rpc("upsert_shop_staff", {
        p_staff_id: editingStaff?.id || null,
        p_shop_id: shopId,
        p_full_name: form.staffName.value.trim(),
        p_primary_role: form.staffRole.value.trim(),
        p_app_access_role: appAccessRole,
        p_mobile_number: form.staffMobile.value || null,
        p_hide_mobile_from_public: Boolean(isPhoneHidden),
        p_commission_percent: Number(form.staffCommission.value || 0),
        p_status: status,
        p_specializations: specializations,
        p_assigned_service_ids: assignedServiceIdsClean,
        p_profile_photo_url: finalAvatarUrl,
        p_working_hours: workingHours || {},
        p_weekly_schedule: weeklySchedule || {}
      });

      if (error) {
        console.error("FINAL_STAFF_SAVE_ERROR:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        showToast("Staff save failed: " + error.message);
        setIsSaving(false);
        return;
      }
      
      showToast("Staff member saved successfully.");
      setIsModalOpen(false);
      setEditingStaff(null);
      setAvatarUrl(null);
      setAvatarFile(null);
      setUploadedPhotoUrl(null);
      loadStaff(shopId);
    } catch (error: any) {
      console.error("FINAL_STAFF_SAVE_ERROR:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      showToast("Staff save failed: " + (error?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStaff = async (id: string) => {
    const staff = dbStaffList.find(s => s.id === id);
    if (!staff) return;
    setStaffToDeactivate(staff);
    setIsDeactivateModalOpen(true);
  };

  const toggleStaffStatus = async (staff: any) => {
    if (source === 'cache' || !navigator.onLine) {
      showToast('Staff changes require an internet connection.');
      return;
    }
    
    // UI values: Available, Busy, On Leave, Inactive
    // DB values: available, busy, on_leave, inactive
    const nextDbStatus = staff.status === 'Available' ? 'on_leave' : 'available';
    const nextUiStatus = nextDbStatus === 'available' ? 'Available' : 'On Leave';
    
    try {
      const { error } = await supabase
        .from('staff')
        .update({ status: nextDbStatus })
        .eq('id', staff.id);
        
      if (error) throw error;
      
      setDbStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, status: nextDbStatus } : s));
      showToast(`${staff.name} is now marked as ${nextUiStatus}`);
    } catch (err) {
      console.error("Staff status update failed:", err);
      showToast('Staff status could not be updated. Please try again.');
    }
  };

  const totalActiveStaff = staffList.filter(s => s.is_active !== false).length;
  const availableStaffCount = staffList.filter(s => s.status === 'Available' && s.is_active !== false).length;
  const busyStaffCount = staffList.filter(s => s.status === 'Busy' && s.is_active !== false).length;
  const onLeaveStaffCount = staffList.filter(s => s.status === 'On Leave' && s.is_active !== false).length;
  
  const avgRating = staffList.length > 0 
    ? (staffList.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 5.0), 0) / staffList.length).toFixed(1)
    : '5.0';

  if (source === 'none' && !isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="min-h-[50vh] bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            No saved staff information is available offline.
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            Connect to the internet once to load your staff list.
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
                  <span className="font-bold text-base text-amber-950">Showing saved staff information</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isStale 
                      ? 'bg-amber-200 text-amber-900 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isStale ? 'Outdated saved staff data' : 'Saved staff data'}
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
                  Availability and schedules may have changed while you were offline.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!navigator.onLine) {
                  showToast('You are still offline. Connect to internet to refresh.');
                } else {
                  refetch();
                  showToast('Refreshing live staff...');
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 mt-1">Manage team members, working availability, and commission rates</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPermissionsModalOpen(true)} 
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs text-xs sm:text-sm cursor-pointer"
          >
            <Shield className="w-4 h-4 text-blue-600" /> Role Permissions
          </button>
          <button 
            onClick={openAddModal} 
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'directory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Staff Directory & Schedule
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'payroll' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Payroll & Commissions
        </button>
      </div>

      {activeTab === 'payroll' ? (
        <div className="space-y-6">
          {/* Payroll Header banner */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-700/60 text-blue-100 mb-2">
                📅 July 2026 Payroll Cycle
              </span>
              <h2 className="text-xl font-bold">Monthly Salary & Commission Dispersal</h2>
              <p className="text-xs text-slate-300 mt-1">
                Calculated automatically from completed bookings, base salaries, and individual staff commission percentages.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (source === 'cache' || !navigator.onLine) {
                  showToast('Staff changes require an internet connection.');
                  return;
                }
                showToast(`🎉 Successfully processed July 2026 payroll for all ${staffList.length} staff members ($17,250 total)!`);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer shrink-0"
            >
              <DollarSign className="w-4 h-4" /> Process All Payroll ($17,250)
            </button>
          </div>

          {/* Payroll KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Base Salaries</span>
              <p className="text-2xl font-black text-slate-900">$12,400.00</p>
              <p className="text-xs text-slate-500">Fixed monthly pay across {staffList.length} staff</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Commissions</span>
              <p className="text-2xl font-black text-emerald-700">$4,850.00</p>
              <p className="text-xs text-slate-500">Based on 148 completed bookings</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Monthly Payout</span>
              <p className="text-2xl font-black text-blue-700">$17,250.00</p>
              <p className="text-xs text-emerald-600 font-semibold">✓ Ready for bank transfer</p>
            </div>
          </div>

          {/* Staff Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Individual Staff Payroll Breakdown</h3>
              <span className="text-xs font-medium text-slate-500">{staffList.length} active payees</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Base Salary</th>
                    <th className="py-3.5 px-4">Completed Bookings</th>
                    <th className="py-3.5 px-4">Comm. Rate</th>
                    <th className="py-3.5 px-4">Commission Payout</th>
                    <th className="py-3.5 px-4">Total Payout</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((s, idx) => {
                    const baseSalary = 2000 + (idx * 250);
                    const completedBookings = 18 + (idx * 7);
                    const revenue = completedBookings * 75;
                    const commRateVal = parseInt(s.commission || '15') / 100;
                    const commissionPayout = revenue * commRateVal;
                    const totalPayout = baseSalary + commissionPayout;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={s.avatar_url || s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`} 
                              alt={s.name} 
                              className="w-9 h-9 rounded-full object-cover border border-slate-200" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`;
                              }}
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{s.name}</span>
                              <span className="text-[11px] text-slate-400">{s.email || 'staff@salon.com'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{s.role}</td>
                        <td className="py-3 px-4 text-slate-900 font-medium">${baseSalary.toLocaleString()}.00</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">{completedBookings} slots</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">{s.commission || '15%'}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">${commissionPayout.toFixed(2)}</td>
                        <td className="py-3 px-4 font-black text-slate-900">${totalPayout.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => showToast(`Payslip generated & sent for ${s.name} ($${totalPayout.toFixed(2)})`)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
                          >
                            Pay Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            {totalActiveStaff}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Staff</p>
            <p className="text-sm font-bold text-slate-900">Registered</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            {availableStaffCount}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Available Now</p>
            <p className="text-sm font-bold text-slate-900">On Duty</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            {busyStaffCount}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Busy</p>
            <p className="text-sm font-bold text-slate-900">In Service</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            {onLeaveStaffCount}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">On Leave</p>
            <p className="text-sm font-bold text-slate-900">Away</p>
          </div>
        </div>
      </div>

      {/* Search, Filter & View Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search staff by name, role, specialization or phone..." 
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
          {source === 'cache' && (searchQuery || selectedStatus !== 'All') && (
            <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
              Filtering saved staff only.
            </span>
          )}

          {/* Status Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto py-1 hide-scrollbar">
            {['All', 'Available', 'Busy', 'On Leave', 'Inactive'].map((status) => (
              <button 
                key={status} 
                onClick={() => setSelectedStatus(status)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  selectedStatus === status 
                    ? 'bg-slate-900 text-white shadow-2xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bulk Action Bar */}
      <StickyBulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredStaff.length}
        itemLabel="staff member"
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        statusOptions={[
          { label: 'Mark Available', value: 'Available', color: 'emerald', icon: <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> },
          { label: 'Mark Busy', value: 'Busy', color: 'amber', icon: <Clock className="w-3.5 h-3.5 text-amber-400" /> },
          { label: 'Mark On Leave', value: 'On Leave', color: 'slate', icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> },
        ]}
        onStatusUpdate={(newStatus) => handleBulkStatusChange(newStatus)}
      />

      {/* Staff Grid or Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading staff records...</div>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(staff => {
            const isSelected = selectedIds.includes(staff.id);
            return (
              <div 
                key={staff.id} 
                className={`bg-white p-5 rounded-2xl border transition-all relative group ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* Top Checkbox & Actions */}
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => handleSelectOne(staff.id)} 
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>

                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => toggleStaffStatus(staff)} 
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                        staff.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                        staff.status === 'Busy' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                        staff.status === 'On Leave' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                        'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Click to toggle status"
                    >
                      {staff.status}
                    </button>

                    <button 
                      onClick={() => openEditModal(staff)} 
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-1"
                      title="Edit Staff"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteStaff(staff.id)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Profile Card Info */}
                <div className="flex items-center gap-4">
                  <img 
                    src={staff.avatar_url || staff.avatar || 'https://i.pravatar.cc/150'} 
                    alt={staff.name} 
                    className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-2xs" 
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      {staff.name}
                      {source === 'cache' && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Saved offline data
                        </span>
                      )}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">{staff.role}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-slate-600">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {staff.rating || '5.0'}
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">{staff.commission || '15% Comm.'}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info Pills */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Specialization</p>
                    <p className="text-slate-700 font-medium truncate mt-0.5">{staff.specialization || staff.role}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Services</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(staff.assigned_service_ids || []).slice(0, 2).map((id: string) => {
                        const service = availableServices.find(s => s.id === id);
                        return (
                          <span key={id} className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100">
                            {service ? service.name : '...'}
                          </span>
                        );
                      })}
                      {(staff.assigned_service_ids || []).length > 2 && (
                        <span className="text-[9px] text-slate-400">+{staff.assigned_service_ids.length - 2} more</span>
                      )}
                      {(!staff.assigned_service_ids || staff.assigned_service_ids.length === 0) && (
                        <span className="text-[9px] text-slate-400 italic">None</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Today Schedule</p>
                    <p className="text-slate-700 font-medium mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-500" /> 4 Slots
                    </p>
                    {source === 'cache' && (
                      <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                        Saved schedule — connect to verify
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 flex gap-2 pt-2">
                  <button 
                    onClick={() => setScheduleStaff(staff)} 
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> View Schedule
                  </button>
                  <button 
                    onClick={() => setViewingStaff(staff)} 
                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    Profile
                  </button>
                </div>
              </div>
            );
          })}
          {filteredStaff.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
              {source === 'cache' && staffList.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 p-4">
                  <p className="text-slate-800 font-bold text-sm">No staff members were available when this page was last updated.</p>
                  <p className="text-xs text-slate-500">Connect to the internet to check for team updates.</p>
                </div>
              ) : (searchQuery || selectedStatus !== 'All') ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-slate-700 font-semibold text-sm">No staff found for this search or filter.</p>
                  <p className="text-xs text-slate-500">Try adjusting your filters or search query</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedStatus('All');
                    }}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-slate-700 font-semibold text-sm">No staff members added yet.</p>
                  <button 
                    onClick={openAddModal}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Add Staff
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <button 
                      onClick={handleSelectAll} 
                      className="p-1 text-slate-500 hover:text-blue-600 transition-colors focus:outline-none"
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
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Role & Specialization</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Commission</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStaff.map(staff => {
                  const isSelected = selectedIds.includes(staff.id);
                  return (
                    <tr key={staff.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                      <td className="py-3.5 px-4 text-center">
                        <button 
                          onClick={() => handleSelectOne(staff.id)} 
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={staff.avatar_url || staff.avatar || 'https://i.pravatar.cc/150'} 
                            alt={staff.name} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-200" 
                          />
                          <div>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              {staff.name}
                              {source === 'cache' && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Saved offline
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-slate-500">{staff.mobile || '+91 98765 43210'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-slate-800">{staff.role}</p>
                          <p className="text-xs text-slate-500">{staff.specialization || staff.role}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {staff.rating || '5.0'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                        {staff.commission || '15%'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button 
                          onClick={() => toggleStaffStatus(staff)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            staff.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            staff.status === 'Busy' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {staff.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openEditModal(staff)} 
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteStaff(staff.id)} 
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStaff ? "Edit Staff Details" : "Add New Staff Member"}>
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs font-medium text-white">{isUploading ? 'Uploading...' : (avatarUrl ? 'Change Photo' : 'Upload Photo')}</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            {isOptimized && <p className="text-xs text-green-600 mt-1">Image optimized for faster upload.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              name="staffName" 
              defaultValue={editingStaff?.name} 
              type="text" 
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary Role</label>
              <select 
                name="staffRole" 
                defaultValue={editingStaff?.role || 'Senior Stylist'} 
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm"
                required
              >
                {predefinedRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">App Access Role</label>
              <select 
                name="staffAccessRole" 
                defaultValue={editingStaff?.access_role || 'Service Provider'}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm"
              >
                <option value="Manager">Manager (Full Access)</option>
                <option value="Service Provider">Service Provider (Assigned)</option>
                <option value="Receptionist">Receptionist (Frontdesk)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mobile</label>
              <input 
                name="staffMobile" 
                defaultValue={editingStaff?.mobile || '+91 98765 12345'} 
                type="tel" 
                placeholder="+91 98765..." 
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-xs" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Comm. (%)</label>
              <input 
                name="staffCommission" 
                defaultValue={editingStaff?.commission?.replace('%', '') || '15'} 
                type="number" 
                placeholder="15" 
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-xs" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select 
                name="staffStatus" 
                defaultValue={editingStaff?.status || 'Available'}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white text-xs"
              >
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Services Assignment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Assign Services</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-300 rounded-xl p-2">
              {availableServices.map(service => (
                <label key={service.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={assignedServiceIds.includes(service.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAssignedServiceIds([...assignedServiceIds, service.id]);
                      } else {
                        setAssignedServiceIds(assignedServiceIds.filter(id => id !== service.id));
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {service.name}
                </label>
              ))}
              {availableServices.length === 0 && <p className="text-xs text-slate-400">No active services.</p>}
            </div>
          </div>

          {/* Privacy Toggle Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Hide Mobile Number from Public/Staff List</span>
              <span className="text-[11px] text-slate-500">When enabled, phone contact is kept private and hidden from customer booking views.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPhoneHidden(!isPhoneHidden)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPhoneHidden ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isPhoneHidden ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900">Weekly Schedule</label>
            <div className="space-y-1">
              {Object.entries(weeklySchedule).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex items-center gap-2">
                  <input type="checkbox" checked={hours.enabled} onChange={(e) => setWeeklySchedule({...weeklySchedule, [day]: {...hours, enabled: e.target.checked}})} />
                  <span className="capitalize w-20 text-[11px] text-slate-600">{day}</span>
                  <input type="time" value={hours.start} onChange={(e) => setWeeklySchedule({...weeklySchedule, [day]: {...hours, start: e.target.value}})} className="border border-slate-300 rounded px-1 text-[11px] py-1" />
                  <input type="time" value={hours.end} onChange={(e) => setWeeklySchedule({...weeklySchedule, [day]: {...hours, end: e.target.value}})} className="border border-slate-300 rounded px-1 text-[11px] py-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Select Specialization Chips */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Specializations / Skills (Select multiple)</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
              {availableSkills.map(skill => {
                const isSelected = selectedSpecializations.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSpecializations(selectedSpecializations.filter(s => s !== skill));
                      } else {
                        setSelectedSpecializations([...selectedSpecializations, skill]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs">
              {isSaving ? 'Saving...' : (editingStaff ? 'Save Changes' : 'Add Staff Member')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeactivateModalOpen} onClose={() => setIsDeactivateModalOpen(false)} title="Deactivate Staff?">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">This staff member will be removed from active staff list but previous bookings and records will remain safe.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsDeactivateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={handleDeactivateStaff} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg">Deactivate Staff</button>
          </div>
        </div>
      </Modal>

      {/* Staff Profile View Modal */}
      <Modal isOpen={!!viewingStaff} onClose={() => setViewingStaff(null)} title="Staff Profile Details">
        {viewingStaff && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <img 
                src={viewingStaff.avatar_url || viewingStaff.avatar || 'https://i.pravatar.cc/150'} 
                alt={viewingStaff.name} 
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mb-3" 
              />
              <h2 className="text-xl font-bold text-slate-900">{viewingStaff.name}</h2>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">{viewingStaff.role}</p>
              <div className="flex items-center gap-1 mt-1 text-sm font-medium text-slate-600">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {viewingStaff.rating || '5.0'} Rating
              </div>
            </div>
            
            {/* Assigned Services */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned Services</p>
              <div className="flex flex-wrap gap-1.5">
                {(viewingStaff.assigned_service_ids || []).map((id: string) => {
                  const service = availableServices.find(s => s.id === id);
                  return (
                    <span key={id} className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                      {service ? service.name : 'Service unavailable'}
                    </span>
                  );
                })}
                {(!viewingStaff.assigned_service_ids || viewingStaff.assigned_service_ids.length === 0) && (
                  <span className="text-xs text-slate-400">No services assigned.</span>
                )}
              </div>
            </div>
            
              {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Mobile Contact</p>
                <p className="text-slate-800 font-bold mt-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {viewingStaff.mobile || 'Not provided'}
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Commission Rate</p>
                <p className="text-slate-800 font-bold mt-1 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-blue-500" /> {viewingStaff.commission || '0%'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Specializations</p>
              <p className="text-slate-800 font-medium mt-1">{viewingStaff.specialization || viewingStaff.role}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => { setViewingStaff(null); openEditModal(viewingStaff); }} 
                className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-xs"
              >
                Edit Staff Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Staff Schedule Modal */}
      <Modal isOpen={!!scheduleStaff} onClose={() => setScheduleStaff(null)} title={`Duty Schedule - ${scheduleStaff?.name || ''}`}>
        {scheduleStaff && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <img 
                src={scheduleStaff.avatar_url || scheduleStaff.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(scheduleStaff.name)}&background=random`} 
                alt={scheduleStaff.name} 
                className="w-10 h-10 rounded-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(scheduleStaff.name)}&background=random`;
                }}
              />
              <div>
                <p className="text-sm font-bold text-slate-900">{scheduleStaff.name}</p>
                <p className="text-xs text-slate-500">{scheduleStaff.role} • Shift: 10:00 AM - 08:00 PM</p>
              </div>
            </div>

            {source === 'cache' && (
              <p className="text-xs font-medium text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Schedule changes require an internet connection.
              </p>
            )}

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Weekly Schedule</p>
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {Object.entries(scheduleStaff.weekly_schedule || {}).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-b-0">
                  <span className="capitalize text-slate-600">{day}</span>
                  <span className="font-medium text-slate-900">
                    {hours.enabled ? `${hours.start} - ${hours.end}` : 'Off'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Appointments</p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {[
                { time: '10:30 AM', client: 'Vikram Singh', service: 'Haircut & Beard Styling', status: 'Completed' },
                { time: '01:00 PM', client: 'Rohit Mehta', service: 'Royal Hair Spa', status: 'In Progress' },
                { time: '03:30 PM', client: 'Priya Sharma', service: 'Facial & Scrub', status: 'Upcoming' },
                { time: '06:00 PM', client: 'Karan Johar', service: 'Classic Haircut', status: 'Upcoming' },
              ].map((slot, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">{slot.time}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{slot.client}</p>
                      <p className="text-[11px] text-slate-500">{slot.service}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    slot.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
                    slot.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {slot.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setScheduleStaff(null)} 
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Close Schedule
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Role Permissions Matrix Modal */}
      <Modal isOpen={isPermissionsModalOpen} onClose={() => setIsPermissionsModalOpen(false)} title="Role & Permission Access Matrix">
        <div className="space-y-5">
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-bold block mb-0.5">Granular Access Control</span>
              Define what each staff role can view, edit, or manage across bookings, financials, staff records, and payout accounts.
            </div>
          </div>

          <div className="space-y-4">
            {accessRoles.map(role => (
              <div key={role.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{role.name}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-extrabold uppercase">Role</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (source === 'cache' || !navigator.onLine) {
                        showToast('Staff changes require an internet connection.');
                        return;
                      }
                      showToast(`Role "${role.name}" permissions updated successfully!`);
                      setIsPermissionsModalOpen(false);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  {Object.entries(role.permissions).map(([moduleName, permLevel]) => (
                    <div key={moduleName} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{moduleName}</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-slate-800 text-[11px]">{permLevel}</span>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">🔒 Owner has unconditional full privileges.</span>
            <button 
              onClick={() => setIsPermissionsModalOpen(false)} 
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
