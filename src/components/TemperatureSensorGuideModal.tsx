import React from 'react';
import { Thermometer, ShieldAlert, Wifi, Cpu, Bell, CheckCircle2, Flame, RefreshCw, X } from 'lucide-react';

interface TemperatureSensorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerDemoSpike?: () => void;
}

export const TemperatureSensorGuideModal: React.FC<TemperatureSensorGuideModalProps> = ({
  isOpen,
  onClose,
  onTriggerDemoSpike,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 my-auto space-y-0">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-rose-950 p-2.5 rounded-xl text-rose-400 border border-rose-800">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">How IoT Temperature Sensors & Breach Alerts Work</h3>
              <p className="text-xs text-slate-400">UN 3373 Category B Bio-Transport Sensor Technology Guide</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Physical Hardware */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>1. BLE Dataloggers Inside P650 Insulated Specimen Boxes</span>
            </h4>
            <p className="leading-relaxed">
              Every medical transport container carries a Bluetooth Low Energy (BLE) temperature logger calibrated to certified limits (e.g. 2.0°C - 8.0°C for blood/vaccines, or 15°C - 25°C for ambient samples). The logger pings telemetry every 4 seconds to the courier's smartphone.
            </p>
          </div>

          {/* Section 2: Why Breaches Happen */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>2. Why Temperature Threshold Breaches Occur</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Lid left unlatched during clinic pickup.</li>
              <li>Cooling packs depleted in hot vehicle summer conditions.</li>
              <li>Extreme traffic delays beyond insulated box thermal holding duration.</li>
            </ul>
          </div>

          {/* Section 3: Legal Escalation Protocol */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>3. Automatic Legal & Regulatory Escalation Protocol</span>
            </h4>
            <p className="leading-relaxed">
              Under German <em>Transfusionsgesetz</em> and ADR regulations, if a cold-chain specimen exceeds 8.0°C for longer than 15 minutes:
            </p>
            <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-lg text-rose-200 space-y-1 font-mono text-[11px]">
              <div>• <strong>Instant Driver Alert:</strong> Audio beep & phone vibration.</div>
              <div>• <strong>Dispatcher Notification:</strong> Red pulse badge on Central Map.</div>
              <div>• <strong>Immutable Audit Entry:</strong> Timestamped GPS position & temp log saved for legal proof.</div>
            </div>
          </div>

          {/* Section 4: Demo Simulator Controls */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center space-x-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span>4. Interactive Demo Simulator</span>
            </h4>
            <p className="text-slate-400">
              Test how the application responds when a thermal probe records an out-of-range spike:
            </p>

            <div className="flex items-center space-x-3 pt-1">
              {onTriggerDemoSpike && (
                <button
                  onClick={() => {
                    onTriggerDemoSpike();
                    onClose();
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-md transition-all"
                >
                  <Flame className="w-4 h-4" />
                  <span>Simulate 14.2°C Cold Chain Breach</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2 rounded-xl transition-all"
              >
                Close Explanation Guide
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
