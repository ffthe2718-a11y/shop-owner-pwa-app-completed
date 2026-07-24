import { useState, useMemo } from 'react';
import { Globe, ExternalLink, Image, LayoutTemplate, Settings, CheckCircle2, ChevronRight, Share2, X, MapPin, WifiOff, RefreshCw, VideoOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import StoreMap from '../components/StoreMap';
import { useOwnerWebsite } from '../hooks/useOwnerWebsite';
import { DEFAULT_WEBSITE_CONFIG } from '../lib/ownerWebsiteRepository';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';

export default function Website() {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const {
    data,
    source,
    lastUpdated,
    isLoading,
    isOffline,
    updateConfig,
    togglePublish,
    refetch
  } = useOwnerWebsite();

  useRegisterRefresh(refetch);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const isCacheOutdated = useMemo(() => {
    if (!lastUpdated) return false;
    try {
      const diff = Date.now() - new Date(lastUpdated).getTime();
      return diff > 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, [lastUpdated]);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return 'Unknown';
    try {
      const d = new Date(lastUpdated);
      if (isNaN(d.getTime())) return lastUpdated;
      return d.toLocaleString();
    } catch {
      return lastUpdated;
    }
  }, [lastUpdated]);

  const sections = useMemo(() => {
    return data?.sections || DEFAULT_WEBSITE_CONFIG.sections;
  }, [data]);

  // Loading view
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Loading website builder...</p>
      </div>
    );
  }

  // No-cache offline view
  if (source === 'none' && isOffline) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs my-6 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
          <Globe className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No Saved Website Configuration Available</h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
          No saved website configuration is available offline. Connect to the internet once to load your website builder.
        </p>
        <button
          onClick={refetch}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Offline Status Warning Banner */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-amber-850 shadow-xs">
          <div className="flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Showing your last saved website</p>
              <p className="text-xs text-amber-700 mt-1">
                Last updated: {formattedLastUpdated} • <span className="font-semibold">{isCacheOutdated ? 'Outdated saved website data' : 'Saved website data'}</span>
              </p>
              <p className="text-xs text-amber-600 mt-1.5 font-medium bg-amber-100/50 px-2 py-1 rounded inline-block">
                Editing, saving and publishing require an internet connection.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Website Builder</h1>
          <p className="text-slate-500 mt-1">Manage your shop's online presence</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isOffline) {
                showToast('The live website requires an internet connection.');
              } else {
                showToast('Link copied to clipboard');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button
            onClick={() => {
              if (isOffline) {
                showToast('Website changes require an internet connection.');
                return;
              }
              togglePublish()
                .then(() => showToast(data?.isPublished ? 'Website Unpublished' : 'Website Published successfully'))
                .catch(err => showToast(err.message));
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg transition-colors ${
              (data?.isPublished ?? true)
                ? 'bg-slate-900 hover:bg-slate-800'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {(data?.isPublished ?? true) ? 'Unpublish' : 'Publish Site'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <Globe className="w-10 h-10 text-blue-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${(data?.isPublished ?? true) ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              <span className="text-sm font-medium text-slate-500">{(data?.isPublished ?? true) ? 'Live & Accepting Bookings' : 'Draft / Offline'}</span>
              {isOffline && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  Saved status — connect to verify
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{data?.slug || 'royalglow.nexora.in'}</h2>
            <p className="text-sm text-slate-500 mt-1">Last updated: {formattedLastUpdated}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => setIsPreviewOpen(true)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Preview
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Website Sections</h3>
              {isOffline && (
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded">
                  Read Only Mode
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {sections.map((section, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-slate-400 cursor-grab" />
                    <div>
                      <p className="font-medium text-slate-900">{section.name}</p>
                      <p className={`text-xs ${section.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>{section.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={section.visible}
                        disabled={isOffline}
                        onChange={() => {
                          if (isOffline) {
                            showToast('Website changes require an internet connection.');
                            return;
                          }
                          const newSections = sections.map((s, i) => i === idx ? { ...s, visible: !s.visible } : s);
                          updateConfig({ sections: newSections })
                            .then(() => showToast(`${section.name} visibility updated`))
                            .catch(err => showToast(err.message));
                        }}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <button
                      onClick={() => {
                        if (isOffline) {
                          showToast('Website changes require an internet connection.');
                          return;
                        }
                        showToast(`Edit ${section.name}`);
                      }}
                      className={`text-sm font-medium ${isOffline ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Link
            to={isOffline ? '#' : "/app/owner/templates"}
            onClick={(e) => {
              if (isOffline) {
                e.preventDefault();
                showToast('Website changes require an internet connection.');
              }
            }}
            className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors group"
          >
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 flex items-center justify-between">
              Change Theme <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </h3>
            <p className="text-sm text-slate-500 mt-1">Currently using "{data?.templateName || 'Royal Luxe'}"</p>
          </Link>

          <Link
            to={isOffline ? '#' : "/app/owner/gallery"}
            onClick={(e) => {
              if (isOffline) {
                e.preventDefault();
                showToast('Website changes require an internet connection.');
              }
            }}
            className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors group"
          >
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Image className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 flex items-center justify-between">
              Manage Gallery <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </h3>
            <p className="text-sm text-slate-500 mt-1">10 photos uploaded</p>
          </Link>

          <div className="bg-slate-900 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-2">Setup Progress</h3>
            <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Basic Details added</li>
              <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Services linked</li>
              <li className="flex gap-2 items-center text-slate-400"><div className="w-4 h-4 border-2 border-slate-500 rounded-full"></div> Add Staff photos</li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-900">{data?.slug || 'royalglow.nexora.in'} <span className="text-sm font-normal text-slate-500">(Preview)</span></h2>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 bg-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center">
              <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border-8 border-slate-800 flex flex-col relative">
                
                {/* Saved offline preview badge */}
                {isOffline && (
                  <div className="absolute top-4 left-4 z-10 bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-md animate-pulse">
                    Saved offline preview
                  </div>
                )}

                <div className="h-48 bg-slate-900 flex flex-col items-center justify-center text-center p-4">
                  <h1 className="text-2xl font-bold text-white">{data?.businessName || 'Royal Glow Salon'}</h1>
                  <p className="text-slate-400 text-xs mt-1">{data?.templateName || 'Royal Luxe'} Theme</p>
                </div>
                
                <div className="p-6 space-y-6 flex-1">
                  {/* Hero Section */}
                  {sections.find(s => s.name === 'Hero Section')?.visible && (
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Hero Section</h4>
                      <p className="text-sm text-slate-700 mt-1">Welcome to the premium beauty lounge. Relax, renew, refresh.</p>
                    </div>
                  )}

                  {/* About Business */}
                  {sections.find(s => s.name === 'About Business')?.visible && (
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">About Business</h4>
                      <p className="text-sm text-slate-600 mt-1">We provide world-class hair, makeup, and skin care services with highly professional staff.</p>
                    </div>
                  )}

                  {/* Services List with prices indicator */}
                  {sections.find(s => s.name === 'Services List')?.visible && (
                    <div className="border-b border-slate-100 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Our Services</h4>
                        {isOffline && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">
                            * Saved data prices
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-slate-800">Haircut & Styling</span>
                          <span className="text-blue-600 font-semibold">₹300{isOffline && '*'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-slate-800">Bridal Makeup</span>
                          <span className="text-blue-600 font-semibold">₹3,500{isOffline && '*'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Staff Members */}
                  {sections.find(s => s.name === 'Staff Members')?.visible && (
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Meet Our Team</h4>
                      <div className="flex gap-3 mt-2">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold">M</div>
                          <span className="text-xs mt-1 text-slate-600">Meera</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold">R</div>
                          <span className="text-xs mt-1 text-slate-600">Rahul</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Photo Gallery with Offline Video Warning */}
                  {sections.find(s => s.name === 'Photo Gallery')?.visible && (
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Media Gallery</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400">Photo 1</div>
                        <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400">Photo 2</div>
                      </div>
                      
                      {/* Video Area */}
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                        <p className="text-xs font-semibold text-slate-700">Promo Video</p>
                        {isOffline ? (
                          <div className="text-[11px] text-slate-500 mt-1 bg-slate-100 p-2 rounded border border-slate-200 flex items-center justify-center gap-1.5 font-medium">
                            <VideoOff className="w-3.5 h-3.5 text-slate-400" />
                            Video preview is unavailable offline.
                          </div>
                        ) : (
                          <div className="text-[11px] text-blue-600 mt-1">
                            Click to play live promo
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Customer Reviews consistency */}
                  {sections.find(s => s.name === 'Customer Reviews')?.visible && (
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Customer Reviews</h4>
                      {isOffline && (
                        <p className="text-[9px] text-amber-600 bg-amber-50 p-1 rounded border border-amber-100 mt-1 font-medium">
                          Reviews shown are not guaranteed to be the latest.
                        </p>
                      )}
                      <div className="mt-2 text-xs text-slate-600 italic">
                        "Amazing makeup session!" - Anita Sharma
                      </div>
                    </div>
                  )}

                  {/* Book Appointment & Location */}
                  <div>
                    <h3 className="font-bold text-lg mb-2">Book Appointment</h3>
                    <div className="h-20 bg-blue-50 rounded-xl border border-blue-100 w-full flex items-center justify-center mb-4">
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Book Now</button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" /> Visit Our Salon
                    </h3>
                    <p className="text-xs text-slate-500 mb-2">Hill Road, Bandra West, Mumbai, Maharashtra 400050</p>
                    <StoreMap height="180px" showControls={false} />
                  </div>

                  {/* Consistency Helper Text */}
                  {isOffline && (
                    <div className="text-center pt-4 border-t border-slate-100">
                      <p className="text-[10px] text-slate-500 italic">
                        Content shown is from the last saved website version.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
