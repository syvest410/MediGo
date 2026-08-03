import React from 'react';
import { AuditLog, Order } from '../../types';
import { ShieldCheck, MapPin, Smartphone, User, CheckCircle, Database } from 'lucide-react';

interface AuditTrailViewerProps {
  orders: Order[];
  selectedOrder: Order | null;
}

export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({ orders, selectedOrder }) => {
  // Aggregate all audit logs across orders or for selected order
  let logs: AuditLog[] = [];

  if (selectedOrder) {
    logs = selectedOrder.auditLogs;
  } else {
    orders.forEach((o) => {
      logs = logs.concat(o.auditLogs);
    });
  }

  // Sort by newest first
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-slate-100 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-950 p-2 rounded-lg text-emerald-400 border border-emerald-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Immutable Audit Trail Ledger</h3>
            <p className="text-xs text-slate-400">German Legal & Laboratory Chain-of-Custody Compliance Verification</p>
          </div>
        </div>

        <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold">
          {logs.length} Immutable Event(s)
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs font-medium">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3">Timestamp (DE)</th>
              <th className="p-3">Order ID</th>
              <th className="p-3">State Transition</th>
              <th className="p-3">Action Description</th>
              <th className="p-3">User / Role</th>
              <th className="p-3">GPS Location</th>
              <th className="p-3">Sync Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-slate-300">
                    {new Date(log.createdAt).toLocaleString('de-DE')}
                  </td>

                  <td className="p-3 font-bold text-white">
                    {log.orderId}
                  </td>

                  <td className="p-3">
                    <span className="text-amber-300 font-semibold">{log.previousState || 'INIT'}</span>
                    <span className="text-slate-500 mx-1">→</span>
                    <span className="text-emerald-400 font-semibold">{log.newState}</span>
                  </td>

                  <td className="p-3 text-slate-200 max-w-xs font-sans">
                    {log.actionDescription}
                  </td>

                  <td className="p-3 text-slate-300 font-sans">
                    <div className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.userName} ({log.userRole})</span>
                    </div>
                  </td>

                  <td className="p-3 text-slate-400 text-[11px]">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{log.gpsLatitude.toFixed(4)}, {log.gpsLongitude.toFixed(4)}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    {log.offlineSynced ? (
                      <span className="text-emerald-400 text-[10px] font-semibold flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Synced</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 text-[10px] font-semibold flex items-center space-x-1">
                        <Database className="w-3.5 h-3.5" />
                        <span>Local Queue</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
