import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Truck,
  Building2,
  FlaskConical,
  Crown,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login, isLoading, dbStatus } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-900/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-900/15 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand & Badge Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-xs text-cyan-400 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold uppercase tracking-wider font-mono text-[11px]">
              ADR P650 • UN 3373 Category B
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            BioDispatch <span className="text-cyan-400 font-light">MediGo</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Hessen Medical Specimen Courier Logistics & Digital Chain of Custody System
          </p>
        </div>

        {/* Database Status Indicator */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Database:</span>
            <span
              className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                dbStatus?.provider === 'supabase'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-blue-950 text-cyan-300 border border-blue-800'
              }`}
            >
              {dbStatus?.provider === 'supabase' ? 'Supabase (Connected)' : 'Server Persistent Database'}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Auth Verified</span>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Verified Personnel Sign In</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Only authorized dispatchers, drivers, clinics, and laboratories may enter.
            </p>
          </div>

          {error && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-start space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Workplace Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@medigo-hessen.de or clinic@kgu.de"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-950 transition-all cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Instant Demo Access (Seeded):
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">1-Click Auto-Fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('nsansvester89@gmail.com', 'AdminPass2026!')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-[11px]">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Master Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">nsansvester89@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('hans.schmidt@medigo-hessen.de', 'DriverPass2026!')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold text-[11px]">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Medical Courier</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">hans.schmidt (Van 7741)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('probeneingang@kgu.de', 'ClinicPass2026!')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Hospital Clinic</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  UKF Frankfurt • <span className="font-mono text-cyan-300">CTR-2026</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('empfang@synlab-hessen.de', 'LabPass2026!')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5 text-purple-400 font-bold text-[11px]">
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Diagnostic Lab</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  Synlab Hessen • <span className="font-mono text-cyan-300">CTR-2026</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security / Administration Policy Notice */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Verification Policy:</span>
          </p>
          <p>
            Per compliance rules, public self-registration is restricted. Only the Master Admin may provision Driver, Clinic, and Laboratory accounts with verified Contract Numbers.
          </p>
        </div>
      </div>
    </div>
  );
};
