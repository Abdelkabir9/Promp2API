import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Sparkles, ChevronLeft, Trash2, Plus, Info, Globe, Code2, Loader2, AlertCircle, Download, MonitorPlay, Cpu, Link as LinkIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Parameter } from '../types';
import { apiRequest } from '../services/api';

const FunctionBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(!!id);
  const [error, setError] = useState('');
  
  // External APIs State
  const [availableExternalApis, setAvailableExternalApis] = useState<any[]>([]);
  const [loadingExternalApis, setLoadingExternalApis] = useState(false);

  const [funcData, setFuncData] = useState({
    name: '',
    description: '',
    language: 'python',
    code: `def main(**params):\n    """\n    Entry point for CodeGenie executor.\n    params: keyword arguments mapped to your Input Schema\n    """\n    import math\n    import json\n\n    principal = params.get('principal', 0)\n    rate = params.get('rate', 0)\n    \n    # Business logic here\n    interest = principal * (rate / 100)\n    \n    return {\n        "status": "success",\n        "interest_earned": interest,\n        "total": principal + interest\n    }`,
    parameters: [
      { name: 'principal', type: 'number' as const, description: 'Initial amount', required: true },
      { name: 'rate', type: 'number' as const, description: 'Interest rate percentage', required: true }
    ] as Parameter[],
    external_apis: [] as string[]
  });

  useEffect(() => {
    // Fetch available External APIs for linking
    const fetchExternalApis = async () => {
        setLoadingExternalApis(true);
        try {
            const data = await apiRequest('/api/external-apis/');
            const list = Array.isArray(data) ? data : (data.results || []);
            setAvailableExternalApis(list.filter((api: any) => api.is_active));
        } catch (e) {
            console.error("Failed to load external APIs", e);
        } finally {
            setLoadingExternalApis(false);
        }
    };
    fetchExternalApis();
  }, []);

  useEffect(() => {
    if (id) {
      const loadFunction = async () => {
        try {
          const data = await apiRequest(`/api/functions/${id}/`);
          
          // Transform JSON Schema back to list for UI
          const schema = data.parameters_schema || {};
          const properties = schema.properties || {};
          const requiredList = schema.required || [];
          
          const parameterList: Parameter[] = Object.keys(properties).map(key => ({
            name: key,
            type: properties[key].type || 'string',
            description: properties[key].description || '',
            required: requiredList.includes(key)
          }));

          setFuncData({
            name: data.name || '',
            description: data.description || '',
            language: data.language || 'python',
            code: data.code || '',
            parameters: parameterList.length > 0 ? parameterList : [],
            external_apis: data.external_apis || []
          });
        } catch (err: any) {
          setError(err.message || "Failed to load function");
        } finally {
          setFetchLoading(false);
        }
      };
      loadFunction();
    }
  }, [id]);

  const handleSave = async () => {
    if (!funcData.name) {
      setError("Function name (slug) is required.");
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      // Transform list to JSON Schema for Backend FunctionExecutor
      const properties: any = {};
      const required: string[] = [];
      
      funcData.parameters.forEach(p => {
        if (p.name) {
          properties[p.name] = { 
            type: p.type, 
            description: p.description 
          };
          if (p.required) required.push(p.name);
        }
      });

      const payload = {
        name: funcData.name,
        description: funcData.description,
        language: funcData.language,
        code: funcData.code,
        parameters_schema: {
          type: "object",
          properties,
          required
        },
        external_apis: funcData.external_apis,
        is_active: true
      };

      if (id) {
        await apiRequest(`/api/functions/${id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/api/functions/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      navigate('/functions');
    } catch (err: any) {
      setError(err.message || "Failed to save function");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!id) return;
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
        a.download = `${funcData.name}_django_project.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (e: any) {
        setError("Download failed: " + e.message);
    } finally {
        setIsDownloading(false);
    }
  };

  const generateWithAi = async () => {
    if (!funcData.description) {
      setError("Please provide a description in 'AI Context / Prompt' first!");
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Filter selected APIs and format their configuration for the prompt
      const selectedApis = availableExternalApis.filter(api => funcData.external_apis.includes(api.id));
      const apiContext = selectedApis.map(api => {
          return `
          --- EXTERNAL API: ${api.name} ---
          Base URL: ${api.base_url}
          Description: ${api.description}
          Auth Type: ${api.auth_type}
          Default Headers: ${JSON.stringify(api.default_headers || {})}
          Default Params: ${JSON.stringify(api.default_params || {})}
          (Assume credentials are in os.environ as: ${api.name.toUpperCase().replace(/ /g, '_')}_API_KEY or similar)
          `;
      }).join('\n');

      const prompt = `
        You are a senior Python backend developer.
        
        TASK: 
        ${funcData.description}
        
        INPUT PARAMETERS: 
        ${JSON.stringify(funcData.parameters)}
        
        AVAILABLE EXTERNAL SERVICES CONFIGURATION:
        ${apiContext}
        
        REQUIREMENTS:
        1. Generate a robust Python 3.10 function named 'main'.
        2. The function signature MUST be: def main(**params):
        3. STRICT REQUIREMENT: ALL imports (e.g., 'import requests', 'import json', 'import os') MUST be placed INSIDE the 'main' function body. Do not put them at the top level.
        4. Use params.get('key', default) to safely access input arguments.
        5. If using External APIs:
           - Use the 'requests' library (import it inside main).
           - Construct the full URL using the provided Base URL from configuration.
           - Handle authentication by retrieving keys from os.environ (e.g., os.environ.get('STRIPE_SECRET_KEY')).
           - Handle 4xx/5xx errors gracefully.
        6. Return a JSON-serializable dictionary.
        7. Output ONLY the raw Python code. No markdown formatting, no explanation.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (response.text) {
        const cleanedCode = response.text.replace(/```python|```/g, '').trim();
        setFuncData(prev => ({ ...prev, code: cleanedCode }));
      }
    } catch (e: any) {
      setError("AI Generation failed: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const addParam = () => {
    setFuncData({
      ...funcData,
      parameters: [...funcData.parameters, { name: 'new_param', type: 'string', description: '', required: false }]
    });
  };

  const updateParam = (idx: number, field: keyof Parameter, value: any) => {
    const updated = [...funcData.parameters];
    updated[idx] = { ...updated[idx], [field]: value };
    setFuncData({ ...funcData, parameters: updated });
  };

  const removeParam = (idx: number) => {
    setFuncData({
      ...funcData,
      parameters: funcData.parameters.filter((_, i) => i !== idx)
    });
  };

  const toggleExternalApi = (apiId: string) => {
      const current = new Set(funcData.external_apis);
      if (current.has(apiId)) {
          current.delete(apiId);
      } else {
          current.add(apiId);
      }
      setFuncData({ ...funcData, external_apis: Array.from(current) });
  };

  if (fetchLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Retrieving Function Source...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/functions')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{id ? `Editing ${funcData.name}` : 'Build New Function'}</h2>
            <p className="text-slate-500 text-sm">Serverless Python logic targeting 'def main(**params)' signature.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {error && (
            <div className="flex items-center space-x-2 text-rose-500 text-xs font-bold">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          
          {id && (
             <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-50 font-bold transition-all disabled:opacity-50"
             >
                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span>Source</span>
             </button>
          )}

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{id ? 'Update API' : 'Deploy API'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-b-4 border-b-slate-900">
            <div className="px-4 py-3 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 size={16} className="text-blue-400" />
                <span className="text-slate-400 text-xs font-mono">main.py</span>
                <span className="text-slate-600 text-[10px] ml-2 font-mono uppercase tracking-tighter">Python 3.10 Sandbox</span>
              </div>
              <button 
                onClick={generateWithAi}
                disabled={isGenerating}
                className="flex items-center space-x-1.5 bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-md shadow-blue-900/50"
              >
                <Sparkles size={12} />
                <span>{isGenerating ? 'AI Thinking...' : 'AI Rewrite'}</span>
              </button>
            </div>
            <textarea 
              className="w-full h-[600px] p-8 bg-[#0f172a] text-blue-100 font-mono text-sm resize-none focus:outline-none leading-relaxed border-none"
              spellCheck={false}
              value={funcData.code}
              onChange={(e) => setFuncData({...funcData, code: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center uppercase tracking-widest">
              <Info size={16} className="mr-2 text-blue-500" />
              API Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Function Slug</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="calculate_roi"
                  value={funcData.name}
                  onChange={(e) => setFuncData({...funcData, name: e.target.value})}
                  disabled={!!id}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Context / AI Prompt</label>
                <textarea 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Describe the logic. E.g., 'Fetch user data from Stripe and calculate total spend'."
                  value={funcData.description}
                  onChange={(e) => setFuncData({...funcData, description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <Cpu size={16} className="mr-2 text-indigo-600" />
                  External APIs
              </h3>
              <button 
                  onClick={() => navigate('/external-apis')}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
              >
                  Manage
              </button>
            </div>
            {loadingExternalApis ? (
                <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-slate-400" size={16}/></div>
            ) : availableExternalApis.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-lg">No external APIs configured.</div>
            ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableExternalApis.map(api => (
                        <div 
                            key={api.id}
                            onClick={() => toggleExternalApi(api.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                funcData.external_apis.includes(api.id) 
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center space-x-2 overflow-hidden">
                                <Cpu size={14} className={funcData.external_apis.includes(api.id) ? 'text-indigo-600' : 'text-slate-400'} />
                                <span className={`text-xs font-bold truncate ${funcData.external_apis.includes(api.id) ? 'text-indigo-800' : 'text-slate-600'}`}>
                                    {api.name}
                                </span>
                            </div>
                             {funcData.external_apis.includes(api.id) && <LinkIcon size={12} className="text-indigo-500" />}
                        </div>
                    ))}
                </div>
            )}
            <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                Select APIs to give the AI generator access to their configuration and base URLs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Input Schema</h3>
              <button onClick={addParam} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {funcData.parameters.map((p, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group relative">
                  <div className="flex items-center justify-between mb-2">
                    <input 
                      className="bg-transparent text-xs font-bold text-slate-700 w-full focus:outline-none" 
                      value={p.name}
                      placeholder="param_name"
                      onChange={(e) => updateParam(idx, 'name', e.target.value)}
                    />
                    <button onClick={() => removeParam(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1"
                      value={p.type}
                      onChange={(e) => updateParam(idx, 'type', e.target.value)}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="array">array</option>
                      <option value="object">object</option>
                    </select>
                    <label className="flex items-center text-[10px] text-slate-500">
                      <input 
                        type="checkbox" 
                        className="mr-1" 
                        checked={p.required}
                        onChange={(e) => updateParam(idx, 'required', e.target.checked)}
                      />
                      Req
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
             <h3 className="text-xs font-bold text-blue-400 mb-4 flex items-center tracking-widest uppercase">
              <Globe size={14} className="mr-2" />
              Environment Specs
             </h3>
             <div className="space-y-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold">TIMEOUT</span>
                  <span className="text-xs text-slate-300 font-mono">30.0s (Fixed)</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold">MEMORY CAP</span>
                  <span className="text-xs text-slate-300 font-mono">256MB / Request</span>
                </div>
                 {id && (
                    <div className="flex flex-col space-y-1 pt-2 border-t border-slate-800 mt-2">
                        <span className="text-[10px] text-slate-500 font-bold">LOCAL EXECUTION</span>
                        <div className="text-xs text-emerald-400 font-mono flex items-center">
                            <MonitorPlay size={10} className="mr-1"/>
                            Supported via Download
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FunctionBuilder;