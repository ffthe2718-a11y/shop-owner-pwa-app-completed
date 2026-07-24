import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, IndianRupee, History, Settings, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const adminNavItems = [
  { to: '/app/admin', label: 'Platform Overview', icon: LayoutDashboard, end: true },
  { to: '/app/admin/shops', label: 'Shop Directory', icon: Store },
  { to: '/app/admin/payouts', label: 'Settlement Desk', icon: IndianRupee },
  { to: '/app/admin/bookings', label: 'Platform Bookings', icon: History },
  { to: '/app/admin/categories', label: 'System Config', icon: Settings },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-slate-900 text-white border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Nexora<span className="text-blue-400">Admin</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Super Admin Dashboard</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => twMerge(
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Switcher */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <button
          onClick={() => navigate('/app/owner')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/20 active:scale-95"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Switch to Shop Owner</span>
        </button>
      </div>
    </aside>
  );
}
