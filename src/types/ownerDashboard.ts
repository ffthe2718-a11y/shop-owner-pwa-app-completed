export interface DashboardKPIs {
  todayBookings: number | string;
  todayRevenue: string;
  customers: string;
  pendingRequests: number | string;
  rating: string;
  wallet: string;
}

export interface DashboardGrowth {
  currentMonth: string;
  currentRev: number;
  prevMonth: string;
  prevRev: number;
  diff: number;
  percentage: number;
  isIncrease: boolean;
}

export interface DashboardActivity {
  id: string;
  category: string;
  title: string;
  detail: string;
  time: string;
  badge: string;
  badgeClass: string;
  iconName?: string;
}

export interface OwnerDashboardData {
  shopName: string;
  ownerName: string;
  kpis: DashboardKPIs;
  revenueData: Array<{ name: string; revenue: number }>;
  monthlyRevenueData: Array<{ month: string; revenue: number; bookings: number }>;
  activities: DashboardActivity[];
  scheduleData: Array<any>;
}

export interface OwnerDashboardState {
  data: OwnerDashboardData | null;
  source: 'network' | 'cache' | 'none';
  isStale: boolean;
  lastUpdated?: string;
  error?: string | null;
  isLoading: boolean;
}
