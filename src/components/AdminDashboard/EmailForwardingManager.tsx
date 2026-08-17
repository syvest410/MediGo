import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  Download,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
  User,
  Settings,
  X,
  FileCheck,
  Check,
  Paperclip
} from 'lucide-react';
import { EmailForwardingSettings, ForwardedEmailLog } from '../../types';
import { emailForwardingStore } from '../../lib/emailForwardingStore';

interface EmailForwardingManagerProps {
  isNightShift?: boolean;
}

export const EmailForwardingManager: React.FC<EmailForwardingManagerProps> = ({ isNightShift = false }) => {
  const [settings, setSettings] = useState<EmailForwardingSettings>(() => emailForwardingStore.getSettings());
  const [logs, setLogs] = useState<ForwardedEmailLog[]>(() => emailForwardingStore.getLogs());
  const [filterType, setFilterType] = useState<string>('ALL');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [selectedLogForPreview, setSelectedLogForPreview] = useState<ForwardedEmailLog | null>(null);
  const [isTestSending, setIsTestSending] = useState<boolean>(false);

  // Form Inputs
  const [ceoEmail, setCeoEmail] = useState(settings.ceoEmail);
  const [ceoName, setCeoName] = useState(settings.ceoName);
  const [ccAccountingEmail, setCcAccountingEmail] = useState(settings.ccAccountingEmail || '');
  const [autoForwardCompletedOrders, setAutoForwardCompletedOrders] = useState(settings.autoForwardCompletedOrders);
  const [autoForwardInvoices, setAutoForwardInvoices] = useState(settings.autoForwardInvoices);
  const [attachTelemetryPdf, setAttachTelemetryPdf] = useState(settings.attachTelemetryPdf);
  const [attachChainOfCustodyPdf, setAttachChainOfCustodyPdf] = useState(settings.attachChainOfCustodyPdf);
  const [forwardingMode, setForwardingMode] = useState<'INSTANT' | 'DAILY_DIGEST'>(settings.forwardingMode);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = emailForwardingStore.updateSettings({
      ceoEmail,
      ceoName,
      ccAccountingEmail,
      autoForwardCompletedOrders,
      autoForwardInvoices,
      attachTelemetryPdf,
      attachChainOfCustodyPdf,
      forwardingMode
    });
    setSettings(updated);
    setSaveSuccessToast('CEO Email Forwarding Rules updated successfully!');
    setTimeout(() => setSaveSuccessToast(null), 4000);
  };

  const handleSendTestEmail = () => {
    setIsTestSending(true);
    setTimeout(() => {
      const newLog = emailForwardingStore.sendTestEmail(ceoEmail);
      setLogs(emailForwardingStore.getLogs());
      setSelectedLogForPreview(newLog);
      setIsTestSending(false);
      setSaveSuccessToast(`Test Email successfully sent to ${ceoEmail}`);
      setTimeout(() => setSaveSuccessToast(null), 4000);
    }, 800);
  };

  const filteredLogs = logs.filter(log => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 shadow-xl transition-colors duration-300 ${
      isNightShift ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 bg-red-600/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="text-xl font-black tracking-tight">CEO Email & Invoice Forwarding Engine</h2>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Forwarding Active</span>
              </span>
            </div>
            <p className={`text-xs mt-1 ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
              Automatically receive completed order proofs, UN 3373 Chain of Custody PDFs, and client invoices in your executive inbox.
            </p>
          </div>
        </div>

        <button
          onClick={handleSendTestEmail}
          disabled={isTestSending}
          className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 shrink-0 active:scale-95 disabled:opacity-50"
        >
          {isTestSending ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{isTestSending ? 'Sending Verification Email...' : 'Send Test Forwarding Email'}</span>
        </button>
      </div>

      {/* Success Toast */}
      {saveSuccessToast && (
        <div className="bg-emerald-900/90 border border-emerald-600 text-emerald-100 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessToast}</span>
          </div>
          <button onClick={() => setSaveSuccessToast(null)} className="text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form Settings & Rule Configuration */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Email Addresses */}
        <div className={`lg:col-span-6 p-5 rounded-2xl border space-y-4 ${
          isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <User className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-sm">1. Executive Recipient Configuration</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold mb-1">
                CEO / Executive Primary Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={ceoEmail}
                onChange={e => setCeoEmail(e.target.value)}
                placeholder="e.g. dispatch@medigo-hessen.de"
                className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isNightShift ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                All completed transports and generated client invoices will be forwarded here.
              </span>
            </div>

            <div>
              <label className="block font-bold mb-1">CEO / Executive Title</label>
              <input
                type="text"
                value={ceoName}
                onChange={e => setCeoName(e.target.value)}
                placeholder="e.g. Katrin Weber (Managing Director)"
                className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isNightShift ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1">CC Accounting / Finance Email (Optional)</label>
              <input
                type="email"
                value={ccAccountingEmail}
                onChange={e => setCcAccountingEmail(e.target.value)}
                placeholder="e.g. buchhaltung@medigo-hessen.de"
                className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isNightShift ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Receives a copy of generated client invoices and tariff summaries.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Forwarding Rules & Attachments */}
        <div className={`lg:col-span-6 p-5 rounded-2xl border space-y-4 ${
          isNightShift ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Settings className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">2. Automatic Forwarding Rules</h3>
          </div>

          <div className="space-y-3 text-xs">
            
            {/* Rule 1: Auto Forward Completed Orders */}
            <label className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              autoForwardCompletedOrders
                ? isNightShift ? 'bg-slate-900 border-emerald-800/80' : 'bg-emerald-50/70 border-emerald-300'
                : isNightShift ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={autoForwardCompletedOrders}
                onChange={e => setAutoForwardCompletedOrders(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Auto-Forward Completed Orders</span>
                <span className="text-[11px] text-slate-500 block">
                  Immediately emails PDF Proof of Delivery, pickup/delivery timestamps, and recipient signature when courier marks order DELIVERED.
                </span>
              </div>
            </label>

            {/* Rule 2: Auto Forward Invoices */}
            <label className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              autoForwardInvoices
                ? isNightShift ? 'bg-slate-900 border-red-800/80' : 'bg-red-50/70 border-red-300'
                : isNightShift ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={autoForwardInvoices}
                onChange={e => setAutoForwardInvoices(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-red-600 rounded focus:ring-red-500"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Auto-Forward Invoices & Billing Statements</span>
                <span className="text-[11px] text-slate-500 block">
                  Emails PDF billing statements, tariff breakdowns, and 19% MwSt tax calculations upon order billing or monthly statement run.
                </span>
              </div>
            </label>

            {/* Attachments Options */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 text-[11px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachTelemetryPdf}
                  onChange={e => setAttachTelemetryPdf(e.target.checked)}
                  className="rounded text-red-600"
                />
                <span>Attach Cold Chain Telemetry Log</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachChainOfCustodyPdf}
                  onChange={e => setAttachChainOfCustodyPdf(e.target.checked)}
                  className="rounded text-red-600"
                />
                <span>Attach Chain of Custody PDF</span>
              </label>
            </div>

            {/* Delivery Mode */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="block font-bold mb-1">Forwarding Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForwardingMode('INSTANT')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    forwardingMode === 'INSTANT'
                      ? 'bg-red-600 text-white border-red-600 shadow'
                      : isNightShift ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  ⚡ Instant Real-Time
                </button>
                <button
                  type="button"
                  onClick={() => setForwardingMode('DAILY_DIGEST')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    forwardingMode === 'DAILY_DIGEST'
                      ? 'bg-red-600 text-white border-red-600 shadow'
                      : isNightShift ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  🌙 Daily Evening Digest (18:00)
                </button>
              </div>
            </div>

          </div>
        </div>

        <div className="lg:col-span-12 flex justify-end">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Save Email Forwarding Configuration</span>
          </button>
        </div>
      </form>

      {/* Sent Email Forwarding Logs Table */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-red-500" />
              <span>CEO Forwarded Email & Invoice History</span>
            </h3>
            <p className={`text-xs ${isNightShift ? 'text-slate-400' : 'text-slate-600'}`}>
              Immutable log of all invoices and completed order receipts delivered to {ceoEmail}
            </p>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterType === 'ALL' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilterType('COMPLETED_ORDER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterType === 'COMPLETED_ORDER' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Completed Orders
            </button>
            <button
              onClick={() => setFilterType('INVOICE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterType === 'INVOICE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Invoices
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
              isNightShift ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Subject & Recipient</th>
                <th className="p-3">Ref / Invoice #</th>
                <th className="p-3">Amount (EUR)</th>
                <th className="p-3">Attachments</th>
                <th className="p-3">Sent Time</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 text-xs">
                    No forwarded emails match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    isNightShift ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                        log.type === 'INVOICE'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : log.type === 'COMPLETED_ORDER'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-purple-950 text-purple-300 border-purple-800'
                      }`}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3 max-w-xs truncate font-medium">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{log.subject}</div>
                      <div className="text-[10px] text-slate-500 truncate">To: {log.recipientEmail} {log.ccEmail && `(CC: ${log.ccEmail})`}</div>
                    </td>

                    <td className="p-3 font-mono font-bold text-red-500">
                      {log.orderTrackingNumber || log.invoiceNumber || 'N/A'}
                    </td>

                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {log.amountEur ? `€${log.amountEur.toFixed(2)}` : '—'}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                        <Paperclip className="w-3 h-3 text-red-500" />
                        <span>{log.attachments.length} PDFs</span>
                      </div>
                    </td>

                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(log.sentAt).toLocaleString('de-DE')}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLogForPreview(log)}
                        className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-red-500" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HTML Email & PDF Attachment Simulator Modal */}
      {selectedLogForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-2xl w-full border rounded-2xl p-6 space-y-4 shadow-2xl transition-colors ${
            isNightShift ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-base">CEO Forwarded Email Preview</h3>
              </div>
              <button
                onClick={() => setSelectedLogForPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Meta Card */}
            <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">From:</span>
                <span className="font-bold text-slate-900 dark:text-white">MediGo Dispatch System &lt;noreply@medigo-logistics.de&gt;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">To:</span>
                <span className="font-bold text-red-500">{selectedLogForPreview.recipientEmail}</span>
              </div>
              {selectedLogForPreview.ccEmail && (
                <div className="flex justify-between">
                  <span className="text-slate-500">CC:</span>
                  <span className="text-slate-400">{selectedLogForPreview.ccEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Subject:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedLogForPreview.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sent At:</span>
                <span className="text-slate-400">{new Date(selectedLogForPreview.sentAt).toString()}</span>
              </div>
            </div>

            {/* Email Body Simulation */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs leading-relaxed space-y-3 font-sans">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                <span className="font-black text-red-600 text-sm">MediGo Hessen Logistics HQ (Wiesbaden)</span>
                <span className="text-[10px] bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">SMTP STATUS: 250 OK</span>
              </div>

              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Dear {ceoName || 'Executive'},
              </p>

              <p className="text-slate-600 dark:text-slate-300">
                {selectedLogForPreview.bodyPreview}
              </p>

              {/* Order/Invoice details table */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white border-b pb-1 mb-1">
                  Summary & Tax Breakdown
                </div>
                {selectedLogForPreview.orderTrackingNumber && (
                  <div className="flex justify-between">
                    <span>Tracking Reference:</span>
                    <span className="font-mono font-bold text-red-500">{selectedLogForPreview.orderTrackingNumber}</span>
                  </div>
                )}
                {selectedLogForPreview.invoiceNumber && (
                  <div className="flex justify-between">
                    <span>Invoice Reference:</span>
                    <span className="font-mono font-bold text-blue-500">{selectedLogForPreview.invoiceNumber}</span>
                  </div>
                )}
                {selectedLogForPreview.amountEur && (
                  <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Total Amount (MwSt incl.):</span>
                    <span>€{selectedLogForPreview.amountEur.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Attachments Chips */}
              {selectedLogForPreview.attachments.length > 0 && (
                <div className="pt-2">
                  <div className="font-bold text-[11px] text-slate-500 mb-1 flex items-center space-x-1">
                    <Paperclip className="w-3 h-3 text-red-500" />
                    <span>Attached Official PDF Documents:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedLogForPreview.attachments.map((att, idx) => (
                      <div key={idx} className="bg-red-950/80 border border-red-800 text-red-200 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-red-400" />
                        <span>{att}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLogForPreview(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2 rounded-xl"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
