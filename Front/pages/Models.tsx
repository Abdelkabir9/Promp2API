
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Table, Play, Rocket, PauseCircle, Code2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../services/api';

const Models: React.FC = () => {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Saved Queries (Functions with type=database_query)
      const funcResponse = await apiRequest('/api/functions/');
      const funcList = Array.isArray(funcResponse) ? funcResponse : (funcResponse.results || []);
      const dbQueries = funcList.filter((f: any) => f.function_type === 'database_query');
      setQueries(dbQueries);

    } catch (e: any) {
      console.error("Failed to fetch data", e);
      setError("Could not load data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (query: any) => {
    setActionLoading(query.id);
    try {
        await apiRequest(`/api/functions/${query.id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active: !query.is_active })
        });
        fetchData(); // Refresh
    } catch (e) {
        console.error("Failed to update status", e);
        alert("Failed to change status");
    } finally {
        setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="animate-spin text-indigo-600" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Database Resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Database Query APIs</h2>
          <p className="text-slate-500">Manage your generated SQL query endpoints.</p>
        </div>
        
         <button 
          onClick={() => navigate('/models/new')}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>New Query API</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center space-x-2 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* QUERIES TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Query API Name</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Execution Stats</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {queries.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                                <Table size={40} className="mx-auto mb-4 opacity-20" />
                                No generated query APIs found. Use the Query Builder to create one.
                            </td>
                        </tr>
                    ) : (
                        queries.map((q) => (
                            <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-emerald-50 p-2 rounded">
                                            <Code2 size={18} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-700 block">{q.name}</span>
                                            <span className="text-[10px] text-slate-400 truncate max-w-[200px] block">{q.description}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        q.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        q.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                        }`} />
                                        {q.is_active ? 'Active' : 'Draft'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-slate-600 text-sm">
                                        <Play size={14} className="mr-1 text-slate-400" />
                                        {q.execution_count || 0} runs
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-3">
                                        <button 
                                            onClick={() => handleToggleStatus(q)}
                                            disabled={actionLoading === q.id}
                                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                q.is_active 
                                                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200'
                                            }`}
                                            >
                                            {actionLoading === q.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : q.is_active ? (
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
                                            onClick={() => navigate(`/functions/${q.id}`)}
                                            className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Logic"
                                        >
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Models;
