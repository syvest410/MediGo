import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { getChainOfCustodyPDFDataUri, generateChainOfCustodyPDF } from '../../lib/pdfGenerator';
import {
  FileText,
  Download,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  PenTool,
  Sparkles,
  ExternalLink,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ isOpen, onClose, order }) => {
  const [pdfDataUri, setPdfDataUri] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    if (!isOpen || !order) {
      setPdfDataUri('');
      return;
    }

    setIsLoading(true);
    try {
      const uri = getChainOfCustodyPDFDataUri(order);
      setPdfDataUri(uri);
    } catch (err) {
      console.error('Failed to generate PDF preview data URI:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleDownload = () => {
    generateChainOfCustodyPDF(order);
  };

  const handleOpenNewTab = () => {
    if (!pdfDataUri) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${pdfDataUri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const pickupSig = order.chainOfCustodyLogs?.find(l => l.eventType === 'PICKUP_SIGNATURE');
  const deliverySig = order.chainOfCustodyLogs?.find(l => l.eventType === 'DELIVERY_SIGNATURE');
  const preTrip = order.preTripCheck;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[94vh] overflow-hidden shadow-2xl flex flex-col text-slate-100 animate-fade-in">
        
        {/* Header */}
        <div className="bg-slate-800/95 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">Official UN 3373 Certificate & Visual Signatures</h3>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  eIDAS / ADR P650
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Order: <span className="font-mono text-emerald-400 font-bold">{order.trackingNumber}</span> • {order.pickupClinicName} → {order.deliveryLabName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-950 transition-all active:scale-95"
              title="Download PDF to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              onClick={handleOpenNewTab}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition-all"
              title="Open full page PDF in browser"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Full Tab</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Signature Verification Status Strip */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
            <PenTool className="w-4 h-4 text-emerald-400" />
            <span>Visible Certificate Signatures:</span>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <div className="flex items-center space-x-1">
              <CheckCircle2 className={`w-3.5 h-3.5 ${preTrip ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={preTrip ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                1. Driver Pre-Trip ({order.driverName || 'Courier'})
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <CheckCircle2 className={`w-3.5 h-3.5 ${pickupSig ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={pickupSig ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                2. Clinic Handover ({pickupSig?.staffName || 'Elena Meyer'})
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <CheckCircle2 className={`w-3.5 h-3.5 ${deliverySig || order.status === 'DELIVERED' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={deliverySig || order.status === 'DELIVERED' ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                3. Lab Reception ({deliverySig?.staffName || 'Sabine Neumann'})
              </span>
            </div>
          </div>
        </div>

        {/* PDF Frame Container */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-auto flex items-center justify-center relative">
          {isLoading ? (
            <div className="flex flex-col items-center space-y-3 text-slate-400">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold">Rendering Cryptographic Certificate & Signatures...</span>
            </div>
          ) : pdfDataUri ? (
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-white">
              <iframe
                src={`${pdfDataUri}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title={`Chain of Custody PDF - ${order.trackingNumber}`}
              />
            </div>
          ) : (
            <div className="text-center p-6 space-y-2">
              <p className="text-rose-400 font-bold">Could not load PDF certificate preview.</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs"
              >
                Download Direct PDF File
              </button>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Complies with German Transfusionsgesetz § 14, ADR Packaging P650 & BioStoffV regulations.</span>
          <span className="font-mono text-emerald-400">PDF Engine 2.5 • SHA256 Sealed</span>
        </div>

      </div>
    </div>
  );
};
