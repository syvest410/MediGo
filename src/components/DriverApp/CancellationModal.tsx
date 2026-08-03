import React, { useState } from 'react';
import { CancelReasonCode } from '../../types';
import { AlertTriangle, X, Check } from 'lucide-react';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: CancelReasonCode, notes: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState<CancelReasonCode>('RECIPIENT_UNAVAILABLE');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason, notes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 my-auto">
        
        <div className="bg-rose-950/90 border-b border-rose-800 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-bold text-base text-white">Cancel / Return Specimen Order</h3>
              <p className="text-xs text-rose-200">UN 3373 Abort & Return Protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Mandatory Protocol Cancellation Reason Code *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CancelReasonCode)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="RECIPIENT_UNAVAILABLE">Recipient Unavailable at Laboratory / Lab Closed</option>
              <option value="SAMPLE_REJECTED_PACAKGING">Sample Rejected: P650 Packaging Compromised</option>
              <option value="TEMPERATURE_BREACH">Critical Temperature Threshold Breach Alert</option>
              <option value="VEHICLE_FAILURE">Thermo Transport Vehicle Mechanical Breakdown</option>
              <option value="CLINIC_CANCELLED">Clinic Cancelled Transport Request</option>
              <option value="OTHER">Other Protocol Exception</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Detailed Exception & Return Plan Notes *</label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide exact details (e.g. Lab door locked at 18:30, returned specimen box to clinic pathology vault at 19:15)."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center space-x-1.5 shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Abort & Return Protocol</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
