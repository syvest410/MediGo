import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiFetch, parseJsonSafe } from '../../lib/apiFetch';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ForcePasswordChangeModal: React.FC = () => {
  const { currentUser, token, updateSession, logout } = useAuth();
  const { language } = useLanguage();
  const isDe = language === 'de';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Password Checklist
  const isMinLength = newPassword.length >= 12;
  const isMaxLength = newPassword.length <= 128;
  const isNotSameAsCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const isNotEmail = !currentUser?.email || (
    newPassword.toLowerCase() !== currentUser.email.toLowerCase() &&
    newPassword.toLowerCase() !== currentUser.email.split('@')[0].toLowerCase()
  );
  const isNotName = !currentUser?.name || newPassword.toLowerCase() !== currentUser.name.toLowerCase();
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    isMinLength &&
    isMaxLength &&
    isNotSameAsCurrent &&
    isNotEmail &&
    isNotName &&
    isMatching &&
    currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isFormValid) {
      setError(
        isDe
          ? 'Bitte erfüllen Sie alle Kennwort-Kriterien.'
          : 'Please satisfy all password security requirements.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setIsSubmitting(false);
        const errorMsg = data?.message || (data?.errors ? data.errors.join(', ') : `Server error (${res.status}). Please try again.`);
        setError(errorMsg);
        return;
      }

      setSuccess(
        isDe
          ? 'Passwort erfolgreich aktualisiert! Berechtigungen werden freigeschaltet...'
          : 'Password successfully changed! Activating full session...'
      );

      // Update auth context state with cleared mustChangePassword flag
      setTimeout(() => {
        updateSession(data.user, data.token);
      }, 750);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Network error occurred during password change.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100">
        
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isDe ? 'Erstmaliges Kennwort ändern' : 'Mandatory Password Change'}
              </h2>
              <p className="text-xs text-amber-400/90 font-medium">
                {isDe ? 'Sicherheits-Richtlinie DSGVO Art. 9 & BSI Baseline' : 'GDPR Art. 9 & German Medical Logistics Compliance'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title={isDe ? 'Abmelden' : 'Logout'}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isDe ? 'Abmelden' : 'Sign Out'}</span>
          </button>
        </div>

        {/* Informational Notice */}
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 text-xs text-amber-200/90 flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-amber-300">
              {isDe ? 'Initiales Einmal-Passwort erkannt' : 'Initial Seed Password Detected'}
            </span>
            {isDe
              ? 'Aus Sicherheitsgründen müssen initial vergebene Kennwörter vor dem ersten Zugriff auf medizinische Patientendaten und Aufträge durch ein persönliches, starkes Passwort ersetzt werden.'
              : 'Your account was initialized with a temporary or seed password. You must establish a strong personal password before access to medical specimens, clinical routes, and patient data is unlocked.'}
          </div>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isDe ? 'Aktuelles Initial-Kennwort' : 'Current Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isDe ? 'Neues Kennwort (mindestens 12 Zeichen)' : 'New Password (min. 12 characters)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isDe ? 'Neues Kennwort bestätigen' : 'Confirm New Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Realtime Policy Checklist */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5 text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">
              {isDe ? 'Sicherheits-Kriterien:' : 'Password Requirements:'}
            </span>
            <div className="flex items-center gap-2">
              {isMinLength && isMaxLength ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className={isMinLength && isMaxLength ? 'text-emerald-300' : ''}>
                {isDe ? '12 bis 128 Zeichen Länge' : 'Between 12 and 128 characters'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isNotEmail && isNotName ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className={isNotEmail && isNotName ? 'text-emerald-300' : ''}>
                {isDe ? 'Darf nicht dem Namen oder der E-Mail entsprechen' : 'Cannot equal your name or email'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isNotSameAsCurrent && currentPassword.length > 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className={isNotSameAsCurrent && currentPassword.length > 0 ? 'text-emerald-300' : ''}>
                {isDe ? 'Muss sich vom alten Passwort unterscheiden' : 'Must differ from current password'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isMatching ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className={isMatching ? 'text-emerald-300' : ''}>
                {isDe ? 'Passwörter stimmen überein' : 'Passwords match'}
              </span>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              isFormValid && !isSubmitting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isSubmitting ? (
              <span>{isDe ? 'Wird gespeichert...' : 'Updating password...'}</span>
            ) : (
              <>
                <span>{isDe ? 'Passwort aktualisieren & Fortfahren' : 'Update Password & Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
