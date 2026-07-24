import { useState, useEffect } from 'react';
import { adminState } from '../lib/adminState';
import type { AdminPayout } from '../types';
import { 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight, 
  Building,
  Check,
  X,
  User,
  CalendarDays
} from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [toast, setToast] = useState({ visible: false, message: '' });

  const loadData = () => {
    setPayouts(adminState.getPayouts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('nexora_admin_state_changed', loadData);
    return () => window.removeEventListener('nexora_admin_state_changed', loadData);
  }, []);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleApprove = (payoutId: string) => {
    adminState.approvePayout(payoutId);
    showToast('Settlement approved! Bank transfer initiated.');
  };

  const handleReject = (payoutId: string) => {
    adminState.rejectPayout(payoutId);
    showToast('Settlement request declined.');
  };

  // Financial Summary calculations
  const totalPaid = payouts
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRejected = payouts
    .filter(p => p.status === 'rejected')
    .reduce((sum, p) => sum + p.amount, 0);

  // Filter payouts
  const filteredPayouts = payouts.filter(p => filterTab === 'all' || p.status === filterTab);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Merchant Settlement Desk</h1>
        <p className="text-slate-500 mt-1 text-sm">Review, authorize, and process earnings withdrawal requests from shop owners</p>
      </div>

      {/* Financial Overview Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Paid Settlements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Settled payouts</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">₹{totalPaid.toLocaleString()}</h3>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Transferred to bank</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Settlements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Pending Settles</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">₹{totalPending.toLocaleString()}</h3>
            <p className="text-[10px] text-amber-600 font-bold mt-1">⏳ Processing transfer</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* Rejected Settlements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Declined payouts</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">₹{totalRejected.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Rejected by Platform</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs list & Main ledger list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-4.5 h-4.5 text-blue-600" />
            <span>Withdrawal Requests Ledger</span>
          </h2>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            {['all', 'pending', 'approved', 'rejected'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  filterTab === tab
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List of settlement requests */}
        <div className="divide-y divide-slate-100">
          {filteredPayouts.map(payout => (
            <div key={payout.id} className="p-5 flex flex-col md:flex-row justify-between gap-6 hover:bg-slate-50/30 transition-all">
              
              {/* Left Column: Requester Information */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {payout.shop_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{payout.shop_name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3 h-3 text-slate-400" />
                      <span>Requested: {payout.request_date} • Ref ID: #{payout.id}</span>
                    </p>
                  </div>
                </div>

                {/* Bank account details banner */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 max-w-lg">
                  <div className="flex items-start gap-2.5">
                    <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Details</p>
                      <p className="text-xs font-semibold text-slate-800 mt-1 leading-relaxed">
                        {payout.bank_details}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Amount & Approval state controls */}
              <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-4 shrink-0">
                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-400">Withdrawal Amount</p>
                  <p className="text-xl font-black text-slate-950">₹{payout.amount.toLocaleString()}</p>
                </div>

                {/* Current state badge or action controllers */}
                <div>
                  {payout.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(payout.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Decline payout request"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>

                      <button
                        onClick={() => handleApprove(payout.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        title="Approve & execute bank settlement"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Authorize</span>
                      </button>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      payout.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {payout.status === 'approved' ? '✓ Authorised / Settled' : '✕ Declined'}
                    </span>
                  )}
                </div>
              </div>

            </div>
          ))}

          {filteredPayouts.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No payout transactions match your selected status.
            </div>
          )}
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
