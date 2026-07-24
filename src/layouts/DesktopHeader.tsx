import { useEffect, useState } from 'react';
import { Bell, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeaderLocationBar from '../components/HeaderLocationBar';
import OfflineIndicator from '../components/OfflineIndicator';
import { shopInfo } from '../data/mock';

interface Props {
  onOpenNotifications: () => void;
}

export default function DesktopHeader({ onOpenNotifications }: Props) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: shopInfo.owner.name,
    avatar: shopInfo.owner.avatar
  });
  const [shopStatus, setShopStatus] = useState(shopInfo.status || 'Shop Open');

  useEffect(() => {
    const updateHeaderData = () => {
      try {
        const profStr = localStorage.getItem('nexora_local_profile');
        if (profStr) {
          const prof = JSON.parse(profStr);
          setProfile({
            name: prof.full_name || shopInfo.owner.name,
            avatar: prof.avatar_url || shopInfo.owner.avatar
          });
        }
        
        const shopStr = localStorage.getItem('nexora_local_shop');
        if (shopStr) {
          const shop = JSON.parse(shopStr);
          setShopStatus(shop.status || 'Shop Open');
        }
      } catch (e) {
        console.error(e);
      }
    };
    updateHeaderData();
    window.addEventListener('nexora_profile_updated', updateHeaderData);
    window.addEventListener('nexora_shop_updated', updateHeaderData);
    return () => {
      window.removeEventListener('nexora_profile_updated', updateHeaderData);
      window.removeEventListener('nexora_shop_updated', updateHeaderData);
    };
  }, []);

  return (
    <header className="hidden md:flex sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 items-center justify-between shadow-2xs">
      {/* Left: Location Bar (Uber/Zomato Style) */}
      <div className="flex items-center gap-4">
        <HeaderLocationBar />
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="capitalize">{shopStatus}</span>
        </div>
      </div>

      {/* Right: Offline Indicator, Admin Switch, Notifications & Owner Profile */}
      <div className="flex items-center gap-4">
        <OfflineIndicator />

        {/* Quick Admin Switch */}
        <button
          onClick={() => navigate('/app/admin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all cursor-pointer"
          title="Switch to Admin Panel"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Admin Console</span>
        </button>

        <button
          onClick={onOpenNotifications}
          className="p-2 relative text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <img
            src={profile.avatar}
            alt="Owner"
            className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs"
          />
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
              {profile.name}
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Salon Owner</p>
          </div>
        </div>
      </div>
    </header>
  );
}
