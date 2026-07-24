import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Navigation, Share2 } from 'lucide-react';
import StoreMap from '../components/StoreMap';
import { api } from '../lib/api';
import Toast from '../components/Toast';

export default function StoreLocation() {
  const [shop, setShop] = useState<any>(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    api.getShop().then(data => setShop(data)).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Google Maps Store Location</h1>
          <p className="text-slate-500 mt-1">Interactive Google Map with live place search, pin marker & driving directions</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            showToast('Location link copied to clipboard!');
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Share2 className="w-4 h-4" /> Share Location
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Store Information Card */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                {shop?.name?.[0] || 'N'}
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">{shop?.name || "Nexora Luxury Hair & Beauty"}</h2>
                <p className="text-xs text-blue-600 font-semibold">Verified Salon Outlet</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Address</p>
                  <p className="text-slate-600 mt-0.5">{shop?.address || "Hill Road, Bandra West"}, {shop?.city || "Mumbai"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Phone Contact</p>
                  <p className="text-slate-600 mt-0.5">{shop?.phone || "+91 98765 43210"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Email Address</p>
                  <p className="text-slate-600 mt-0.5">{shop?.email || "contact@nexora.in"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Business Hours</p>
                  <p className="text-slate-600 mt-0.5">Mon - Sun: 10:00 AM - 09:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 text-white p-5 rounded-2xl shadow-md space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-300" /> Nearby Search & Directions
            </h3>
            <p className="text-xs text-blue-200 leading-relaxed">
              Use the live search bar on the Google Map to find nearby landmarks, metro stations, or street intersections and compute real-time driving routes!
            </p>
          </div>
        </div>

        {/* Right Column: Google Map Container */}
        <div className="lg:col-span-2">
          <StoreMap 
            storeName={shop?.name || "Nexora Luxury Hair & Beauty Salon"}
            address={shop?.address ? `${shop.address}, ${shop.city}` : "Hill Road, Bandra West, Mumbai"}
            phone={shop?.phone || "+91 98765 43210"}
            height="520px"
          />
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
