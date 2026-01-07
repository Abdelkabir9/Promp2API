
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Plus, Save, Trash2, Globe, Key, FileJson, Copy, Edit, TestTube, CheckCircle, XCircle, X, Loader2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ExternalAPI {
  id: string;
  name: string;
  description: string;
  base_url: string;
  auth_type: string;
  auth_config: any;
  default_headers: any;
  default_params: any;
  timeout?: number;
  rate_limit?: number;
  rate_limit_window?: number;
  cache_enabled?: boolean;
  cache_duration?: number;
  retry_count?: number;
  retry_delay?: number;
  is_active: boolean;
  is_verified: boolean;
  last_checked: string | null;
  request_count: number;
  success_count: number;
  error_count: number;
  average_response_time: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface APIFormData {
  name: string;
  description: string;
  base_url: string;
  auth_type: string;
  auth_config: any;
  default_headers: any;
  default_params: any;
  timeout: number;
  rate_limit: number;
  retry_count: number;
  cache_enabled: boolean;
  cache_duration: number;
  is_active: boolean;
}

const ExternalAPIs: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [apis, setApis] = useState<ExternalAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingApi, setEditingApi] = useState<ExternalAPI | null>(null);
  const [testingApi, setTestingApi] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [jsonErrors, setJsonErrors] = useState<{[key: string]: string}>({});
  
  const [formData, setFormData] = useState<APIFormData>({
    name: '',
    description: '',
    base_url: '',
    auth_type: 'none',
    auth_config: {},
    default_headers: {},
    default_params: {},
    timeout: 30,
    rate_limit: 100,
    retry_count: 3,
    cache_enabled: true,
    cache_duration: 300,
    is_active: true
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchAPIs();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
      setError('Please log in to access external APIs');
    }
  }, [authLoading, isAuthenticated]);

  const fetchAPIs = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<any>('/api/external-apis/');

      // Handle paginated response from Django REST Framework
      let apis: ExternalAPI[] = [];
      if (Array.isArray(data)) {
        apis = data;
      } else if (data && data.results && Array.isArray(data.results)) {
        apis = data.results;
      }

      setApis(apis);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch external APIs:', err);
      setApis([]);
      setError('Failed to load external APIs. Please check your authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingApi
        ? `/api/external-apis/${editingApi.id}/`
        : '/api/external-apis/';
      const method = editingApi ? 'PUT' : 'POST';

      await apiRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      fetchAPIs();
      resetForm();
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Failed to save API:', err);

      // Extract more specific error message
      let errorMessage = 'Failed to save external API';
      if (err.message) {
        if (err.message.includes('already exists')) {
          errorMessage = `API with name "${formData.name}" already exists. Please choose a different name.`;
        } else if (err.message.includes('name:')) {
          errorMessage = 'Name field error: ' + err.message.split('name:')[1].split('.')[0];
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    }
  };

  const handleDelete = async (apiId: string) => {
    if (!confirm('Are you sure you want to delete this external API?')) return;

    try {
      await apiRequest(`/api/external-apis/${apiId}/`, {
        method: 'DELETE'
      });
      fetchAPIs();
    } catch (err) {
      console.error('Failed to delete API:', err);
      setError('Failed to delete external API');
    }
  };

  const testConnection = async (api: ExternalAPI) => {
    setTestingApi(api.id);
    setTestResult(null);

    try {
        let url = api.base_url;
        const headers: Record<string, string> = { ...api.default_headers };

        // 1. Construct URL & Headers based on Auth Type
        if (api.auth_type === 'api_key' && api.auth_config) {
            if (api.auth_config.key_location === 'query') {
                const separator = url.includes('?') ? '&' : '?';
                url = `${url}${separator}${api.auth_config.key_name}=${api.auth_config.key_value}`;
            } else if (api.auth_config.key_name && api.auth_config.key_value) {
                headers[api.auth_config.key_name] = api.auth_config.key_value;
            }
        } else if (api.auth_type === 'bearer' && api.auth_config?.token) {
            headers['Authorization'] = `Bearer ${api.auth_config.token}`;
        } else if (api.auth_type === 'basic' && api.auth_config?.username) {
            const credentials = btoa(`${api.auth_config.username}:${api.auth_config.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
        }

        // 2. Append default query params
        if (api.default_params) {
            const params = new URLSearchParams(api.default_params).toString();
            if (params) {
                const separator = url.includes('?') ? '&' : '?';
                url = `${url}${separator}${params}`;
            }
        }

        // 3. Perform Direct Frontend Fetch
        const startTime = performance.now();
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            // 'cors' mode is required to read the status code. 
            // If the external API doesn't allow your origin, this will throw a Network Error.
            mode: 'cors' 
        });
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        const result = {
            success: response.ok,
            status_code: response.status,
            response_time: duration,
            url_tested: url,
            auth_type: api.auth_type,
            message: response.ok ? "Connection successful" : `HTTP Error: ${response.status} ${response.statusText}`
        };

        setTestResult(result);

        // 4. Optionally update local state to reflect success immediately (verified status)
        if (response.ok) {
             setApis(prev => prev.map(p => p.id === api.id ? { ...p, is_verified: true, success_count: p.success_count + 1, last_checked: new Date().toISOString() } : p));
        } else {
             setApis(prev => prev.map(p => p.id === api.id ? { ...p, error_count: p.error_count + 1 } : p));
        }

    } catch (err: any) {
        console.error("Test connection error:", err);
        
        let msg = err.message;
        if (err.message === 'Failed to fetch') {
            msg = "Network Error or CORS Blocked. The browser could not reach the endpoint. This might happen if the API doesn't allow requests from this domain.";
        }

        setTestResult({
            success: false,
            message: "Connection Failed",
            error: msg
        });
        
        setApis(prev => prev.map(p => p.id === api.id ? { ...p, error_count: p.error_count + 1 } : p));
    } finally {
        setTestingApi(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      base_url: '',
      auth_type: 'none',
      auth_config: {},
      default_headers: {},
      default_params: {},
      timeout: 30,
      rate_limit: 100,
      retry_count: 3,
      cache_enabled: true,
      cache_duration: 300,
      is_active: true
    });
    setJsonErrors({});
    setShowAddForm(false);
    setEditingApi(null);
  };

  const startEditing = (api: ExternalAPI) => {
    setEditingApi(api);
    setFormData({
      name: api.name,
      description: api.description,
      base_url: api.base_url,
      auth_type: api.auth_type,
      auth_config: api.auth_config || {},
      default_headers: api.default_headers || {},
      default_params: api.default_params || {},
      timeout: api.timeout || 30,
      rate_limit: api.rate_limit || 100,
      retry_count: api.retry_count || 3,
      cache_enabled: api.cache_enabled !== undefined ? api.cache_enabled : true,
      cache_duration: api.cache_duration || 300,
      is_active: api.is_active !== undefined ? api.is_active : true
    });
    setShowAddForm(true);
  };

  const getAuthTypeDisplay = (authType: string) => {
    const types = {
      'none': 'No Authentication',
      'api_key': 'API Key',
      'bearer': 'Bearer Token',
      'basic': 'Basic Auth',
      'oauth2': 'OAuth 2.0'
    };
    return types[authType as keyof typeof types] || authType;
  };

  const getStatusColor = (api: ExternalAPI) => {
    if (!api.is_active) return 'text-gray-500';
    if (api.is_verified) return 'text-emerald-600';
    return 'text-amber-600';
  };

  const getStatusText = (api: ExternalAPI) => {
    if (!api.is_active) return 'Inactive';
    if (api.is_verified) return 'Verified';
    return 'Unverified';
  };

  const validateAndParseJSON = (fieldName: string, jsonString: string): { isValid: boolean; value: any; error?: string } => {
    if (!jsonString || !jsonString.trim()) {
      return { isValid: true, value: {} };
    }

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        return { isValid: true, value: parsed };
      } else {
        return { isValid: false, value: {}, error: `${fieldName} must be a valid JSON object` };
      }
    } catch (e: any) {
      // If JSON parsing fails, try to parse as key-value pairs (more user-friendly)
      try {
        const lines = jsonString.split('\n').map(line => line.trim()).filter(line => line);
        const result: {[key: string]: string} = {};

        for (const line of lines) {
          // Support formats like: key: value, key=value, "key": "value"
          const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
          const equalsMatch = line.match(/^([^=]+)=\s*(.+)$/);

          if (colonMatch) {
            const [, key, value] = colonMatch;
            result[key.trim().replace(/["']/g, '')] = value.trim().replace(/["']/g, '');
          } else if (equalsMatch) {
            const [, key, value] = equalsMatch;
            result[key.trim().replace(/["']/g, '')] = value.trim().replace(/["']/g, '');
          } else {
            return { isValid: false, value: {}, error: `${fieldName}: Invalid format. Use "key: value" or "key=value" format, one per line.` };
          }
        }

        return { isValid: true, value: result };
      } catch (fallbackError) {
        return { isValid: false, value: {}, error: `${fieldName}: ${e.message}. You can also use simple "key: value" format, one per line.` };
      }
    }
  };

  const objectToKeyValueString = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return '';
    return Object.entries(obj).map(([key, value]) => `${key}: ${value}`).join('\n');
  };

  const handleJSONChange = (fieldName: 'default_headers' | 'default_params', value: string) => {
    const result = validateAndParseJSON(fieldName, value);

    setFormData(prev => ({ ...prev, [fieldName]: result.value }));

    setJsonErrors(prev => ({
      ...prev,
      [fieldName]: result.error || ''
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Cpu className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            {authLoading ? 'Checking authentication...' : 'Loading External APIs...'}
          </h3>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Authentication Required</h3>
          <p className="text-slate-500 mb-6">Please log in to access external API integrations.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">External Service Integration</h2>
          <p className="text-slate-500">Link third-party APIs to use inside your generated Python functions.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold active:scale-95"
        >
          <Plus size={18} />
          <span>Add Integration</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="text-red-600" size={20} />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              {editingApi ? 'Edit External API' : 'Add External API'}
            </h3>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <XCircle size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Base URL *</label>
                <input
                  type="url"
                  value={formData.base_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://api.example.com/v1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Brief description of this API"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Authentication Type</label>
              <select
                value={formData.auth_type}
                onChange={(e) => {
                  const newAuthType = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    auth_type: newAuthType,
                    auth_config: {}
                  }));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">No Authentication</option>
                <option value="api_key">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>
            </div>

            {/* Dynamic Authentication Fields */}
            {formData.auth_type === 'bearer' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-blue-800 mb-3">Bearer Token Configuration</h4>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">Token *</label>
                  <input
                    type="password"
                    value={formData.auth_config.token || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      auth_config: { ...prev.auth_config, token: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Enter your bearer token"
                    required={formData.auth_type === 'bearer'}
                  />
                  <p className="text-xs text-blue-600 mt-1">Token will be sent as: Authorization: Bearer &lt;token&gt;</p>
                </div>
              </div>
            )}

            {formData.auth_type === 'api_key' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-green-800 mb-3">API Key Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">Header/Parameter Name *</label>
                    <input
                      type="text"
                      value={formData.auth_config.key_name || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auth_config: { ...prev.auth_config, key_name: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      placeholder="X-API-Key"
                      required={formData.auth_type === 'api_key'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">Location</label>
                    <select
                      value={formData.auth_config.key_location || 'header'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auth_config: { ...prev.auth_config, key_location: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="header">HTTP Header</option>
                      <option value="query">Query Parameter</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-green-700 mb-2">API Key Value *</label>
                  <input
                    type="password"
                    value={formData.auth_config.key_value || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      auth_config: { ...prev.auth_config, key_value: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="Enter your API key"
                    required={formData.auth_type === 'api_key'}
                  />
                </div>
              </div>
            )}

            {formData.auth_type === 'basic' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-purple-800 mb-3">Basic Authentication</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">Username *</label>
                    <input
                      type="text"
                      value={formData.auth_config.username || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auth_config: { ...prev.auth_config, username: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      placeholder="Enter username"
                      required={formData.auth_type === 'basic'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">Password *</label>
                    <input
                      type="password"
                      value={formData.auth_config.password || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auth_config: { ...prev.auth_config, password: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      placeholder="Enter password"
                      required={formData.auth_type === 'basic'}
                    />
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-2">Credentials will be base64 encoded and sent as Authorization header</p>
              </div>
            )}

            {formData.auth_type === 'oauth2' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-orange-800 mb-3">OAuth 2.0 Configuration</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-2">Client ID *</label>
                      <input
                        type="text"
                        value={formData.auth_config.client_id || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          auth_config: { ...prev.auth_config, client_id: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        placeholder="OAuth client ID"
                        required={formData.auth_type === 'oauth2'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-2">Client Secret *</label>
                      <input
                        type="password"
                        value={formData.auth_config.client_secret || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          auth_config: { ...prev.auth_config, client_secret: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        placeholder="OAuth client secret"
                        required={formData.auth_type === 'oauth2'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-700 mb-2">Token URL</label>
                    <input
                      type="url"
                      value={formData.auth_config.token_url || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auth_config: { ...prev.auth_config, token_url: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      placeholder="https://api.example.com/oauth/token"
                    />
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-2">OAuth 2.0 implementation is basic. Consider using proper OAuth library for production.</p>
              </div>
            )}

            {/* Additional Configuration Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-gray-800 mb-4">Additional Configuration (Optional)</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Default Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Headers</label>
                  <textarea
                    value={formData.default_headers ? objectToKeyValueString(formData.default_headers) : ''}
                    onChange={(e) => handleJSONChange('default_headers', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white font-mono text-sm ${
                      jsonErrors.default_headers
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-indigo-500'
                    }`}
                    rows={4}
                    placeholder={`Accept: application/json\nContent-Type: application/json\nUser-Agent: MyApp/1.0\nAuthorization: Bearer your-token`}
                  />
                  {jsonErrors.default_headers && (
                    <p className="text-xs text-red-600 mt-1">{jsonErrors.default_headers}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <p><strong>Format accepté :</strong></p>
                    <ul className="ml-4 space-y-0.5">
                      <li>• <code>Header-Name: value</code> (recommandé)</li>
                      <li>• <code>Header-Name=value</code></li>
                      <li>• JSON: <code>{"{ \"Accept\": \"application/json\" }"}</code></li>
                    </ul>
                  </div>
                </div>

                {/* Default Query Parameters */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Query Parameters</label>
                  <textarea
                    value={formData.default_params ? objectToKeyValueString(formData.default_params) : ''}
                    onChange={(e) => handleJSONChange('default_params', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white font-mono text-sm ${
                      jsonErrors.default_params
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-indigo-500'
                    }`}
                    rows={4}
                    placeholder={`format: json\nversion: v1\nlimit: 100\nlang: en`}
                  />
                  {jsonErrors.default_params && (
                    <p className="text-xs text-red-600 mt-1">{jsonErrors.default_params}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <p><strong>Format accepté :</strong></p>
                    <ul className="ml-4 space-y-0.5">
                      <li>• <code>param: value</code> (recommandé)</li>
                      <li>• <code>param=value</code></li>
                      <li>• JSON: <code>{"{ \"format\": \"json\" }"}</code></li>
                    </ul>
                    <p className="text-blue-600 mt-1">💡 Ces paramètres seront ajoutés à toutes les URLs : <code>?param=value&other=123</code></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Timeout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={formData.timeout || 30}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    max="300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Request timeout in seconds (1-300)</p>
                </div>

                {/* Rate Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate Limit (requests/minute)</label>
                  <input
                    type="number"
                    value={formData.rate_limit || 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate_limit: parseInt(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    max="10000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum requests per minute</p>
                </div>

                {/* Retry Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retry Count</label>
                  <input
                    type="number"
                    value={formData.retry_count || 3}
                    onChange={(e) => setFormData(prev => ({ ...prev, retry_count: parseInt(e.target.value) || 3 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of retry attempts on failure</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Cache Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cache Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.cache_duration || 300}
                    onChange={(e) => setFormData(prev => ({ ...prev, cache_duration: parseInt(e.target.value) || 300 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    max="86400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cache responses for this duration (0 = no cache)</p>
                </div>

                {/* Cache Enabled */}
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.cache_enabled !== undefined ? formData.cache_enabled : true}
                      onChange={(e) => setFormData(prev => ({ ...prev, cache_enabled: e.target.checked }))}
                      className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Caching</span>
                  </label>
                </div>

                {/* Is Active */}
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active !== undefined ? formData.is_active : true}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">API Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                {editingApi ? 'Update API' : 'Add API'}
              </button>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3">💡 Configuration Guide</h4>
            <div className="text-xs text-slate-600 space-y-3">
              <div>
                <p className="font-semibold text-slate-700 mb-1">Authentication Types:</p>
                <ul className="ml-4 space-y-1">
                  <li><strong>No Authentication:</strong> For public APIs that don't require credentials.</li>
                  <li><strong>API Key:</strong> Most common method. Choose header (X-API-Key) or query parameter.</li>
                  <li><strong>Bearer Token:</strong> For OAuth tokens. Sent as "Authorization: Bearer &lt;token&gt;".</li>
                  <li><strong>Basic Auth:</strong> Username/password combination, base64 encoded.</li>
                  <li><strong>OAuth 2.0:</strong> Advanced authentication (client credentials flow).</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1">Additional Settings:</p>
                <ul className="ml-4 space-y-1">
                  <li><strong>Default Headers:</strong> JSON object of headers sent with every request.</li>
                  <li><strong>Default Params:</strong> JSON object of query parameters appended to URLs.</li>
                  <li><strong>Timeout:</strong> Maximum time to wait for API response (seconds).</li>
                  <li><strong>Rate Limit:</strong> Maximum requests per minute to avoid API limits.</li>
                  <li><strong>Cache Duration:</strong> How long to cache responses (0 = no cache).</li>
                  <li><strong>Retry Count:</strong> Number of retry attempts on request failure.</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <p className="font-semibold text-blue-800 mb-1">💡 Pro Tip:</p>
                <p className="text-blue-700">Use JSON format for headers and parameters: <code className="bg-blue-100 px-1 rounded">{"{ \"Accept\": \"application/json\" }"}</code></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {apis.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <Cpu className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No External APIs Configured</h3>
            <p className="text-slate-500 mb-6">Add your first external API integration to use third-party services in your functions.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg font-medium"
            >
              <Plus size={20} />
              <span>Add Your First API</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <FileJson size={16} className="text-indigo-600" />
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">External API Integrations</span>
               </div>
               <div className="text-xs text-slate-500">
                 {apis.length} API{apis.length !== 1 ? 's' : ''} configured
               </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {apis.map(api => (
                   <div key={api.id} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group">
                     <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="bg-indigo-50 p-3 rounded-xl">
                            <Cpu className="text-indigo-600" size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">{api.name}</h3>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: {api.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                           <span className={`w-1.5 h-1.5 rounded-full ${api.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                           <span className={`text-[10px] font-bold uppercase ${getStatusColor(api)}`}>
                             {getStatusText(api)}
                           </span>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Base Endpoint</label>
                          <div className="flex items-center space-x-2">
                            <Globe size={14} className="text-slate-300" />
                            <span className="text-xs font-mono text-slate-600 truncate">{api.base_url}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Authentication Strategy</label>
                          <div className="flex items-center space-x-2">
                            <Key size={14} className="text-slate-300" />
                            <span className="text-xs text-slate-600 font-semibold">{getAuthTypeDisplay(api.auth_type)}</span>
                          </div>
                        </div>
                        {api.description && (
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                            <span className="text-xs text-slate-600">{api.description}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <div className="text-xs font-bold text-blue-600">{api.request_count}</div>
                            <div className="text-[9px] text-blue-500 uppercase">Requests</div>
                          </div>
                          <div className="p-2 bg-emerald-50 rounded-lg">
                            <div className="text-xs font-bold text-emerald-600">{api.success_count}</div>
                            <div className="text-[9px] text-emerald-500 uppercase">Success</div>
                          </div>
                          <div className="p-2 bg-red-50 rounded-lg">
                            <div className="text-xs font-bold text-red-600">{api.error_count}</div>
                            <div className="text-[9px] text-red-500 uppercase">Errors</div>
                          </div>
                        </div>
                     </div>

                     <div className="mt-8 pt-4 border-t border-slate-50 flex justify-between items-center">
                        <button
                          onClick={() => testConnection(api)}
                          disabled={testingApi === api.id}
                          className="flex items-center space-x-2 px-3 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {testingApi === api.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <TestTube size={14} />
                          )}
                          <span>{testingApi === api.id ? 'Connecting...' : 'Test (Direct)'}</span>
                        </button>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditing(api)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(api.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        )}

        {/* Test Result Modal/Section */}
        {testResult && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <TestTube size={16} className="mr-2" />
                Connection Test Result (Direct Frontend Fetch)
              </h3>
              <button
                onClick={() => setTestResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className={`p-4 rounded-lg border ${
              testResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {testResult.success ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <XCircle size={20} className="text-red-600" />
                )}
                <span className="font-semibold">
                  {testResult.success ? 'Test Successful' : 'Test Failed'}
                </span>
              </div>

              <div className="text-sm space-y-1">
                {testResult.status_code && (
                  <p><strong>Status Code:</strong> {testResult.status_code}</p>
                )}
                {testResult.response_time && (
                  <p><strong>Response Time:</strong> {typeof testResult.response_time === 'number' ? testResult.response_time.toFixed(3) : testResult.response_time}s</p>
                )}
                {testResult.url_tested && (
                  <p><strong>URL Tested:</strong> {testResult.url_tested}</p>
                )}
                {testResult.auth_type && (
                  <p><strong>Auth Type:</strong> {getAuthTypeDisplay(testResult.auth_type)}</p>
                )}
                <p><strong>Message:</strong> {testResult.message || testResult.error}</p>
                {!testResult.success && testResult.message && testResult.message.includes("Network Error") && (
                     <div className="mt-2 flex items-start space-x-2 bg-white/50 p-2 rounded border border-red-200 text-xs">
                         <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                         <p>
                             <strong>CORS Warning:</strong> This request failed directly from the browser. 
                             If the external API does not allow requests from <code>{window.location.origin}</code>, 
                             this failure is expected in the frontend even if the backend can verify it successfully.
                         </p>
                     </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-slate-900 rounded-2xl p-8 shadow-xl text-white">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-blue-400 font-bold text-sm uppercase tracking-widest">Configuration Preview (YAML)</h3>
             <button className="text-[10px] text-slate-500 hover:text-white uppercase font-bold tracking-widest flex items-center">
               <Copy size={12} className="mr-1" /> Copy YAML
             </button>
           </div>
           <pre className="font-mono text-xs text-blue-100 leading-loose opacity-80">
{`# Generated by CodeGenie Platform
stripe:
  base_url: https://api.stripe.com/v1
  auth_type: bearer_token
  headers:
    Authorization: "Bearer \${STRIPE_SECRET_KEY}"
    
openweather:
  base_url: https://api.openweathermap.org/data/2.5
  params:
    appid: "\${WEATHER_API_KEY}"
    units: "metric"
  cache_time: 600`}
           </pre>
        </div>
      </div>
    </div>
  );
};

export default ExternalAPIs;
