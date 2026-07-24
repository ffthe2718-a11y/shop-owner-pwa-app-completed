import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Scissors, Users, UserCircle, Star, Globe, Wallet, LineChart, HelpCircle, User, MapPin, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import OwnerSyncStatus from '../components/owner/OwnerSyncStatus';

const navItems = [
  { to: '/app/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/owner/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/app/owner/services', label: 'Services', icon: Scissors },
  { to: '/app/owner/staff', label: 'Staff', icon: Users },
  { to: '/app/owner/customers', label: 'Customers', icon: UserCircle },
  { to: '/app/owner/reviews', label: 'Reviews', icon: Star },
  { to: '/app/owner/website', label: 'Website', icon: Globe },
  { to: '/app/owner/location', label: 'Store Location', icon: MapPin },
  { to: '/app/owner/wallet', label: 'Wallet', icon: Wallet },
  { to: '/app/owner/analytics', label: 'Analytics', icon: LineChart },
  { to: '/app/owner/support', label: 'Support', icon: HelpCircle },
  { to: '/app/owner/owner-profile', label: 'Profile', icon: User },
];

export default function OwnerSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-white border-r border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nexora<span className="text-blue-600">OS</span></h1>
        <p className="text-sm text-slate-500 mt-1">Owner Portal</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => twMerge(
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer Switcher */}
      <div className="p-4 border-t border-slate-150 bg-slate-50 space-y-3">
        <OwnerSyncStatus />
        <button
          onClick={() => navigate('/app/admin')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-200 active:scale-95 cursor-pointer"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Switch to System Admin</span>
        </button>
      </div>
    </aside>
  );
}