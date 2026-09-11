import React, { useState } from 'react';
import { Order } from '../../types';
import { generateChainOfCustodyPDF } from '../../lib/pdfGenerator';
import { FileText, Download, Code, ShieldCheck, CheckCircle2, Eye, PenTool } from 'lucide-react';
import { PDFPreviewModal } from './PDFPreviewModal';

interface CertificateExporterProps {
  orders: Order[];
}

export const CertificateExporter: React.FC<CertificateExporterProps> = ({ orders }) => {
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  const downloadJSON = (order: Order) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(order, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ChainOfCustody_${order.trackingNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-slate-100 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-950 p-2 rounded-lg text-emerald-400 border border-emerald-800">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Chain of Custody & UN 3373 ADR Compliance Export</h3>
            <p className="text-xs text-slate-400">Generate Audit Certificates with Visible Digital Signatures for German Health Authorities</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-3 py-1 rounded-lg">
          <PenTool className="w-3.5 h-3.5" />
          <span className="font-semibold">3 Visible Signature Sectors Enabled</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {orders.map((ord) => (
          <div
            key={ord.id}
            className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-white text-xs font-mono">{ord.trackingNumber}</span>
                <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded">
                  {ord.status}
                </span>
              </div>

              <div className="pt-2 text-xs text-slate-300 space-y-1">
                <p><strong>Clinic:</strong> {ord.pickupClinicName}</p>
                <p><strong>Lab:</strong> {ord.deliveryLabName}</p>
                <p><strong>Specimen:</strong> {ord.sampleCategory}</p>
                <p className="text-[11px] text-slate-400 flex items-center space-x-1 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />
                  <span>
                    Signatures: Driver ({ord.preTripCheck ? '✓' : 'Pending'}), Clinic ({ord.chainOfCustodyLogs.some(l => l.eventType === 'PICKUP_SIGNATURE') ? '✓' : 'Pending'}), Lab ({ord.chainOfCustodyLogs.some(l => l.eventType === 'DELIVERY_SIGNATURE') || ord.status === 'DELIVERED' ? '✓' : 'Pending'})
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-2 flex-wrap gap-y-1">
              <button
                onClick={() => downloadJSON(ord)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all"
                title="Export raw JSON"
              >
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSON</span>
              </button>

              <button
                onClick={() => setPreviewOrder(ord)}
                className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
                title="Preview PDF Certificate on screen"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preview Certificate</span>
              </button>

              <button
                onClick={() => generateChainOfCustodyPDF(ord)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md transition-all"
                title="Download PDF directly"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* In-App PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={!!previewOrder}
        onClose={() => setPreviewOrder(null)}
        order={previewOrder}
      />
    </div>
  );
};
