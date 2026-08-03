import React from 'react';
import { WifiOff, RefreshCw, Database } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
  pendingCount: number;
  onSyncNow: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, pendingCount, onSyncNow }) => {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className={`px-4 py-2.5 text-xs font-medium border-b flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm ${
      isOffline 
        ? 'bg-amber-900/90 text-amber-100 border-amber-700' 
        : 'bg-blue-900/90 text-blue-100 border-blue-700'
    }`}>
      <div className="flex items-center space-x-2">
        {isOffline ? (
          <WifiOff className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
        ) : (
          <Database className="w-4 h-4 text-blue-300 shrink-0" />
        )}
        <span>
          {isOffline ? (
            <strong>Hospital Basement Mode Active: </strong>
          ) : (
            <strong>Offline Queue Pending: </strong>
          )}
          {isOffline 
            ? 'No cellular network detected. Scans, signatures, and state changes are saved locally to IndexedDB.' 
            : `${pendingCount} item(s) stored locally are waiting to be synchronized with the central server.`
          }
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {pendingCount > 0 && (
          <span className="bg-amber-950 text-amber-200 border border-amber-600 px-2 py-0.5 rounded text-[11px]">
            {pendingCount} action(s) queued
          </span>
        )}
        <button
          onClick={onSyncNow}
          className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded border border-slate-600 flex items-center space-x-1 transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Sync Queue</span>
        </button>
      </div>
    </div>
  );
};
