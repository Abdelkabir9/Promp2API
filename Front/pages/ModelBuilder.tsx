
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Database, 
  ArrowRight, 
  Server, 
  RefreshCw, 
  Sparkles, 
  Code2, 
  Play, 
  Save, 
  Check, 
  Table, 
  Eye,
  Lock,
  User,
  AlertCircle,
  Library,
  Plus,
  Trash2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { apiRequest } from '../services/api';
import { Parameter } from '../types';

type Step = 'connect' | 'schema' | 'query';

const ModelBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [currentStep, setCurrentStep] = useState<Step>('connect');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Connection State
  const [connection, setConnection] = useState({
    name: 'My Database Connection',
    type: 'postgresql',
    host: 'localhost',
    port: '5432',
    username: 'postgres',
    password: '',
    database: 'postgres'
  });

  // Step 2: Schema State
  const [schema, setSchema] = useState<any>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  // Step 3: Query State
  const [queryContext, setQueryContext] = useState({
    prompt: '',
    generatedCode: '',
    functionName: 'get_custom_data'
  });

  // Parameter Builder State (Initialized with Implicit Password)
  const [queryParams, setQueryParams] = useState<Parameter[]>([
    { name: 'db_password', type: 'string', description: 'Database Password (Implicit)', required: true },
    { name: 'limit', type: 'integer', description: 'Maximum number of records to return', required: false }
  ]);

  const handleConnect = async () => {
    setIsLoadingSchema(true);
    setError(null);
    try {
      // REAL API CALL: Connect to backend to introspect database
      const response = await apiRequest('/api/external-apis/introspect/', {
        method: 'POST',
        body: JSON.stringify({
          type: 'database',
          config: {
            engine: connection.type,
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            db_name: connection.database
          }
        })
      });

      if (response && response.schema) {
        setSchema(response.schema);
        setCurrentStep('schema');
      } else {
        throw new Error("Invalid response structure from introspection endpoint.");
      }
    } catch (e: any) {
      console.error("Connection failed", e);
      setError(e.message || "Failed to connect to database. Please check credentials and firewall settings.");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const addParam = () => {
    setQueryParams([
      ...queryParams,
      { name: 'new_param', type: 'string', description: '', required: false }
    ]);
  };

  const updateParam = (idx: number, field: keyof Parameter, value: any) => {
    const updated = [...queryParams];
    updated[idx] = { ...updated[idx], [field]: value };
    setQueryParams(updated);
  };

  const removeParam = (idx: number) => {
    // Prevent removing the implicit password if we want to enforce it, 
    // but allowing flexibility for now.
    setQueryParams(queryParams.filter((_, i) => i !== idx));
  };

  const generateQuery = async () => {
    if (!queryContext.prompt) return;
    setIsGenerating(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // We pass a simplified version of the schema to save tokens
      const schemaString = JSON.stringify(schema, null, 2);
      
      // Construct connection string logic
      // Note: We use the 'db_password' param for the password slot
      const dbUrlTemplate = `${connection.type}://${connection.username}:" + params.get('db_password', '${connection.password}') + "@${connection.host}:${connection.port}/${connection.database}`;
      
      const paramDefinitions = queryParams.map(p => 
        `- ${p.name} (Type: ${p.type}, ${p.required ? 'REQUIRED' : 'OPTIONAL'}): ${p.description || ''}`
      ).join('\n');

      const prompt = `
        You are a Python backend expert specializing in SQLAlchemy.
        
        CONTEXT:
        - Database Type: ${connection.type}
        - Schema Definition: ${schemaString}
        
        USER REQUEST: 
        "${queryContext.prompt}"
        
        PARAMETERS DEFINED:
        ${paramDefinitions}
        
        TASK:
        Generate a robust Python function named 'main' that accepts **params.
        
        REQUIREMENTS:
        1. Use 'sqlalchemy' to connect.
        2. Connection String Construction:
           db_url = "${dbUrlTemplate}"
        3. The function signature MUST be: def main(**params):
        4. Extract parameters from 'params'. 
           - If a parameter is REQUIRED and missing, raise a ValueError.
           - If OPTIONAL, use .get() with a sensible default.
           - Specifically look for 'db_password' in params.
        5. Return a list of dictionaries (records).
        6. Handle exceptions and return {"error": str(e)} if fails.
        7. Output ONLY raw Python code. No markdown.
        8. IMPORTANT: All imports (e.g. 'import sqlalchemy', 'from sqlalchemy import create_engine') MUST be inside the 'main' function definition to ensure they are available during execution.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      if (response.text) {
        const cleanCode = response.text.replace(/```python|```/g, '').trim();
        setQueryContext(prev => ({ ...prev, generatedCode: cleanCode }));
      }
    } catch (e: any) {
      setError("AI Generation failed: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        // Build Schema from UI State
        const properties: any = {};
        const required: string[] = [];
        
        queryParams.forEach(p => {
            if (p.name) {
                properties[p.name] = { type: p.type, description: p.description };
                if (p.required) required.push(p.name);
            }
        });

        const parametersSchema = {
            type: 'object',
            properties,
            required
        };

        // SAVE AS DRAFT: Save as a CustomFunction with is_active=false
        await apiRequest('/api/functions/', {
            method: 'POST',
            body: JSON.stringify({
                name: queryContext.functionName,
                description: `Auto-generated query for ${connection.database}: ${queryContext.prompt}`,
                language: 'python',
                code: queryContext.generatedCode,
                parameters_schema: parametersSchema, 
                is_active: false, // SAVED AS DRAFT (Inactive)
                function_type: 'database_query'
            })
        });
        // Redirect to Models page (specifically Queries tab logic if implemented via query param, default is fine)
        navigate('/models');
    } catch (e: any) {
        setError("Save failed: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/models')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Database Query Builder</h2>
            <p className="text-slate-500 text-sm">Connect, extract schema, and generate API endpoints.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <div className={`h-2 w-2 rounded-full ${currentStep === 'connect' ? 'bg-blue-600' : 'bg-slate-300'}`} />
           <div className={`h-1 w-8 rounded-full ${currentStep !== 'connect' ? 'bg-blue-600' : 'bg-slate-200'}`} />
           <div className={`h-2 w-2 rounded-full ${currentStep === 'schema' ? 'bg-blue-600' : currentStep === 'query' ? 'bg-blue-600' : 'bg-slate-300'}`} />
           <div className={`h-1 w-8 rounded-full ${currentStep === 'query' ? 'bg-blue-600' : 'bg-slate-200'}`} />
           <div className={`h-2 w-2 rounded-full ${currentStep === 'query' ? 'bg-blue-600' : 'bg-slate-300'}`} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Configuration / Input */}
        <div className="lg:col-span-1 space-y-6">
            {/* Step 1: Connection */}
            <div className={`bg-white p-6 rounded-2xl border transition-all ${currentStep === 'connect' ? 'border-blue-500 shadow-lg ring-4 ring-blue-50' : 'border-slate-200 opacity-60'}`}>
                <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-slate-100 p-2 rounded-lg"><Server size={20} className="text-slate-600" /></div>
                    <h3 className="font-bold text-slate-700">1. Connection Details</h3>
                </div>
                {currentStep === 'connect' && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Connection Name</label>
                            <input className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                              value={connection.name} 
                              onChange={e => setConnection({...connection, name: e.target.value})} 
                              placeholder="e.g. Production Read Replica"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Database Engine</label>
                            <select 
                                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                value={connection.type}
                                onChange={e => setConnection({...connection, type: e.target.value})}
                            >
                                <option value="postgresql">PostgreSQL</option>
                                <option value="mysql">MySQL</option>
                                <option value="oracle">Oracle</option>
                                <option value="mssql">SQL Server</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Host</label>
                                <input className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={connection.host} onChange={e => setConnection({...connection, host: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Port</label>
                                <input className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={connection.port} onChange={e => setConnection({...connection, port: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Database Name</label>
                            <input className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={connection.database} onChange={e => setConnection({...connection, database: e.target.value})} />
                        </div>
                        
                        <div className="pt-2 border-t border-slate-100 mt-2">
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <User size={10} /> Username
                                  </label>
                                  <input 
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                                    value={connection.username} 
                                    onChange={e => setConnection({...connection, username: e.target.value})} 
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <Lock size={10} /> Password
                                  </label>
                                  <input 
                                    type="password"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                                    value={connection.password} 
                                    onChange={e => setConnection({...connection, password: e.target.value})} 
                                  />
                              </div>
                           </div>
                        </div>

                        <button 
                            onClick={handleConnect}
                            disabled={isLoadingSchema}
                            className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center justify-center space-x-2 transition-all disabled:opacity-70"
                        >
                            {isLoadingSchema ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                            <span>{isLoadingSchema ? 'Introspecting...' : 'Connect & Extract Schema'}</span>
                        </button>
                    </div>
                )}
                {currentStep !== 'connect' && (
                   <div className="flex items-center justify-between text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded-lg">
                       <span>Connected to {connection.database}</span>
                       <Check size={16} />
                   </div>
                )}
            </div>

            {/* Step 2: Schema Review */}
            <div className={`bg-white p-6 rounded-2xl border transition-all ${currentStep === 'schema' ? 'border-blue-500 shadow-lg ring-4 ring-blue-50' : 'border-slate-200 opacity-60'}`}>
                <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-slate-100 p-2 rounded-lg"><Table size={20} className="text-slate-600" /></div>
                    <h3 className="font-bold text-slate-700">2. Architecture</h3>
                </div>
                {schema && schema.tables && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Detected Tables</div>
                        {schema.tables.map((t: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-sm">
                                <span className="font-mono font-bold text-slate-700">{t.name}</span>
                                <span className="text-xs text-slate-400">{t.columns?.length || 0} cols</span>
                            </div>
                        ))}
                    </div>
                )}
                {currentStep === 'schema' && schema && (
                    <button 
                        onClick={() => setCurrentStep('query')}
                        className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center justify-center space-x-2"
                    >
                        <span>Proceed to Query Builder</span>
                        <ArrowRight size={16} />
                    </button>
                )}
            </div>

            {/* Step 3: Query Prompt */}
            <div className={`bg-white p-6 rounded-2xl border transition-all ${currentStep === 'query' ? 'border-blue-500 shadow-lg ring-4 ring-blue-50' : 'border-slate-200 opacity-60'}`}>
                <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-slate-100 p-2 rounded-lg"><Sparkles size={20} className="text-slate-600" /></div>
                    <h3 className="font-bold text-slate-700">3. Query Generator</h3>
                </div>
                {currentStep === 'query' && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">API Function Name</label>
                            <input 
                                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-indigo-600"
                                value={queryContext.functionName}
                                onChange={(e) => setQueryContext({...queryContext, functionName: e.target.value})}
                                placeholder="get_monthly_revenue"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Natural Language Prompt</label>
                            <textarea 
                                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g., Get top 10 users by order total who joined last month"
                                value={queryContext.prompt}
                                onChange={(e) => setQueryContext({...queryContext, prompt: e.target.value})}
                            />
                        </div>
                        
                        {/* Parameters Configuration */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Query Parameters</label>
                                <button onClick={addParam} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                                    <Plus size={14} />
                                </button>
                            </div>
                            <div className="space-y-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                {queryParams.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                        <div className="flex-1 min-w-0">
                                            <input 
                                                className="w-full text-xs font-bold text-slate-700 focus:outline-none" 
                                                value={p.name}
                                                placeholder="param_name"
                                                onChange={(e) => updateParam(idx, 'name', e.target.value)}
                                            />
                                        </div>
                                        <select 
                                            className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-1"
                                            value={p.type}
                                            onChange={(e) => updateParam(idx, 'type', e.target.value)}
                                        >
                                            <option value="string">string</option>
                                            <option value="number">number</option>
                                            <option value="integer">integer</option>
                                            <option value="boolean">bool</option>
                                        </select>
                                        <label className="flex items-center text-[10px] text-slate-500 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                className="mr-1" 
                                                checked={p.required}
                                                onChange={(e) => updateParam(idx, 'required', e.target.checked)}
                                            />
                                            Req
                                        </label>
                                        <button onClick={() => removeParam(idx)} className="text-slate-300 hover:text-red-500">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {queryParams.length === 0 && <p className="text-[10px] text-slate-400 text-center py-2">No parameters defined.</p>}
                            </div>
                        </div>

                        <button 
                            onClick={generateQuery}
                            disabled={isGenerating || !queryContext.prompt}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm hover:opacity-90 flex items-center justify-center space-x-2 shadow-md"
                        >
                            {isGenerating ? <Sparkles className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            <span>Generate Query Code</span>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Code Editor & Preview */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 min-h-[500px] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Code2 size={16} className="text-blue-400" />
                        <span className="text-slate-300 font-mono text-xs">Generated Function</span>
                    </div>
                </div>
                
                <div className="flex-1 p-6 relative group">
                    {!queryContext.generatedCode ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                             <Database size={48} className="mb-4 opacity-20" />
                             <p className="text-sm font-medium">Waiting for Query Generation...</p>
                             <p className="text-xs mt-2 max-w-xs text-center opacity-70">Complete steps on the left to transform your request into optimized SQL/Python code.</p>
                        </div>
                    ) : (
                        <textarea 
                            className="absolute inset-0 w-full h-full h100% bg-transparent text-blue-100 font-mono text-sm resize-none focus:outline-none"
                            value={queryContext.generatedCode}
                            onChange={(e) => setQueryContext({...queryContext, generatedCode: e.target.value})}
                            spellCheck={false}
                        />
                    )}
                </div>
                
                {queryContext.generatedCode && (
                     <div className="p-4 bg-slate-800/50 border-t border-slate-800 flex justify-end">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
                        >
                            {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Library size={18} />}
                            <span>Save to Databases</span>
                        </button>
                     </div>
                )}
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start space-x-4">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                   <Eye size={20} className="text-blue-600" />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">Draft Preview</h4>
                    <p className="text-xs text-blue-700 mt-1">
                        Function will be saved as <strong>Inactive</strong> in the <span className="font-bold">Database Manager</span>.
                    </p>
                    <code className="block mt-2 bg-white/50 px-3 py-1.5 rounded border border-blue-100 text-xs font-mono text-blue-800">
                        POST /api/execute/{queryContext.functionName || 'custom_query'}/
                    </code>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ModelBuilder;
