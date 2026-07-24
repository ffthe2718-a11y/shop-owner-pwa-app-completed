import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { shopInfo } from '../data/mock';
import HeaderLocationBar from '../components/HeaderLocationBar';
import OfflineIndicator from '../components/OfflineIndicator';

interface Props {
  onOpenNotifications: () => void;
}

export default function MobileHeader({ onOpenNotifications }: Props) {
  const [profile, setProfile] = useState({
    avatar: shopInfo.owner.avatar
  });

  useEffect(() => {
    const updateHeaderData = () => {
      try {
        const profStr = localStorage.getItem('nexora_local_profile');
        if (profStr) {
          const prof = JSON.parse(profStr);
          setProfile({
            avatar: prof.avatar_url || shopInfo.owner.avatar
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    updateHeaderData();
    window.addEventListener('nexora_profile_updated', updateHeaderData);
    return () => window.removeEventListener('nexora_profile_updated', updateHeaderData);
  }, []);

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shadow-2xs">
      <div className="flex items-center gap-2 min-w-0">
        <img 
          src={profile.avatar} 
          alt="Profile" 
          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
        />
        {/* Zomato/Uber style location selector header */}
        <HeaderLocationBar compact />
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <OfflineIndicator />
        <button 
          onClick={onOpenNotifications}
          className="p-2 relative text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </div>
    </header>
  );
}
