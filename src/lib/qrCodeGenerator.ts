import QRCode from 'qrcode';
import { Order } from '../types';

export interface QRPayload {
  type: 'UN3373_ORDER' | 'SPECIMEN_BARCODE';
  orderId: string;
  trackingNumber: string;
  pickupClinicName?: string;
  deliveryLabName?: string;
  transportType?: string;
  barcodes?: string[];
  timestamp: string;
}

/**
 * Encodes order information into a structured string payload for QR Code generation
 */
export function buildOrderQRPayloadString(order: Order): string {
  const payload: QRPayload = {
    type: 'UN3373_ORDER',
    orderId: order.id,
    trackingNumber: order.trackingNumber,
    pickupClinicName: order.pickupClinicName,
    deliveryLabName: order.deliveryLabName,
    transportType: order.transportType,
    barcodes: order.barcodeList,
    timestamp: new Date().toISOString()
  };
  return JSON.stringify(payload);
}

/**
 * Attempts to parse a scanned string as a structured order QR payload
 */
export function parseScannedQRPayload(scannedText: string): QRPayload | null {
  try {
    const parsed = JSON.parse(scannedText);
    if (parsed && typeof parsed === 'object' && (parsed.type === 'UN3373_ORDER' || parsed.orderId || parsed.trackingNumber)) {
      return parsed as QRPayload;
    }
  } catch (e) {
    // String is not JSON, check if formatted like string code
  }
  return null;
}

/**
 * Generates a PNG Data URL for a given string (or Order)
 */
export async function generateQRCodeDataURL(
  textOrOrder: string | Order,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  const text = typeof textOrOrder === 'string'
    ? textOrOrder
    : buildOrderQRPayloadString(textOrOrder);

  const defaultOpts: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    width: 300,
    color: {
      dark: '#0f172a', // slate-900
      light: '#ffffff',
    },
    ...options,
  };

  try {
    return await QRCode.toDataURL(text, defaultOpts);
  } catch (err) {
    console.error('Failed to generate QR code Data URL:', err);
    throw err;
  }
}

/**
 * Opens a print-ready window with a standard 100mm x 100mm ADR P650 Specimen Box Sticker
 */
export async function printOrderQRSticker(order: Order): Promise<void> {
  const qrDataUrl = await generateQRCodeDataURL(order, { width: 350 });

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>UN 3373 Specimen Transport Sticker - ${order.trackingNumber}</title>
      <style>
        @page {
          size: 100mm 100mm;
          margin: 0;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 8mm;
          background: #fff;
          color: #000;
          box-sizing: border-box;
        }
        .label-container {
          border: 3px solid #000;
          padding: 6mm;
          height: 84mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }
        .header {
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .adr-symbol {
          border: 2px solid #000;
          padding: 3px 8px;
          font-weight: bold;
          font-size: 16px;
          display: inline-block;
          margin-bottom: 4px;
        }
        .title {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }
        .details {
          font-size: 10px;
          line-height: 1.4;
          max-width: 55%;
        }
        .qr-box {
          text-align: center;
        }
        .qr-box img {
          width: 32mm;
          height: 32mm;
        }
        .tracking {
          font-family: monospace;
          font-size: 13px;
          font-weight: bold;
          margin-top: 2px;
        }
        .footer {
          border-top: 1px solid #000;
          padding-top: 4px;
          font-size: 8px;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="header">
          <div class="adr-symbol">UN 3373</div>
          <div class="title">BIOLOGICAL SUBSTANCE, CATEGORY B</div>
          <div style="font-size: 9px; font-style: italic;">P650 Triple Packaging Compliant</div>
        </div>

        <div class="content">
          <div class="details">
            <div><strong>Tracking #:</strong> <span class="tracking">${order.trackingNumber}</span></div>
            <div style="margin-top: 4px;"><strong>Pickup Clinic:</strong> ${order.pickupClinicName}</div>
            <div><strong>Delivery Lab:</strong> ${order.deliveryLabName}</div>
            <div style="margin-top: 4px;"><strong>Specimen:</strong> ${order.sampleCategory}</div>
            <div><strong>Temp Spec:</strong> ${order.transportType}</div>
            <div><strong>Barcodes:</strong> ${order.barcodeList.join(', ') || 'N/A'}</div>
          </div>

          <div class="qr-box">
            <img src="${qrDataUrl}" alt="Order QR Code" />
            <div style="font-size: 8px; font-weight: bold; margin-top: 2px;">SCAN AT PICKUP / DELIVERY</div>
          </div>
        </div>

        <div class="footer">
          <span>BioDispatch DE Medical Courier Network</span>
          <span>Order ID: ${order.id.slice(0, 8)}...</span>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
