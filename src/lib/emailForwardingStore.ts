import { EmailForwardingSettings, ForwardedEmailLog, Order, MonthlyInvoice } from '../types';

const SETTINGS_STORAGE_KEY = 'medigo_ceo_email_forwarding_settings';
const LOGS_STORAGE_KEY = 'medigo_ceo_email_forwarding_logs';

export const DEFAULT_EMAIL_SETTINGS: EmailForwardingSettings = {
  ceoEmail: 'dispatch@medigo-hessen.de',
  ceoName: 'Katrin Weber (CEO & Dispatch Director)',
  ccAccountingEmail: 'buchhaltung@medigo-hessen.de',
  autoForwardCompletedOrders: true,
  autoForwardInvoices: true,
  attachTelemetryPdf: true,
  attachChainOfCustodyPdf: true,
  forwardingMode: 'INSTANT',
  digestTimeOfDay: '18:00',
  lastUpdated: new Date().toISOString()
};

export const INITIAL_FORWARDED_LOGS: ForwardedEmailLog[] = [
  {
    id: 'FWD-2026-003',
    type: 'INVOICE',
    recipientEmail: 'dispatch@medigo-hessen.de',
    ccEmail: 'buchhaltung@medigo-hessen.de',
    subject: '📄 Invoice INV-2026-07-001 — Universitätsklinikum Frankfurt am Main (€380.80 MwSt incl.)',
    invoiceNumber: 'INV-2026-07-001',
    amountEur: 380.80,
    attachments: ['Invoice_INV-2026-07-001_UKF.pdf', 'UN3373_Tariff_Breakdown_Hessen.pdf'],
    status: 'DELIVERED',
    sentAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    bodyPreview: 'Forwarded Invoice INV-2026-07-001 for July 2026 transports. Subtotal: €320.00 + 19% MwSt €60.80 = Total €380.80. Verified by MediGo Wiesbaden HQ.'
  },
  {
    id: 'FWD-2026-002',
    type: 'COMPLETED_ORDER',
    recipientEmail: 'dispatch@medigo-hessen.de',
    ccEmail: 'buchhaltung@medigo-hessen.de',
    subject: '✅ Order Completed: DE-UN3373-2026-8821 — Proof of Delivery & Chain of Custody',
    orderTrackingNumber: 'DE-UN3373-2026-8821',
    amountEur: 89.25,
    attachments: ['ProofOfDelivery_DE-UN3373-2026-8821.pdf', 'Telemetry_ColdChain_2_8C.pdf'],
    status: 'DELIVERED',
    sentAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    bodyPreview: 'Transport DE-UN3373-2026-8821 (Blood Serum) marked DELIVERED by Hans Schmidt at Biosammlungszentrum Frankfurt. Recipient signature verified.'
  },
  {
    id: 'FWD-2026-001',
    type: 'COMPLETED_ORDER',
    recipientEmail: 'dispatch@medigo-hessen.de',
    ccEmail: 'buchhaltung@medigo-hessen.de',
    subject: '✅ Order Completed: DE-UN3373-2026-8820 — Urgent Stem Cell Courier to Marburg',
    orderTrackingNumber: 'DE-UN3373-2026-8820',
    amountEur: 145.00,
    attachments: ['ProofOfDelivery_DE-UN3373-2026-8820.pdf', 'UN3373_P650_Certificate.pdf'],
    status: 'DELIVERED',
    sentAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    bodyPreview: 'Transport DE-UN3373-2026-8820 delivered to Universitätsklinikum Marburg. Zero temperature breaches recorded.'
  }
];

export class EmailForwardingStore {
  private settings: EmailForwardingSettings;
  private logs: ForwardedEmailLog[];

  constructor() {
    this.settings = this.loadSettings();
    this.logs = this.loadLogs();
  }

  private loadSettings(): EmailForwardingSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load email settings from localStorage:', e);
    }
    return DEFAULT_EMAIL_SETTINGS;
  }

  private loadLogs(): ForwardedEmailLog[] {
    try {
      const saved = localStorage.getItem(LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load email logs from localStorage:', e);
    }
    return INITIAL_FORWARDED_LOGS;
  }

  public getSettings(): EmailForwardingSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<EmailForwardingSettings>): EmailForwardingSettings {
    this.settings = {
      ...this.settings,
      ...newSettings,
      lastUpdated: new Date().toISOString()
    };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save email settings:', e);
    }
    return { ...this.settings };
  }

  public getLogs(): ForwardedEmailLog[] {
    return [...this.logs];
  }

  public addLog(log: Omit<ForwardedEmailLog, 'id' | 'sentAt'>): ForwardedEmailLog {
    const fullLog: ForwardedEmailLog = {
      ...log,
      id: `FWD-${Date.now()}`,
      sentAt: new Date().toISOString()
    };
    this.logs = [fullLog, ...this.logs];
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save email log:', e);
    }
    return fullLog;
  }

  public triggerOrderCompletedForwarding(order: Order): ForwardedEmailLog | null {
    if (!this.settings.autoForwardCompletedOrders) return null;

    const attachments: string[] = [`ProofOfDelivery_${order.trackingNumber}.pdf`];
    if (this.settings.attachTelemetryPdf && order.telemetryLogs?.length > 0) {
      attachments.push(`Telemetry_Log_${order.trackingNumber}.pdf`);
    }
    if (this.settings.attachChainOfCustodyPdf) {
      attachments.push(`ChainOfCustody_${order.trackingNumber}.pdf`);
    }

    const calculatedPrice = order.calculatedPriceEur || order.priceBreakdown?.totalEur || 78.50;

    return this.addLog({
      type: 'COMPLETED_ORDER',
      recipientEmail: this.settings.ceoEmail,
      ccEmail: this.settings.ccAccountingEmail,
      subject: `✅ Order Completed: ${order.trackingNumber} — ${order.pickupClinicName} ➔ ${order.deliveryLabName}`,
      orderTrackingNumber: order.trackingNumber,
      amountEur: calculatedPrice,
      attachments,
      status: 'DELIVERED',
      bodyPreview: `Automated CEO Notification: Order ${order.trackingNumber} was marked COMPLETED. Pickup: ${order.pickupClinicName}, Delivery: ${order.deliveryLabName}. Total Amount: €${calculatedPrice.toFixed(2)}.`
    });
  }

  public triggerInvoiceForwarding(invoice: MonthlyInvoice): ForwardedEmailLog | null {
    if (!this.settings.autoForwardInvoices) return null;

    return this.addLog({
      type: 'INVOICE',
      recipientEmail: this.settings.ceoEmail,
      ccEmail: this.settings.ccAccountingEmail,
      subject: `📄 Invoice ${invoice.invoiceNumber} — ${invoice.clinicName} (€${invoice.totalEur.toFixed(2)})`,
      invoiceNumber: invoice.invoiceNumber,
      amountEur: invoice.totalEur,
      attachments: [`Invoice_${invoice.invoiceNumber}.pdf`, `Tariff_Statement_${invoice.billingPeriod.replace(/\s+/g, '_')}.pdf`],
      status: 'DELIVERED',
      bodyPreview: `Automated CEO Invoice Forwarding: Monthly invoice ${invoice.invoiceNumber} issued to ${invoice.clinicName}. Total: €${invoice.totalEur.toFixed(2)} (${invoice.totalTransports} transports).`
    });
  }

  public sendTestEmail(targetEmailOverride?: string): ForwardedEmailLog {
    const targetEmail = targetEmailOverride || this.settings.ceoEmail;
    return this.addLog({
      type: 'TEST_DISPATCH',
      recipientEmail: targetEmail,
      ccEmail: this.settings.ccAccountingEmail,
      subject: `🧪 Test Forwarding Verification — CEO Dispatch HQ Wiesbaden`,
      attachments: ['Test_Proof_of_Delivery_Sample.pdf', 'Test_UN3373_Compliance.pdf'],
      status: 'DELIVERED',
      bodyPreview: `SMTP Verification Ping: Auto-forwarding rule active for ${targetEmail}. Testing attachments & Chain of Custody delivery protocols.`
    });
  }
}

export const emailForwardingStore = new EmailForwardingStore();
