import React from 'react';
import { BarChart2, TrendingUp, Users, Globe } from 'lucide-react';

export default function AnalyticsPage() {
   return (
      <div className="h-full flex flex-col p-8 md:p-12 animate-in fade-in zoom-in-95 duration-500">
         <header className="mb-10">
            <h1 className="text-4xl font-black mb-2 tracking-tight">Analytics</h1>
            <p className="text-slate-500 text-lg">Real-time usage statistics.</p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<TrendingUp />} label="Total Secrets" value="1,204" color="bg-blue-50 text-blue-600" />
            <StatCard icon={<Users />} label="Active Links" value="42" color="bg-purple-50 text-purple-600" />
            <StatCard icon={<Globe />} label="Data Processed" value="2.4 GB" color="bg-emerald-50 text-emerald-600" />
         </div>

         <div className="flex-1 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center text-slate-400">
            <div className="text-center">
               <BarChart2 size={48} className="mx-auto mb-4 opacity-50" />
               <p className="font-medium">Chart Visualization Placeholder</p>
               <p className="text-xs mt-1">(Requires Chart.js integration)</p>
            </div>
         </div>
      </div>
   );
}

function StatCard({ icon, label, value, color }) {
   return (
      <div className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-sm">
         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>{icon}</div>
         <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">{label}</p>
         <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
   );
}
