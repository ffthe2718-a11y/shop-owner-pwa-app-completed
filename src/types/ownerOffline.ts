export type OwnerOfflineRecord<T = any> = {
  id: string;
  ownerId: string;
  shopId: string;
  data: T;
  cachedAt: string;
  updatedAt: string;
  expiresAt?: string;
};

export type OwnerPendingAction = {
  id: string;
  ownerId: string;
  shopId: string;
  actionType:
    | "owner_ui_preference_update"
    | "owner_dashboard_filter_preference"
    | "owner_booking_filter_preference"
    | "owner_service_filter_preference"
    | "owner_staff_filter_preference"
    | "owner_customer_filter_preference"
    | "owner_last_opened_page"
    | "owner_collapsed_section_state";
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  status: "pending" | "processing" | "failed";
  idempotencyKey: string;
  lastError?: string;
};

export type OwnerSyncMetadata = {
  id: string;
  ownerId: string;
  shopId: string;
  lastSyncedAt: string;
  syncStatus: 'success' | 'partial' | 'failed' | 'idle';
  pendingCount: number;
};

export type OwnerStoreName =
  | 'owner_dashboard_cache'
  | 'owner_bookings_cache'
  | 'owner_services_cache'
  | 'owner_staff_cache'
  | 'owner_customers_cache'
  | 'owner_profile_cache'
  | 'owner_booking_drafts'
  | 'owner_pending_actions'
  | 'owner_sync_metadata'
  | 'owner_website_cache';
