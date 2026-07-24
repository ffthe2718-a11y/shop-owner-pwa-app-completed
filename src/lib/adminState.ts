export interface AdminShop {
  id: string;
  name: string;
  owner_name: string;
  category: string;
  mobile_number: string;
  email_address: string;
  status: 'active' | 'suspended' | 'pending';
  is_featured: boolean;
  rating: number;
  total_bookings: number;
  total_revenue: number;
  created_at: string;
}

export interface AdminPayout {
  id: string;
  shop_id: string;
  shop_name: string;
  amount: number;
  request_date: string;
  status: 'pending' | 'approved' | 'rejected';
  bank_details: string;
}

const DEFAULT_SHOPS: AdminShop[] = [
  {
    id: 'shop_1',
    name: 'Royal Glow Salon',
    owner_name: 'Rajesh',
    category: 'Salon & Spa',
    mobile_number: '+91 9610360360',
    email_address: 'owner@royalglow.com',
    status: 'active',
    is_featured: true,
    rating: 4.8,
    total_bookings: 248,
    total_revenue: 148500,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'shop_2',
    name: 'Cut & Style Barbers',
    owner_name: 'Amit Sharma',
    category: 'Barbershop',
    mobile_number: '+91 9876543210',
    email_address: 'amit@cutstyle.com',
    status: 'active',
    is_featured: false,
    rating: 4.5,
    total_bookings: 112,
    total_revenue: 45400,
    created_at: '2026-03-20T12:00:00Z',
  },
  {
    id: 'shop_3',
    name: 'Bliss Wellness & Yoga',
    owner_name: 'Priya Patel',
    category: 'Wellness & Yoga',
    mobile_number: '+91 9123456789',
    email_address: 'priya@blissyogo.com',
    status: 'pending',
    is_featured: false,
    rating: 0.0,
    total_bookings: 0,
    total_revenue: 0,
    created_at: '2026-07-22T08:30:00Z',
  },
];

const DEFAULT_PAYOUTS: AdminPayout[] = [
  {
    id: 'PO402',
    shop_id: 'shop_1',
    shop_name: 'Royal Glow Salon',
    amount: 15000,
    request_date: '2026-07-21',
    status: 'pending',
    bank_details: 'HDFC Bank - A/C 501002345678 - IFSC HDFC0000123',
  },
  {
    id: 'PO401',
    shop_id: 'shop_2',
    shop_name: 'Cut & Style Barbers',
    amount: 12000,
    request_date: '2026-07-14',
    status: 'approved',
    bank_details: 'ICICI Bank - A/C 000401234567 - IFSC ICIC0000004',
  },
];

const DEFAULT_CATEGORIES = [
  'Salon & Spa',
  'Hair Studio',
  'Nail & Beauty',
  'Barbershop',
  'Wellness & Yoga',
  'Massage Therapy',
];

// LocalStorage Keys
const KEYS = {
  SHOPS: 'nexora_admin_shops',
  PAYOUTS: 'nexora_admin_payouts',
  CATEGORIES: 'nexora_admin_categories',
  COMMISSION: 'nexora_admin_commission',
  MAINTENANCE: 'nexora_admin_maintenance',
};

// Initialize helper
function initLocalStorage() {
  if (!localStorage.getItem(KEYS.SHOPS)) {
    localStorage.setItem(KEYS.SHOPS, JSON.stringify(DEFAULT_SHOPS));
  }
  if (!localStorage.getItem(KEYS.PAYOUTS)) {
    localStorage.setItem(KEYS.PAYOUTS, JSON.stringify(DEFAULT_PAYOUTS));
  }
  if (!localStorage.getItem(KEYS.CATEGORIES)) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem(KEYS.COMMISSION)) {
    localStorage.setItem(KEYS.COMMISSION, '10');
  }
  if (!localStorage.getItem(KEYS.MAINTENANCE)) {
    localStorage.setItem(KEYS.MAINTENANCE, 'false');
  }
}

// Ensure init happens
if (typeof window !== 'undefined') {
  initLocalStorage();
}

export const adminState = {
  // Shops
  getShops(): AdminShop[] {
    try {
      const data = localStorage.getItem(KEYS.SHOPS);
      return data ? JSON.parse(data) : DEFAULT_SHOPS;
    } catch {
      return DEFAULT_SHOPS;
    }
  },

  updateShopStatus(shopId: string, status: 'active' | 'suspended' | 'pending'): AdminShop[] {
    const shops = this.getShops();
    const updated = shops.map((s) => {
      if (s.id === shopId) {
        // If owner changes status of their own shop
        if (s.id === 'shop_1') {
          localStorage.setItem('nexora_local_shop_status', status);
          window.dispatchEvent(new Event('nexora_shop_updated'));
        }
        return { ...s, status };
      }
      return s;
    });
    localStorage.setItem(KEYS.SHOPS, JSON.stringify(updated));
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
    return updated;
  },

  toggleShopFeatured(shopId: string): AdminShop[] {
    const shops = this.getShops();
    const updated = shops.map((s) => (s.id === shopId ? { ...s, is_featured: !s.is_featured } : s));
    localStorage.setItem(KEYS.SHOPS, JSON.stringify(updated));
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
    return updated;
  },

  // Payouts
  getPayouts(): AdminPayout[] {
    try {
      const data = localStorage.getItem(KEYS.PAYOUTS);
      return data ? JSON.parse(data) : DEFAULT_PAYOUTS;
    } catch {
      return DEFAULT_PAYOUTS;
    }
  },

  requestPayout(amount: number, bankDetails: string): AdminPayout {
    const payouts = this.getPayouts();
    const newPayout: AdminPayout = {
      id: 'PO' + Math.floor(100 + Math.random() * 900),
      shop_id: 'shop_1',
      shop_name: 'Royal Glow Salon',
      amount,
      request_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      bank_details: bankDetails,
    };
    payouts.unshift(newPayout);
    localStorage.setItem(KEYS.PAYOUTS, JSON.stringify(payouts));
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
    return newPayout;
  },

  approvePayout(payoutId: string): AdminPayout[] {
    const payouts = this.getPayouts();
    const updated = payouts.map((p) => {
      if (p.id === payoutId) {
        // Update wallet balance correspondingly if it is for the demo shop
        if (p.shop_id === 'shop_1') {
          const currentBalance = localStorage.getItem('nexora_local_wallet_balance') || '18750';
          const numericBalance = parseFloat(currentBalance.replace(/[^0-9.]/g, ''));
          const nextBalance = Math.max(0, numericBalance - p.amount);
          localStorage.setItem('nexora_local_wallet_balance', '₹' + nextBalance.toLocaleString());
          window.dispatchEvent(new Event('nexora_wallet_updated'));
        }
        return { ...p, status: 'approved' as const };
      }
      return p;
    });
    localStorage.setItem(KEYS.PAYOUTS, JSON.stringify(updated));
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
    return updated;
  },

  rejectPayout(payoutId: string): AdminPayout[] {
    const payouts = this.getPayouts();
    const updated = payouts.map((p) => (p.id === payoutId ? { ...p, status: 'rejected' as const } : p));
    localStorage.setItem(KEYS.PAYOUTS, JSON.stringify(updated));
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
    return updated;
  },

  // Categories
  getCategories(): string[] {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  addCategory(name: string): string[] {
    const categories = this.getCategories();
    if (!categories.includes(name) && name.trim()) {
      categories.push(name.trim());
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
      window.dispatchEvent(new Event('nexora_admin_state_changed'));
    }
    return categories;
  },

  deleteCategory(name: string): string[] {
    const categories = this.getCategories();
    const filtered = categories.filter((c) => c !== name);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(filtered));
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
    return filtered;
  },

  // Commission & settings
  getCommission(): number {
    return parseFloat(localStorage.getItem(KEYS.COMMISSION) || '10');
  },

  updateCommission(rate: number): void {
    localStorage.setItem(KEYS.COMMISSION, rate.toString());
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
  },

  isMaintenanceMode(): boolean {
    return localStorage.getItem(KEYS.MAINTENANCE) === 'true';
  },

  toggleMaintenanceMode(): boolean {
    const nextVal = !this.isMaintenanceMode();
    localStorage.setItem(KEYS.MAINTENANCE, nextVal.toString());
    window.dispatchEvent(new Event('nexora_admin_state_changed'));
    return nextVal;
  },
};
