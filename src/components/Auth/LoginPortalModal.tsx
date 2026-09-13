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
  Info,
  AlertTriangle,
  Eye,
  EyeOff,
  Database
} from 'lucide-react';
import { Role, User } from '../../types';
import { INITIAL_USERS } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';

interface LoginPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectUser: (user: User, preferredViewMode?: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' | 'LEGAL_COMPLIANCE') => void;
  onRegisterUser?: (newUser: User) => void;
}

interface DemoRoleInfo {
  role: Role;
  name: string;
  email: string;
  defaultPass: string;
  pinOrContract?: string;
  org: string;
  view: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL';
  leastPrivilegeTitle: string;
  allowed: string[];
  restricted: string[];
}

const DEMO_ROLES: DemoRoleInfo[] = [
  {
    role: 'CLIENT_CLINIC',
    name: 'Dr. Martin Hoffmann',
    email: 'probeneingang@kgu.de',
    defaultPass: 'ClinicPass2026!',
    pinOrContract: 'CTR-2026-UKF-HE-01',
    org: 'Universitätsklinikum Frankfurt am Main',
    view: 'CLIENT_PORTAL',
    leastPrivilegeTitle: 'Clinic Client Isolation (GDPR Art. 9 & BDSG)',
    allowed: [
      'Create & schedule UN 3373 diagnostic pickups',
      'View cold-chain status & ETA for own shipments',
      'Access monthly transport invoices & billing'
    ],
    restricted: [
      'Cannot view shipments from other hospitals',
      'Cannot access driver telematics vehicle diagnostics',
      'Cannot modify dispatch routes or driver fleet'
    ]
  },
  {
    role: 'DRIVER',
    name: 'Hans Schmidt (Kurier 104)',
    email: 'hans.schmidt@medigo-hessen.de',
    defaultPass: 'DriverPass2026!',
    pinOrContract: '1044',
    org: 'MediGo Hessen Kurierflotte',
    view: 'DRIVER_MOBILE',
    leastPrivilegeTitle: 'Courier Operational Scope (ADR P650 Safety)',
    allowed: [
      'View assigned delivery tasks & open dispatch board',
      'Execute sequential UN 3373 pre-trip checklist',
      'Log electronic chain-of-custody (Handover/POD)'
    ],
    restricted: [
      'Commercial tariffs & B2B profit margins stripped',
      'Cannot view orders assigned to other couriers',
      'Cannot edit client billing agreements or tariffs'
    ]
  },
  {
    role: 'LAB_STAFF',
    name: 'Sabine Neumann (Laborleitung)',
    email: 'empfang@synlab-hessen.de',
    defaultPass: 'LabPass2026!',
    pinOrContract: 'CTR-2026-SYNLAB-04',
    org: 'Synlab Medizinisches Versorgungszentrum Frankfurt',
    view: 'DISPATCH_DASHBOARD',
    leastPrivilegeTitle: 'Laboratory Receiving Gatekeeper',
    allowed: [
      'View inbound diagnostic shipments destined for Synlab',
      'Sign digital reception protocols & sample condition check',
      'Verify temperature compliance upon arrival'
    ],
    restricted: [
      'Cannot view orders consigned to other laboratories',
      'Cannot access hospital invoice rates or driver payroll',
      'Cannot create courier assignments or dispatches'
    ]
  },
  {
    role: 'DISPATCHER',
    name: 'Katrin Weber (Dispatch Zentrale)',
    email: 'dispatch@medigo-hessen.de',
    defaultPass: 'Dispatch2026!',
    org: 'MediGo Zentrale Wiesbaden',
    view: 'DISPATCH_DASHBOARD',
    leastPrivilegeTitle: 'Regional Logistics Command & Telemetry Ops',
    allowed: [
      'Live GPS map & real-time route assignment across Hessen',
      'Immediate temperature spike alerts & breach handling',
      'Emergency reroute & carrier capacity management'
    ],
    restricted: [
      'Cannot delete audit trail logs (immutable BDSG records)',
      'Cannot modify database schemas or encryption keys'
    ]
  },
  {
    role: 'ADMIN',
    name: 'Admin (nsansvester89)',
    email: 'nsansvester89@gmail.com',
    defaultPass: 'AdminPass2026!',
    org: 'BioDispatch / MediGo Zentrale',
    view: 'DISPATCH_DASHBOARD',
    leastPrivilegeTitle: 'System Administrator & Compliance Officer',
    allowed: [
      'User provisioning & role management (Admin CRUD)',
      'Immutable security audit log review (ISO 27001)',
      'Tariff matrix configuration & GDPR AVV certificates'
    ],
    restricted: [
      'Requires separate multi-factor authentication for DB drops',
      'All administrative actions permanently audit-logged'
    ]
  }
];

export const LoginPortalModal: React.FC<LoginPortalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onRegisterUser,
}) => {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'SIGNUP' | 'POLP_MATRIX' | 'SHARE_CREDENTIALS'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<Role>('CLIENT_CLINIC');
  const [emailInput, setEmailInput] = useState('probeneingang@kgu.de');
  const [passwordInput, setPasswordInput] = useState('ClinicPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  // Sync default credentials when selecting role in form
  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    const demo = DEMO_ROLES.find(r => r.role === role);
    if (demo) {
      setEmailInput(demo.email);
      setPasswordInput(demo.defaultPass);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const result = await login(emailInput.trim(), passwordInput);
      if (result.success) {
        const matchedUser = INITIAL_USERS.find(u => u.email.toLowerCase() === emailInput.trim().toLowerCase()) 
          || INITIAL_USERS.find(u => u.role === selectedRole) 
          || INITIAL_USERS[0];

        let preferredView: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' = 'DISPATCH_DASHBOARD';
        if (matchedUser.role === 'CLIENT_CLINIC') preferredView = 'CLIENT_PORTAL';
        if (matchedUser.role === 'DRIVER') preferredView = 'DRIVER_MOBILE';

        onSelectUser(matchedUser, preferredView);
        onClose();
      } else {
        setAuthError(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demo: DemoRoleInfo) => {
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const result = await login(demo.email, demo.defaultPass);
      if (result.success) {
        const matchedUser = INITIAL_USERS.find(u => u.email.toLowerCase() === demo.email.toLowerCase()) 
          || INITIAL_USERS.find(u => u.role === demo.role) 
          || INITIAL_USERS[0];

        onSelectUser(matchedUser, demo.view);
        onClose();
      } else {
        setAuthError(result.error || `Could not log in as ${demo.name}.`);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login connection error.');
    } finally {
      setIsSubmitting(false);
    }
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

    setSignUpSuccessMsg(`Account created for ${signUpName} (${signUpRole})! Signing in...`);
    
    setTimeout(() => {
      let preferredView: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' = 'DISPATCH_DASHBOARD';
      if (signUpRole === 'CLIENT_CLINIC') preferredView = 'CLIENT_PORTAL';
      if (signUpRole === 'DRIVER') preferredView = 'DRIVER_MOBILE';

      onSelectUser(newUser, preferredView);
      onClose();
    }, 1200);
  };

  const shareText = `MediGo Hessen UN 3373 Medical Logistics — Demo Credentials & Least Privilege Matrix:

1. CLINIC CLIENT PORTAL (Hospital Ward & Diagnostics)
   • Email: probeneingang@kgu.de
   • Password: ClinicPass2026!
   • Contract ID: CTR-2026-UKF-HE-01
   • Least Privilege: Can ONLY access UK Frankfurt orders; invoices & patient barcodes visible; other hospitals & driver vehicle mechanics isolated.

2. DRIVER MOBILE APP & LIVE COURIER MANIFEST
   • Email: hans.schmidt@medigo-hessen.de
   • Password: DriverPass2026!
   • Driver PIN: 1044 (Vehicle F-MG 7741 Thermo Van)
   • Least Privilege: Can ONLY access assigned shipments & open route board; commercial pricing & B2B margins stripped; sequential pre-trip safety checklist required.

3. LABORATORY RECEIVING STAFF (Synlab MVZ Frankfurt)
   • Email: empfang@synlab-hessen.de
   • Password: LabPass2026!
   • Least Privilege: Can ONLY view specimens consigned to Synlab dock; can sign arrival handover protocol; pricing & unrelated clinics restricted.

4. CENTRAL DISPATCHER (Regional Hessen Fleet Operations)
   • Email: dispatch@medigo-hessen.de
   • Password: Dispatch2026!
   • Least Privilege: Real-time GPS tracking, temperature spike alarms, dynamic re-routing across all Hessen hubs.

5. SYSTEM ADMINISTRATOR & COMPLIANCE OFFICER
   • Email: nsansvester89@gmail.com
   • Password: AdminPass2026!
   • Least Privilege: User provisioning, role-based access audit logs, tariff management, and GDPR Art. 9 / AVV compliance exports.

PUBLIC TRACKING (Zero Auth Required):
   • Route: /api/orders/track/:trackingNumber
   • Exposes milestones & temperature safety ONLY. Strips all patient notes & commercial pricing.`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl text-slate-100 my-auto">
        
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
                <span>MediGo Security & Role Access Portal</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  PoLP Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">Enforcing Principle of Least Privilege for UN 3373 Medical Specimens</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('LOGIN')}
            className={`flex-1 py-3 px-4 font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'LOGIN'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>1-Click Sample Logins</span>
          </button>

          <button
            onClick={() => setActiveTab('POLP_MATRIX')}
            className={`flex-1 py-3 px-4 font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'POLP_MATRIX'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Least Privilege Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('SIGNUP')}
            className={`flex-1 py-3 px-4 font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'SIGNUP'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Register Account</span>
          </button>

          <button
            onClick={() => setActiveTab('SHARE_CREDENTIALS')}
            className={`flex-1 py-3 px-4 font-bold border-b-2 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'SHARE_CREDENTIALS'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Credentials Sheet</span>
          </button>
        </div>

        {/* Global Error Notice (e.g. rate limiting or invalid credentials) */}
        {authError && (
          <div className="mx-6 mt-4 p-3 bg-red-950/80 border border-red-700/80 rounded-xl flex items-start space-x-3 text-red-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block text-red-300">Authentication Alert</strong>
              <span>{authError}</span>
            </div>
            <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-red-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {activeTab === 'LOGIN' && (
            <div className="space-y-6">
              
              {/* Role Cards with PoLP details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Choose an Authenticated Sample Persona
                  </label>
                  <span className="text-[11px] text-slate-400">
                    5-attempt brute-force protection active
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DEMO_ROLES.map((demo) => {
                    const isClient = demo.role === 'CLIENT_CLINIC';
                    const isDriver = demo.role === 'DRIVER';
                    const isLab = demo.role === 'LAB_STAFF';
                    const isAdmin = demo.role === 'ADMIN';

                    const badgeColor = isClient 
                      ? 'bg-blue-950 text-blue-300 border-blue-800'
                      : isDriver 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : isLab 
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : isAdmin 
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : 'bg-red-950 text-red-300 border-red-800';

                    const icon = isClient ? <Building2 className="w-5 h-5 text-blue-400" />
                      : isDriver ? <Truck className="w-5 h-5 text-emerald-400" />
                      : isLab ? <TestTube className="w-5 h-5 text-amber-400" />
                      : isAdmin ? <ShieldCheck className="w-5 h-5 text-purple-400" />
                      : <ShieldCheck className="w-5 h-5 text-red-400" />;

                    return (
                      <div
                        key={demo.role}
                        onClick={() => !isSubmitting && handleQuickLogin(demo)}
                        className={`bg-slate-950 border border-slate-800 hover:border-red-500 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] group space-y-3 flex flex-col justify-between ${
                          isSubmitting ? 'opacity-60 pointer-events-none' : ''
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                              {icon}
                            </div>
                            <span className={`text-[10px] border px-2 py-0.5 rounded font-bold ${badgeColor}`}>
                              {demo.role}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">
                              {demo.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {demo.org}
                            </p>
                          </div>

                          <div className="bg-slate-900/90 rounded-lg p-2 text-[10px] space-y-1 border border-slate-800/80 font-mono">
                            <div className="flex justify-between text-slate-400">
                              <span>Login:</span>
                              <span className="text-slate-200 font-semibold">{demo.email}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Password:</span>
                              <span className="text-emerald-400 font-semibold">{demo.defaultPass}</span>
                            </div>
                            {demo.pinOrContract && (
                              <div className="flex justify-between text-slate-400">
                                <span>Ref / PIN:</span>
                                <span className="text-amber-400">{demo.pinOrContract}</span>
                              </div>
                            )}
                          </div>

                          {/* Least Privilege Summary */}
                          <div className="text-[10px] text-slate-400 leading-tight border-t border-slate-900 pt-2 space-y-1">
                            <span className="font-semibold text-slate-300 block">{demo.leastPrivilegeTitle}</span>
                            <div className="text-emerald-400/90 flex items-center space-x-1">
                              <span>✓</span>
                              <span className="line-clamp-1">{demo.allowed[0]}</span>
                            </div>
                            <div className="text-red-400/80 flex items-center space-x-1">
                              <span>✕</span>
                              <span className="line-clamp-1">{demo.restricted[0]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-semibold text-red-400">
                          <span>1-Click Authenticate</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Manual Credentials Form */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <Key className="w-4 h-4 text-red-400" />
                      <span>Custom Credentials Login</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Authenticates directly against bcrypt-hashed user accounts with JWT session issuance.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Bcrypt + JWT</span>
                </div>

                <form onSubmit={handleCustomLogin} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Target Portal Role</label>
                      <select
                        value={selectedRole}
                        onChange={(e) => handleRoleChange(e.target.value as Role)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="CLIENT_CLINIC">Clinic Client (Hospital / Ward)</option>
                        <option value="DRIVER">Courier Driver (Mobile Manifest)</option>
                        <option value="LAB_STAFF">Laboratory Staff (Dock Receiving)</option>
                        <option value="DISPATCHER">Central Dispatcher (Operations)</option>
                        <option value="ADMIN">CEO / Compliance Officer (Full Admin)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 pr-9 text-white focus:outline-none focus:border-red-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-400">
                      Rate limit: 5 attempts per 5 minutes before account lock
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg flex items-center space-x-2"
                    >
                      <span>{isSubmitting ? 'Authenticating...' : 'Sign In with Credentials'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {activeTab === 'POLP_MATRIX' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Principle of Least Privilege (PoLP) Enforcement Matrix</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Complies with GDPR Art. 9 (Health Data Protection), German BDSG, and ADR P650 specimen transport standards.
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    Zero-Trust Model
                  </span>
                </div>

                <div className="space-y-4">
                  {DEMO_ROLES.map((demo) => (
                    <div key={demo.role} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{demo.name}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-semibold">
                            {demo.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{demo.org}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-950/80 border border-emerald-900/50 p-3 rounded-lg space-y-1.5">
                          <div className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Authorized Capabilities (Scope of Work)</span>
                          </div>
                          <ul className="space-y-1 text-slate-300 text-[11px]">
                            {demo.allowed.map((item, i) => (
                              <li key={i} className="flex items-start space-x-1.5">
                                <span className="text-emerald-400 shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-950/80 border border-red-900/50 p-3 rounded-lg space-y-1.5">
                          <div className="text-red-400 font-semibold flex items-center space-x-1.5">
                            <X className="w-3.5 h-3.5" />
                            <span>Enforced Isolation (Forbidden by PoLP)</span>
                          </div>
                          <ul className="space-y-1 text-slate-300 text-[11px]">
                            {demo.restricted.map((item, i) => (
                              <li key={i} className="flex items-start space-x-1.5">
                                <span className="text-red-400 shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Public Tracking Isolation */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="font-bold text-white text-sm">Public Tracking Inquiries (Unauthenticated)</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        NO_AUTH_REQUIRED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Anyone with a tracking number (e.g. clinic nurse or lab intake) can verify milestone progress and temperature compliance via <code className="text-red-400 bg-slate-950 px-1 py-0.5 rounded font-mono">/api/orders/track/:trackingNumber</code>. All diagnostic barcodes, patient clinical notes, courier telemetry physics, and tariff pricing are stripped at the API layer.
                    </p>
                  </div>
                </div>
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
                        <option value="LAB_STAFF">Laboratory Staff (Dock Receiving)</option>
                        <option value="DISPATCHER">Central Dispatcher (Full Operations Access)</option>
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
                    <span>Account will be registered with role scope: <strong className="text-white">{signUpRole}</strong></span>
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
                    <span>Demo Credentials Cheat Sheet</span>
                  </h4>

                  <button
                    onClick={handleCopyShare}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all"
                  >
                    {copiedShare ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShare ? 'Copied Credentials Sheet!' : 'Copy Credentials Sheet'}</span>
                  </button>
                </div>

                <p className="text-slate-400 leading-relaxed">
                  Use this cheat sheet to share login access with stakeholders, clinic staff, or test users:
                </p>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-[11px] text-slate-300 space-y-3 leading-relaxed select-all">
                  {DEMO_ROLES.map((demo) => (
                    <div key={demo.role} className="border-b border-slate-800 pb-2.5 last:border-b-0 last:pb-0">
                      <strong className="text-red-400 block">{demo.name} ({demo.role})</strong>
                      <span>• Email: {demo.email}</span><br />
                      <span>• Password: {demo.defaultPass}</span><br />
                      {demo.pinOrContract && <span>• Ref/PIN: {demo.pinOrContract}<br /></span>}
                      <span className="text-slate-400 text-[10px]">• Scope: {demo.leastPrivilegeTitle}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-800/80 border-t border-slate-700 p-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-red-400" />
            <span>Currently active: <strong className="text-white">{currentUser?.name || 'MediGo Guest'}</strong> ({currentUser?.role || 'DRIVER'})</span>
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

