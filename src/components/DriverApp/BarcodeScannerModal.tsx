import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  QrCode,
  Plus,
  Check,
  X,
  Trash2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Flashlight,
  SwitchCamera,
  Upload,
  Volume2,
  VolumeX,
  CheckCircle2,
  FileImage,
  Layers
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { parseScannedQRPayload } from '../../lib/qrCodeGenerator';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  expectedBarcodes?: string[];
  onClose: () => void;
  onConfirm: (scannedList: string[]) => void;
}

// Web Audio API beep generator for reliable zero-dependency scan feedback
function playScanSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // Jump to A6
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio context errors if sound is disabled/blocked
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  expectedBarcodes = [],
  onClose,
  onConfirm,
}) => {
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>(expectedBarcodes || []);
  const [manualInput, setManualInput] = useState<string>('');
  const [flashMsg, setFlashMsg] = useState<string>('');
  const [flashType, setFlashType] = useState<'success' | 'info' | 'error'>('info');

  // Camera Hardware State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrReaderId = 'html5-barcode-scanner-viewport';

  // Initialize or Clean up camera scanner on open/close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    // Set initial list from expectedBarcodes if state was empty
    if (expectedBarcodes && expectedBarcodes.length > 0 && scannedBarcodes.length === 0) {
      setScannedBarcodes(expectedBarcodes);
    }

    // Check available camera devices & start scanner
    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, selectedCameraId]);

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setFlashMsg(msg);
    setFlashType(type);
    setTimeout(() => {
      setFlashMsg('');
    }, 3500);
  };

  const handleBarcodeScanned = (decodedText: string) => {
    const raw = decodedText.trim();
    if (!raw) return;

    if (soundEnabled) {
      playScanSuccessBeep();
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([50, 30, 50]);
      } catch (e) {
        // Haptics not allowed
      }
    }

    // 1. Check if it's a JSON QR Code Payload
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
        showNotification(`✓ Verified UN 3373 QR Payload! Added ${newItems.length} item(s)`, 'success');
        return;
      } else {
        showNotification(`QR Payload items are already in the verified list.`, 'info');
        return;
      }
    }

    // 2. Standard 1D/2D Barcode string
    const trimmed = raw.toUpperCase();
    if (scannedBarcodes.includes(trimmed)) {
      showNotification(`Barcode ${trimmed} is already in the list.`, 'info');
      return;
    }

    setScannedBarcodes((prev) => [...prev, trimmed]);
    setManualInput('');
    showNotification(`✓ Successfully scanned: ${trimmed}`, 'success');
  };

  const startCamera = async () => {
    setCameraError(null);

    // Ensure DOM container is ready before initializing Html5Qrcode
    await new Promise((resolve) => setTimeout(resolve, 150));
    const container = document.getElementById(qrReaderId);
    if (!container) {
      console.warn('Barcode scanner DOM container not found yet, retrying in 200ms...');
      setTimeout(startCamera, 200);
      return;
    }

    // Stop previous instance if running
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }

    // Safely enumerate cameras without throwing or blocking
    try {
      if (cameraDevices.length === 0 && typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (devices && devices.length > 0) {
          setCameraDevices(devices);
          if (!selectedCameraId) {
            const backCam = devices.find(d =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        }
      }
    } catch (devErr) {
      console.warn('Camera enumeration note:', devErr);
    }

    const qrCodeFormats = [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.DATA_MATRIX
    ];

    try {
      const html5QrCode = new Html5Qrcode(qrReaderId, {
        formatsToSupport: qrCodeFormats,
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edgeSize = Math.floor(minEdge * 0.75);
          return {
            width: Math.max(220, edgeSize),
            height: Math.max(160, Math.floor(edgeSize * 0.65))
          };
        },
        aspectRatio: 1.333333
      };

      const onScanSuccess = (decodedText: string) => {
        handleBarcodeScanned(decodedText);
      };

      const onScanFailure = () => {
        // Continuous non-match frames are expected
      };

      // Cascade of camera configurations for guaranteed maximum device compatibility
      let started = false;
      const cameraConfigsToTry: (MediaTrackConstraints | { facingMode: any } | { deviceId: any })[] = [];

      if (selectedCameraId) {
        cameraConfigsToTry.push({ deviceId: { exact: selectedCameraId } });
      }
      cameraConfigsToTry.push({ facingMode: { ideal: facingMode } });
      cameraConfigsToTry.push({ facingMode: facingMode });
      cameraConfigsToTry.push({ facingMode: facingMode === 'environment' ? 'user' : 'environment' });
      cameraConfigsToTry.push({} as any);

      let lastErr: any = null;
      for (const config of cameraConfigsToTry) {
        try {
          await html5QrCode.start(config as any, scanConfig, onScanSuccess, onScanFailure);
          started = true;
          setIsCameraActive(true);
          setCameraError(null);
          break;
        } catch (tryErr) {
          lastErr = tryErr;
        }
      }

      if (!started) {
        throw lastErr || new Error('Unable to initialize video stream with available device configurations.');
      }
    } catch (err: unknown) {
      console.warn('Camera stream could not be started:', err);
      setIsCameraActive(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission') || errMsg.includes('denied')) {
        setCameraError('Camera access is restricted or awaiting permission. You can use your phone camera photo snapshot, simulate scanner, or use the 1-click verification below.');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError('No physical camera device was detected. Use the Native Photo, Simulator, or Sample buttons below.');
      } else if (errMsg.includes('NotReadableError')) {
        setCameraError('Camera is currently in use by another tab or app. Please close other camera apps and retry.');
      } else {
        setCameraError('Live camera stream is unavailable in this environment. Use the Phone Camera / Simulator buttons below to verify specimens.');
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      } finally {
        scannerRef.current = null;
        setIsCameraActive(false);
        setIsTorchOn(false);
      }
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setSelectedCameraId('');
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !isCameraActive) return;
    try {
      // Attempt torch toggle via html5-qrcode video track
      const videoElement = document.querySelector(`#${qrReaderId} video`) as HTMLVideoElement | null;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
          if (capabilities.torch) {
            const nextState = !isTorchOn;
            await track.applyConstraints({
              advanced: [{ torch: nextState } as any]
            });
            setIsTorchOn(nextState);
            showNotification(`Flashlight ${nextState ? 'Turned ON' : 'Turned OFF'}`, 'info');
            return;
          }
        }
      }
      showNotification('Flashlight torch is not supported on this specific camera lens.', 'info');
    } catch (e) {
      showNotification('Flashlight toggle is not available on this device.', 'info');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsProcessingFile(true);

    try {
      // Temporarily stop camera to free resources for image decoder
      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
          setIsCameraActive(false);
        } catch (e) {
          // ignore
        }
      }

      const tempScanner = new Html5Qrcode(qrReaderId, { verbose: false });
      const decodedResult = await tempScanner.scanFile(file, true);
      handleBarcodeScanned(decodedResult);
      showNotification(`✓ Decoded from image: ${decodedResult}`, 'success');
    } catch (err) {
      console.warn('Image barcode scan error:', err);
      showNotification('No readable barcode or QR code found in photo. Please ensure good lighting or use the 1-Click verification below.', 'error');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Simulates a physical laser scanner reading the next expected barcode with laser sound and animation
  const handleSimulateLaserScan = () => {
    // Determine which barcode to scan
    let codeToScan = '';
    const unverifiedExpected = expectedBarcodes.find(b => !scannedBarcodes.includes(b));
    if (unverifiedExpected) {
      codeToScan = unverifiedExpected;
    } else {
      const demoSamples = ['SPEC-MR-4412', 'SPEC-KS-101-A', 'SPEC-KS-101-B', 'SPEC-KS-101-C', 'SPEC-DE-UN3373-B'];
      const nextDemo = demoSamples.find(s => !scannedBarcodes.includes(s));
      codeToScan = nextDemo || `SPEC-DE-${Math.floor(1000 + Math.random() * 9000)}-A`;
    }

    handleBarcodeScanned(codeToScan);
    showNotification(`⚡ Laser Scan Simulated: ${codeToScan}`, 'success');
  };

  const handleAddExpectedBarcodes = () => {
    if (expectedBarcodes.length === 0) {
      const demoCode = `SPEC-UN3373-${Math.floor(1000 + Math.random() * 9000)}-A`;
      handleBarcodeScanned(demoCode);
      return;
    }

    let addedCount = 0;
    expectedBarcodes.forEach((b) => {
      if (!scannedBarcodes.includes(b)) {
        setScannedBarcodes((prev) => [...prev, b]);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      if (soundEnabled) playScanSuccessBeep();
      showNotification(`✓ Verified all ${addedCount} order specimen barcode(s)`, 'success');
    } else {
      showNotification(`All ${expectedBarcodes.length} order barcodes are already verified.`, 'info');
    }
  };

  const handleAddManualBarcode = (code: string) => {
    if (!code.trim()) return;
    handleBarcodeScanned(code.trim());
  };

  const handleRemove = (code: string) => {
    setScannedBarcodes(scannedBarcodes.filter(c => c !== code));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">Specimen Barcode & Camera Scanner</h3>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                  UN 3373 P650
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Live Hardware Video & Laser Aiming Guide</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Beep Audio' : 'Enable Beep Audio'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Live Camera Viewport Area */}
          <div className="relative bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[240px]">
            
            {/* HTML5 QR/Barcode Video Container */}
            <div
              id={qrReaderId}
              className="w-full h-full min-h-[220px] max-h-[300px] flex items-center justify-center overflow-hidden [&_video]:max-h-[300px] [&_video]:w-full [&_video]:object-cover"
            />

            {/* Viewfinder Aiming Overlay (when camera is active) */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Aiming Reticle Box */}
                <div className="w-56 h-36 border-2 border-emerald-400/80 rounded-xl relative shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />

                  {/* Animated Laser Scanning Line */}
                  <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#34d399] top-1/2 -translate-y-1/2" />
                </div>
                
                <div className="absolute bottom-2 bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-700 text-[10px] text-emerald-300 font-mono flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Aim at 1D Barcode or 2D QR Code</span>
                </div>
              </div>
            )}

            {/* Error or Inactive Camera Fallback State */}
            {(!isCameraActive || cameraError) && (
              <div className="p-6 text-center space-y-3 max-w-sm">
                <div className="w-14 h-14 mx-auto bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 text-emerald-400 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>

                {cameraError ? (
                  <div className="space-y-2">
                    <p className="text-amber-300 font-medium text-xs flex items-center justify-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Camera Access Notice</span>
                    </p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {cameraError}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs">
                    Initializing camera stream for specimen box scan...
                  </p>
                )}

                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md transition-all flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera Stream</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateLaserScan}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-md transition-all flex items-center space-x-1.5 animate-pulse"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                    <span>Simulate Laser Scan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold transition-all flex items-center space-x-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isProcessingFile ? 'Analyzing Photo...' : 'Snap Photo / Upload'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Hardware & Simulation Controls Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            
            {/* Camera Controls */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {cameraDevices.length > 1 ? (
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-emerald-500 max-w-[150px] truncate"
                >
                  {cameraDevices.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] font-semibold flex items-center space-x-1 transition-all"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{facingMode === 'environment' ? 'Rear' : 'Front'} Lens</span>
                </button>
              )}

              {/* Torch / Light Toggle */}
              <button
                type="button"
                onClick={toggleTorch}
                disabled={!isCameraActive}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center space-x-1 transition-all disabled:opacity-40 ${
                  isTorchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Flashlight className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
              
              <button
                type="button"
                onClick={handleSimulateLaserScan}
                className="bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-700 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all"
                title="Simulate laser scan hardware read"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Simulate Scan</span>
              </button>

              <button
                type="button"
                onClick={handleAddExpectedBarcodes}
                className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all"
                title="Verify all barcodes belonging to this order"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verify All Order Codes</span>
              </button>
            </div>
          </div>

          {/* Quick Barcode Test Targets Chips */}
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Quick Test Specimen Codes (Tap to scan):</span>
              <span className="text-[10px] text-emerald-400">1-Tap Verification</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(expectedBarcodes.length > 0 ? expectedBarcodes : ['SPEC-MR-4412', 'SPEC-KS-101-A', 'SPEC-KS-101-B', 'SPEC-KS-101-C']).map((code) => {
                const isScanned = scannedBarcodes.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleBarcodeScanned(code)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center space-x-1 border transition-all ${
                      isScanned
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700 line-through opacity-70'
                        : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700 hover:border-cyan-500'
                    }`}
                  >
                    <span>{code}</span>
                    {isScanned ? (
                      <Check className="w-3 h-3 text-emerald-400 inline" />
                    ) : (
                      <Plus className="w-3 h-3 text-cyan-400 inline" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flash Feedback Banner */}
          {flashMsg && (
            <div
              className={`p-2.5 rounded-xl text-center font-bold text-xs flex items-center justify-center space-x-2 border transition-all animate-fade-in ${
                flashType === 'success'
                  ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200 shadow-md shadow-emerald-950/50'
                  : flashType === 'error'
                  ? 'bg-rose-950/90 border-rose-600 text-rose-200 shadow-md shadow-rose-950/50'
                  : 'bg-blue-950/90 border-blue-600 text-blue-200 shadow-md shadow-blue-950/50'
              }`}
            >
              {flashType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {flashType === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{flashMsg}</span>
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <label className="text-slate-300 font-semibold block text-[11px]">
              Manual Barcode or Tracking # Entry:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualBarcode(manualInput);
                  }
                }}
                placeholder="e.g. SPEC-BER-9902-A or DE-UN3373-2026-8821"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs uppercase"
              />
              <button
                type="button"
                onClick={() => handleAddManualBarcode(manualInput)}
                disabled={!manualInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1 shadow transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Scanned Barcodes List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold text-xs">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Verified Specimen Barcodes ({scannedBarcodes.length}):</span>
              </span>
              {scannedBarcodes.length === 0 && (
                <span className="text-rose-400 text-[11px] flex items-center space-x-1 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded-full font-bold">
                  <AlertCircle className="w-3 h-3" />
                  <span>Scan required</span>
                </span>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
              {scannedBarcodes.length === 0 ? (
                <div className="text-slate-500 text-center py-5 space-y-1">
                  <p className="italic">No specimen barcodes registered yet.</p>
                  <p className="text-[10px] text-slate-600">Scan packaging labels via camera or type codes above</p>
                </div>
              ) : (
                scannedBarcodes.map((code, idx) => {
                  const isExpected = expectedBarcodes.includes(code);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-xl text-mono group hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="text-emerald-300 font-mono font-bold text-xs block truncate">
                            {code}
                          </span>
                          {isExpected && (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-0.5">
                              <Check className="w-3 h-3 inline" /> Order Specimen Match
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(code)}
                        className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 p-1.5 rounded-lg transition-colors shrink-0"
                        title="Remove barcode"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-800/80 border-t border-slate-700 p-3.5 sm:p-4 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition-all text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onConfirm(scannedBarcodes)}
            disabled={scannedBarcodes.length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center space-x-2 shadow-lg shadow-emerald-950 transition-all text-xs active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Verified Barcodes ({scannedBarcodes.length})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
