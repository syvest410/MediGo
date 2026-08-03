import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, Key, UserCheck, ShieldCheck } from 'lucide-react';
import { Role, User } from '../../types';

interface UnauthorizedShieldProps {
  requiredRole: string;
  currentRole: Role;
  currentUser: User | null;
  onSwitchRole: () => void;
  isNightShift?: boolean;
}

export const UnauthorizedShield: React.FC<UnauthorizedShieldProps> = ({
  requiredRole,
  currentRole,
  currentUser,
  onSwitchRole,
  isNightShift = true,
}) => {
  return (
    <div className={`p-6 sm:p-10 rounded-2xl border text-center space-y-6 max-w-2xl mx-auto my-8 shadow-2xl transition-colors ${
      isNightShift 
        ? 'bg-slate-900/90 border-red-900/80 text-slate-100' 
        : 'bg-white border-red-200 text-slate-900'
    }`}>
      <div className="w-16 h-16 bg-red-950/80 border-2 border-red-600 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="bg-red-950 text-red-300 border border-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center space-x-1">
          <Lock className="w-3.5 h-3.5" />
          <span>Role Isolation Security Enforcement</span>
        </span>
        <h2 className={`text-2xl font-black ${isNightShift ? 'text-white' : 'text-slate-900'}`}>
          Access Restricted: {requiredRole} Required
        </h2>
        <p className={`text-xs max-w-md mx-auto leading-relaxed ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
          Under German Medical Logistics Compliance (UN 3373 & EU DSGVO Art. 28), accounts assigned to 
          <strong className="text-red-500"> {currentRole}</strong> are restricted from accessing internal central fleet operations or client billing data.
        </p>
      </div>

      <div className={`p-4 rounded-xl border text-left text-xs space-y-2 ${
        isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between font-bold border-b pb-2 border-slate-800">
          <span className="flex items-center space-x-1.5 text-slate-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Session Account</span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">{currentUser?.email || 'Authenticated User'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-500 block">Current User:</span>
            <span className="font-bold text-white">{currentUser?.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Assigned Role Scope:</span>
            <span className="font-bold text-amber-400 font-mono">{currentRole}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onSwitchRole}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md w-full sm:w-auto"
        >
          <Key className="w-4 h-4" />
          <span>Switch to CEO / Dispatcher Demo Account</span>
        </button>
      </div>

      <div className="text-[10px] text-slate-500 flex items-center justify-center space-x-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Role Isolation Active • Enforced by MediGo Security Controller</span>
      </div>
    </div>
  );
};
