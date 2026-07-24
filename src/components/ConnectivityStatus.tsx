import { useState, useEffect } from 'react';
import { WifiOff, Wifi, X, RefreshCw } from 'lucide-react';

export default function ConnectivityStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCheckConnection = () => {
    if (typeof navigator !== 'undefined') {
      const status = navigator.onLine;
      setIsOnline(status);
      if (status) {
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3000);
      }
    }
  };

  if (isOnline && !showRestored) {
    return null;
  }

  if (!isOnline && dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full transition-all duration-300 z-50 text-xs font-medium border-b shrink-0 ${
        !isOnline
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : 'bg-emerald-50 text-emerald-900 border-emerald-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {!isOnline ? (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 shrink-0">
              <WifiOff className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Wifi className="w-3.5 h-3.5" />
            </span>
          )}

          <p className="truncate text-slate-800">
            {!isOnline ? (
              <span>
                <strong className="font-semibold text-amber-900">Offline Mode:</strong> You are currently offline. Local cache active — changes will sync once connection is restored.
              </span>
            ) : (
              <span>
                <strong className="font-semibold text-emerald-900">Connection Restored:</strong> You are back online.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isOnline && (
            <button
              onClick={handleCheckConnection}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-200/70 hover:bg-amber-200 text-amber-900 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}

          <button
            onClick={() => {
              if (!isOnline) setDismissed(true);
              else setShowRestored(false);
            }}
            className="p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
