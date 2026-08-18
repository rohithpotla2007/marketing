import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Warehouse, Eye, EyeOff, Lock, User, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, demoLogin } = useAuth();
  const { success } = useNotification();
  const navigate = useNavigate();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
      success(`Welcome back, ${username.trim()}!`);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Incorrect username or password. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'admin' | 'warehouse') => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await demoLogin(role);
      success(`Signed in as ${role === 'admin' ? 'Operations Director (Admin)' : 'Warehouse Specialist'}`);
      navigate('/');
    } catch (err: any) {
      setErrorMsg('Failed to log in with demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white shadow-xl shadow-brand-600/20 mb-3.5">
            <Warehouse className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            StockFlow <span className="text-brand-400 font-extrabold">WMS</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise Warehouse Inventory & Fulfillment System
          </p>
        </div>

        {/* Login Card */}
        <div className="wms-card p-6 sm:p-8 shadow-2xl backdrop-blur-xl border-slate-700/80">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Sign In to Warehouse Portal</h2>
            <p className="text-xs text-slate-400 mt-0.5">Enter your operator credentials below</p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Username input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">User ID / Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or warehouse"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-0"
                />
                Remember warehouse terminal session
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 mt-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Login Section for Hackathon */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              1-Click Demo Logins (Hackathon Evaluators)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                disabled={loading}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold text-center transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span className="text-brand-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
                <span className="text-[10px] text-slate-400 font-mono">admin / admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('warehouse')}
                disabled={loading}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold text-center transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Warehouse className="w-3 h-3" /> Staff
                </span>
                <span className="text-[10px] text-slate-400 font-mono">warehouse / warehouse123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
