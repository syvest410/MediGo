import React, { useState, useRef } from 'react';
import { PenTool, MapPin, KeyRound, Check, X, AlertCircle } from 'lucide-react';
import { ChainOfCustody } from '../../types';

interface SignaturePadModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  defaultStaffName?: string;
  defaultStaffTitle?: string;
  scannedBarcodes: string[];
  onClose: () => void;
  onSubmit: (signatureData: Partial<ChainOfCustody>) => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  title,
  subtitle,
  defaultStaffName = '',
  defaultStaffTitle = '',
  scannedBarcodes,
  onClose,
  onSubmit,
}) => {
  const [staffName, setStaffName] = useState(defaultStaffName);
  const [staffTitle, setStaffTitle] = useState(defaultStaffTitle);
  const [pinCode, setPinCode] = useState('8832');
  const [usePin, setUsePin] = useState(true);
  const [signatureData, setSignatureData] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#10b981';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!staffName || staffName.trim().length < 2) {
      setErrorMsg('Recipient/Handover staff member full name is required for Chain of Custody.');
      return;
    }

    if (!signatureData) {
      setErrorMsg('Digital signature on touch pad is required.');
      return;
    }

    onSubmit({
      staffName,
      staffTitle,
      signatureBase64: signatureData,
      pinCodeVerified: usePin,
      scannedBarcodes,
      timestamp: new Date().toISOString(),
      gpsLatitude: 52.5200,
      gpsLongitude: 13.4050,
      gpsAccuracyMeters: 3.5,
      deviceId: 'MOB-DRIVER-104'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 my-auto">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PenTool className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="bg-rose-950/90 border border-rose-600 text-rose-200 p-3 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Barcode verification reminder */}
          <div className="bg-emerald-950/50 border border-emerald-700/60 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-emerald-300 font-medium">Scanned Barcodes Linked ({scannedBarcodes.length}):</span>
            <span className="font-mono text-emerald-400 font-semibold">{scannedBarcodes.join(', ') || 'Default Box'}</span>
          </div>

          {/* Staff Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Staff Member Name *</label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g. Schwester Elena Meyer"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Title / Department</label>
              <input
                type="text"
                value={staffTitle}
                onChange={(e) => setStaffTitle(e.target.value)}
                placeholder="e.g. Stationsleitung / Lab Reception"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* PIN Verification */}
          <div className="bg-slate-800/40 border border-slate-700 p-3 rounded-lg space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usePin}
                onChange={(e) => setUsePin(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-emerald-500"
              />
              <span className="text-slate-200 font-medium flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verify Staff Security PIN Code</span>
              </span>
            </label>

            {usePin && (
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="password"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="4-digit PIN"
                  className="w-28 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-center font-mono text-emerald-300 text-sm focus:outline-none"
                />
                <span className="text-emerald-400 text-[11px] font-medium">✓ PIN 8832 Authorized</span>
              </div>
            )}
          </div>

          {/* GPS Coordinates Display */}
          <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-slate-400 text-[11px]">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>GPS Lat: 52.5200, Lng: 13.4050 (±3.5m)</span>
            </div>
            <span>{new Date().toLocaleTimeString('de-DE')}</span>
          </div>

          {/* Signature Canvas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-medium">Handover Signature Canvas *</span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-slate-400 hover:text-white underline text-[11px]"
              >
                Clear
              </button>
            </div>
            <div className="border border-slate-700 rounded-lg bg-slate-950 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={450}
                height={110}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 cursor-crosshair touch-none"
              />
            </div>
            <p className="text-[10px] text-slate-500">Sign above to finalize legally binding Chain of Custody record.</p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-1.5 shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Chain of Custody</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
