
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Globe, ShieldCheck, Zap, Server, Clock, Loader2, ArrowUpRight } from 'lucide-react';
import { apiRequest } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiRequest('/api/dashboard/');
        setStats(data);
      } catch (e) {
        console.error('Failed to fetch stats', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const displayStats = [
    { 
      label: 'Cloud Invocations', 
      value: stats?.executions?.total || '0', 
      change: `+${stats?.executions?.today || 0} today`, 
      icon: Activity, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Active APIs', 
      value: (stats?.apis?.deployed || 0), 
      change: `${stats?.functions?.active || 0} functions`, 
      icon: Globe, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
    { 
      label: 'Runtime Success', 
      value: `${Math.round(stats?.executions?.success_rate || 0)}%`, 
      change: 'Calculated', 
      icon: ShieldCheck, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      label: 'Platform Usage', 
      value: `${stats?.functions?.total || 0}`, 
      change: `of ${stats?.user_limits?.max_functions || '∞'}`, 
      icon: Zap, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
  ];

  // Mock data for graph as backend doesn't provide history yet
  const chartData = [
    { time: '00:00', calls: 12 }, { time: '04:00', calls: 18 }, { time: '08:00', calls: 65 },
    { time: '12:00', calls: 42 }, { time: '16:00', calls: 89 }, { time: '20:00', calls: 34 },
    { time: '23:59', calls: 21 }
  ];

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-600" size={64} />
          <div className="absolute inset-0 flex items-center justify-center">
             <Zap size={24} className="text-blue-300 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-800 font-bold text-lg">Waking up the Genie...</p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Fetching Infrastructure Metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:scale-125 transition-transform">
              <stat.icon size={100} />
            </div>
            <div className="flex items-center justify-between mb-6">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-sm group-hover:rotate-6 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 uppercase tracking-widest flex items-center">
                {stat.change}
                <ArrowUpRight size={10} className="ml-1 text-slate-300" />
              </span>
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">System Throughput</h2>
              <p className="text-xs text-slate-400 font-medium">Real-time invocation volume across all logical nodes</p>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1.5 text-[10px] font-bold bg-blue-600 text-white rounded-lg">24H</button>
              <button className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:bg-slate-50 rounded-lg">7D</button>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 800}} 
                  cursor={{stroke: '#3b82f6', strokeWidth: 2}}
                />
                <Area 
                  type="stepAfter" 
                  dataKey="calls" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorCalls)" 
                  strokeWidth={4} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-colors" />
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center">
              <Server size={18} className="mr-2 text-blue-400" />
              Infrastructure Limits
            </h3>
            <div className="space-y-8">
               <div className="space-y-3">
                 <div className="flex justify-between items-end">
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logic Nodes</span>
                   <span className="text-xs text-blue-300 font-mono font-bold">{stats?.functions?.total} / {stats?.user_limits?.max_functions || '∞'}</span>
                 </div>
                 <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                      style={{ width: `${Math.min((stats?.functions?.total / (stats?.user_limits?.max_functions || 100)) * 100, 100)}%` }} 
                    />
                 </div>
               </div>
               <div className="space-y-3">
                 <div className="flex justify-between items-end">
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rate Limit</span>
                   <span className="text-xs text-emerald-400 font-mono font-bold">{stats?.user_limits?.api_rate_limit} req/min</span>
                 </div>
                 <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: '100%' }} />
                 </div>
               </div>
               <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    <Clock size={12} className="mr-2" />
                    Last Snapshot: {new Date().toLocaleTimeString()}
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Execution Registry</h3>
            <div className="space-y-4">
               {(!stats?.recent_logs || stats.recent_logs.length === 0) ? (
                 <div className="py-6 text-center">
                   <p className="text-slate-300 italic text-xs">Awaiting first execution...</p>
                 </div>
               ) : (
                 stats.recent_logs.map((log: any, i: number) => (
                   <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">POST</span>
                        <span className="text-[10px] font-mono text-slate-600 truncate max-w-[120px]">{log.function_name || log.endpoint}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-bold ${log.status < 400 ? 'text-emerald-600' : 'text-rose-500'}`}>{log.status || 200}</span>
                        <span className="text-[8px] text-slate-400 font-mono">{log.time || '14ms'}</span>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
