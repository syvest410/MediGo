import React, { useState } from 'react';
import medigoLogoImg from '../../assets/images/medigo_logo_1785514597465.jpg';
import medigoNightImg from '../../assets/images/medigo_night_fleet_1785703838127.jpg';
import medigoHeroDayImg from '../../assets/images/medigo_van_hero_day_1785705443992.jpg';
import medigoHeroNightImg from '../../assets/images/medigo_courier_hero_night_1785705461334.jpg';
import { 
  Building2, 
  Truck, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Key, 
  Smartphone, 
  Scale, 
  Thermometer, 
  MapPin, 
  Zap,
  Clock,
  Award,
  Share2,
  Copy,
  ChevronRight,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { Role, User } from '../../types';
import { INITIAL_USERS } from '../../lib/db';

interface HomePageLandingProps {
  onLogin: (user: User, initialViewMode?: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' | 'LEGAL_COMPLIANCE') => void;
  onOpenMobileInstall: () => void;
  isNightShift?: boolean;
  onToggleNightShift?: () => void;
}

export const HomePageLanding: React.FC<HomePageLandingProps> = ({
  onLogin,
  onOpenMobileInstall,
  isNightShift = false,
  onToggleNightShift
}) => {
  const [selectedRole, setSelectedRole] = useState<Role>('CLIENT_CLINIC');
  const [emailInput, setEmailInput] = useState('probeneingang@kgu.de');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [pinInput, setPinInput] = useState('1044');
  const [contractInput, setContractInput] = useState('CTR-2026-UKF');
  const [copiedShare, setCopiedShare] = useState(false);

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = INITIAL_USERS.find(u => u.role === selectedRole) || INITIAL_USERS[0];
    let viewMode: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' = 'DISPATCH_DASHBOARD';
    if (selectedRole === 'CLIENT_CLINIC') viewMode = 'CLIENT_PORTAL';
    if (selectedRole === 'DRIVER') viewMode = 'DRIVER_MOBILE';

    onLogin(user, viewMode);
  };

  const handleQuickLogin = (role: Role, viewMode: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL') => {
    const user = INITIAL_USERS.find(u => u.role === role) || INITIAL_USERS[0];
    onLogin(user, viewMode);
  };

  const shareText = `🏥 MediGo Hessen Medical Logistics — Demo Credentials:
• CLINIC PORTAL: probeneingang@kgu.de (Contract: CTR-2026-UKF)
• DRIVER APP: Hans Schmidt (PIN: 1044, Vehicle: F-MG 7741)
• CEO DISPATCH: dispatch@medigo-hessen.de`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col font-sans selection:bg-red-600 selection:text-white ${
      isNightShift ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Top Navigation Bar */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 ${
        isNightShift ? 'border-slate-800 bg-slate-900/90 text-white' : 'border-slate-200 bg-white/95 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
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
              <div className="flex items-center space-x-2">
                <span className={`text-xl font-black tracking-tight ${isNightShift ? 'text-white' : 'text-slate-900'}`}>
                  <span className="text-red-600">Medi</span>Go
                </span>
                <span className={`border text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  isNightShift ? 'bg-red-950 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  Hessen
                </span>
              </div>
              <p className={`text-[11px] ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>UN 3373 Category B Medical Courier & Laboratory Express</p>
            </div>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center space-x-3 text-xs">
            {onToggleNightShift && (
              <button
                onClick={onToggleNightShift}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${
                  isNightShift
                    ? 'bg-indigo-950 border-indigo-600 text-indigo-200 hover:bg-indigo-900'
                    : 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                }`}
                title="Toggle Clear (Light) Mode vs Dark Mode"
              >
                {isNightShift ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-600" />}
                <span>{isNightShift ? '🌙 Dark Mode' : '☀️ Clear Mode'}</span>
              </button>
            )}

            <button
              onClick={onOpenMobileInstall}
              className={`hidden sm:flex items-center space-x-1.5 border px-3 py-1.5 rounded-lg transition-all ${
                isNightShift
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
              <span>Get Mobile App</span>
            </button>

            <button
              onClick={() => handleQuickLogin('CLIENT_CLINIC', 'CLIENT_PORTAL')}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In to Portal</span>
            </button>
          </div>

        </div>
      </header>

      {/* FIRST SECTION / HERO SECTION WITH DYNAMIC BACKGROUND IMAGE */}
      <section className="relative overflow-hidden min-h-[580px] py-12 px-4 sm:px-6 w-full flex-1 flex flex-col justify-center">
        
        {/* Full Section Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={isNightShift ? medigoHeroNightImg : medigoHeroDayImg} 
            alt={isNightShift ? "MediGo Night Delivery Fleet Hero" : "MediGo Day Delivery Fleet Hero"}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center transform scale-100 transition-all duration-700 filter brightness-90"
          />
          {/* Backdrop Masking Gradient for Crystal Clear Image Visibility and Text Legibility */}
          <div className={`absolute inset-0 transition-all duration-500 ${
            isNightShift 
              ? 'bg-gradient-to-r from-slate-950/90 via-slate-950/80 to-slate-900/60' 
              : 'bg-gradient-to-r from-slate-950/85 via-slate-950/75 to-slate-900/50'
          }`} />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Headline & Value Prop */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center space-x-2 bg-red-950/80 border border-red-800/80 px-3 py-1 rounded-full text-red-300 text-xs font-semibold backdrop-blur-sm">
                <Award className="w-3.5 h-3.5 text-red-400" />
                <span>State of Hesse Medical Courier & Specimen Logistics Engine</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
                Mission-Critical <span className="text-red-500">UN 3373</span> Medical Logistics for Hessen Clinics & Labs
              </h1>

              <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-medium drop-shadow-sm">
                MediGo connects university hospitals, pathology centers, and emergency laboratories across Frankfurt am Main, Marburg, Kassel, and Wiesbaden with temperature-monitored courier transport, offline state machine tracking, and GDPR-compliant legal AVV governance.
              </p>

              {/* Quick Feature Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-100">
                <div className="bg-slate-900/80 border border-slate-700/80 backdrop-blur-md p-2.5 rounded-xl flex items-center space-x-2 shadow-lg">
                  <Thermometer className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-medium">2-8°C & -20°C Thermal Logs</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-700/80 backdrop-blur-md p-2.5 rounded-xl flex items-center space-x-2 shadow-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">German P650 & TFG Compliant</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-700/80 backdrop-blur-md p-2.5 rounded-xl flex items-center space-x-2 shadow-lg">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium">Offline Basement Sync</span>
                </div>
              </div>

              {/* Demo Share Bar */}
              <div className="bg-slate-900/85 border border-slate-700/80 backdrop-blur-md p-3 rounded-xl flex items-center justify-between text-xs text-slate-300 shadow-xl">
                <span className="truncate pr-2 font-medium">Need credentials for testing? Copy pre-filled demo accounts.</span>
                <button
                  onClick={handleCopyShare}
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-1.5 rounded-lg flex items-center space-x-1 shrink-0 font-semibold shadow-sm transition-all"
                >
                  {copiedShare ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedShare ? 'Copied!' : 'Copy Demo Logins'}</span>
                </button>
              </div>

              {/* Fleet & Courier Showcase Banner */}
              <div className={`border rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-4 shadow-2xl backdrop-blur-md overflow-hidden transition-all ${
                isNightShift 
                  ? 'bg-indigo-950/75 border-indigo-700/80 text-white' 
                  : 'bg-slate-900/85 border-slate-700/80 text-white'
              }`}>
                <div className="w-full sm:w-48 h-32 rounded-xl overflow-hidden border border-slate-600 shrink-0 relative group shadow-md">
                  <img 
                    src={isNightShift ? medigoNightImg : medigoLogoImg} 
                    alt={isNightShift ? "MediGo 24/7 Notfall-Nachtdienst Vehicle" : "MediGo UN 3373 Delivery Fleet Van"} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-1 right-1 bg-slate-950/90 backdrop-blur text-red-400 font-bold text-[9px] px-1.5 py-0.5 rounded border border-slate-700 flex items-center space-x-1">
                    {isNightShift ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-amber-400" />}
                    <span>{isNightShift ? 'NIGHT F-MG 7741' : 'DAY F-MG 7741'}</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                      isNightShift
                        ? 'bg-indigo-900 text-indigo-200 border-indigo-600'
                        : 'bg-red-950 text-red-300 border-red-800'
                    }`}>
                      {isNightShift ? '24/7 Notfall-Nachtdienst Active' : 'MediGo Hessen Fleet & Courier'}
                    </span>
                    {onToggleNightShift && (
                      <button
                        onClick={onToggleNightShift}
                        className="text-[10px] text-slate-300 hover:text-white underline font-semibold"
                      >
                        {isNightShift ? 'Switch to Day Mode' : 'Switch to Night Mode'}
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {isNightShift ? '24/7 Emergency Night Shift Specimen Transport' : 'Dedicated UN 3373 Specimen Transport Vehicle'}
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {isNightShift
                      ? 'Active 20:00 - 06:00 Night Shift protocol for emergency STAT lab samples between Hessen ER clinics with automated +25% night surcharge logs.'
                      : 'Equipped with GPS live tracking telemetry, P650 specimen boxes, active 2-8°C / -20°C temperature regulation, and reflective courier uniforms.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Right Column: Secure Portal Login Form */}
            <div className="lg:col-span-5">
              <div className={`border rounded-2xl p-6 shadow-2xl space-y-5 relative backdrop-blur-md transition-colors duration-300 ${
                isNightShift 
                  ? 'bg-slate-900/90 border-slate-800 text-white' 
                  : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
              }`}>
                
                <div className={`border-b pb-4 ${isNightShift ? 'border-slate-800' : 'border-slate-200'}`}>
                  <h2 className={`text-lg font-bold flex items-center space-x-2 ${isNightShift ? 'text-white' : 'text-slate-900'}`}>
                    <Lock className="w-4 h-4 text-red-600" />
                    <span>MediGo Portal Secure Login</span>
                  </h2>
                  <p className={`text-xs mt-0.5 ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
                    Select your assigned organization role to access your dedicated dashboard.
                  </p>
                </div>

              {/* Role Selection Tabs */}
              <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border text-xs ${
                isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('CLIENT_CLINIC');
                    setEmailInput('probeneingang@kgu.de');
                  }}
                  className={`py-2 px-1 rounded-lg font-bold transition-all flex flex-col items-center justify-center text-center space-y-1 ${
                    selectedRole === 'CLIENT_CLINIC'
                      ? 'bg-red-600 text-white shadow'
                      : isNightShift ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Clinic</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('DRIVER');
                  }}
                  className={`py-2 px-1 rounded-lg font-bold transition-all flex flex-col items-center justify-center text-center space-y-1 ${
                    selectedRole === 'DRIVER'
                      ? 'bg-red-600 text-white shadow'
                      : isNightShift ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Courier</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('DISPATCHER');
                    setEmailInput('dispatch@medigo-hessen.de');
                  }}
                  className={`py-2 px-1 rounded-lg font-bold transition-all flex flex-col items-center justify-center text-center space-y-1 ${
                    selectedRole === 'DISPATCHER'
                      ? 'bg-red-600 text-white shadow'
                      : isNightShift ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>CEO / Ops</span>
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
                
                {selectedRole === 'CLIENT_CLINIC' && (
                  <>
                    <div>
                      <label className={`block font-semibold mb-1 ${isNightShift ? 'text-slate-300' : 'text-slate-700'}`}>Clinic Email Address</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-red-500 border ${
                          isNightShift ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block font-semibold mb-1 ${isNightShift ? 'text-slate-300' : 'text-slate-700'}`}>Hessen Contract Number</label>
                      <input
                        type="text"
                        required
                        value={contractInput}
                        onChange={(e) => setContractInput(e.target.value)}
                        className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-red-500 font-mono border ${
                          isNightShift ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      <span className={`text-[10px] mt-0.5 block ${isNightShift ? 'text-slate-500' : 'text-slate-500'}`}>Preset: CTR-2026-UKF (Uniklinik Frankfurt)</span>
                    </div>
                  </>
                )}

                {selectedRole === 'DRIVER' && (
                  <>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Driver Name / Vehicle</label>
                      <input
                        type="text"
                        readOnly
                        value="Hans Schmidt (Courier 104 • F-MG 7741)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-300 focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Driver Security PIN</label>
                      <input
                        type="password"
                        required
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 font-mono text-base tracking-widest"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Demo Driver Security PIN: 1044</span>
                    </div>
                  </>
                )}

                {selectedRole === 'DISPATCHER' && (
                  <>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Management Dispatcher Email</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 text-sm"
                >
                  <span>Authenticate & Launch Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

              </form>

              {/* Direct 1-Click Login Shortcuts */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block text-center">
                  Instant 1-Click Demo Logins
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickLogin('CLIENT_CLINIC', 'CLIENT_PORTAL')}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-blue-400 py-2 rounded-lg text-[11px] font-bold transition-all text-center truncate px-1"
                  >
                    Clinic Login
                  </button>
                  <button
                    onClick={() => handleQuickLogin('DRIVER', 'DRIVER_MOBILE')}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 py-2 rounded-lg text-[11px] font-bold transition-all text-center truncate px-1"
                  >
                    Driver Login
                  </button>
                  <button
                    onClick={() => handleQuickLogin('DISPATCHER', 'DISPATCH_DASHBOARD')}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-red-400 py-2 rounded-lg text-[11px] font-bold transition-all text-center truncate px-1"
                  >
                    CEO Login
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
      </section>

      {/* PORTAL OVERVIEW SECTION */}
      <section className={`py-12 px-4 sm:px-6 border-t border-b transition-colors duration-300 ${
        isNightShift 
          ? 'bg-slate-900 border-slate-800 text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className={`text-2xl font-bold ${isNightShift ? 'text-white' : 'text-slate-900'}`}>Three Isolated Role Dashboards</h2>
            <p className={`text-xs ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
              Strict security isolation ensures clients, drivers, and CEO management see only the data and functionality required for their operational scope.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Role 1 Card */}
            <div className={`p-6 rounded-2xl space-y-4 border transition-all ${
              isNightShift 
                ? 'bg-slate-950 border-slate-800 hover:border-blue-500/50 text-slate-100' 
                : 'bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-900 shadow-sm'
            }`}>
              <div className="w-12 h-12 bg-blue-950 text-blue-400 rounded-xl flex items-center justify-center border border-blue-800">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${isNightShift ? 'text-white' : 'text-slate-900'}`}>1. Clinic Client Portal</h3>
                <p className={`text-xs mt-1 ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
                  Built for hospital ward staff & laboratory receptionists to request UN 3373 specimen pickups.
                </p>
              </div>
              <ul className={`text-xs space-y-2 border-t pt-3 ${isNightShift ? 'border-slate-900 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Instant UN 3373 pickup booking & box count</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Live driver ETA map & arrival updates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Automated monthly contract billing & invoices</span>
                </li>
              </ul>
              <button
                onClick={() => handleQuickLogin('CLIENT_CLINIC', 'CLIENT_PORTAL')}
                className={`w-full font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1 border ${
                  isNightShift 
                    ? 'bg-slate-900 hover:bg-slate-800 text-blue-400 border-blue-900' 
                    : 'bg-white hover:bg-slate-100 text-blue-600 border-blue-300 shadow-sm'
                }`}
              >
                <span>Launch Clinic Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Role 2 Card */}
            <div className={`p-6 rounded-2xl space-y-4 border transition-all ${
              isNightShift 
                ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/50 text-slate-100' 
                : 'bg-slate-50 border-slate-200 hover:border-emerald-400 text-slate-900 shadow-sm'
            }`}>
              <div className="w-12 h-12 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-800">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${isNightShift ? 'text-white' : 'text-slate-900'}`}>2. Driver Courier App</h3>
                <p className={`text-xs mt-1 ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
                  Mobile PWA & native APK workflow for drivers navigating hospital basements and courier routes.
                </p>
              </div>
              <ul className={`text-xs space-y-2 border-t pt-3 ${isNightShift ? 'border-slate-900 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Sequential state machine (Pre-check to Delivery)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Offline queueing for basement signal blindspots</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Job Marketplace for claiming available orders</span>
                </li>
              </ul>
              <button
                onClick={() => handleQuickLogin('DRIVER', 'DRIVER_MOBILE')}
                className={`w-full font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1 border ${
                  isNightShift 
                    ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-emerald-900' 
                    : 'bg-white hover:bg-slate-100 text-emerald-600 border-emerald-300 shadow-sm'
                }`}
              >
                <span>Launch Driver App</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Role 3 Card */}
            <div className={`p-6 rounded-2xl space-y-4 border transition-all ${
              isNightShift 
                ? 'bg-slate-950 border-slate-800 hover:border-red-500/50 text-slate-100' 
                : 'bg-slate-50 border-slate-200 hover:border-red-400 text-slate-900 shadow-sm'
            }`}>
              <div className="w-12 h-12 bg-red-950 text-red-400 rounded-xl flex items-center justify-center border border-red-800">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${isNightShift ? 'text-white' : 'text-slate-900'}`}>3. CEO Dispatch Command</h3>
                <p className={`text-xs mt-1 ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
                  Central fleet control dashboard with live thermal sensor breach alarms & legal compliance vault.
                </p>
              </div>
              <ul className={`text-xs space-y-2 border-t pt-3 ${isNightShift ? 'border-slate-900 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Live GPS telemetry map & thermal breach spikes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Chain of custody audit trails & signature PDFs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>GDPR Art. 28 AVV legal agreements & DSGVO data</span>
                </li>
              </ul>
              <button
                onClick={() => handleQuickLogin('DISPATCHER', 'DISPATCH_DASHBOARD')}
                className={`w-full font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1 border ${
                  isNightShift 
                    ? 'bg-slate-900 hover:bg-slate-800 text-red-400 border-red-900' 
                    : 'bg-white hover:bg-slate-100 text-red-600 border-red-300 shadow-sm'
                }`}
              >
                <span>Launch CEO Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className={`py-6 px-4 sm:px-6 border-t text-xs text-center transition-colors ${
        isNightShift ? 'border-slate-900 bg-slate-950 text-slate-500' : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 MediGo Logistics Hessen GmbH • Frankfurt am Main</span>
          <span>EU DSGVO Data Privacy & Transfusionsgesetz (§ 15 TFG) Certified</span>
        </div>
      </footer>

    </div>
  );
};
