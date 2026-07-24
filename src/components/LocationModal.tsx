import { useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { 
  Navigation, MapPin, Search, Check, X, Compass, Loader2, AlertTriangle, Building2, ChevronRight, Sparkles 
} from 'lucide-react';

const POPULAR_LOCATIONS = [
  { area: 'Bandra West', city: 'Mumbai', address: 'Hill Road, Bandra West, Mumbai', lat: 19.0596, lng: 72.8295 },
  { area: 'Connaught Place', city: 'New Delhi', address: 'Inner Circle, Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
  { area: 'Indiranagar', city: 'Bengaluru', address: '100 Feet Road, Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 },
  { area: 'Jubilee Hills', city: 'Hyderabad', address: 'Road No. 36, Jubilee Hills, Hyderabad', lat: 17.4319, lng: 78.4071 },
  { area: 'Koregaon Park', city: 'Pune', address: 'North Main Road, Koregaon Park, Pune', lat: 18.5362, lng: 73.8939 },
  { area: 'Salt Lake', city: 'Kolkata', address: 'Sector V, Salt Lake, Kolkata', lat: 22.5804, lng: 88.4170 },
  { area: 'Sector 17', city: 'Chandigarh', address: 'Plaza, Sector 17, Chandigarh', lat: 30.7398, lng: 76.7827 },
  { area: 'Gomti Nagar', city: 'Lucknow', address: 'Virama Khand, Gomti Nagar, Lucknow', lat: 26.8500, lng: 80.9999 },
];

export default function LocationModal() {
  const { 
    location, 
    isLoading, 
    error, 
    detectLocation, 
    setManualLocation, 
    isModalOpen, 
    setIsModalOpen 
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');

  if (!isModalOpen) return null;

  const filteredLocations = POPULAR_LOCATIONS.filter(item => 
    item.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setManualLocation({
      address: searchQuery,
      area: searchQuery.split(',')[0] || searchQuery,
      city: searchQuery.split(',')[1] || 'Custom City',
      formattedAddress: searchQuery,
      lat: 19.0760,
      lng: 72.8777,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                Location Selection
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  Uber / Zomato GPS
                </span>
              </h3>
              <p className="text-xs text-slate-500">Auto-detect via GPS or select your service area</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Primary Action: Auto-Detect GPS Button */}
          <button
            onClick={() => detectLocation()}
            disabled={isLoading}
            className="w-full relative group p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between text-left disabled:opacity-75"
          >
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:bg-white/30 transition-colors">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Navigation className="w-6 h-6 fill-current text-white animate-bounce" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-1.5">
                  {isLoading ? 'Detecting Your GPS Location...' : 'Use Current Location'}
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </p>
                <p className="text-xs text-blue-100 mt-0.5">
                  {isLoading ? 'Fetching coordinates via browser GPS...' : 'Enable GPS permission for instant auto-detect'}
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0 z-10" />
          </button>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  You can search or choose a popular city area from the list below.
                </p>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Search Area, Landmark or City
            </label>
            <form onSubmit={handleCustomSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type location (e.g., Bandra West, Connaught Place...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Set Area
                </button>
              )}
            </form>
          </div>

          {/* Popular Cities / Areas Grid */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Popular Locations</span>
              <span className="text-[10px] text-slate-400 font-normal">Click to select</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredLocations.map((item, idx) => {
                const isSelected = location.area === item.area;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setManualLocation({
                        address: item.address,
                        area: item.area,
                        city: item.city,
                        formattedAddress: item.address,
                        lat: item.lat,
                        lng: item.lng,
                      });
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 group ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                      isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:text-blue-600 group-hover:bg-blue-50'
                    }`}>
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {item.area}
                        </p>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.city}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Current: <strong className="text-slate-800">{location.area}, {location.city}</strong></span>
          </div>

          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
