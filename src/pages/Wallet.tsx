import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, ArrowUpRight, ArrowDownRight, TrendingUp, Clock, AlertCircle, WifiOff } from 'lucide-react';
import { transactionsData, kpiData } from '../data/mock';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { adminState } from '../lib/adminState';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function Wallet() {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('HDFC Bank - A/C 501002345678 - IFSC HDFC0000123');
  const [balanceStr, setBalanceStr] = useState('₹18,750');
  const isOnline = useNetworkStatus();

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const loadBalance = useCallback(() => {
    const localBal = localStorage.getItem('nexora_local_wallet_balance');
    if (localBal) {
      setBalanceStr(localBal);
    } else {
      localStorage.setItem('nexora_local_wallet_balance', '₹18,750');
      setBalanceStr('₹18,750');
    }
  }, []);

  const refetch = useCallback(async () => {
    loadBalance();
  }, [loadBalance]);

  useRegisterRefresh(refetch);

  useEffect(() => {
    loadBalance();
    window.addEventListener('nexora_wallet_updated', loadBalance);
    window.addEventListener('nexora_admin_state_changed', loadBalance);
    return () => {
      window.removeEventListener('nexora_wallet_updated', loadBalance);
      window.removeEventListener('nexora_admin_state_changed', loadBalance);
    };
  }, [loadBalance]);

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    const numericBalance = parseFloat(balanceStr.replace(/[^0-9.]/g, ''));

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid positive withdrawal amount.');
      return;
    }

    if (amount > numericBalance) {
      showToast(`Insufficient balance! Your max limit is ${balanceStr}.`);
      return;
    }

    adminState.requestPayout(amount, bankDetails);
    setIsWithdrawModalOpen(false);
    setWithdrawAmount('');
    showToast('Withdraw request submitted successfully! Pending admin approval.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wallet & Payments</h1>
        <p className="text-slate-500 mt-1">Manage your earnings and settlements</p>
      </div>

      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
          <WifiOff className="w-5 h-5" />
          <span>You are currently offline. Data shown is cached and may be stale. Withdrawal features are disabled.</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <p className="text-slate-300 font-medium text-sm flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Available Balance { !isOnline && <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">Cached</span>}</p>
            <h2 className="text-4xl font-bold mt-2">{balanceStr}</h2>
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                disabled={!isOnline}
                className={`px-4 py-2 bg-white text-slate-900 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${!isOnline ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'}`}
              >
                Withdraw Funds
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-slate-500">Pending Settlement</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹4,500</p>
          <p className="text-xs text-slate-400 mt-1">Expected tomorrow</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-slate-500">Today's Collection</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpiData.todayRevenue}</p>
          <p className="text-xs text-slate-400 mt-1">From 18 bookings</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          <div className="flex gap-2">
            {['All', 'Credits', 'Debits', 'Payouts'].map((tab, i) => (
              <button key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${i === 0 ? 'bg-white shadow border border-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {transactionsData.map(txn => (
            <div key={txn.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  txn.type === 'Credit' || txn.type === 'Payout' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {txn.type === 'Credit' || txn.type === 'Payout' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{txn.ref}</p>
                  <p className="text-xs text-slate-500">{txn.date} • {txn.id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-base font-bold ${txn.type === 'Credit' || txn.type === 'Payout' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {txn.type === 'Credit' || txn.type === 'Payout' ? '+' : ''}{txn.amount}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{txn.type}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
          <button onClick={() => showToast('Loading more transactions...')} className="text-sm font-medium text-blue-600 hover:text-blue-700">View All Transactions</button>
        </div>
      </div>

      {/* Withdraw Funds Modal */}
      <Modal 
        isOpen={isWithdrawModalOpen} 
        onClose={() => setIsWithdrawModalOpen(false)} 
        title="Initiate Fund Withdrawal"
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Available Balance</label>
            <p className="text-2xl font-black text-slate-900">{balanceStr}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Withdrawal Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
              <input 
                type="number"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="e.g. 10000"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Destination Bank Account Details</label>
            <textarea
              value={bankDetails}
              onChange={e => setBankDetails(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none font-medium text-slate-700 bg-slate-50"
              required
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">
              Funds will be deposited into your bank account within 24-48 business hours after platform administrator approval.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsWithdrawModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              Confirm Withdrawal
            </button>
          </div>
        </form>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}