import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Globe, Wallet, User } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/app/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/owner/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/app/owner/website', label: 'Website', icon: Globe },
  { to: '/app/owner/wallet', label: 'Wallet', icon: Wallet },
  { to: '/app/owner/owner-profile', label: 'Profile', icon: User },
];

export default function BottomNavigation() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-40">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => clsx(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}