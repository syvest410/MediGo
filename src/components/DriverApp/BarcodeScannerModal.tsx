import React, { useState } from 'react';
import { Camera, QrCode, Plus, Check, X, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import { parseScannedQRPayload } from '../../lib/qrCodeGenerator';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  expectedBarcodes: string[];
  onClose: () => void;
  onConfirm: (scannedList: string[]) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  expectedBarcodes,
  onClose,
  onConfirm,
}) => {
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>(expectedBarcodes || []);
  const [manualInput, setManualInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [flashMsg, setFlashMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleAddBarcode = (code: string) => {
    const raw = code.trim();
    if (!raw) return;

    // Check if it's a JSON QR Code Payload
    const qrPayload = parseScannedQRPayload(raw);
    if (qrPayload) {
      const newItems: string[] = [];
      if (qrPayload.trackingNumber && !scannedBarcodes.includes(qrPayload.trackingNumber)) {
        newItems.push(qrPayload.trackingNumber);
      }
      if (qrPayload.barcodes && Array.isArray(qrPayload.barcodes)) {
        qrPayload.barcodes.forEach((b) => {
          if (b && !scannedBarcodes.includes(b) && !newItems.includes(b)) {
            newItems.push(b);
          }
        });
      }

      if (newItems.length > 0) {
        setScannedBarcodes((prev) => [...prev, ...newItems]);
        setManualInput('');
        setFlashMsg(`✓ Verified QR Code Payload! Added ${newItems.length} item(s)`);
        setTimeout(() => setFlashMsg(''), 3000);
        return;
      }
    }

    // Standard string barcode
    const trimmed = raw.toUpperCase();
    if (scannedBarcodes.includes(trimmed)) {
      setFlashMsg(`Barcode ${trimmed} is already in the list.`);
      return;
    }
    setScannedBarcodes((prev) => [...prev, trimmed]);
    setManualInput('');
    setFlashMsg(`✓ Scanned ${trimmed}`);
    setTimeout(() => setFlashMsg(''), 2500);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const mockCode = `SPEC-BAR-${Math.floor(1000 + Math.random() * 9000)}`;
      handleAddBarcode(mockCode);
      setIsScanning(false);
    }, 800);
  };

  const handleRemove = (code: string) => {
    setScannedBarcodes(scannedBarcodes.filter(c => c !== code));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 my-auto">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base text-white">Specimen Barcode Verification</h3>
              <p className="text-xs text-slate-400">UN 3373 Package ID Scan</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          
          {/* Simulated Camera Viewfinder */}
          <div className="relative bg-slate-950 border-2 border-dashed border-emerald-500/50 rounded-xl p-6 text-center space-y-3 overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none animate-pulse" />
            
            <div className="w-16 h-16 mx-auto bg-slate-800/80 rounded-full flex items-center justify-center border border-slate-700 text-emerald-400 shadow-inner">
              <Camera className={`w-8 h-8 ${isScanning ? 'animate-bounce text-emerald-300' : ''}`} />
            </div>

            <p className="text-slate-300 text-xs">Align Specimen Box Barcode / QR Code in camera frame</p>

            <button
              type="button"
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md transition-all flex items-center justify-center space-x-2 mx-auto"
            >
              <QrCode className="w-4 h-4" />
              <span>{isScanning ? 'Reading Specimen Barcode...' : 'Trigger Camera Laser Scan'}</span>
            </button>
          </div>

          {flashMsg && (
            <div className="bg-emerald-950/90 border border-emerald-600 text-emerald-200 p-2.5 rounded-lg text-center font-medium">
              {flashMsg}
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Manual Barcode / Identifier Entry:</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. SPEC-BER-9901-A"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleAddBarcode(manualInput)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-600 flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Scanned Barcodes List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Verified Barcodes ({scannedBarcodes.length}):</span>
              {scannedBarcodes.length === 0 && (
                <span className="text-rose-400 text-[11px] flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Scan required</span>
                </span>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950 border border-slate-800 p-2 rounded-lg">
              {scannedBarcodes.length === 0 ? (
                <p className="text-slate-500 text-center py-4 italic">No barcodes scanned yet.</p>
              ) : (
                scannedBarcodes.map((code, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800/80 border border-slate-700 px-2.5 py-1.5 rounded text-mono">
                    <span className="text-emerald-300 font-mono font-semibold">{code}</span>
                    <button
                      onClick={() => handleRemove(code)}
                      className="text-slate-400 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
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
              type="button"
              onClick={() => onConfirm(scannedBarcodes)}
              disabled={scannedBarcodes.length === 0}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center space-x-1.5 shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Verified Barcodes ({scannedBarcodes.length})</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
