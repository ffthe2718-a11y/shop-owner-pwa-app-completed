import { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { usePendingShopUpdates } from '../../hooks/usePendingShopUpdates';
import { WifiOff, Wifi, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ownerConnectionRefreshManager } from '../../lib/ownerConnectionRefreshManager';
import type { OwnerRefreshState } from '../../lib/ownerConnectionRefreshManager';

const ALLOWED_PREF_ACTIONS = [
  "owner_ui_preference_update",
  "owner_dashboard_filter_preference",
  "owner_booking_filter_preference",
  "owner_service_filter_preference",
  "owner_staff_filter_preference",
  "owner_customer_filter_preference",
  "owner_last_opened_page",
  "owner_collapsed_section_state"
];

export default function OwnerOfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const { pendingCount } = usePendingShopUpdates();
  const [refreshState, setRefreshState] = useState<OwnerRefreshState>(() => ownerConnectionRefreshManager.getState());
  const [prefSavedNotice, setPrefSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = ownerConnectionRefreshManager.subscribe((state) => {
      setRefreshState(state);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleActionChanged = (e: any) => {
      const actionType = e?.detail?.actionType;
      if (isOffline && actionType && ALLOWED_PREF_ACTIONS.includes(actionType)) {
        setPrefSavedNotice(true);
        const timer = setTimeout(() => {
          setPrefSavedNotice(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('owner-pending-actions-changed', handleActionChanged);
    return () => {
      window.removeEventListener('owner-pending-actions-changed', handleActionChanged);
    };
  }, [isOffline]);

  const handleManualRetry = () => {
    ownerConnectionRefreshManager.triggerRefresh().catch((err) => {
      console.warn('Manual refresh failed:', err);
    });
  };

  if (!isOffline && refreshState.status === 'idle') {
    return null;
  }

  let bgClass = 'bg-amber-500 text-slate-950 border-amber-600';
  let icon = <WifiOff className="w-4 h-4 shrink-0" />;
  let content = null;

  if (isOffline) {
    content = (
      <div className="flex flex-col items-center gap-1">
        <span>
          You are offline. Live business data may be unavailable.
          {pendingCount > 0 && ` (${pendingCount} offline update${pendingCount > 1 ? 's' : ''} queued)`}
        </span>
        {prefSavedNotice && (
          <span className="flex items-center gap-1 mt-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px] border border-emerald-200 animate-pulse">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Saved on this device. It will sync when you reconnect.
          </span>
        )}
      </div>
    );
  } else {
    switch (refreshState.status) {
      case 'verifying':
        bgClass = 'bg-blue-600 text-white border-blue-700';
        icon = <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />;
        content = <span>Internet restored. Checking connection…</span>;
        break;
      case 'refreshing':
        bgClass = 'bg-blue-600 text-white border-blue-700';
        icon = <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />;
        content = <span>Connection restored. Refreshing live business data…</span>;
        break;
      case 'success':
        bgClass = 'bg-emerald-600 text-white border-emerald-700';
        icon = <Wifi className="w-4 h-4 shrink-0" />;
        content = <span>Live business data is up to date.</span>;
        break;
      case 'failed':
        bgClass = 'bg-rose-600 text-white border-rose-700';
        icon = <AlertCircle className="w-4 h-4 shrink-0" />;
        content = (
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span>Internet is available, but live data could not be refreshed.</span>
            <button
              onClick={handleManualRetry}
              className="px-2 py-0.5 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold rounded border border-rose-200 cursor-pointer transition-colors"
            >
              Try Again
            </button>
          </div>
        );
        break;
      default:
        return null;
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2 px-4 border-b text-xs md:text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 z-30 shrink-0 ${bgClass}`}
    >
      {icon}
      {content}
    </div>
  );
}
