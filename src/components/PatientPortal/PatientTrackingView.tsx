import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Thermometer, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Lock, 
  Building2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { apiFetch, parseJsonSafe } from '../../lib/apiFetch';

export const PatientTrackingView: React.FC = () => {
  const { language } = useLanguage();
  const isDe = language === 'de';

  const [trackingInput, setTrackingInput] = useState('DE-UN3373-2026-8821');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const trimmed = trackingInput.trim();
      const res = await apiFetch(`/api/orders/track/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error(
          isDe
            ? 'Keine Sendung zu dieser Tracking-Nummer oder diesem Token gefunden.'
            : 'No shipment found for this tracking number or token.'
        );
      }
      const data = await parseJsonSafe(res);
      if (!data) {
        throw new Error(isDe ? 'Ungültige Serverantwort.' : 'Invalid server response.');
      }
      setTrackingData(data);
    } catch (err: any) {
      setErrorMessage(err.message || (isDe ? 'Verbindungsfehler zur MediGo Sendungsverfolgung.' : 'Connection error to MediGo tracking service.'));
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStepIndex = (status?: string): number => {
    switch (status) {
      case 'SCHEDULED': return 1;
      case 'PRE_TRIP_CHECK': return 2;
      case 'PICKED_UP': return 3;
      case 'IN_TRANSIT': return 4;
      case 'DELIVERED': return 5;
      case 'QUARANTINED_UNSYNCED': return 3;
      default: return 0;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'DELIVERED') {
      return (
        <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          {isDe ? 'Zugestellt' : 'Delivered'}
        </span>
      );
    }
    if (status === 'IN_TRANSIT') {
      return (
        <span className="bg-blue-950 text-blue-300 border border-blue-700 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          {isDe ? 'In Beförderung' : 'In Transit'}
        </span>
      );
    }
    if (status === 'QUARANTINED_UNSYNCED') {
      return (
        <span className="bg-amber-950 text-amber-300 border border-amber-700 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          {isDe ? 'In Klärung' : 'In Review'}
        </span>
      );
    }
    return (
      <span className="bg-slate-800 text-slate-200 border border-slate-700 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-900/40 rounded-3xl p-6 sm:p-8 text-center space-y-3 relative overflow-hidden shadow-2xl">
        <div className="inline-flex p-3 bg-red-600/20 text-red-400 border border-red-500/30 rounded-2xl shadow-inner">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {isDe ? 'MediGo Patienten- & Probenverfolgung' : 'MediGo Patient & Specimen Tracking'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          {isDe
            ? 'Transparente Sendungsüberwachung für Patienten, Praxen und Einsender gemäß ApBetrO § 17 und ADR P650. Medizinische Diagnosedaten bleiben unter DSGVO Art. 9 vollkommen vertraulich.'
            : 'Transparent shipment verification for patients and clinics under ApBetrO § 17 and ADR P650. Medical diagnosis details remain strictly confidential under GDPR Art. 9.'}
        </p>

        {/* Input Bar */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto pt-2 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder={isDe ? 'z.B. DE-UN3373-2026-8821' : 'e.g. DE-UN3373-2026-8821'}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>{isDe ? 'Wird geladen...' : 'Searching...'}</span>
            ) : (
              <>
                <span>{isDe ? 'Sendung prüfen' : 'Track Shipment'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-3 pt-1">
          <span>
            {isDe ? 'Beispiel-Nummer zum Testen: ' : 'Sample number for testing: '}
            <button type="button" onClick={() => setTrackingInput('DE-UN3373-2026-8821')} className="underline text-red-400 hover:text-red-300 font-mono">
              DE-UN3373-2026-8821
            </button>
          </span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-950/60 border border-red-800 rounded-2xl p-4 text-xs text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tracking Result Card */}
      {trackingData && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6 text-slate-100">
          
          {/* Top Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
            <div>
              <div className="text-xs text-slate-400 font-medium">{isDe ? 'Tracking-Nummer' : 'Tracking Number'}</div>
              <div className="text-lg sm:text-xl font-mono font-bold text-white tracking-wide">
                {trackingData.trackingNumber}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(trackingData.status)}
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                trackingData.activeTemperatureOk
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-red-950 text-red-300 border-red-800'
              }`}>
                {trackingData.activeTemperatureOk 
                  ? (isDe ? 'Kühlkette OK (2-8°C)' : 'Cold Chain OK (2-8°C)') 
                  : (isDe ? 'Temperaturabweichung' : 'Temperature Spike Alert')}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {isDe ? 'Transport-Meilensteine (ApBetrO § 17)' : 'Transport Milestones (ApBetrO § 17)'}
            </div>
            
            <div className="grid grid-cols-5 gap-2 pt-2">
              {[
                { step: 1, labelDe: 'Erfasst', labelEn: 'Booked' },
                { step: 2, labelDe: 'P650 Check', labelEn: 'Pre-Trip' },
                { step: 3, labelDe: 'Übernahme', labelEn: 'Pickup' },
                { step: 4, labelDe: 'Transport', labelEn: 'In Transit' },
                { step: 5, labelDe: 'Labor Empfang', labelEn: 'Delivered' }
              ].map(item => {
                const currentIdx = getStatusStepIndex(trackingData.status);
                const isPassed = currentIdx >= item.step;
                const isCurrent = currentIdx === item.step;

                return (
                  <div key={item.step} className="text-center space-y-1.5">
                    <div className={`h-2 rounded-full transition-all ${
                      isPassed ? 'bg-red-500' : 'bg-slate-800'
                    } ${isCurrent ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900' : ''}`} />
                    <span className={`text-[10px] sm:text-xs block font-medium truncate ${
                      isPassed ? 'text-white' : 'text-slate-500'
                    }`}>
                      {isDe ? item.labelDe : item.labelEn}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Facts Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>{isDe ? 'Startregion (Einsender)' : 'Origin Clinic'}</span>
              </div>
              <div className="text-sm font-bold text-white">{trackingData.originCity}</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isDe ? 'Ziel-Standort (Labor)' : 'Destination Lab'}</span>
              </div>
              <div className="text-sm font-bold text-white">{trackingData.destinationCity}</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                <span>{isDe ? 'Vorgegebene Kühlzone' : 'Thermal Specification'}</span>
              </div>
              <div className="text-sm font-bold text-white">{trackingData.transportType?.replace(/_/g, ' ')}</div>
            </div>
          </div>

          {/* Legal Compliance & GDPR Art. 9 Notice */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>{isDe ? 'DSGVO Art. 9 & Deutsches Patientengeheimnis (§ 203 StGB)' : 'GDPR Art. 9 & Medical Secrecy (§ 203 StGB)'}</span>
            </div>
            <p>
              {isDe
                ? 'Diese öffentliche Ansicht zeigt ausschließlich logistische Meilensteine und Kühlketten-Parameter. Keine Namen von Patienten, Befunde oder medizinische Indikationen werden offengelegt.'
                : 'This public view exclusively shows logistical status milestones and cold chain telemetry. No patient identities, diagnoses, or clinical findings are exposed.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
