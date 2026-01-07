
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Code2, ArrowRight, Activity, Loader2, Rocket, PauseCircle } from 'lucide-react';
import { EntityType, ApiStatus } from '../types';
import { apiRequest } from '../services/api';

const Functions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchFunctions = async () => {
    try {
      const data = await apiRequest('/api/functions/');
      const functionsList = Array.isArray(data) ? data : (data?.results || []);
      setFunctions(functionsList);
    } catch (e) {
      console.error('Failed to fetch functions', e);
      setFunctions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunctions();
  }, []);

  const handleToggleStatus = async (func: any) => {
    setActionLoading(func.id);
    try {
        await apiRequest(`/api/functions/${func.id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active: !func.is_active })
        });
        // Optimistic update or refetch
        await fetchFunctions();
    } catch (e) {
        console.error("Failed to update status", e);
        alert("Failed to change deployment status");
    } finally {
        setActionLoading(null);
    }
  };

  // Ensure functions is treated as an array before filtering
  // FILTER: Exclude functions that are database queries (these go to Models page)
  const filteredFunctions = Array.isArray(functions) 
    ? functions.filter(f => 
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        f.function_type !== 'database_query'
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Functions</h2>
          <p className="text-slate-500">Manage your serverless calculation logic and processing scripts.</p>
        </div>
        <button 
          onClick={() => navigate('/functions/new')}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>New Function</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search functions..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center space-x-2 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
            <Filter size={18} />
            <span className="text-sm font-medium">Filter</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
               <Loader2 className="animate-spin text-blue-600" size={40} />
               <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Accessing Generator Node...</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Function Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Total Calls</th>
                  <th className="px-6 py-4">Version</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFunctions.map((func) => (
                  <tr key={func.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-50 p-2 rounded">
                          <Code2 size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <span className="font-semibold text-slate-700 block">{func.name}</span>
                            <span className="text-[10px] text-slate-400">{func.language || 'python'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        func.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          func.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                        {func.is_active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-slate-600 text-sm">
                        <Activity size={14} className="mr-1 text-slate-400" />
                        {func.execution_count || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">v1.0</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                         {/* Deploy / Pause Button */}
                         <button 
                           onClick={() => handleToggleStatus(func)}
                           disabled={actionLoading === func.id}
                           className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                               func.is_active 
                                 ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                                 : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                           }`}
                         >
                           {actionLoading === func.id ? (
                               <Loader2 size={14} className="animate-spin" />
                           ) : func.is_active ? (
                               <>
                                 <PauseCircle size={14} />
                                 <span>Pause</span>
                               </>
                           ) : (
                               <>
                                 <Rocket size={14} />
                                 <span>Deploy</span>
                               </>
                           )}
                         </button>

                         <button 
                           onClick={() => navigate(`/functions/${func.id}`)}
                           className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm hover:bg-blue-50 p-2 rounded-lg transition-colors"
                         >
                           Edit <ArrowRight size={16} className="ml-1" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFunctions.length === 0 && !loading && (
                   <tr>
                     <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                       {searchTerm ? 'No matches found for your search.' : 'No functions found. Create your first one to get started.'}
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Functions;
