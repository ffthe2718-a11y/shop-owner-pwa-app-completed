export interface Service {
  id: string;
  shop_id?: string;
  name: string;
  category: string;
  duration: number; // in minutes
  price: number;
  discount_price?: number | null;
  is_active: boolean;
  created_at?: string;
}

export interface Booking {
  id: string;
  shop_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_name: string;
  staff_name: string;
  date: string; // YYYY-MM-DD or 'Today'
  time: string; // e.g. '10:00 AM'
  status: 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rejected' | 'No Show';
  price: number;
  amount?: number;
  discount_amount?: number;
  total_amount?: number;
  duration_minutes?: number;
  avatar?: string;
  notes?: string;
  customer_notes?: string;
  owner_notes?: string;
  payment_status?: 'Paid' | 'Pending' | 'Cash' | 'Unpaid' | 'Partial' | 'Refunded' | 'Failed';
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  visits: number;
  spent: string;
  lastVisit: string;
  status: string;
  avatar_url?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  rating: number;
  status: string;
  avatar_url?: string;
}

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
