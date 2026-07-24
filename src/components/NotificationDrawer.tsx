import { X, Bell, Calendar, Star, Wallet, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onClose: () => void;
}

const mockNotifications = [
  { id: 1, type: 'booking', title: 'New Booking', desc: 'Anita Sharma booked Bridal Makeup', time: '5m ago', unread: true, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 2, type: 'review', title: 'New Review', desc: 'Rohan left a 4-star review', time: '1h ago', unread: true, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { id: 3, type: 'payout', title: 'Payout Processed', desc: '₹17,100 settled to bank', time: '2h ago', unread: false, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 4, type: 'website', title: 'Website Published', desc: 'Your new template is live', time: '1d ago', unread: false, icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50' }
];

export default function NotificationDrawer({ onClose }: Props) {
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 z-50 md:hidden"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-500">Recent</span>
            <button className="text-sm text-blue-600 font-medium hover:underline">Mark all read</button>
          </div>
          
          {mockNotifications.map(n => (
            <div key={n.id} className={`flex gap-3 p-3 rounded-xl border ${n.unread ? 'bg-slate-50 border-blue-100' : 'bg-white border-slate-100'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.bg} ${n.color}`}>
                <n.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{n.time}</span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{n.desc}</p>
              </div>
              {n.unread && (
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0"></div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}