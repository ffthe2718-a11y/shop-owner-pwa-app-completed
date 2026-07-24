import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => {
          // Toggle or check connection status on click
          const current = navigator.onLine;
          setIsOnline(current);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
        }`}
        title={isOnline ? 'Online - PWA Synced' : 'Offline Mode - Changes saved locally'}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Online</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Offline Mode</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </>
        )}
      </button>

      {/* Network status toast popup when toggled or changed */}
      {showToast && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs z-50 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div>
              <p className="font-bold">{isOnline ? 'Back Online' : 'You are Offline'}</p>
              <p className="text-[11px] text-slate-300">
                {isOnline
                  ? 'Cloud sync active & data is up to date.'
                  : 'Working in offline cache mode. Changes will sync when reconnected.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
