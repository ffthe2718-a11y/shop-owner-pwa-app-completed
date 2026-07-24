import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Calendar, IndianRupee, Users, TrendingUp } from 'lucide-react';

const revenueData = [
  { name: 'Mon', rev: 4000, bookings: 12 },
  { name: 'Tue', rev: 3000, bookings: 9 },
  { name: 'Wed', rev: 5000, bookings: 15 },
  { name: 'Thu', rev: 2780, bookings: 8 },
  { name: 'Fri', rev: 8900, bookings: 25 },
  { name: 'Sat', rev: 12450, bookings: 35 },
  { name: 'Sun', rev: 15000, bookings: 40 },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">Business performance overview</p>
        </div>
        <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>This Month</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", val: "144", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Revenue", val: "₹51,130", icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "New Customers", val: "38", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Conversion", val: "12%", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${k.bg} ${k.color}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 font-medium">{k.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{k.val}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip />
                <Line type="monotone" dataKey="rev" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Bookings by Day</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}