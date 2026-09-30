import React from 'react';
import { Order, TemperatureTelemetry, TRANSPORT_TEMP_RANGES, getTransportTempRange } from '../../types';
import { Thermometer, AlertTriangle, Flame, Bell } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface TemperatureAlertsPanelProps {
  orders: Order[];
  onSimulateSpike: (order: Order) => void;
}

export const TemperatureAlertsPanel: React.FC<TemperatureAlertsPanelProps> = ({
  orders,
  onSimulateSpike,
}) => {
  const { language, t } = useLanguage();
  const isDe = language === 'de';

  // Collect all breach incidents across active orders
  const allTelemetryWithBreaches: { order: Order; telemetry: TemperatureTelemetry }[] = [];

  (orders || []).forEach((o) => {
    (o?.telemetryLogs || []).forEach((tLog) => {
      if (tLog?.isBreach) {
        allTelemetryWithBreaches.push({ order: o, telemetry: tLog });
      }
    });
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-slate-100 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="bg-rose-950 p-2 rounded-lg text-rose-400 border border-rose-800">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isDe ? 'Temperatur-Telemetrie & Schwellenwert-Überwachung' : 'Thermal Telemetry & Threshold Breach Monitor'}
            </h3>
            <p className="text-xs text-slate-400">
              {isDe ? 'UN 3373 Kühlketten- & Raumtemperatur-Sicherheitsregeln in Echtzeit' : 'UN 3373 Cold-Chain & Ambient Real-Time Safety Rules'}
            </p>
          </div>
        </div>

        <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-mono font-semibold">
          {isDe ? 'Taktung: Alle 4s' : 'Pulse: Every 4s'}
        </span>
      </div>

      {/* Active Orders Temperature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(orders || []).map((ord) => {
          const tempRange = getTransportTempRange(ord?.transportType);
          const minVal = tempRange?.min ?? 2;
          const maxVal = tempRange?.max ?? 8;
          const latestTel = ord?.telemetryLogs?.[0];
          const isBreach = Boolean(latestTel?.isBreach);

          return (
            <div
              key={ord.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isBreach
                  ? 'bg-rose-950/80 border-rose-600 shadow-lg shadow-rose-950/50 animate-pulse'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div>
                  <span className="font-bold text-white text-xs block font-mono">{ord.trackingNumber}</span>
                  <span className="text-[11px] text-slate-400">{ord.pickupClinicName}</span>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  isBreach ? 'bg-rose-900 text-rose-200 border-rose-500' : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}>
                  {isBreach ? (isDe ? '⚠️ TEMPERATUR-ALARM' : '⚠️ BREACH ALERT') : (isDe ? '✓ TEMPERATUR OK' : '✓ TEMPERATURE OK')}
                </span>
              </div>

              {/* Temperature Reading */}
              <div className="py-2 flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">{isDe ? 'Aktueller Messwert' : 'Current Reading'}</span>
                  <span className={`text-xl font-bold ${isBreach ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {latestTel ? `${latestTel.tempCelsius}°C` : 'N/A'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">{isDe ? 'Soll-Bereich' : 'Target Range'}</span>
                  <span className="text-slate-200 text-xs font-semibold">
                    {minVal}°C {isDe ? 'bis' : 'to'} {maxVal}°C
                  </span>
                </div>
              </div>

              {/* Actions & Spike Simulator Button */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">{t(`status.${ord.status}`)}</span>
                <button
                  onClick={() => onSimulateSpike(ord)}
                  className="bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-600 px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition-all"
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{isDe ? 'Temperatur-Spitze simulieren' : 'Simulate Temp Spike'}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Historical Breach Incident Log */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <h4 className="font-bold text-xs text-white flex items-center space-x-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>
            {isDe
              ? `Historisches Protokoll Grenzwertverletzungen (${allTelemetryWithBreaches.length})`
              : `Historical Breach Log & Protocol Escalations (${allTelemetryWithBreaches.length})`}
          </span>
        </h4>

        {allTelemetryWithBreaches.length === 0 ? (
          <p className="text-slate-500 text-xs italic py-2">
            {isDe
              ? 'Keine Temperaturüberschreitungen verzeichnet. Alle Kühl- und Raumtemperaturbehälter entsprechen den geforderten ADR P650 Spezifikationen.'
              : 'No temperature threshold breaches recorded. All cold-chain and ambient packages maintained inside required ADR packaging specifications.'}
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs font-mono">
            {allTelemetryWithBreaches.map(({ order, telemetry }, idx) => {
              const range = getTransportTempRange(order?.transportType);
              const minVal = range?.min ?? 2;
              const maxVal = range?.max ?? 8;
              return (
                <div key={idx} className="bg-rose-950/60 border border-rose-800 p-2 rounded text-rose-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white">{order?.trackingNumber || 'ORDER'}: </span>
                      <span>
                        {isDe
                          ? `Gemessen ${telemetry.tempCelsius}°C (Soll: ${minVal}°C - ${maxVal}°C)`
                          : `Recorded ${telemetry.tempCelsius}°C (Target: ${minVal}°C - ${maxVal}°C)`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-rose-300">{new Date(telemetry.timestamp).toLocaleTimeString(isDe ? 'de-DE' : 'en-US')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
