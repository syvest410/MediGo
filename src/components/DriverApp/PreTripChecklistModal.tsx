import React, { useState, useRef } from 'react';
import { Order, TRANSPORT_TEMP_RANGES, PreTripCheck } from '../../types';
import { CheckSquare, ShieldCheck, Thermometer, AlertCircle, CheckCircle, X } from 'lucide-react';

interface PreTripChecklistModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preTripData: Partial<PreTripCheck>) => void;
}

export const PreTripChecklistModal: React.FC<PreTripChecklistModalProps> = ({
  order,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [p650Outer, setP650Outer] = useState(true);
  const [primarySecondaryLeakProof, setPrimarySecondaryLeakProof] = useState(true);
  const [absorbentMaterial, setAbsorbentMaterial] = useState(true);
  const [tempBoxCalibrated, setTempBoxCalibrated] = useState(true);
  
  const tempRange = TRANSPORT_TEMP_RANGES[order.transportType] || TRANSPORT_TEMP_RANGES['REFRIGERATED_2_8C'];
  const [initialTemp, setInitialTemp] = useState<number>(+( (tempRange.min + tempRange.max) / 2 ).toFixed(1));
  const [signatureData, setSignatureData] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  if (!isOpen) return null;

  // Drawing signature logic
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
    ctx.strokeStyle = '#0284c7';
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

    if (!p650Outer || !primarySecondaryLeakProof || !absorbentMaterial || !tempBoxCalibrated) {
      setErrorMsg('UN 3373 ADR Compliance Error: All 4 packaging and temperature checks must be passed before pickup.');
      return;
    }

    if (!signatureData) {
      setErrorMsg('Driver signature required on Pre-Trip Certificate.');
      return;
    }

    onSubmit({
      p650OuterPackagingIntact: p650Outer,
      primarySecondaryLeakProof: primarySecondaryLeakProof,
      absorbentMaterialPresent: absorbentMaterial,
      tempBoxCalibrated: tempBoxCalibrated,
      initialTempCelsius: Number(initialTemp),
      targetTempMinCelsius: tempRange.min,
      targetTempMaxCelsius: tempRange.max,
      driverSignatureBase64: signatureData,
      approved: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 my-auto">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base text-white">Pre-Trip P650 Inspection</h3>
              <p className="text-xs text-slate-400">UN 3373 Category B Transport Verification</p>
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

          {/* Transport Specifications Info */}
          <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-lg space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-200">
              <span>Required Range: {tempRange.label}</span>
              <span className="text-emerald-400">{tempRange.min}°C to {tempRange.max}°C</span>
            </div>
            <p className="text-slate-400 text-[11px]">{tempRange.desc}</p>
          </div>

          {/* Checklist Options */}
          <div className="space-y-2">
            <label className="flex items-start space-x-3 bg-slate-800/40 border border-slate-700 p-2.5 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-all">
              <input
                type="checkbox"
                checked={p650Outer}
                onChange={(e) => setP650Outer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-semibold text-slate-200 block">1. Outer Packaging Intact (P650 Rigid Outer)</span>
                <span className="text-slate-400 text-[11px]">Free from cracks, impacts, or chemical degradation.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 bg-slate-800/40 border border-slate-700 p-2.5 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-all">
              <input
                type="checkbox"
                checked={primarySecondaryLeakProof}
                onChange={(e) => setPrimarySecondaryLeakProof(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-semibold text-slate-200 block">2. Primary & Secondary Vessels Leak-Proof</span>
                <span className="text-slate-400 text-[11px]">Capable of withstanding 95 kPa internal pressure differential.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 bg-slate-800/40 border border-slate-700 p-2.5 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-all">
              <input
                type="checkbox"
                checked={absorbentMaterial}
                onChange={(e) => setAbsorbentMaterial(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-semibold text-slate-200 block">3. Absorbent Material Present</span>
                <span className="text-slate-400 text-[11px]">Sufficient to absorb entire liquid contents of primary containers.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 bg-slate-800/40 border border-slate-700 p-2.5 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-all">
              <input
                type="checkbox"
                checked={tempBoxCalibrated}
                onChange={(e) => setTempBoxCalibrated(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-semibold text-slate-200 block">4. Temperature Box & Sensor Calibration</span>
                <span className="text-slate-400 text-[11px]">Thermo-insulated box pre-cooled/pre-conditioned with active sensor.</span>
              </div>
            </label>
          </div>

          {/* Initial Temperature Reading */}
          <div className="bg-slate-800/40 border border-slate-700 p-3 rounded-lg space-y-1.5">
            <label className="flex items-center space-x-2 text-slate-300 font-medium">
              <Thermometer className="w-4 h-4 text-emerald-400" />
              <span>Initial Box Temperature (°C):</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={initialTemp}
              onChange={(e) => setInitialTemp(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
            />
          </div>

          {/* Signature Canvas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-medium">Driver Signature (Hans Schmidt):</span>
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
                height={100}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-24 cursor-crosshair touch-none"
              />
            </div>
            <p className="text-[10px] text-slate-500">Sign above using touchscreen or mouse to certify inspection.</p>
          </div>

          {/* Footer Actions */}
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
              <CheckCircle className="w-4 h-4" />
              <span>Approve & Proceed to Pickup</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
