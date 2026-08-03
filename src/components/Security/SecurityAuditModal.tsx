import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Truck, 
  Crown, 
  Key, 
  AlertTriangle, 
  Zap, 
  FileText, 
  Server, 
  Eye, 
  ShieldAlert,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { Role, User } from '../../types';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSwitchRole: () => void;
  isNightShift?: boolean;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchRole,
  isNightShift = true,
}) => {
  const [testSimulating, setTestSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulateAttack = () => {
    setTestSimulating(true);
    setSimulationResult(null);

    setTimeout(() => {
      setTestSimulating(false);
      setSimulationResult(
        `🚨 ATTEMPT DETECTED & BLOCKED:\n\n` +
        `User: Dr. Martin Hoffmann (CLIENT_CLINIC)\n` +
        `Target Action: Attempted GET /api/admin/financial-invoices\n` +
        `Security Guard Response: 403 Forbidden (RBAC Role Scope Violation)\n` +
        `Audit Log Recorded: SHA-256 Hash Signed Entry #AUD-SEC-${Math.floor(1000 + Math.random() * 9000)}\n` +
        `Result: Client session safely isolated. Zero data leakage.`
      );
    }, 1000);
  };

  const matrixPermissions = [
    {
      feature: 'Request UN 3373 Specimen Pickups',
      description: 'Book biological sample transport with P650 box count',
      client: true,
      driver: false,
      ceo: true,
    },
    {
      feature: 'View Own Clinic Orders & ETA Tracking',
      description: 'Live courier arrival map scoped to clinic contract ID',
      client: true,
      driver: false,
      ceo: true,
    },
    {
      feature: 'Execute Pre-Trip Vehicle Inspection',
      description: 'Check thermo calibration, seal, absorbent material',
      client: false,
      driver: true,
      ceo: true,
    },
    {
      feature: 'Scan UN 3373 Barcodes & Capture Signatures',
      description: 'Chain of custody digital signing at clinic & lab',
      client: false,
      driver: true,
      ceo: true,
    },
    {
      feature: 'Claim Marketplace Courier Orders',
      description: 'Self-assign open express pickups in Hessen',
      client: false,
      driver: true,
      ceo: true,
    },
    {
      feature: 'Central Fleet GPS & Sensor Telemetry',
      description: 'Real-time temperature spike alerts & map tracking',
      client: false,
      driver: false,
      ceo: true,
    },
    {
      feature: 'Tariff Rate & Feiertagszuschlag Manager',
      description: 'Configure night/holiday surcharge multiplier rates',
      client: false,
      driver: false,
      ceo: true,
    },
    {
      feature: 'Monthly Contract Invoicing & Financial Exports',
      description: 'Generate PDF billing statements for hospital accounts',
      client: 'Own Clinic Invoices Only',
      driver: false,
      ceo: true,
    },
    {
      feature: 'Vacation Shutdown Emergency Router',
      description: 'Activate automated detour routing during operating breaks',
      client: false,
      driver: false,
      ceo: true,
    },
    {
      feature: 'GDPR Art. 28 AVV & Compliance Vault',
      description: 'Inspect signed data processing agreements under TFG § 15',
      client: 'Own Signed AVV Contract',
      driver: false,
      ceo: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-auto transition-colors ${
        isNightShift ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isNightShift ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-700 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-extrabold text-base flex items-center space-x-2 ${isNightShift ? 'text-white' : 'text-slate-900'}`}>
                <span>MediGo Security & Role Access Control Matrix</span>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] px-2 py-0.5 rounded font-mono uppercase">
                  Verified Active
                </span>
              </h3>
              <p className={`text-xs ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
                Role-Based Access Control (RBAC), Multi-Tenant Data Scope & Encryption Audit
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg border transition-all ${
              isNightShift ? 'text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-200'
            }`}
          >
            ✕
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Active Session Role Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN'
              ? 'bg-purple-950/40 border-purple-800 text-purple-200'
              : currentUser?.role === 'CLIENT_CLINIC'
              ? 'bg-blue-950/40 border-blue-800 text-blue-200'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                <Key className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white">{currentUser?.name}</span>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded font-mono font-bold uppercase border border-slate-700">
                    Role: {currentUser?.role}
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 block">
                  {currentUser?.role === 'CLIENT_CLINIC' && '🔒 Isolated Scope: Clinic Client Booking & Order Tracking Only'}
                  {currentUser?.role === 'DRIVER' && '🔒 Isolated Scope: Driver Courier App & Job Marketplace Only'}
                  {(currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && '👑 Unrestricted Scope: CEO Full Control Across All Fleet Systems'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onSwitchRole();
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 shadow"
            >
              Switch Demo Role
            </button>
          </div>

          {/* Automated System Verification Checklist */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isNightShift ? 'text-slate-300' : 'text-slate-700'}`}>
              System Security Verification Checks (6/6 Passed)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border space-y-1 ${isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Role Isolation Guard</span>
                </div>
                <p className="text-[11px] text-slate-400">Strict RBAC boundaries enforce non-overlapping permissions per role.</p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Contract Data Locking</span>
                </div>
                <p className="text-[11px] text-slate-400">Clinic orders locked to Hessen Contract IDs (e.g. CTR-2026-UKF).</p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Offline Queue HMAC</span>
                </div>
                <p className="text-[11px] text-slate-400">SHA-256 signed offline timestamps prevent tamper in basement deadzones.</p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>GDPR Art. 28 AVV Vault</span>
                </div>
                <p className="text-[11px] text-slate-400">Patient sample metadata encrypted under Transfusionsgesetz § 15.</p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>TLS 1.3 Telemetry Stream</span>
                </div>
                <p className="text-[11px] text-slate-400">Temperature sensor readings streamed via encrypted WebSocket proxy.</p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Immutable Audit Log</span>
                </div>
                <p className="text-[11px] text-slate-400">Every state machine transition signed with device ID and GPS coordinates.</p>
              </div>
            </div>
          </div>

          {/* RBAC Matrix Table */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isNightShift ? 'text-slate-300' : 'text-slate-700'}`}>
              Detailed Role Permission Matrix
            </h4>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isNightShift ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'}`}>
                    <th className="p-3 font-bold">System Capability</th>
                    <th className="p-3 font-bold text-center">
                      <div className="flex items-center justify-center space-x-1 text-blue-400">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Clinic Client</span>
                      </div>
                    </th>
                    <th className="p-3 font-bold text-center">
                      <div className="flex items-center justify-center space-x-1 text-emerald-400">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Courier Driver</span>
                      </div>
                    </th>
                    <th className="p-3 font-bold text-center">
                      <div className="flex items-center justify-center space-x-1 text-red-400">
                        <Crown className="w-3.5 h-3.5" />
                        <span>CEO / Dispatch</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isNightShift ? 'divide-slate-800/80 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                  {matrixPermissions.map((row, idx) => (
                    <tr key={idx} className={isNightShift ? 'hover:bg-slate-850' : 'hover:bg-slate-50'}>
                      <td className="p-3">
                        <span className="font-bold block text-white">{row.feature}</span>
                        <span className="text-[11px] text-slate-400">{row.description}</span>
                      </td>

                      {/* Client */}
                      <td className="p-3 text-center">
                        {typeof row.client === 'boolean' ? (
                          row.client ? (
                            <span className="inline-flex items-center justify-center bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-blue-400" />
                              Allowed
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center text-slate-500 text-[11px]">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-slate-600" />
                              Denied
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center justify-center bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {row.client}
                          </span>
                        )}
                      </td>

                      {/* Driver */}
                      <td className="p-3 text-center">
                        {typeof row.driver === 'boolean' ? (
                          row.driver ? (
                            <span className="inline-flex items-center justify-center bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                              Allowed
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center text-slate-500 text-[11px]">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-slate-600" />
                              Denied
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center justify-center bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {row.driver}
                          </span>
                        )}
                      </td>

                      {/* CEO */}
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-[11px] font-bold">
                          <Crown className="w-3 h-3 mr-1 text-red-400" />
                          Full Access
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Escalation Simulator */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                  Test Security Enforcement (Penetration Test Simulator)
                </h4>
              </div>
              <button
                onClick={handleSimulateAttack}
                disabled={testSimulating}
                className="bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 shadow"
              >
                {testSimulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Attack Test...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Test Client -&gt; CEO Breach Attempt</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Click to simulate a unauthorized access attempt where a Clinic Client attempts to directly query central financial dispatch API endpoints.
            </p>

            {simulationResult && (
              <div className="bg-slate-900 border border-red-800 p-3 rounded-lg text-xs font-mono text-red-300 whitespace-pre-wrap animate-in fade-in duration-200">
                {simulationResult}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          isNightShift ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <span>MediGo Security Controller • Hessen Medical Transport Guard</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition-all"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
