import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, Sparkles } from 'lucide-react';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const inStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(inStandalone);

    // Check if user previously dismissed banner in this session or localStorage
    const dismissed = sessionStorage.getItem('nexora_install_banner_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for PWA beforeinstallprompt event (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback for browsers that don't trigger beforeinstallprompt directly or desktop chrome
      alert("To install Nexora App:\n• Mobile: Open browser menu (⋮) and tap 'Add to Home screen' or 'Install App'.\n• Desktop: Click install icon in your address bar.");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('nexora_install_banner_dismissed', 'true');
  };

  // If already installed/standalone or dismissed by user, don't show
  if (isStandalone || installed || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 shadow-xl border border-indigo-800/50 mb-6 relative overflow-hidden group">
      {/* Subtle background glow effect */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md border border-white/10 group-hover:scale-105 transition-transform">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Install Nexora App</h3>
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider rounded-full border border-amber-400/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> PWA App
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Install on your home screen for 1-tap fast access, instant booking alerts & offline capability.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4" /> Install App
          </button>

          <button
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal/Accordion */}
      {showIOSGuide && (
        <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-200 space-y-2 animate-in fade-in">
          <p className="font-semibold text-amber-300 flex items-center gap-1.5">
            <Share2 className="w-4 h-4" /> How to install on iOS (iPhone / iPad):
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
            <li>Tap the <strong>Share button</strong> at the bottom of Safari browser bar</li>
            <li>Scroll down and select <strong>'Add to Home Screen'</strong></li>
            <li>Tap <strong>'Add'</strong> in top right corner</li>
          </ol>
          <button
            onClick={() => setShowIOSGuide(false)}
            className="text-[10px] text-blue-300 hover:underline pt-1"
          >
            Got it, close instructions
          </button>
        </div>
      )}
    </div>
  );
}
