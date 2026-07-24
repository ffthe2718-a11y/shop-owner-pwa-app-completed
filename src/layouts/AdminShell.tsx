import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Menu, X, ShieldAlert } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import OfflineIndicator from '../components/OfflineIndicator';
import ConnectivityStatus from '../components/ConnectivityStatus';

export default function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside 
        className={`md:hidden fixed top-0 bottom-0 left-0 w-64 bg-slate-900 text-white z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            Nexora<span className="text-blue-400">Admin</span>
          </h1>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {[
            { to: '/app/admin', label: 'Platform Overview' },
            { to: '/app/admin/shops', label: 'Shop Directory' },
            { to: '/app/admin/payouts', label: 'Settlement Desk' },
            { to: '/app/admin/bookings', label: 'Platform Bookings' },
            { to: '/app/admin/categories', label: 'System Config' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/app/owner');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/20"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Switch to Shop Owner</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ConnectivityStatus />
        {/* Admin Header */}
        <header className="bg-slate-900 text-white border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <span className="text-sm font-bold tracking-tight">NexoraOS Administrative Panel</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <OfflineIndicator />
            <div className="h-4 w-px bg-slate-800 hidden md:block" />
            <button
              onClick={() => navigate('/app/owner')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Owner Panel</span>
            </button>
          </div>
        </header>

        {/* Inner Content View */}
        <main className="flex-1 overflow-y-auto bg-slate-50 pb-8">
          <div className="max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
