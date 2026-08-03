import React, { useState } from 'react';
import medigoLogoImg from '../../assets/images/medigo_logo_1785514597465.jpg';
import { 
  Lock, 
  Building2, 
  Truck, 
  ShieldCheck, 
  UserCheck, 
  Key, 
  ArrowRight, 
  FileText, 
  Copy, 
  CheckCircle2, 
  X,
  Share2,
  TestTube,
  Smartphone,
  Info
} from 'lucide-react';
import { Role, User } from '../../types';
import { INITIAL_USERS } from '../../lib/db';

interface LoginPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectUser: (user: User, preferredViewMode?: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' | 'LEGAL_COMPLIANCE') => void;
  onRegisterUser?: (newUser: User) => void;
}

export const LoginPortalModal: React.FC<LoginPortalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onRegisterUser,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'SIGNUP' | 'SHARE_CREDENTIALS'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<Role>('CLIENT_CLINIC');
  const [emailInput, setEmailInput] = useState('probeneingang@kgu.de');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [pinInput, setPinInput] = useState('1044');
  const [contractInput, setContractInput] = useState('CTR-2026-UKF');
  const [copiedShare, setCopiedShare] = useState(false);

  // Sign Up Form States
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpRole, setSignUpRole] = useState<Role>('CLIENT_CLINIC');
  const [signUpOrg, setSignUpOrg] = useState('');
  const [signUpContractOrPin, setSignUpContractOrPin] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpSuccessMsg, setSignUpSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedUser = INITIAL_USERS.find(u => u.role === selectedRole) || INITIAL_USERS[0];
    let preferredView: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' = 'DISPATCH_DASHBOARD';
    if (selectedRole === 'CLIENT_CLINIC') preferredView = 'CLIENT_PORTAL';
    if (selectedRole === 'DRIVER') preferredView = 'DRIVER_MOBILE';
    
    onSelectUser(matchedUser, preferredView);
    onClose();
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName || !signUpEmail) return;

    const newUser: User = {
      id: `USR-${signUpRole}-${Date.now().toString().slice(-4)}`,
      name: signUpName,
      email: signUpEmail,
      role: signUpRole,
      organization: signUpOrg || 'MediGo Hessen Partner',
      phone: '+49 69 5500 ' + Math.floor(1000 + Math.random() * 9000),
    };

    if (onRegisterUser) {
      onRegisterUser(newUser);
    }

    setSignUpSuccessMsg(`✅ Account created for ${signUpName} (${signUpRole})! Signing in...`);
    
    setTimeout(() => {
      let preferredView: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' = 'DISPATCH_DASHBOARD';
      if (signUpRole === 'CLIENT_CLINIC') preferredView = 'CLIENT_PORTAL';
      if (signUpRole === 'DRIVER') preferredView = 'DRIVER_MOBILE';

      onSelectUser(newUser, preferredView);
      onClose();
    }, 1200);
  };

  const handleQuickLogin = (role: Role, defaultViewMode: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL') => {
    const matchedUser = INITIAL_USERS.find(u => u.role === role) || INITIAL_USERS[0];
    onSelectUser(matchedUser, defaultViewMode);
    onClose();
  };

  const shareText = `🏥 MediGo Hessen Medical Logistics — Demo Portal Login Credentials:

1. CLINIC CLIENT PORTAL (Place Pickups & Invoices):
   - Email: probeneingang@kgu.de
   - Contract ID: CTR-2026-UKF (UK Frankfurt am Main)
   - Role: Clinic Client

2. DRIVER COURIER MOBILE APP & JOB BOARD:
   - Driver PIN: 1044
   - Vehicle: F-MG 7741 (Thermo Van)
   - Courier: Hans Schmidt

3. CEO & CENTRAL DISPATCH DASHBOARD:
   - Email: dispatch@medigo-hessen.de
   - Role: CEO / Central Dispatcher
   - Features: Real-time Telemetry, Sensor Spike Alerts, Financial Invoices & Legal AVV

App URL: ${window.location.href}`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-100 my-auto">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl overflow-hidden flex items-center justify-center border border-red-500 shadow-md shrink-0">
              <img 
                src={medigoLogoImg} 
                alt="MediGo Logo" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <span>MediGo Authentication & Role Access Portal</span>
              </h3>
              <p className="text-xs text-slate-400">Secure access control for Clinics, Couriers, and Management</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs">
          <button
            onClick={() => setActiveTab('LOGIN')}
            className={`flex-1 py-3 font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'LOGIN'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>1-Click Demo Login</span>
          </button>

          <button
            onClick={() => setActiveTab('SIGNUP')}
            className={`flex-1 py-3 font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'SIGNUP'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Register New Account</span>
          </button>

          <button
            onClick={() => setActiveTab('SHARE_CREDENTIALS')}
            className={`flex-1 py-3 font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'SHARE_CREDENTIALS'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Share Demo Credentials</span>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {activeTab === 'LOGIN' && (
            <div className="space-y-6">
              
              {/* Quick Select Portal Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Select Role to Launch Dashboard
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Card 1: Clinic Client */}
                  <div
                    onClick={() => handleQuickLogin('CLIENT_CLINIC', 'CLIENT_PORTAL')}
                    className="bg-slate-950 border border-slate-800 hover:border-red-500 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] group space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="bg-blue-950 p-2.5 rounded-lg text-blue-400 border border-blue-800">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-bold">
                        Clinic Client
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">
                        Clinic Booking Portal
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Request UN 3373 express pickups, view live driver arrival ETA & monthly invoices.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-semibold text-blue-400">
                      <span>UK Frankfurt am Main</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 2: Driver Mobile App */}
                  <div
                    onClick={() => handleQuickLogin('DRIVER', 'DRIVER_MOBILE')}
                    className="bg-slate-950 border border-slate-800 hover:border-red-500 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] group space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="bg-emerald-950 p-2.5 rounded-lg text-emerald-400 border border-emerald-800">
                        <Truck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                        Courier Fleet
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">
                        Driver Mobile & Job Board
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Sequential state machine, offline queue for basements, sensor logs & digital signatures.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                      <span>Hans Schmidt (Courier 104)</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 3: CEO / Dispatcher */}
                  <div
                    onClick={() => handleQuickLogin('DISPATCHER', 'DISPATCH_DASHBOARD')}
                    className="bg-slate-950 border border-slate-800 hover:border-red-500 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] group space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="bg-red-950 p-2.5 rounded-lg text-red-400 border border-red-800">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">
                        Management
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">
                        CEO Dispatch Dashboard
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Live GPS tracking, temperature breach alarms, automated billing & DSGVO AVV legal center.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-semibold text-red-400">
                      <span>Katrin Weber (MediGo HQ)</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Form Input Section for Manual Credentials */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                    <Key className="w-4 h-4 text-red-400" />
                    <span>Custom Credentials Login Form</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">SSL Encrypted 256-bit Connection</span>
                </div>

                <form onSubmit={handleCustomLogin} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Target Portal Role</label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as Role)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="CLIENT_CLINIC">Clinic Client (Hospital / Laboratory)</option>
                        <option value="DRIVER">Courier Driver (Mobile App & Vehicle)</option>
                        <option value="DISPATCHER">Central Dispatcher (Operations Control)</option>
                        <option value="ADMIN">CEO / Compliance Officer (Full Admin)</option>
                      </select>
                    </div>

                    {selectedRole === 'CLIENT_CLINIC' ? (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Clinic Contract Number</label>
                        <input
                          type="text"
                          value={contractInput}
                          onChange={(e) => setContractInput(e.target.value)}
                          placeholder="e.g. CTR-2026-UKF"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                    ) : selectedRole === 'DRIVER' ? (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Driver Verification PIN</label>
                        <input
                          type="password"
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="Enter 4-digit PIN"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    )}

                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg flex items-center space-x-2"
                    >
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {activeTab === 'SIGNUP' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Register New Demo Account</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Create a custom test account with specific role isolation permissions.
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                    Role Isolation Active
                  </span>
                </div>

                {signUpSuccessMsg && (
                  <div className="bg-emerald-950 border border-emerald-700 text-emerald-200 p-3 rounded-lg font-bold text-xs animate-in fade-in duration-200">
                    {signUpSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleSignUpSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="e.g. Dr. Sarah Miller"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Work Email Address</label>
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="e.g. s.miller@klinikum-hessen.de"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Assigned System Role</label>
                      <select
                        value={signUpRole}
                        onChange={(e) => setSignUpRole(e.target.value as Role)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="CLIENT_CLINIC">Clinic Client (Hospital Ward / Lab Pickup Portal)</option>
                        <option value="DRIVER">Courier Driver (Mobile App & Job Marketplace)</option>
                        <option value="DISPATCHER">CEO / Central Dispatcher (Full Management Access)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Hospital / Organization Name</label>
                      <input
                        type="text"
                        value={signUpOrg}
                        onChange={(e) => setSignUpOrg(e.target.value)}
                        placeholder="e.g. Klinikum Offenbach am Main"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>

                    {signUpRole === 'CLIENT_CLINIC' && (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Hessen Contract Number</label>
                        <input
                          type="text"
                          value={signUpContractOrPin}
                          onChange={(e) => setSignUpContractOrPin(e.target.value)}
                          placeholder="e.g. CTR-2026-OFFENBACH"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                    )}

                    {signUpRole === 'DRIVER' && (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Driver 4-Digit Security PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={signUpContractOrPin}
                          onChange={(e) => setSignUpContractOrPin(e.target.value)}
                          placeholder="e.g. 5501"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-[11px] text-slate-400 flex items-center justify-between">
                    <span>🔒 Account will be registered with role scope: <strong className="text-white">{signUpRole}</strong></span>
                    <span className="text-emerald-400 font-mono font-bold">DSGVO Compliant</span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg flex items-center space-x-2"
                    >
                      <span>Create & Launch Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'SHARE_CREDENTIALS' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span>How to Share Logins with Clinic Clients & Drivers</span>
                  </h4>

                  <button
                    onClick={handleCopyShare}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all"
                  >
                    {copiedShare ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShare ? 'Copied Share Credentials!' : 'Copy Credentials Sheet'}</span>
                  </button>
                </div>

                <p className="text-slate-400 leading-relaxed">
                  You can copy and send these demo login credentials to clinic administrators, couriers, or business stakeholders to test each portal role directly:
                </p>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-[11px] text-slate-300 space-y-3 leading-relaxed select-all">
                  <div>
                    <strong className="text-blue-400 block">1. CLINIC CLIENT PORTAL (Place Pickups & View Invoices)</strong>
                    <span>• Login Email: probeneingang@kgu.de</span><br />
                    <span>• Clinic: Universitätsklinikum Frankfurt am Main</span><br />
                    <span>• Active Contract ID: CTR-2026-UKF</span>
                  </div>

                  <div>
                    <strong className="text-emerald-400 block">2. DRIVER MOBILE APP (Sequential Pickups & Offline Mode)</strong>
                    <span>• Driver Name: Hans Schmidt (Kurier 104)</span><br />
                    <span>• Vehicle Reg: F-MG 7741 (Thermo Van Hessen)</span><br />
                    <span>• Driver Security PIN: 1044</span>
                  </div>

                  <div>
                    <strong className="text-red-400 block">3. CEO & CENTRAL DISPATCH DASHBOARD</strong>
                    <span>• Email: dispatch@medigo-hessen.de</span><br />
                    <span>• Role: CEO / Central Operations Command</span><br />
                    <span>• Includes: Sensor Spike Alarms, Live Map, Financial Invoices & Legal DSGVO AVV</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-800/80 border-t border-slate-700 p-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-red-400" />
            <span>Currently logged in: <strong className="text-white">{currentUser?.name || 'MediGo Guest'}</strong> ({currentUser?.role || 'DRIVER'})</span>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-1.5 rounded-lg transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
