import React, { useState, useEffect } from 'react';
import { Role, User } from '../types';
import { offlineQueue } from '../lib/offlineQueue';
import medigoLogoImg from '../assets/images/medigo_logo_1785514597465.jpg';
import { 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  FileCode, 
  Building2, 
  HelpCircle, 
  Scale, 
  Download, 
  Key, 
  LogIn, 
  UserCheck, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Globe,
  MapPin,
  Users,
  Database,
  Crown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DatabaseStatus } from '../context/AuthContext';

interface HeaderProps {
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  currentUser?: User | null;
  viewMode: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' | 'LEGAL_COMPLIANCE' | 'PRISMA_SCHEMA' | 'SECURITY_AUDIT';
  setViewMode: (mode: 'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' | 'LEGAL_COMPLIANCE' | 'PRISMA_SCHEMA' | 'SECURITY_AUDIT') => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  pendingCount: number;
  activeBreachesCount: number;
  onManualSync: () => void;
  onOpenTempGuide?: () => void;
  onOpenMobileInstall?: () => void;
  onOpenLoginPortal?: () => void;
  onOpenUserManagement?: () => void;
  dbStatus?: DatabaseStatus | null;
  onLogout?: () => void;
  isNightShift?: boolean;
  onToggleNightShift?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeRole,
  setActiveRole,
  currentUser,
  viewMode,
  setViewMode,
  isOffline,
  setIsOffline,
  pendingCount,
  activeBreachesCount,
  onManualSync,
  onOpenTempGuide,
  onOpenMobileInstall,
  onOpenLoginPortal,
  onOpenUserManagement,
  dbStatus,
  onLogout,
  isNightShift = false,
  onToggleNightShift,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className={`border-b sticky top-0 z-40 transition-colors duration-300 select-none ${
      isNightShift 
        ? 'bg-slate-900 border-slate-800 text-white shadow-lg' 
        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        
        {/* Top Row: Brand, User Info, Mobile Hamburger */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="bg-red-600 text-white p-1 rounded-xl shadow-md border border-red-500 overflow-hidden shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10">
              <img 
                src={medigoLogoImg} 
                alt="MediGo Logo" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h1 className={`text-lg sm:text-xl font-black tracking-tight flex items-center space-x-0.5 ${
                  isNightShift ? 'text-white' : 'text-slate-900'
                }`}>
                  <span className="text-red-600">Medi</span><span>Go</span>
                </h1>
                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide truncate ${
                  isNightShift ? 'bg-red-950 text-red-200 border-red-700' : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  Wiesbaden HQ • Hessen
                </span>
              </div>
              <p className={`text-[10px] sm:text-xs truncate ${isNightShift ? 'text-slate-400' : 'text-slate-500'}`}>
                UN 3373 Medical Logistics • Wiesbaden Hub & Hessen Express
              </p>
            </div>
          </div>

          {/* User Badge & Desktop Action Buttons */}
          <div className="hidden lg:flex items-center space-x-2">
            
            {/* Language Switcher Toggle (German DE / English EN) */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all min-h-[36px] ${
                isNightShift
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-sm'
              }`}
              title="Switch Language (German / English)"
            >
              <Globe className="w-3.5 h-3.5 text-red-500" />
              <span>{language === 'de' ? '🇩🇪 DE' : '🇬🇧 EN'}</span>
            </button>
            
            {/* Dynamic Day / Night Shift Mode Toggle */}
            {onToggleNightShift && (
              <button
                onClick={onToggleNightShift}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all min-h-[36px] ${
                  isNightShift
                    ? 'bg-indigo-950 border-indigo-600 text-indigo-200 shadow-md hover:bg-indigo-900'
                    : 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm hover:bg-amber-200'
                }`}
                title="Toggle Clear (Light) Mode vs Dark Mode"
              >
                {isNightShift ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>🌙 Dark Mode (20:00 - 06:00)</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <span>☀️ Clear Mode (Tagdienst)</span>
                  </>
                )}
              </button>
            )}
            
            {/* Download Mobile App */}
            {onOpenMobileInstall && (
              <button
                onClick={onOpenMobileInstall}
                className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 text-xs font-semibold transition-all shadow-sm min-h-[36px]"
                title="Install Mobile App on Android or iOS"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Get App</span>
              </button>
            )}

            {/* Offline Simulation Button */}
            <button
              onClick={() => {
                const nextState = !isOffline;
                setIsOffline(nextState);
                offlineQueue.setForceOffline(nextState);
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all min-h-[36px] ${
                isOffline
                  ? 'bg-amber-950/90 border-amber-600 text-amber-200 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Basement Mode (Offline)</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Online Coverage</span>
                </>
              )}
            </button>

            {/* Database Status Indicator */}
            {dbStatus && (
              <button
                onClick={onOpenUserManagement}
                className={`hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs min-h-[36px] font-mono transition-all ${
                  dbStatus.tablesCreated
                    ? 'bg-emerald-950/80 hover:bg-emerald-900/80 border-emerald-700 text-emerald-300'
                    : dbStatus.supabaseConfigured
                    ? 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-700 text-amber-300 animate-pulse'
                    : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-300'
                }`}
                title={
                  dbStatus.tablesCreated
                    ? 'Supabase PostgreSQL connected & tables active. Click to manage.'
                    : dbStatus.supabaseConfigured
                    ? 'Supabase connected but tables are not created yet! Click to view SQL schema.'
                    : 'Local Persistent Server Storage active. Click to configure Supabase.'
                }
              >
                <Database className={`w-3.5 h-3.5 ${
                  dbStatus.tablesCreated ? 'text-emerald-400' : dbStatus.supabaseConfigured ? 'text-amber-400' : 'text-cyan-400'
                }`} />
                <span className="text-[11px] font-bold">
                  {dbStatus.tablesCreated
                    ? 'Supabase DB'
                    : dbStatus.supabaseConfigured
                    ? 'Supabase (Run SQL)'
                    : 'Server DB'}
                </span>
              </button>
            )}

            {/* Admin User & Contract Management (ADMIN / DISPATCHER) */}
            {onOpenUserManagement && (currentUser?.role === 'ADMIN' || currentUser?.role === 'DISPATCHER') && (
              <button
                onClick={onOpenUserManagement}
                className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs transition-all shadow-md min-h-[36px]"
                title="Admin User Management: Create Users & Assign Authorized Contract Numbers"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Users & Contracts</span>
              </button>
            )}

            {/* Role Switcher (STRICT RBAC: CEO / DISPATCHER ONLY) */}
            {onOpenLoginPortal && (currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && (
              <button
                onClick={onOpenLoginPortal}
                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-600/60 text-amber-300 font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs transition-all shadow-md min-h-[36px]"
                title="Executive Control: Switch active role account or test permissions"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch Role (CEO)</span>
              </button>
            )}

            {/* Current User Badge */}
            {currentUser && (
              <div className="flex items-center space-x-2 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs min-h-[36px]">
                {currentUser.role === 'ADMIN' ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="font-bold text-white max-w-[110px] truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded font-bold uppercase">
                  {currentUser.role}
                </span>
                {currentUser.contractNumber && (
                  <span className="text-[10px] text-emerald-300 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold" title="Authorized Contract Number">
                    {currentUser.contractNumber}
                  </span>
                )}
              </div>
            )}

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs transition-all shadow-md min-h-[36px]"
                title="Log out and return to MediGo Home Page"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Sign Out</span>
              </button>
            )}

          </div>

          {/* Mobile Right Bar: Language Switcher, Mobile Menu Button & Quick Day/Night Toggle */}
          <div className="flex lg:hidden items-center space-x-1.5">
            <button
              onClick={toggleLanguage}
              className={`p-2 rounded-xl border text-xs font-bold transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${
                isNightShift
                  ? 'bg-slate-800 border-slate-700 text-slate-100'
                  : 'bg-slate-100 border-slate-300 text-slate-900'
              }`}
              aria-label="Switch Language"
              title="Switch Language (DE / EN)"
            >
              <span className="text-xs font-black">{language === 'de' ? '🇩🇪' : '🇬🇧'}</span>
            </button>

            {onToggleNightShift && (
              <button
                onClick={onToggleNightShift}
                className={`p-2 rounded-xl border text-xs font-bold transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${
                  isNightShift
                    ? 'bg-indigo-950 border-indigo-600 text-indigo-200'
                    : 'bg-amber-950/80 border-amber-600 text-amber-200'
                }`}
                aria-label="Toggle Day / Night Mode"
                title="Toggle Day / Night Mode"
              >
                {isNightShift ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
            )}

            {activeBreachesCount > 0 && (
              <span className="bg-rose-950 text-rose-300 border border-rose-600 text-[10px] font-bold px-2 py-1 rounded-md animate-pulse">
                {activeBreachesCount} Breach!
              </span>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>

        </div>

        {/* Desktop & Tablet Responsive View Mode Tabs Bar */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 hidden sm:flex items-center justify-between gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* ROLE 1: CLIENT CLINIC SCOPE */}
            {currentUser?.role === 'CLIENT_CLINIC' && (
              <div className="flex items-center space-x-2 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-300 bg-blue-950/90 px-3 py-1.5 rounded-lg border border-blue-800">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Clinic Portal Scope ({currentUser.organization || 'Klinikum Frankfurt'})</span>
                </div>

                <button
                  onClick={() => setViewMode('SECURITY_AUDIT')}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'SECURITY_AUDIT'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Security Matrix</span>
                </button>
              </div>
            )}

            {/* ROLE 2: DRIVER MOBILE SCOPE */}
            {currentUser?.role === 'DRIVER' && (
              <div className="flex items-center space-x-2 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300 bg-emerald-950/90 px-3 py-1.5 rounded-lg border border-emerald-800">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Courier Driver Mobile Scope ({currentUser.name})</span>
                </div>

                <button
                  onClick={() => setViewMode('SECURITY_AUDIT')}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'SECURITY_AUDIT'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Security Matrix</span>
                </button>
              </div>
            )}

            {/* ROLE 3: CEO / DISPATCHER (UNRESTRICTED EXECUTIVE CONTROL) */}
            {(currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN' || !currentUser) && (
              <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  onClick={() => {
                    setViewMode('CLIENT_PORTAL');
                    setActiveRole('CLIENT_CLINIC');
                  }}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                    viewMode === 'CLIENT_PORTAL'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Clinic Portal</span>
                </button>

                <button
                  onClick={() => {
                    setViewMode('DRIVER_MOBILE');
                    setActiveRole('DRIVER');
                  }}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                    viewMode === 'DRIVER_MOBILE'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Driver App</span>
                </button>

                <button
                  onClick={() => {
                    setViewMode('DISPATCH_DASHBOARD');
                    setActiveRole('ADMIN');
                  }}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                    viewMode === 'DISPATCH_DASHBOARD'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Dispatch / CEO</span>
                </button>

                <button
                  onClick={() => setViewMode('LEGAL_COMPLIANCE')}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                    viewMode === 'LEGAL_COMPLIANCE'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Legal & GDPR</span>
                </button>

                <button
                  onClick={() => setViewMode('SECURITY_AUDIT')}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                    viewMode === 'SECURITY_AUDIT'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Security Matrix</span>
                </button>

                <button
                  onClick={() => setViewMode('PRISMA_SCHEMA')}
                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[34px] ${
                    viewMode === 'PRISMA_SCHEMA'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Prisma Schema</span>
                </button>
              </div>
            )}
          </div>

          {/* Indicators Bar */}
          <div className="flex items-center space-x-2 text-xs shrink-0">
            {/* Active Temp Breaches */}
            {activeBreachesCount > 0 && (
              <div className="flex items-center space-x-1 bg-rose-950 border border-rose-600 text-rose-200 px-2 py-1 rounded-md text-[11px] font-bold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{activeBreachesCount} Temp Breach!</span>
              </div>
            )}

            {/* Pending Queue Sync */}
            {pendingCount > 0 && (
              <button
                onClick={onManualSync}
                className="flex items-center space-x-1 bg-blue-900 border border-blue-600 text-blue-200 px-2 py-1 rounded-md hover:bg-blue-800 text-[11px] font-bold transition-all"
                title="Force sync offline queue"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-300" />
                <span>{pendingCount} Sync</span>
              </button>
            )}

            {onOpenTempGuide && (
              <button
                onClick={onOpenTempGuide}
                className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded bg-slate-800 border border-slate-700"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Sensor Guide</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile View Mode Navigation Pill Bar (always visible on mobile screens) */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex sm:hidden items-center space-x-1 overflow-x-auto pb-1 no-scrollbar">
          {currentUser?.role === 'CLIENT_CLINIC' && (
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="bg-blue-950 text-blue-300 border border-blue-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Clinic Portal Scope</span>
              </span>
              <button
                onClick={() => setViewMode('SECURITY_AUDIT')}
                className="bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Security</span>
              </button>
            </div>
          )}

          {currentUser?.role === 'DRIVER' && (
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Driver Mobile Scope</span>
              </span>
              <button
                onClick={() => setViewMode('SECURITY_AUDIT')}
                className="bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Security</span>
              </button>
            </div>
          )}

          {(currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN' || !currentUser) && (
            <>
              <button
                onClick={() => {
                  setViewMode('CLIENT_PORTAL');
                  setActiveRole('CLIENT_CLINIC');
                }}
                className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl shrink-0 min-h-[44px] ${
                  viewMode === 'CLIENT_PORTAL'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Clinic Portal</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('DRIVER_MOBILE');
                  setActiveRole('DRIVER');
                }}
                className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl shrink-0 min-h-[44px] ${
                  viewMode === 'DRIVER_MOBILE'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Driver App</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('DISPATCH_DASHBOARD');
                  setActiveRole('ADMIN');
                }}
                className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl shrink-0 min-h-[44px] ${
                  viewMode === 'DISPATCH_DASHBOARD'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Dispatch CEO</span>
              </button>

              <button
                onClick={() => setViewMode('SECURITY_AUDIT')}
                className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl shrink-0 min-h-[44px] ${
                  viewMode === 'SECURITY_AUDIT'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-800 text-amber-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Security Matrix</span>
              </button>

              <button
                onClick={() => setViewMode('LEGAL_COMPLIANCE')}
                className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl shrink-0 min-h-[44px] ${
                  viewMode === 'LEGAL_COMPLIANCE'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Legal AVV</span>
              </button>

              <button
                onClick={() => setViewMode('PRISMA_SCHEMA')}
                className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl shrink-0 min-h-[44px] ${
                  viewMode === 'PRISMA_SCHEMA'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Schema</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Full Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Active User Information */}
            {currentUser && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-950 text-red-400 flex items-center justify-center border border-red-800">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{currentUser.role} Account</span>
                  </div>
                </div>

                {onOpenLoginPortal && (currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLoginPortal();
                    }}
                    className="bg-amber-500/20 text-amber-300 border border-amber-600/60 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                  >
                    Switch Role
                  </button>
                )}
              </div>
            )}

            {/* Quick Actions List */}
            <div className="space-y-2 text-xs">
              
              {/* Day / Night Shift Mode Toggle */}
              {onToggleNightShift && (
                <button
                  onClick={onToggleNightShift}
                  className={`w-full p-3 rounded-xl border font-bold flex items-center justify-between min-h-[44px] ${
                    isNightShift
                      ? 'bg-indigo-950 border-indigo-600 text-indigo-200'
                      : 'bg-amber-950/80 border-amber-600 text-amber-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {isNightShift ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>{isNightShift ? 'Night Shift (20:00 - 06:00)' : 'Day Mode (Tagdienst)'}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950 font-extrabold">
                    {isNightShift ? 'NIGHT 🌙' : 'DAY ☀️'}
                  </span>
                </button>
              )}

              {/* Basement Mode Toggle */}
              <button
                onClick={() => {
                  const nextState = !isOffline;
                  setIsOffline(nextState);
                  offlineQueue.setForceOffline(nextState);
                }}
                className={`w-full p-3 rounded-xl border font-bold flex items-center justify-between min-h-[44px] ${
                  isOffline
                    ? 'bg-amber-950 border-amber-600 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isOffline ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
                  <span>Basement Mode (Offline Simulation)</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950">
                  {isOffline ? 'OFFLINE' : 'ONLINE'}
                </span>
              </button>

              {/* Admin Users & Contracts Management */}
              {onOpenUserManagement && (currentUser?.role === 'ADMIN' || currentUser?.role === 'DISPATCHER') && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenUserManagement();
                  }}
                  className="w-full bg-cyan-950 border border-cyan-700 text-cyan-200 p-3 rounded-xl font-bold flex items-center justify-between min-h-[44px]"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Manage Users & Contract Numbers</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cyan-500" />
                </button>
              )}

              {/* Mobile App PWA & Native Export */}
              {onOpenMobileInstall && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenMobileInstall();
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-emerald-300 p-3 rounded-xl font-bold flex items-center justify-between min-h-[44px]"
                >
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Download App / Store APK Guide</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              )}

              {/* Sensor Guide */}
              {onOpenTempGuide && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenTempGuide();
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-cyan-300 p-3 rounded-xl font-bold flex items-center justify-between min-h-[44px]"
                >
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>Temperature Sensor & Breach Guide</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              )}

            </div>

            {/* Sign Out Button */}
            {onLogout && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full bg-red-950/90 border border-red-800 text-red-200 font-bold p-3 rounded-xl flex items-center justify-center space-x-2 text-xs shadow-md min-h-[44px]"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Sign Out of MediGo</span>
              </button>
            )}

          </div>
        )}

      </div>
    </header>
  );
};

