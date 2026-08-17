// Types & Interfaces for UN 3373 Category B Biological Specimen Logistics

export type Role = 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'CLIENT_CLINIC' | 'LAB_STAFF';

export type TransportType = 'AMBIENT_15_25C' | 'REFRIGERATED_2_8C' | 'FROZEN_MINUS_20C';

export type OrderStatus = 
  | 'SCHEDULED'
  | 'PRE_TRIP_CHECK'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type CancelReasonCode = 
  | 'RECIPIENT_UNAVAILABLE'
  | 'SAMPLE_REJECTED_PACAKGING'
  | 'VEHICLE_FAILURE'
  | 'TEMPERATURE_BREACH'
  | 'CLINIC_CANCELLED'
  | 'OTHER';

export interface ContractBillingConfig {
  contractId: string;
  clinicId: string;
  clinicName: string;
  pricingModel: 'FIXED_ROUTE' | 'PER_BOX' | 'DISTANCE_BASED' | 'MONTHLY_RETAINER';
  baseRateEur: number; // e.g., 35 for route, 15 for box base, 10 for distance base, 850 for retainer
  perBoxRateEur?: number; // e.g. 5
  perKmRateEur?: number; // e.g. 1.80
  monthlyIncludedTransports?: number; // e.g. 30
  overagePerTransportEur?: number; // e.g. 28
  billingCycle: 'MONTHLY' | 'BI_WEEKLY';
  paymentTermsDays: number; // e.g. 14 days
  contractStartDate: string;
  active: boolean;
}

export interface MonthlyInvoice {
  id: string;
  invoiceNumber: string;
  clinicName: string;
  contractId: string;
  billingPeriod: string; // e.g. "Juli 2026"
  issueDate: string;
  dueDate: string;
  totalTransports: number;
  subtotalEur: number;
  vatEur: number; // 19% German MwSt
  totalEur: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE';
  pricingModelLabel: string;
  items: {
    orderId: string;
    trackingNumber: string;
    date: string;
    route: string;
    boxCount: number;
    amountEur: number;
  }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  organization?: string;
}

export interface PreTripCheck {
  id: string;
  orderId: string;
  driverId: string;
  vehicleRegNumber: string;
  p650OuterPackagingIntact: boolean;
  primarySecondaryLeakProof: boolean;
  absorbentMaterialPresent: boolean;
  tempBoxCalibrated: boolean;
  initialTempCelsius: number;
  targetTempMinCelsius: number;
  targetTempMaxCelsius: number;
  inspectedAt: string;
  driverSignatureBase64: string;
  approved: boolean;
}

export interface ChainOfCustody {
  id: string;
  orderId: string;
  eventType: 'PICKUP_SIGNATURE' | 'DELIVERY_SIGNATURE';
  staffName: string;
  staffTitle?: string;
  signatureBase64: string;
  pinCodeVerified: boolean;
  scannedBarcodes: string[];
  timestamp: string;
  gpsLatitude: number;
  gpsLongitude: number;
  gpsAccuracyMeters: number;
  deviceId: string;
}

export interface TemperatureTelemetry {
  id: string;
  orderId: string;
  sensorId: string;
  tempCelsius: number;
  ambientTempCelsius: number;
  humidityPercent: number;
  batteryLevelPercent: number;
  isBreach: boolean;
  timestamp: string;
  gpsLatitude: number;
  gpsLongitude: number;
}

export interface AuditLog {
  id: string;
  orderId: string;
  previousState?: OrderStatus | null;
  newState: OrderStatus;
  actionDescription: string;
  userId: string;
  userName: string;
  userRole: Role;
  deviceId: string;
  gpsLatitude: number;
  gpsLongitude: number;
  offlineSynced: boolean;
  syncedAt?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  trackingNumber: string;
  status: OrderStatus;
  transportType: TransportType;
  
  // Addresses & Contacts
  pickupClinicName: string;
  pickupAddress: string;
  pickupDepartment?: string;
  pickupContactPhone: string;
  
  deliveryLabName: string;
  deliveryAddress: string;
  deliveryDepartment?: string;
  deliveryContactPhone: string;

  // Schedule Window
  scheduledPickupFrom: string;
  scheduledPickupTo: string;
  scheduledDeliveryBy: string;

  // Specimen Metadata (UN 3373 Cat B)
  sampleCategory: string; // e.g. "UN 3373 Biological Substance Category B (Blood)"
  specimenBoxCount: number;
  barcodeList: string[]; // e.g. ["SPEC-9901-A", "SPEC-9901-B"]
  specialNotes?: string;
  p650Verified: boolean;

  // Driver Assignment
  driverId?: string;
  driverName?: string;
  createdById: string;
  createdByOrg: string;
  vehicleRegNumber?: string;

  // Cancellation
  cancellationReason?: CancelReasonCode;
  cancellationNotes?: string;

  // Dynamic Pricing Breakdown
  calculatedPriceEur?: number;
  priceBreakdown?: {
    basePickupFeeEur: number;
    distanceKm: number;
    distanceFeeEur: number;
    expressSurchargeEur: number;
    weekendMarkupPercent: number;
    weekendSurchargeEur: number;
    holidayMarkupPercent: number;
    holidaySurchargeEur: number;
    holidayName?: string;
    subtotalNetEur: number;
    vatEur: number; // 19% MwSt
    totalEur: number;
  };

  // Subcontractor / Emergency Delegation
  delegatedToSubcontractor?: boolean;
  subcontractorName?: string;
  subcontractorPhone?: string;
  subcontractorDelegatedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Embedded relations
  preTripCheck?: PreTripCheck;
  chainOfCustodyLogs: ChainOfCustody[];
  telemetryLogs: TemperatureTelemetry[];
  auditLogs: AuditLog[];
}

export type GermanFederalState = 'HE' | 'BY' | 'NW' | 'BW' | 'BE' | 'NI' | 'ALL_MIX';

export interface BaseTariffSettings {
  basePickupFeeEur: number; // e.g. 25.00
  ratePerKmEur: number; // e.g. 1.85
  expressEmergencySurchargeEur: number; // e.g. 20.00
  weekendMarkupPercent: number; // e.g. 50 (+50%)
  holidayMarkupPercent: number; // e.g. 100 (+100%)
  selectedState: GermanFederalState;
}

export type OperationalMode = 'SOLO' | 'FLEET';

export interface VacationWindow {
  id: string;
  title: string; // e.g. "Ostermarkt Pause 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  activeCoverPartnerName: string; // e.g. "Express Courier Hessen GmbH"
  activeCoverPartnerPhone: string; // e.g. "+49 69 987654"
  allowEmergencyDelegation: boolean;
  notes?: string;
}

export interface SubcontractorEmergencyLog {
  id: string;
  orderId: string;
  trackingNumber: string;
  driverId: string;
  driverName: string;
  reason: string;
  gpsLatitude: number;
  gpsLongitude: number;
  subcontractorName: string;
  subcontractorPhone: string;
  dispatchTextSms: string;
  dispatchTextEmail: string;
  createdAt: string;
}

export interface PendingOfflineAction {
  id: string;
  orderId: string;
  actionType: 'ACCEPT' | 'PRE_TRIP_CHECK' | 'PICKUP' | 'TELEMETRY' | 'DELIVER' | 'CANCEL';
  payload: any;
  timestamp: string;
  gpsLatitude: number;
  gpsLongitude: number;
  deviceId: string;
  retryCount: number;
}

export const TRANSPORT_TEMP_RANGES: Record<TransportType, { min: number; max: number; label: string; desc: string }> = {
  'AMBIENT_15_25C': { min: 15.0, max: 25.0, label: 'Ambient (15°C to 25°C)', desc: 'Standard UN 3373 P650 insulated transport box' },
  'REFRIGERATED_2_8C': { min: 2.0, max: 8.0, label: 'Cold Chain (2°C to 8°C)', desc: 'Calibrated cooling pack with active sensor' },
  'FROZEN_MINUS_20C': { min: -25.0, max: -15.0, label: 'Frozen (-20°C / Dry Ice)', desc: 'Dry ice container with pressure relief vent' }
};

export const GERMAN_SAMPLE_CITIES = [
  { name: 'Berlin', coords: { lat: 52.5200, lng: 13.4050 } },
  { name: 'München', coords: { lat: 48.1351, lng: 11.5820 } },
  { name: 'Frankfurt am Main', coords: { lat: 50.1109, lng: 8.6821 } },
  { name: 'Hamburg', coords: { lat: 53.5511, lng: 9.9937 } },
  { name: 'Köln', coords: { lat: 50.9375, lng: 6.9603 } }
];

export interface EmailForwardingSettings {
  ceoEmail: string;
  ceoName: string;
  ccAccountingEmail?: string;
  autoForwardCompletedOrders: boolean;
  autoForwardInvoices: boolean;
  attachTelemetryPdf: boolean;
  attachChainOfCustodyPdf: boolean;
  forwardingMode: 'INSTANT' | 'DAILY_DIGEST';
  digestTimeOfDay?: string; // e.g. "18:00"
  lastUpdated: string;
}

export interface ForwardedEmailLog {
  id: string;
  type: 'COMPLETED_ORDER' | 'INVOICE' | 'TEST_DISPATCH' | 'DAILY_DIGEST';
  recipientEmail: string;
  ccEmail?: string;
  subject: string;
  orderTrackingNumber?: string;
  invoiceNumber?: string;
  amountEur?: number;
  attachments: string[];
  status: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED';
  sentAt: string;
  bodyPreview: string;
}
