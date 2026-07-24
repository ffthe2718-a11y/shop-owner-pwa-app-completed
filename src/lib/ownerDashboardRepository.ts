import { saveOwnerCache, getOwnerCache } from './ownerOfflineDb';
import type { OwnerDashboardData, OwnerDashboardState } from '../types/ownerDashboard';
import { shopInfo, kpiData, scheduleData } from '../data/mock';
import { supabase } from './supabase';
import { isSupabaseConfigured } from './api';

const FRESHNESS_THRESHOLD_MS = 3600000; // 1 hour

export const DEFAULT_OWNER_ID = '22222222-2222-2222-2222-222222222222';
export const DEFAULT_SHOP_ID = '22222222-2222-2222-2222-222222222222';

/**
 * Retrieves the current authenticated user ID or fallback ID
 */
export async function getActiveOwnerAndShopIds(): Promise<{ ownerId: string; shopId: string }> {
  let ownerId = DEFAULT_OWNER_ID;
  let shopId = DEFAULT_SHOP_ID;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      ownerId = user.id;
    } else {
      const profStr = localStorage.getItem('nexora_local_profile');
      if (profStr) {
        const prof = JSON.parse(profStr);
        if (prof?.id) ownerId = prof.id;
      }
    }

    const shopStr = localStorage.getItem('nexora_local_shop');
    if (shopStr) {
      const shop = JSON.parse(shopStr);
      if (shop?.id) shopId = shop.id;
    }
  } catch (err) {
    console.warn('Could not read user/shop from context:', err);
  }

  return { ownerId, shopId };
}

/**
 * Load default live dashboard data bundle from Supabase
 */
export async function fetchLiveDashboardData(): Promise<OwnerDashboardData> {
  const { ownerId, shopId } = await getActiveOwnerAndShopIds();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  // If Supabase not configured, immediately return mock data to avoid console errors
  if (!isSupabaseConfigured()) {
    return {
      shopName: shopInfo.name,
      ownerName: shopInfo.owner.name,
      kpis: { ...kpiData },
      revenueData: [
        { name: 'Mon', revenue: 4000 },
        { name: 'Tue', revenue: 3000 },
        { name: 'Wed', revenue: 5000 },
        { name: 'Thu', revenue: 2780 },
        { name: 'Fri', revenue: 8900 },
        { name: 'Sat', revenue: 12450 },
        { name: 'Sun', revenue: 15000 }
      ],
      monthlyRevenueData: [
        { month: 'Feb 2026', revenue: 142000, bookings: 165 },
        { month: 'Mar 2026', revenue: 168500, bookings: 192 },
        { month: 'Apr 2026', revenue: 185000, bookings: 210 },
        { month: 'May 2026', revenue: 174000, bookings: 198 },
        { month: 'Jun 2026', revenue: 210000, bookings: 235 },
        { month: 'Jul 2026', revenue: 245000, bookings: 278 }
      ],
      activities: [
        {
          id: 'act-1',
          category: 'Bookings',
          title: 'New booking from Vikram Singh',
          detail: 'Haircut & Beard Styling • Today at 3:30 PM with Barber Rahul',
          time: '10 mins ago',
          badge: '₹850',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
        },
        {
          id: 'act-2',
          category: 'Reviews',
          title: 'Anita Sharma left a 5-star review',
          detail: '"Amazing service as always! Loved the royal hair spa treatment."',
          time: '45 mins ago',
          badge: '5.0 ★',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        }
      ],
      scheduleData: []
    };
  }

  try {
    // 1. Fetch Today's Appointments for count and revenue
    const { data: todayAppts, error: apptsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('shop_id', shopId)
      .eq('date', today);
    
    if (apptsError) {
      console.warn('fetchLiveDashboardData: Error fetching today appointments, using fallback:', apptsError);
    }

    // 2. Fetch All Appointments for month/total stats
    const { data: allAppts, error: allApptsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('shop_id', shopId);
    
    if (allApptsError) {
      console.warn('fetchLiveDashboardData: Error fetching all appointments, using fallback:', allApptsError);
    }

    // 3. Fetch Customers count
    const { count: customerCount, error: custError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId);
    
    if (custError) {
      console.warn('fetchLiveDashboardData: Error fetching customer count, using fallback:', custError);
    }

    // 4. Fetch Staff for rating fallback or real data if available
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('rating')
      .eq('shop_id', shopId);
    
    if (staffError) {
      console.warn('fetchLiveDashboardData: Error fetching staff data, using fallback:', staffError);
    }

    // Fallback to mock data if essential queries failed
    if (apptsError && allApptsError && custError) {
      console.log('Essential queries failed, returning partially mock dashboard data');
      return {
        shopName: shopInfo.name,
        ownerName: shopInfo.owner.name,
        kpis: { ...kpiData },
        revenueData: [
          { name: 'Mon', revenue: 4000 },
          { name: 'Tue', revenue: 3000 },
          { name: 'Wed', revenue: 5000 },
          { name: 'Thu', revenue: 2780 },
          { name: 'Fri', revenue: 8900 },
          { name: 'Sat', revenue: 12450 },
          { name: 'Sun', revenue: 15000 }
        ],
        monthlyRevenueData: [
          { month: 'Feb 2026', revenue: 142000, bookings: 165 },
          { month: 'Mar 2026', revenue: 168500, bookings: 192 },
          { month: 'Apr 2026', revenue: 185000, bookings: 210 },
          { month: 'May 2026', revenue: 174000, bookings: 198 },
          { month: 'Jun 2026', revenue: 210000, bookings: 235 },
          { month: 'Jul 2026', revenue: 245000, bookings: 278 }
        ],
        activities: [
          {
            id: 'act-1',
            category: 'Bookings',
            title: 'New booking from Vikram Singh',
            detail: 'Haircut & Beard Styling • Today at 3:30 PM with Barber Rahul',
            time: '10 mins ago',
            badge: '₹850',
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
          }
        ],
        scheduleData: []
      };
    }

    const avgRating = staffData && staffData.length > 0
      ? (staffData.reduce((acc, s) => acc + (parseFloat(s.rating) || 0), 0) / staffData.length).toFixed(1)
      : '4.8';

    // 5. Calculate KPIs
    const kpis = {
      todayBookings: todayAppts?.length || 0,
      todayRevenue: todayAppts
        ?.filter(b => b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'In Progress')
        .reduce((acc, b) => acc + (parseFloat(b.price) || 0), 0) || 0,
      customers: customerCount || 0,
      pendingRequests: allAppts?.filter(b => b.status === 'Pending').length || 0,
      rating: avgRating,
      wallet: 24500 // Fallback for wallet until we have a real wallet system
    };

    // 6. Map Schedule Data
    const mappedSchedule = (todayAppts || []).map(b => ({
      id: b.id,
      customer: b.customer_name,
      service: b.service_name,
      staff: b.staff_name || 'Unassigned',
      time: b.time,
      status: b.status,
      avatar: `https://i.pravatar.cc/150?u=${b.id}`,
      amount: `₹${b.price}`
    }));

    // 7. Recent Activities (simulated from appointments)
    const recentActivities = (allAppts || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4)
      .map(b => ({
        id: `act-${b.id}`,
        category: 'Bookings' as const,
        title: `New booking from ${b.customer_name}`,
        detail: `${b.service_name} • ${b.date === today ? 'Today' : b.date} at ${b.time} with ${b.staff_name || 'Staff'}`,
        time: 'Just now',
        badge: `₹${b.price}`,
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
      }));

    // 8. Fetch Shop/Owner names
    const { data: shopData, error: shopNameError } = await supabase.from('shops').select('name').eq('id', shopId).maybeSingle();
    if (shopNameError) console.warn('fetchLiveDashboardData: Error fetching shop name:', shopNameError);
    
    const { data: profileData, error: profileNameError } = await supabase.from('profiles').select('full_name').eq('id', ownerId).maybeSingle();
    if (profileNameError) console.warn('fetchLiveDashboardData: Error fetching profile name:', profileNameError);

    return {
      shopName: shopData?.name || shopInfo.name,
      ownerName: profileData?.full_name || shopInfo.owner.name,
      kpis,
      revenueData: [
        { name: 'Mon', revenue: 4000 },
        { name: 'Tue', revenue: 3000 },
        { name: 'Wed', revenue: 5000 },
        { name: 'Thu', revenue: 2780 },
        { name: 'Fri', revenue: 8900 },
        { name: 'Sat', revenue: 12450 },
        { name: 'Sun', revenue: 15000 }
      ],
      monthlyRevenueData: [
        { month: 'Feb 2026', revenue: 142000, bookings: 165 },
        { month: 'Mar 2026', revenue: 168500, bookings: 192 },
        { month: 'Apr 2026', revenue: 185000, bookings: 210 },
        { month: 'May 2026', revenue: 174000, bookings: 198 },
        { month: 'Jun 2026', revenue: 210000, bookings: 235 },
        { month: 'Jul 2026', revenue: 245000, bookings: 278 }
      ],
      activities: recentActivities.length > 0 ? recentActivities : [
        {
          id: 'act-1',
          category: 'Bookings',
          title: 'No recent activity',
          detail: 'Start taking bookings to see activity here.',
          time: 'Now',
          badge: 'Empty',
          badgeClass: 'bg-slate-50 text-slate-700 border-slate-200'
        }
      ],
      scheduleData: mappedSchedule
    };
  } catch (err) {
    console.error('Failed to fetch real dashboard data:', err);
    // Fallback to mock data if everything fails
    return {
      shopName: shopInfo.name,
      ownerName: shopInfo.owner.name,
      kpis: {
        todayBookings: kpiData.todayBookings,
        todayRevenue: kpiData.todayRevenue,
        customers: kpiData.customers,
        pendingRequests: kpiData.pendingRequests,
        rating: kpiData.rating,
        wallet: kpiData.wallet
      },
      revenueData: [
        { name: 'Mon', revenue: 4000 },
        { name: 'Tue', revenue: 3000 },
        { name: 'Wed', revenue: 5000 },
        { name: 'Thu', revenue: 2780 },
        { name: 'Fri', revenue: 8900 },
        { name: 'Sat', revenue: 12450 },
        { name: 'Sun', revenue: 15000 }
      ],
      monthlyRevenueData: [
        { month: 'Feb 2026', revenue: 142000, bookings: 165 },
        { month: 'Mar 2026', revenue: 168500, bookings: 192 },
        { month: 'Apr 2026', revenue: 185000, bookings: 210 },
        { month: 'May 2026', revenue: 174000, bookings: 198 },
        { month: 'Jun 2026', revenue: 210000, bookings: 235 },
        { month: 'Jul 2026', revenue: 245000, bookings: 278 }
      ],
      activities: [
        {
          id: 'act-1',
          category: 'Bookings',
          title: 'New booking from Vikram Singh',
          detail: 'Haircut & Beard Styling • Today at 3:30 PM with Barber Rahul',
          time: '10 mins ago',
          badge: '₹850',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
        },
        {
          id: 'act-2',
          category: 'Reviews',
          title: 'Anita Sharma left a 5-star review',
          detail: '"Amazing service as always! Loved the royal hair spa treatment."',
          time: '45 mins ago',
          badge: '5.0 ★',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        }
      ],
      scheduleData: []
    };
  }
}

/**
 * Primary dashboard loader with offline fallback and IndexedDB cache integration
 */
export async function getOwnerDashboardData(
  ownerId: string,
  shopId: string,
  forceOffline = false
): Promise<OwnerDashboardState> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine && !forceOffline;
  const cacheKey = `${ownerId}:${shopId}:dashboard`;

  // 1. If Online, attempt to fetch live data
  if (isOnline) {
    try {
      const liveData = await fetchLiveDashboardData();

      // Successfully fetched live data -> save complete dashboard object to IndexedDB
      const nowIso = new Date().toISOString();
      await saveOwnerCache('owner_dashboard_cache', {
        id: cacheKey,
        ownerId,
        shopId,
        data: liveData,
        cachedAt: nowIso,
        updatedAt: nowIso
      });

      return {
        data: liveData,
        source: 'network',
        isStale: false,
        lastUpdated: nowIso,
        isLoading: false
      };
    } catch (err) {
      console.warn('Network fetch for dashboard failed. Falling back to cached data:', err);
      // Fall through to cache load without overwriting existing cache
    }
  }

  // 2. Offline or Network Fetch Failed -> Fall back to IndexedDB Cache
  try {
    const cachedRecord = await getOwnerCache<OwnerDashboardData>(
      'owner_dashboard_cache',
      cacheKey,
      ownerId,
      shopId
    );

    if (cachedRecord && cachedRecord.data) {
      const cachedTime = new Date(cachedRecord.cachedAt).getTime();
      const ageMs = Date.now() - cachedTime;
      const isStale = ageMs > FRESHNESS_THRESHOLD_MS;

      return {
        data: cachedRecord.data,
        source: 'cache',
        isStale,
        lastUpdated: cachedRecord.cachedAt,
        isLoading: false
      };
    }
  } catch (cacheErr) {
    console.error('Error reading dashboard cache from IndexedDB:', cacheErr);
  }

  // 3. Neither network nor cache available
  return {
    data: null,
    source: 'none',
    isStale: true,
    error: 'No saved dashboard data is available offline.',
    isLoading: false
  };
}
