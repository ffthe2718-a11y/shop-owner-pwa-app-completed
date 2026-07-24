import { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastState {
  visible: boolean;
  message: string;
  title: string;
  type: 'online' | 'offline';
}

export default function NetworkToastNotifier() {
  const { isOnline } = useNetworkStatus();
  const [prevOnline, setPrevOnline] = useState<boolean | null>(null);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    title: '',
    type: 'online',
  });

  // Track transitions of network state
  useEffect(() => {
    if (prevOnline === null) {
      setPrevOnline(isOnline);
      return;
    }

    if (prevOnline && !isOnline) {
      // Transition: Online -> Offline
      setToast({
        visible: true,
        title: 'Connection Lost',
        message: 'You are now offline. Changes will be saved locally and synced later.',
        type: 'offline',
      });
      setPrevOnline(false);
    } else if (!prevOnline && isOnline) {
      // Transition: Offline -> Online
      setToast({
        visible: true,
        title: 'Connection Restored',
        message: 'You are back online. Synchronizing your changes to the cloud...',
        type: 'online',
      });
      setPrevOnline(true);
    }
  }, [isOnline, prevOnline]);

  // Auto-dismiss the toast after 6 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          id="network-toast-container"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-950 border rounded-2xl shadow-xl overflow-hidden p-4 border-slate-100 dark:border-slate-800"
        >
          <div className="flex gap-3">
            <div
              id="network-toast-icon-wrapper"
              className={`p-2.5 rounded-xl shrink-0 ${
                toast.type === 'online'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              }`}
            >
              {toast.type === 'online' ? (
                <Wifi id="network-toast-online-icon" className="w-5 h-5" />
              ) : (
                <WifiOff id="network-toast-offline-icon" className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 id="network-toast-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {toast.title}
              </h4>
              <p id="network-toast-message" className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              id="network-toast-close-btn"
              onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors self-start shrink-0 cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
