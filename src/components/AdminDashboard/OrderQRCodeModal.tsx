import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { generateQRCodeDataURL, printOrderQRSticker, buildOrderQRPayloadString } from '../../lib/qrCodeGenerator';
import { QrCode, Download, Printer, Copy, Check, X, ShieldAlert, PackageCheck, ExternalLink, Sparkles } from 'lucide-react';

interface OrderQRCodeModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSimulateScanDriver?: (scannedPayload: string) => void;
}

export const OrderQRCodeModal: React.FC<OrderQRCodeModalProps> = ({
  order,
  isOpen,
  onClose,
  onSimulateScanDriver,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'FULL_ORDER' | 'TRACKING_NUM' | 'BARCODES'>('FULL_ORDER');
  const [selectedBarcode, setSelectedBarcode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (!order) return;
    if (order.barcodeList.length > 0 && !selectedBarcode) {
      setSelectedBarcode(order.barcodeList[0]);
    }
  }, [order]);

  useEffect(() => {
    if (!isOpen || !order) return;

    let textToEncode = '';
    if (activeTab === 'FULL_ORDER') {
      textToEncode = buildOrderQRPayloadString(order);
    } else if (activeTab === 'TRACKING_NUM') {
      textToEncode = order.trackingNumber;
    } else if (activeTab === 'BARCODES') {
      textToEncode = selectedBarcode || (order.barcodeList[0] ?? order.trackingNumber);
    }

    setIsGenerating(true);
    generateQRCodeDataURL(textToEncode, { width: 320 })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('QR generation error:', err);
        setIsGenerating(false);
      });
  }, [isOpen, order, activeTab, selectedBarcode]);

  if (!isOpen || !order) return null;

  const handleCopyPayload = () => {
    const textToCopy = activeTab === 'FULL_ORDER' 
      ? buildOrderQRPayloadString(order) 
      : (activeTab === 'TRACKING_NUM' ? order.trackingNumber : selectedBarcode);
      
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${order.trackingNumber}_${activeTab}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePrintSticker = () => {
    printOrderQRSticker(order);
  };

  const handleSendToDriverScanner = () => {
    const payload = activeTab === 'FULL_ORDER' 
      ? buildOrderQRPayloadString(order) 
      : (activeTab === 'TRACKING_NUM' ? order.trackingNumber : selectedBarcode);

    if (onSimulateScanDriver) {
      onSimulateScanDriver(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 my-auto space-y-0">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-950 p-2 rounded-xl text-emerald-400 border border-emerald-800">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Medical Order QR Generator</h3>
              <p className="text-xs text-slate-400 font-mono">{order.trackingNumber}</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('FULL_ORDER')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                activeTab === 'FULL_ORDER' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Order JSON Payload
            </button>

            <button
              onClick={() => setActiveTab('TRACKING_NUM')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                activeTab === 'TRACKING_NUM' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tracking Number
            </button>

            <button
              onClick={() => setActiveTab('BARCODES')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                activeTab === 'BARCODES' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Specimen Barcode
            </button>
          </div>

          {/* If Barcodes sub-tab, show dropdown to select individual specimen barcode */}
          {activeTab === 'BARCODES' && order.barcodeList.length > 0 && (
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Select Specimen Box Barcode:</label>
              <select
                value={selectedBarcode}
                onChange={(e) => setSelectedBarcode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
              >
                {order.barcodeList.map((bc, idx) => (
                  <option key={idx} value={bc}>
                    {bc} (Specimen #{idx + 1})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* QR Display Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 relative overflow-hidden shadow-inner">
            
            {/* UN 3373 Watermark Badge */}
            <div className="absolute top-3 left-3 bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
              UN 3373 CAT B
            </div>

            <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
              {order.transportType}
            </div>

            {/* QR Image Canvas */}
            <div className="bg-white p-3.5 rounded-xl shadow-xl mt-4">
              {isGenerating ? (
                <div className="w-48 h-48 flex items-center justify-center text-slate-800 font-mono text-xs">
                  Generating QR...
                </div>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="Order QR Code" className="w-48 h-48 object-contain" />
              ) : null}
            </div>

            <div className="text-center space-y-1 font-mono">
              <span className="text-slate-400 text-[10px] block">SCANNABLE PAYLOAD</span>
              <p className="text-emerald-400 font-bold text-xs max-w-xs truncate">
                {activeTab === 'FULL_ORDER' ? order.id : (activeTab === 'TRACKING_NUM' ? order.trackingNumber : selectedBarcode)}
              </p>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Pickup Clinic:</span>
              <span className="font-semibold text-white">{order.pickupClinicName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Delivery Lab:</span>
              <span className="font-semibold text-white">{order.deliveryLabName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Registered Barcodes:</span>
              <span className="font-mono text-emerald-400">{order.barcodeList.join(', ')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCopyPayload}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2.5 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Payload'}</span>
            </button>

            <button
              onClick={handleDownloadPNG}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2.5 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handlePrintSticker}
              className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print 100mm x 100mm UN 3373 Package Sticker</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
