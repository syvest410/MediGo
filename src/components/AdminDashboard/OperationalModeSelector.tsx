import React, { useState } from 'react';
import { User, Users, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { OperationalMode } from '../../types';
import { getOperationalMode, setOperationalMode } from '../../lib/db';
import { useLanguage } from '../../context/LanguageContext';

export const OperationalModeSelector: React.FC = () => {
  const { language } = useLanguage();
  const isDe = language === 'de';

  const [mode, setModeState] = useState<OperationalMode>(getOperationalMode());
  const [isSaved, setIsSaved] = useState(false);

  const handleToggle = (newMode: OperationalMode) => {
    setOperationalMode(newMode);
    setModeState(newMode);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <span className="text-red-400 text-xs font-semibold uppercase tracking-wider block">
            {isDe ? 'Skalierungs- & Betriebsphase' : 'Scaling Control Phase'}
          </span>
          <h3 className="text-lg font-bold text-white mt-0.5">
            {isDe ? 'Solo-Fahrer-Modus vs. Mehrfahrer-Flottenbetrieb' : 'Single-Driver (Solo) vs. Multi-Driver Fleet Mode'}
          </h3>
        </div>

        {isSaved && (
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isDe ? 'Betriebsmodus gespeichert!' : 'Mode Switch Saved!'}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* MODE A: SOLO DRIVER PHASE */}
        <div
          onClick={() => handleToggle('SOLO')}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative ${
            mode === 'SOLO'
              ? 'bg-amber-950/40 border-amber-500 shadow-xl shadow-amber-950/30'
              : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
          }`}
        >
          {mode === 'SOLO' && (
            <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
              {isDe ? 'Aktiver Modus' : 'Active Mode'}
            </span>
          )}

          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${mode === 'SOLO' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
              <User className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                {isDe ? 'Modus A: Solo-Kurier Betriebsphase' : 'Mode A: Solo Driver Operational Phase'}
              </h4>
              <p className="text-xs text-slate-400">
                {isDe ? 'Maßgeschneidert für den Start als Einzelunternehmer / Solokurier in Wiesbaden & Hessen' : 'Tailored for a solo courier operator starting out in Hessen'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <div className="font-bold text-amber-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{isDe ? 'Notfall-Pause & Subunternehmer-Delegation:' : 'Emergency Pause / Subcontractor Delegation Protocol:'}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isDe
                ? 'Bei Pannen oder Kapazitätsengpässen: Löst mit 1 Klick vorbereitete SMS/E-Mail-Delegationsprotokolle an verpartnerte Notfallkuriere mit exakten GPS-Koordinaten aus.'
                : 'When an order cannot be completed (vehicle breakdown or capacity limit), triggers instant 1-click SMS/Email delegation templates to pre-configured partner couriers with exact GPS location.'}
            </p>
          </div>
        </div>

        {/* MODE B: MULTI-DRIVER FLEET PHASE */}
        <div
          onClick={() => handleToggle('FLEET')}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative ${
            mode === 'FLEET'
              ? 'bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-950/30'
              : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
          }`}
        >
          {mode === 'FLEET' && (
            <span className="absolute top-3 right-3 bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
              {isDe ? 'Aktiver Modus' : 'Active Mode'}
            </span>
          )}

          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${mode === 'FLEET' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                {isDe ? 'Modus B: Flottenbetrieb mit mehreren Fahrern' : 'Mode B: Multi-Driver Fleet Phase'}
              </h4>
              <p className="text-xs text-slate-400">
                {isDe ? 'Automatische Dispositions-Warteschlange für mehrere Fahrzeuge & Kuriere' : 'Automated dispatch queue for multiple drivers & vehicles'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <div className="font-bold text-emerald-300 flex items-center space-x-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isDe ? 'Automatische Neuvergabe nach Prioritätskette:' : 'Priority Queue Auto Re-Assignment:'}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isDe
                ? 'Lehnt ein Fahrer einen Auftrag ab oder meldet sich krank, leitet das System den Auftrag automatisch an den nächsten verfügbaren Fahrer nach Nähe weiter.'
                : 'When a driver rejects an order or reports sick, system auto re-assigns order following priority queue (Hans Schmidt → Marcus Weber → Thomas Bauer) based on proximity.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
