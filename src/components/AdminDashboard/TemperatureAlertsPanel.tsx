import React from 'react';
import { Order, TemperatureTelemetry, TRANSPORT_TEMP_RANGES } from '../../types';
import { Thermometer, AlertTriangle, ShieldCheck, Flame, Bell, CheckCircle2 } from 'lucide-react';

interface TemperatureAlertsPanelProps {
  orders: Order[];
  onSimulateSpike: (order: Order) => void;
}

export const TemperatureAlertsPanel: React.FC<TemperatureAlertsPanelProps> = ({
  orders,
  onSimulateSpike,
}) => {
  // Collect all breach incidents across active orders
  const allTelemetryWithBreaches: { order: Order; telemetry: TemperatureTelemetry }[] = [];

  orders.forEach((o) => {
    o.telemetryLogs.forEach((t) => {
      if (t.isBreach) {
        allTelemetryWithBreaches.push({ order: o, telemetry: t });
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
            <h3 className="text-base font-bold text-white">Thermal Telemetry & Threshold Breach Monitor</h3>
            <p className="text-xs text-slate-400">UN 3373 Cold-Chain & Ambient Real-Time Safety Rules</p>
          </div>
        </div>

        <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-mono font-semibold">
          Pulse: Every 4s
        </span>
      </div>

      {/* Active Orders Temperature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {orders.map((ord) => {
          const tempRange = TRANSPORT_TEMP_RANGES[ord.transportType];
          const latestTel = ord.telemetryLogs[0];
          const isBreach = latestTel?.isBreach;

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
                  {isBreach ? '⚠️ BREACH ALERT' : '✓ TEMPERATURE OK'}
                </span>
              </div>

              {/* Temperature Reading */}
              <div className="py-2 flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Current Reading</span>
                  <span className={`text-xl font-bold ${isBreach ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {latestTel ? `${latestTel.tempCelsius}°C` : 'N/A'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Target Range</span>
                  <span className="text-slate-200 text-xs font-semibold">
                    {tempRange.min}°C to {tempRange.max}°C
                  </span>
                </div>
              </div>

              {/* Actions & Spike Simulator Button */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">{ord.status}</span>
                <button
                  onClick={() => onSimulateSpike(ord)}
                  className="bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-600 px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition-all"
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Simulate Temp Spike</span>
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
          <span>Historical Breach Log & Protocol Escalations ({allTelemetryWithBreaches.length})</span>
        </h4>

        {allTelemetryWithBreaches.length === 0 ? (
          <p className="text-slate-500 text-xs italic py-2">
            No temperature threshold breaches recorded. All cold-chain and ambient packages maintained inside required ADR packaging specifications.
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs font-mono">
            {allTelemetryWithBreaches.map(({ order, telemetry }, idx) => (
              <div key={idx} className="bg-rose-950/60 border border-rose-800 p-2 rounded text-rose-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white">{order.trackingNumber}: </span>
                    <span>Recorded {telemetry.tempCelsius}°C (Target: {TRANSPORT_TEMP_RANGES[order.transportType].min}°C - {TRANSPORT_TEMP_RANGES[order.transportType].max}°C)</span>
                  </div>
                </div>
                <span className="text-[10px] text-rose-300">{new Date(telemetry.timestamp).toLocaleTimeString('de-DE')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
