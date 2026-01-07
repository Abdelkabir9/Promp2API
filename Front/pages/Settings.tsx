
import React, { useState, useEffect } from 'react';
import { User, Key, Bell, Shield, CreditCard, ChevronRight, Globe, Save, RefreshCw } from 'lucide-react';

const Settings: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('API_BASE_URL') || 'http://localhost:8000');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSaveApiUrl = () => {
    setSaveStatus('saving');
    localStorage.setItem('API_BASE_URL', apiUrl);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const sections = [
    { title: 'Profile Information', desc: 'Update your name, avatar, and email preferences.', icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'API Keys', desc: 'Manage your access tokens for external integrations.', icon: Key, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Security', desc: 'Two-factor authentication and password settings.', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Billing & Usage', desc: 'Current plan, invoices, and payment methods.', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Notifications', desc: 'Configure system alerts and email reports.', icon: Bell, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Account Settings</h2>
        <p className="text-slate-500">Manage your account configurations and preferences.</p>
      </div>

      {/* API Configuration Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Globe size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Backend API Configuration</h3>
            <p className="text-slate-500 text-sm">Set the base URL for your Django backend service.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Base API URL</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
              <button 
                onClick={handleSaveApiUrl}
                disabled={saveStatus === 'saving'}
                className={`px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all ${
                  saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saveStatus === 'saving' ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <><span>Saved</span></>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Apply Changes</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 italic">
              Note: If your frontend is served over HTTPS, your backend must also use HTTPS to avoid browser security blocks.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {sections.map((section) => (
          <button key={section.title} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
            <div className="flex items-center space-x-6 text-left">
              <div className={`p-4 rounded-2xl ${section.bg} ${section.color} group-hover:scale-110 transition-transform`}>
                <section.icon size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{section.title}</h3>
                <p className="text-slate-500 text-sm mt-0.5">{section.desc}</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </button>
        ))}
      </div>

      <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
        <h3 className="text-red-800 font-bold mb-2">Danger Zone</h3>
        <p className="text-red-700 text-sm mb-6">Permanently delete your account and all associated data including APIs and functions.</p>
        <button className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-all">
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default Settings;
