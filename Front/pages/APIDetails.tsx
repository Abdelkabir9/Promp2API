
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Copy, 
  Terminal, 
  Settings, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  AlertCircle, 
  Code2, 
  Database, 
  ChevronLeft, 
  Key, 
  Plus, 
  Trash2, 
  Check, 
  X,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Download,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { ApiToken } from '../types';

const APIDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const apiType = searchParams.get('type') || 'FUNCTION';
  
  const [activeTab, setActiveTab] = useState<'docs' | 'test' | 'metrics' | 'security'>('docs');
  const [snippetLang, setSnippetLang] = useState<'curl' | 'python' | 'js'>('curl');
  
  const [resourceData, setResourceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Test Runner State
  const [testPayload, setTestPayload] = useState('{\n  "param1": "value"\n}');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<number | null>(null);

  // Token Management State
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [isLinkMode, setIsLinkMode] = useState(false);
  
  // Delete Confirmation State
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Both FUNCTION and MODEL types are stored as functions in the backend
        const endpoint = `/api/functions/${id}/`;
        const data = await apiRequest(endpoint);
        setResourceData(data);
        
        // Populate sample payload if empty
        if (data.parameters_schema?.properties) {
          const sample: any = {};
          Object.keys(data.parameters_schema.properties).forEach(key => {
             const prop = data.parameters_schema.properties[key];
             sample[key] = prop.type === 'number' || prop.type === 'integer' ? 0 : 
                           prop.type === 'boolean' ? false : "sample";
          });
          setTestPayload(JSON.stringify(sample, null, 2));
        } else {
           setTestPayload(JSON.stringify({}, null, 2));
        }
      } catch (e: any) {
        setError(e.message || 'Resource not found.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  // Fetch tokens when Security tab is active
  useEffect(() => {
    if (activeTab === 'security' && id) {
      const fetchTokens = async () => {
        setIsTokenLoading(true);
        try {
            // Tokens are managed under functions endpoint
            const endpoint = `/api/functions/${id}/tokens/`;
            try {
               const data = await apiRequest(endpoint);
               if (Array.isArray(data)) setTokens(data);
            } catch (e) {
               console.warn("Backend token endpoint missing or failed", e);
               setTokens([]);
            }
        } finally {
          setIsTokenLoading(false);
        }
      };
      fetchTokens();
    }
  }, [activeTab, id]);

  const handleCreateToken = async () => {
    if (!newTokenName) return;
    setIsTokenLoading(true);
    setGeneratedToken(null);
    try {
        const endpoint = `/api/functions/${id}/tokens/`;
        
        const payload = {
            name: newTokenName,
            expires_in_days: 30,
            permissions: { read: true, write: true, execute: true }
        };

        const res = await apiRequest(endpoint, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        
        if (res.token) {
            setGeneratedToken(res.token);
            setIsLinkMode(false);
            
            const newTokenEntry: ApiToken = {
                id: res.id || `temp_${Date.now()}`,
                name: res.name || newTokenName,
                prefix: res.token.substring(0, 8) + '...',
                created_at: new Date().toISOString(),
                is_active: true,
                last_used: 'Never'
            };
            setTokens(prev => [newTokenEntry, ...prev]);
            setNewTokenName('');
            setShowToken(true);
        } else if (res.generation_link) {
            setGeneratedToken(res.generation_link);
            setIsLinkMode(true);
        } else {
            throw new Error("Invalid response from server: Token not found.");
        }
    } catch (e: any) {
        console.error("Failed to create token", e);
        alert(`Failed to generate token: ${e.message}`);
    } finally {
        setIsTokenLoading(false);
    }
  };

  const confirmDeleteToken = async () => {
    if (!tokenToDelete) return;
    
    const tokenId = tokenToDelete;
    console.log(`Executing deletion for token ID: ${tokenId}`);
    
    // Backup current tokens in case of failure
    const previousTokens = [...tokens];
    
    // Optimistic update
    setTokens(prev => prev.filter(t => t.id !== tokenId));
    setTokenToDelete(null); // Close modal immediately
    
    try {
        const url = `/api/functions/${id}/tokens/?token_id=${tokenId}`;
        console.log(`Sending DELETE request to: ${url}`);
        
        await apiRequest(url, { method: 'DELETE' });
        console.log('Token deleted successfully');
    } catch (e: any) {
        console.error("Failed to delete token on backend", e);
        // Rollback state on error
        setTokens(previousTokens);
        alert(`Failed to delete token: ${e.message}`);
    }
  };

  const handleDownload = async () => {
    if (!resourceData) return;
    setIsDownloading(true);
    try {
        const token = localStorage.getItem('access_token');
        const baseUrl = localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';
        
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
        a.download = `${resourceData.name}_django_project.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (e: any) {
        alert("Download failed: " + e.message);
    } finally {
        setIsDownloading(false);
    }
  };

  const executeTest = async () => {
    setTestLoading(true);
    setTestResponse(null);
    setTestStatus(null);
    try {
      const baseUrl = localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';
      // Unified execution endpoint for both Functions and Database Queries (Models)
      const url = `${baseUrl}/api/execute/${resourceData.name}/`;
      
      const payload = JSON.parse(testPayload);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      });
      
      setTestStatus(res.status);
      const data = await res.json();
      setTestResponse(data);
    } catch (e: any) {
      setTestResponse({ error: e.message || "Invalid JSON or Network Error" });
    } finally {
      setTestLoading(false);
    }
  };

  const getEndpointUrl = () => {
    const baseUrl = localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';
    if (!resourceData) return '';
    return `${baseUrl}/api/execute/${resourceData.name}/`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 size={40} className="animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Loading API Configuration...</p>
      </div>
    );
  }

  if (error || !resourceData) {
    return (
      <div className="p-10 text-center">
        <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Resource not found</h3>
        <p className="text-slate-500 mt-2">{error}</p>
        <button 
            onClick={() => navigate('/apis')}
            className="mt-6 px-6 py-2 bg-slate-100 font-bold text-slate-600 rounded-lg hover:bg-slate-200"
        >
            Back to Explorer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Confirmation Modal */}
      {tokenToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Revoke Access Token?</h3>
            </div>
            <p className="text-slate-500 text-sm">
              Any applications using this token will immediately lose access. This action cannot be undone.
            </p>
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setTokenToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteToken}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
              >
                Yes, Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/apis')} className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors">
          <ChevronLeft size={20} />
          <span className="font-bold text-sm">Back to Explorer</span>
        </button>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>Download Source</span>
          </button>
          <a href={`${getEndpointUrl()}`} target="_blank" rel="noreferrer" className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all">
             <span>Open Public URL</span>
             <Zap size={16} />
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
          <div className="flex items-start justify-between">
             <div className="flex items-center space-x-5">
               <div className={`p-4 rounded-2xl shadow-sm ${apiType === 'MODEL' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                 {apiType === 'MODEL' ? <Database size={32} /> : <Code2 size={32} />}
               </div>
               <div>
                 <h1 className="text-2xl font-black text-slate-800">{resourceData.name}</h1>
                 <p className="text-slate-500 mt-1 max-w-xl">{resourceData.description}</p>
                 <div className="flex items-center space-x-4 mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
                        {resourceData.language || 'python'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                        v{resourceData.version || '1.0'}
                    </span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        Updated {new Date().toLocaleDateString()}
                    </span>
                 </div>
               </div>
             </div>
          </div>
        </div>

        <div className="border-b border-slate-200">
           <div className="flex">
              {['docs', 'test', 'metrics', 'security'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-8 py-4 font-bold text-sm transition-colors border-b-2 ${
                    activeTab === tab 
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'docs' && 'Documentation'}
                  {tab === 'test' && 'Test Runner'}
                  {tab === 'security' && 'Access Tokens'}
                </button>
              ))}
           </div>
        </div>

        <div className="p-8">
           {activeTab === 'docs' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                   <h3 className="text-lg font-bold text-slate-800">Integration</h3>
                   <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                         <div className="flex space-x-4">
                            {['curl', 'js', 'python'].map(lang => (
                               <button 
                                 key={lang} 
                                 onClick={() => setSnippetLang(lang as any)}
                                 className={`text-[10px] font-bold uppercase tracking-widest ${snippetLang === lang ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                               >
                                 {lang}
                               </button>
                            ))}
                         </div>
                         <button onClick={() => copyToClipboard(getEndpointUrl())} className="text-slate-400 hover:text-white">
                            <Copy size={14} />
                         </button>
                      </div>
                      <div className="p-4 overflow-x-auto">
                        <pre className="text-xs font-mono text-blue-100 leading-relaxed">
{snippetLang === 'curl' && `curl -X POST ${getEndpointUrl()} \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '${testPayload.replace(/\n/g, '').replace(/\s+/g, ' ')}'`}
{snippetLang === 'js' && `fetch("${getEndpointUrl()}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${testPayload.replace(/\n/g, '').replace(/\s+/g, ' ')})
})
.then(res => res.json())
.then(console.log);`}
{snippetLang === 'python' && `import requests

response = requests.post(
  "${getEndpointUrl()}",
  headers={"Authorization": "Bearer <token>"},
  json=${testPayload.replace(/\n/g, '').replace(/\s+/g, ' ')}
)
print(response.json())`}
                        </pre>
                      </div>
                   </div>

                   <div className="space-y-4 pt-6">
                      <h3 className="text-lg font-bold text-slate-800">Schema Definitions</h3>
                      {resourceData.parameters_schema?.properties && (
                         <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                               <thead className="bg-slate-50 border-b border-slate-200">
                                  <tr>
                                     <th className="px-4 py-3 font-bold text-slate-600">Field</th>
                                     <th className="px-4 py-3 font-bold text-slate-600">Type</th>
                                     <th className="px-4 py-3 font-bold text-slate-600">Required</th>
                                     <th className="px-4 py-3 font-bold text-slate-600">Description</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                  {Object.entries(resourceData.parameters_schema.properties).map(([key, val]: any) => (
                                     <tr key={key}>
                                        <td className="px-4 py-3 font-mono text-indigo-600 font-medium">{key}</td>
                                        <td className="px-4 py-3 text-slate-500">{val.type}</td>
                                        <td className="px-4 py-3">
                                            {resourceData.parameters_schema.required?.includes(key) ? (
                                                <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded">YES</span>
                                            ) : (
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">NO</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{val.description || '-'}</td>
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>
                      )}
                   </div>
                </div>
                
                <div className="space-y-6">
                   <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
                      <div className="flex items-start space-x-3">
                         <ShieldCheck className="text-amber-600 shrink-0" size={24} />
                         <div>
                            <h4 className="font-bold text-amber-900">Authentication Required</h4>
                            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                               Calls to this endpoint must be authenticated. You can use your personal JWT token (for testing) or generate a dedicated long-lived <strong>API Token</strong> in the "Access Tokens" tab.
                            </p>
                         </div>
                      </div>
                   </div>

                   <h3 className="text-lg font-bold text-slate-800">Output Format</h3>
                   <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 font-mono text-xs text-slate-600">
                      <p className="mb-2 text-slate-400 uppercase tracking-widest font-bold text-[10px]">Response (200 OK)</p>
                      <pre>{JSON.stringify({ status: "success", result: "..." }, null, 2)}</pre>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'test' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h3 className="font-bold text-slate-800">Request Body</h3>
                    <textarea 
                       className="w-full h-96 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none"
                       value={testPayload}
                       onChange={(e) => setTestPayload(e.target.value)}
                    />
                    <button 
                       onClick={executeTest}
                       disabled={testLoading}
                       className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center space-x-2"
                    >
                       {testLoading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                       <span>Execute Request</span>
                    </button>
                 </div>
                 <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center justify-between">
                        <span>Response</span>
                        {testStatus && (
                            <span className={`text-xs px-2 py-1 rounded font-bold ${testStatus >= 200 && testStatus < 300 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                Status: {testStatus}
                            </span>
                        )}
                    </h3>
                    <div className="w-full h-96 font-mono text-sm bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl p-4 overflow-auto">
                       {testResponse ? (
                           <pre>{JSON.stringify(testResponse, null, 2)}</pre>
                       ) : (
                           <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                               <Terminal size={48} className="mb-4" />
                               <p>Waiting for execution...</p>
                           </div>
                       )}
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'security' && (
              <div className="space-y-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                         <h3 className="text-lg font-bold text-slate-800">API Access Tokens</h3>
                         <p className="text-slate-500 text-sm">Manage permanent tokens for external applications.</p>
                     </div>
                     {!generatedToken && (
                         <div className="flex space-x-2">
                             <input 
                                 type="text" 
                                 placeholder="Token Name (e.g. Mobile App)" 
                                 className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                 value={newTokenName}
                                 onChange={(e) => setNewTokenName(e.target.value)}
                             />
                             <button 
                                 onClick={handleCreateToken}
                                 disabled={!newTokenName || isTokenLoading}
                                 className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                             >
                                 {isTokenLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} className="mr-1" />}
                                 Generate
                             </button>
                         </div>
                     )}
                 </div>

                 {generatedToken && (
                     <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-start space-x-3">
                             <div className="p-2 bg-emerald-100 rounded-lg">
                                 <Key className="text-emerald-600" size={24} />
                             </div>
                             <div className="flex-1">
                                 <h4 className="font-bold text-emerald-800">Token Generated Successfully</h4>
                                 <p className="text-sm text-emerald-700 mt-1 mb-4">
                                     Make sure to copy your new access token now. You won't be able to see it again!
                                 </p>
                                 <div className="flex items-center space-x-2">
                                     <code className="flex-1 block p-3 bg-white border border-emerald-200 rounded-lg font-mono text-sm text-emerald-800 break-all">
                                         {generatedToken}
                                     </code>
                                     <button 
                                         onClick={() => copyToClipboard(generatedToken)}
                                         className="p-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                                     >
                                         <Copy size={18} />
                                     </button>
                                 </div>
                                 <button 
                                     onClick={() => setGeneratedToken(null)}
                                     className="mt-4 text-sm font-bold text-emerald-700 hover:underline"
                                 >
                                     Done, I've copied it
                                 </button>
                             </div>
                         </div>
                     </div>
                 )}

                 <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50/50 border-b border-slate-200">
                          <tr>
                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prefix</th>
                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                             <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {tokens.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                                      No tokens generated yet.
                                  </td>
                              </tr>
                          ) : (
                              tokens.map((token) => (
                                 <tr key={token.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">{token.name}</td>
                                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{token.prefix}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(token.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                          Active
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <button 
                                         type="button"
                                         onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setTokenToDelete(token.id);
                                         }}
                                         className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                         title="Revoke Token"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </td>
                                 </tr>
                              ))
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default APIDetails;
