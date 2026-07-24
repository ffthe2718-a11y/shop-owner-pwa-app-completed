import { useState, useEffect } from 'react';
import { adminState } from '../lib/adminState';
import { 
  Settings, 
  Percent, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Check, 
  AlertOctagon,
  Power,
  Sliders,
  Sparkles
} from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const loadData = () => {
    setCategories(adminState.getCategories());
    setCommissionRate(adminState.getCommission());
    setIsMaintenance(adminState.isMaintenanceMode());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('nexora_admin_state_changed', loadData);
    return () => window.removeEventListener('nexora_admin_state_changed', loadData);
  }, []);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    if (categories.includes(newCategoryName.trim())) {
      showToast('Category already exists!');
      return;
    }

    adminState.addCategory(newCategoryName.trim());
    setNewCategoryName('');
    showToast('New system category registered!');
  };

  const handleDeleteCategory = (cat: string) => {
    adminState.deleteCategory(cat);
    showToast('Category removed from system.');
  };

  const handleUpdateCommission = () => {
    if (commissionRate < 0 || commissionRate > 100) {
      showToast('Commission rate must be between 0% and 100%!');
      return;
    }
    adminState.updateCommission(commissionRate);
    showToast('Global platform commission updated!');
  };

  const handleToggleMaintenance = () => {
    const nextVal = adminState.toggleMaintenanceMode();
    showToast(nextVal ? 'System set to Maintenance Mode!' : 'System is back Live!');
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Category Config</h1>
        <p className="text-slate-500 mt-1 text-sm">Control platform commission rates, system availability, and merchant listing business categories</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Platform Commission & Maintenance Settings */}
        <div className="space-y-6">
          {/* Platform Settings Block */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-600" />
              <span>Platform Monetization</span>
            </h2>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Global Commission Rate (%)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-800"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">%</span>
                </div>
                <button
                  onClick={handleUpdateCommission}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
                >
                  Apply Rate
                </button>
              </div>
              <p className="text-xs text-slate-400">
                This rate specifies the transaction fee charged by the platform for each completed booking across all outlets.
              </p>
            </div>
          </div>

          {/* System Control Settings Block */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <span>System Ingress & Access</span>
            </h2>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="space-y-1 pr-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-amber-500" />
                  <span>Platform Maintenance Mode</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Temporarily lock out store owners & end consumers for system-wide service maintenance.
                </p>
              </div>
              
              {/* Slit Switch Button */}
              <button
                onClick={handleToggleMaintenance}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  isMaintenance ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    isMaintenance ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Categories Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>Merchant Business Categories</span>
          </h2>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Add new category (e.g. Skin & Laser)..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              required
            />
            <button
              type="submit"
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer"
              title="Add Category"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Platform Categories</p>
            <div className="border border-slate-150 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-80 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat} className="p-3.5 flex justify-between items-center hover:bg-slate-50/50 transition-all text-sm font-semibold text-slate-700">
                  <span>{cat}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title={`Remove ${cat}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
