import React, { useState, useRef, useEffect } from 'react';
import { Order, TRANSPORT_TEMP_RANGES, PreTripCheck } from '../../types';
import {
  ShieldCheck,
  Thermometer,
  AlertCircle,
  CheckCircle,
  X,
  PenTool,
  RotateCcw,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { generateSampleSignatureDataUrl } from './SignaturePadModal';

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
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSignatureData('');
    setStrokeCount(0);
    setErrorMsg('');

    const timer = setTimeout(() => {
      setupCanvas();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const parentW = canvas.parentElement?.clientWidth || 500;
    const width = rect.width > 50 ? rect.width : parentW;
    const height = rect.height > 50 ? rect.height : 140;
    const dpr = window.devicePixelRatio || 2;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(25 * dpr, canvas.height - 25 * dpr);
    ctx.lineTo(canvas.width - 25 * dpr, canvas.height - 25 * dpr);
    ctx.stroke();

    ctx.lineWidth = 3.2 * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7'; // Courier blue ink
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (canvas.parentElement?.clientWidth || 500);
    const height = rect.height > 0 ? rect.height : 140;

    let clientX = rect.left;
    let clientY = rect.top;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && (e as React.TouchEvent).changedTouches && (e as React.TouchEvent).changedTouches.length > 0) {
      clientX = (e as React.TouchEvent).changedTouches[0].clientX;
      clientY = (e as React.TouchEvent).changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPosRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    ctx.lineWidth = 3.2 * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7';

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 1.6 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getCanvasCoords(e);
    const midX = (lastPosRef.current.x + currentPos.x) / 2;
    const midY = (lastPosRef.current.y + currentPos.y) / 2;

    ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, midX, midY);
    ctx.stroke();

    lastPosRef.current = currentPos;
    setStrokeCount(prev => prev + 1);
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setupCanvas();
    setSignatureData('');
    setStrokeCount(0);
  };

  const handleApplySampleSignature = () => {
    const sampleDataUrl = generateSampleSignatureDataUrl(order.driverName || 'Hans Schmidt (MediGo Courier)');
    setSignatureData(sampleDataUrl);
    setStrokeCount(25);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = sampleDataUrl;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!p650Outer || !primarySecondaryLeakProof || !absorbentMaterial || !tempBoxCalibrated) {
      setErrorMsg('UN 3373 ADR Compliance Error: All 4 packaging and temperature checks must be passed before pickup.');
      return;
    }

    let finalSignature = signatureData;
    if (!finalSignature || strokeCount < 3) {
      finalSignature = generateSampleSignatureDataUrl(order.driverName || 'Hans Schmidt (MediGo Courier)');
      setSignatureData(finalSignature);
    }

    onSubmit({
      p650OuterPackagingIntact: p650Outer,
      primarySecondaryLeakProof: primarySecondaryLeakProof,
      absorbentMaterialPresent: absorbentMaterial,
      tempBoxCalibrated: tempBoxCalibrated,
      initialTempCelsius: Number(initialTemp),
      targetTempMinCelsius: tempRange.min,
      targetTempMaxCelsius: tempRange.max,
      driverSignatureBase64: finalSignature,
      approved: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 my-auto flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">Pre-Trip P650 Inspection</h3>
                <span className="bg-blue-950 text-cyan-300 border border-blue-800 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                  STAGE 2 / 5
                </span>
              </div>
              <p className="text-xs text-slate-400">ADR Biological Substance Category B Transport</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          
          {errorMsg && (
            <div className="bg-rose-950/90 border border-rose-600 text-rose-200 p-3 rounded-xl flex items-start space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Transport Specifications Info */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span>Required Range: {tempRange.label}</span>
              <span className="text-cyan-400 font-mono">{tempRange.min}°C to {tempRange.max}°C</span>
            </div>
            <p className="text-slate-400 text-[11px]">{tempRange.desc}</p>
          </div>

          {/* Checklist Options */}
          <div className="space-y-2">
            <label className="flex items-start space-x-3 bg-slate-950 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-slate-700 transition-all select-none">
              <input
                type="checkbox"
                checked={p650Outer}
                onChange={(e) => setP650Outer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-200 block">1. Outer Packaging Intact (P650 Rigid Outer)</span>
                <span className="text-slate-400 text-[11px]">Free from cracks, impacts, chemical degradation, or moisture.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 bg-slate-950 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-slate-700 transition-all select-none">
              <input
                type="checkbox"
                checked={primarySecondaryLeakProof}
                onChange={(e) => setPrimarySecondaryLeakProof(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-200 block">2. Primary & Secondary Vessels Leak-Proof</span>
                <span className="text-slate-400 text-[11px]">Capable of withstanding 95 kPa internal pressure differential without leak.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 bg-slate-950 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-slate-700 transition-all select-none">
              <input
                type="checkbox"
                checked={absorbentMaterial}
                onChange={(e) => setAbsorbentMaterial(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-200 block">3. Absorbent Material Present</span>
                <span className="text-slate-400 text-[11px]">Sufficient capacity to absorb entire liquid specimen volume.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 bg-slate-950 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-slate-700 transition-all select-none">
              <input
                type="checkbox"
                checked={tempBoxCalibrated}
                onChange={(e) => setTempBoxCalibrated(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-200 block">4. Temperature Box & Sensor Active</span>
                <span className="text-slate-400 text-[11px]">Active IoT data-logger calibrated within 24h calibration validity window.</span>
              </div>
            </label>
          </div>

          {/* Initial Temperature Reading */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <label className="flex items-center justify-between text-slate-300 font-bold">
              <span className="flex items-center space-x-1.5">
                <Thermometer className="w-4 h-4 text-cyan-400" />
                <span>Initial Calibrated Box Temperature:</span>
              </span>
              <span className="text-cyan-400 font-mono">{initialTemp} °C</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={initialTemp}
              onChange={(e) => setInitialTemp(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm font-bold"
            />
          </div>

          {/* Driver Signature Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center space-x-1.5">
                <PenTool className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold">Driver Certification Signature (Hans Schmidt) *</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleApplySampleSignature}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Sample Signature</span>
                </button>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-slate-400 hover:text-white text-[11px] font-semibold flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Canvas Box */}
            <div className="border-2 border-slate-700 hover:border-cyan-500/80 rounded-2xl bg-white p-1 overflow-hidden shadow-inner transition-colors relative">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 cursor-crosshair touch-none rounded-xl block bg-white"
              />

              {!signatureData && strokeCount === 0 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 font-medium text-xs">
                  <span>Sign with touch or mouse to certify inspection</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>Driver signature embedded directly into PDF audit report</span>
              {signatureData && (
                <span className="text-cyan-400 font-bold font-mono flex items-center space-x-1">
                  <FileCheck className="w-3 h-3" />
                  <span>Pre-Trip Signature Captured</span>
                </span>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition-all text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!signatureData && strokeCount < 3}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center space-x-2 shadow-lg shadow-cyan-950 transition-all text-xs active:scale-95"
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
