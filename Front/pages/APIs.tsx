
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Copy, ExternalLink, Shield, Zap, Loader2, Code2, Database, Download } from 'lucide-react';
import { apiRequest } from '../services/api';

interface UnifiedApi {
  id: string;
  name: string;
  type: 'FUNCTION' | 'MODEL';
  url: string;
  status: string;
  auth_type: string;
  latency: string;
  description: string;
}

const APIs: React.FC = () => {
  const [apis, setApis] = useState<UnifiedApi[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllResources = async () => {
      setLoading(true);
      try {
        // Fetch functions only. 
        // Previous '/api/models/' endpoint is removed as it returns 404.
        const [functionsRes] = await Promise.allSettled([
          apiRequest('/api/functions/')
        ]);

        const aggregated: UnifiedApi[] = [];
        const baseUrl = localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';

        // Process Functions - Mapping to the public execution endpoint
        if (functionsRes.status === 'fulfilled') {
          const list = Array.isArray(functionsRes.value) ? functionsRes.value : (functionsRes.value?.results || []);
          list.filter((f: any) => f.is_active).forEach((f: any) => {
            aggregated.push({
              id: f.id,
              name: f.name,
              type: f.function_type === 'database_query' ? 'MODEL' : 'FUNCTION', // Use MODEL icon for DB queries for clarity
              url: `${baseUrl}/api/execute/${f.name}/`,
              status: 'Active',
              auth_type: 'JWT / API Key',
              latency: `${Math.round(f.total_execution_time / (f.execution_count || 1) * 1000)}ms`,
              description: f.description
            });
          });
        }

        setApis(aggregated.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error('Failed to aggregate APIs', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllResources();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownload = async (id: string, name: string) => {
    try {
        const token = localStorage.getItem('access_token');
        const baseUrl = localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';
        
        // Use native fetch to handle blob response from backend generator
        const response = await fetch(`${baseUrl}/api/functions/${id}/generate-django-project/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error("Download failed");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}_django_project.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (e: any) {
        alert("Download failed: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">API Explorer</h2>
          <p className="text-slate-500">Live endpoints generated from your logic and schemas.</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm">
             <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Querying API Registry...</p>
          </div>
        ) : (
          apis.map((api) => (
            <div key={`${api.type}-${api.id}`} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-blue-300 hover:shadow-lg transition-all group">
              <div className="flex items-center space-x-5">
                <div className={`p-4 rounded-2xl shadow-sm ${api.type === 'FUNCTION' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {api.type === 'FUNCTION' ? <Code2 size={28} /> : <Database size={28} />}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-800">{api.name}</h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                      api.type === 'FUNCTION' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                      {api.type === 'MODEL' ? 'QUERY' : 'FUNCTION'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Shield size={12} className="mr-1.5 text-slate-400" />
                      {api.auth_type}
                    </div>
                    <div className="flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">
                      <Zap size={12} className="mr-1" />
                      {api.latency}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-xl">
                 <div className="bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 flex items-center justify-between group/url shadow-inner">
                   <code className="text-[11px] font-mono text-blue-300 truncate mr-4">{api.url}</code>
                   <button 
                     onClick={() => copyToClipboard(api.url)}
                     className="p-1.5 hover:bg-slate-800 rounded-lg transition-all text-slate-500 hover:text-white"
                     title="Copy endpoint URL"
                   >
                     <Copy size={14} />
                   </button>
                 </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                    onClick={() => handleDownload(api.id, api.name)}
                    className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    title="Download Source Code"
                >
                    <Download size={20} />
                </button>

                <button 
                  onClick={() => navigate(`/apis/${api.id}?type=${api.type}`)}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  Docs
                </button>
                <a 
                  href={api.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100 transition-transform active:scale-95"
                >
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
          ))
        )}
        {!loading && apis.length === 0 && (
          <div className="p-32 text-center bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] shadow-inner">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No active APIs found</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              Functions must be marked as "Active" to appear in this explorer.
            </p>
            <div className="mt-8 flex justify-center space-x-4">
              <button onClick={() => navigate('/functions/new')} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Create Function</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIs;
