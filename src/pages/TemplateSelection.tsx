import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, X, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { templatesData } from '../data/mock';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getActiveOwnerAndShopIds, saveWebsiteCache, DEFAULT_WEBSITE_CONFIG } from '../lib/ownerWebsiteRepository';

export default function TemplateSelection() {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [templates, setTemplates] = useState(templatesData);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const { isOffline } = useNetworkStatus();

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const selectTemplate = async (id: number) => {
    if (isOffline) {
      showToast('Template selection requires an internet connection.');
      return;
    }

    const selectedT = templates.find(t => t.id === id);
    if (!selectedT) return;

    setTemplates(templates.map(t => ({...t, selected: t.id === id})));
    showToast('Theme updated successfully');

    try {
      const { ownerId, shopId } = await getActiveOwnerAndShopIds();
      const localStr = localStorage.getItem(`nexora_website_config_${ownerId}_${shopId}`);
      const currentData = localStr ? JSON.parse(localStr) : { ...DEFAULT_WEBSITE_CONFIG };
      currentData.templateName = selectedT.name;
      currentData.lastUpdated = new Date().toISOString();

      // Save online
      localStorage.setItem(`nexora_website_config_${ownerId}_${shopId}`, JSON.stringify(currentData));

      // Save to IndexedDB cache
      await saveWebsiteCache(ownerId, shopId, currentData);
    } catch (err) {
      console.warn('Failed to sync selected template with website cache:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Offline Alert */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block">Offline Mode Active</span>
            Template selection and theme updates require an internet connection.
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link to="/app/owner/website" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Website Themes</h1>
          <p className="text-slate-500 mt-1">Choose a look for your online store</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${template.selected ? 'border-blue-600 shadow-md' : 'border-slate-200 shadow-sm hover:border-blue-300'}`}>
            <div className="aspect-[4/3] bg-slate-100 relative group overflow-hidden">
              <img src={template.img} alt={template.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button onClick={() => setPreviewTemplate(template.img)} className="px-4 py-2 bg-white text-slate-900 font-medium rounded-lg text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Preview
                </button>
              </div>
              {template.selected && (
                <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" /> Active
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900">{template.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{template.style}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                {!template.selected ? (
                  <button
                    onClick={() => selectTemplate(template.id)}
                    className={`w-full py-2.5 font-medium rounded-xl transition-colors ${
                      isOffline
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Apply Theme
                  </button>
                ) : (
                  <button disabled className="w-full py-2.5 bg-blue-50 text-blue-700 font-medium rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Currently Applied
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Toast visible={toast.visible} message={toast.message} />

      <AnimatePresence>
        {previewTemplate && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50">
              <h2 className="font-bold text-slate-900">Live Preview</h2>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 bg-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center">
              <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border-8 border-slate-800">
                <img src={previewTemplate} alt="Preview" className="w-full object-cover" />
                <div className="p-6 space-y-4">
                  <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-32 bg-slate-200 rounded-xl w-full mt-8"></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
