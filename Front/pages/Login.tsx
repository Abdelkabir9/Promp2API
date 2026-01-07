
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 mb-6 transition-transform hover:scale-105 duration-300">
            <ShieldCheck size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Prompt2API</h1>
          <p className="text-slate-500 mt-3 text-lg">Deploy your Python backend API in seconds.</p>
        </div>

        <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-600 text-sm">
              <div className="flex items-center space-x-3">
                <AlertCircle size={18} className="shrink-0" />
                <span className="font-bold">Authentication Error</span>
              </div>
              <p className="pl-7 text-xs opacity-90 leading-relaxed">{error}</p>
              {error.includes('connect') && (
                <div className="pl-7 pt-2">
                  <button 
                    onClick={() => navigate('/settings')}
                    className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800"
                  >
                    <Settings size={12} />
                    <span>Configure API URL</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Workspace Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="admin@example.io"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Secret Passcode</label>
                <a href="#" className="text-xs font-bold text-blue-600 hover:underline">Reset?</a>
              </div>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center space-x-3 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <span className="uppercase tracking-widest">Authorize Access</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              New to the platform? <Link to="/register" className="text-blue-700 font-bold hover:underline ml-1">Establish Workspace</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
