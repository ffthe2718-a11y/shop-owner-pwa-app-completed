import { useEffect, useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { MapPin, ChevronDown, Navigation, Sparkles } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export default function HeaderLocationBar({ compact = false }: Props) {
  const { location, setIsModalOpen, isLoading } = useLocation();
  const [displayLocation, setDisplayLocation] = useState('Select Location');

  useEffect(() => {
    const updateLabel = () => {
      try {
        const shopStr = localStorage.getItem('nexora_local_shop');
        if (shopStr) {
          const shop = JSON.parse(shopStr);
          const label = shop.location_label || '';
          const city = shop.city || '';
          if (label) {
            setDisplayLocation(label);
          } else if (city) {
            setDisplayLocation(city);
          } else {
            setDisplayLocation('Add Location');
          }
        } else {
          setDisplayLocation(location.area || location.city || 'Select Location');
        }
      } catch {
        setDisplayLocation(location.area || location.city || 'Select Location');
      }
    };

    updateLabel();
    window.addEventListener('nexora_shop_updated', updateLabel);
    return () => window.removeEventListener('nexora_shop_updated', updateLabel);
  }, [location]);

  return (
    <button
      onClick={() => setIsModalOpen(true)}
      className={`group relative text-left flex items-center gap-2 px-2.5 py-1.5 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
        compact ? 'max-w-[200px]' : 'max-w-xs'
      }`}
      title="Click to change location or detect GPS"
    >
      {/* Location Pin Icon with Pulse */}
      <div className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-red-600 text-white shadow-xs group-hover:scale-105 transition-transform">
        {isLoading ? (
          <Navigation className="w-4 h-4 animate-spin text-white" />
        ) : (
          <MapPin className="w-4 h-4 text-white" />
        )}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
      </div>

      {/* Location Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
            {location.isAutoDetected ? 'GPS LOCATION' : 'LOCATION'}
          </span>
          {location.isAutoDetected && (
            <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
            {displayLocation}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
        </div>
      </div>
    </button>
  );
}
