// Types & Interfaces for UN 3373 Category B Biological Specimen Logistics

export type Role = 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'ORG_STAFF' | 'PATIENT' | 'CLIENT_CLINIC' | 'LAB_STAFF';

export type OrganizationType = 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'CARE_HOME' | 'LABORATORY' | 'INDIVIDUAL_PATIENT';

export type TransportType = 
  | 'AMBIENT_15_25C' 
  | 'REFRIGERATED_2_8C' 
  | 'FROZEN_MINUS_20C' 
  | 'FROZEN_DRY_ICE';

export type OrderStatus = 
  | 'SCHEDULED'
  | 'PRE_TRIP_CHECK'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'QUARANTINED_UNSYNCED'
  | 'CANCELLED';

export type CancelReasonCode = 
  | 'RECIPIENT_UNAVAILABLE'
  | 'SAMPLE_REJECTED_PACAKGING'
  | 'VEHICLE_FAILURE'
  | 'TEMPERATURE_BREACH'
  | 'CLINIC_CANCELLED'
  | 'OTHER';

export type AuthTier = 'TIER_1_REGISTERED_USER_PIN' | 'TIER_2_OTP_VERIFIED' | 'TIER_3_SIGNATURE_ONLY';

export type ConflictResolution = 'NONE' | 'SERVER_WINS' | 'REJECTED_STALE' | 'MANUAL_RESOLVED';

export type SpecimenCategory = 
  | 'UN3373_CATEGORY_B_SPECIMEN'
  | 'PHARMACEUTICAL_APBETRO'
  | 'STEM_CELLS_APHERESIS'
  | 'CRYOPRESERVED_SPECIMEN';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  contractNumber?: string;
  addressStreet: string;
  postalCode: string;
  city: string;
  state: string;
  contactPhone: string;
  contactEmail: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetentionPolicy {
  id: string;
  code: string;
  name: string;
  retentionPeriodDays: number;
  legalBasis: string;
  anonymizeInsteadOfDelete: boolean;
  createdAt?: string;
}

export interface ContractBillingConfig {
  contractId: string;
  clinicId: string;
  clinicName: string;
  pricingModel: 'FIXED_ROUTE' | 'PER_BOX' | 'DISTANCE_BASED' | 'MONTHLY_RETAINER';
  baseRateEur: number;
  perBoxRateEur?: number;
  perKmRateEur?: number;
  monthlyIncludedTransports?: number;
  overagePerTransportEur?: number;
  billingCycle: 'MONTHLY' | 'BI_WEEKLY';
  paymentTermsDays: number;
  contractStartDate: string;
  active: boolean;
}

export interface MonthlyInvoice {
  id: string;
  invoiceNumber: string;
  clinicName: string;
  contractId: string;
  billingPeriod: string;
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
  organizationId?: string;
  pinCodeHash?: string;
  devicePublicKey?: string;
  contractNumber?: string;
  facilityType?: 'CLINIC' | 'LABORATORY' | 'HQ' | 'COURIER';
  facilityAddress?: string;
  vehicleRegNumber?: string;
  active?: boolean;
  mustChangePassword?: boolean;
  tokenVersion?: number;
  createdAt?: string;
}

export interface LoginAttemptRecord {
  id: string;
  key: string; // e.g. "email:user@domain.de" or "ip:192.168.1.1"
  type: 'EMAIL' | 'IP';
  identifier: string;
  attempts: number;
  firstAttemptAt: string; // ISO string
  lockedUntil?: string | null; // ISO string
  lockoutDurationMinutes: number;
  updatedAt: string; // ISO string
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: string; // ISO string
  revokedAt?: string | null; // ISO string
  replacedById?: string | null;
  createdAt: string; // ISO string
  ip?: string;
  userAgent?: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
  organization?: string;
  organizationId?: string;
  contractNumber?: string;
  facilityType?: 'CLINIC' | 'LABORATORY' | 'HQ' | 'COURIER';
  facilityAddress?: string;
  vehicleRegNumber?: string;
  pinCode?: string;
  devicePublicKey?: string;
  mustChangePassword?: boolean;
  tokenVersion?: number;
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
  authTier?: AuthTier;
  staffName: string;
  staffTitle?: string;
  signatureBase64: string;
  cryptoSignature?: string;
  pinCodeVerified: boolean;
  scannedBarcodes: string[];
  timestamp: string;
  clientRecordedAt?: string;
  serverIngestedAt?: string;
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
  conflictResolution?: ConflictResolution;
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
  publicAccessToken?: string;
  status: OrderStatus;
  transportType: TransportType;
  specimenCategory?: SpecimenCategory;
  
  // Polymorphic Organization Dual Relations
  originOrganizationId?: string;
  pickupClinicName: string;
  pickupAddress: string;
  pickupDepartment?: string;
  pickupContactPhone: string;
  
  destinationOrgId?: string;
  deliveryLabName: string;
  deliveryAddress: string;
  deliveryDepartment?: string;
  deliveryContactPhone: string;

  // Schedule Window
  scheduledPickupFrom: string;
  scheduledPickupTo: string;
  scheduledDeliveryBy: string;

  // Specimen Metadata (UN 3373 Cat B)
  sampleCategory: string;
  specimenBoxCount: number;
  barcodeList: string[];
  specialNotes?: string;
  p650Verified: boolean;

  // Driver Assignment
  driverId?: string;
  driverName?: string;
  createdById: string;
  createdByOrg: string;
  vehicleRegNumber?: string;

  // Conflict & Quarantine
  quarantineReason?: string;

  // Cancellation
  cancellationReason?: CancelReasonCode;
  cancellationNotes?: string;

  // Data Retention
  retentionPolicyId?: string;
  retentionExpiresAt?: string;
  anonymizedAt?: string;

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
  basePickupFeeEur: number;
  ratePerKmEur: number;
  expressEmergencySurchargeEur: number;
  weekendMarkupPercent: number;
  holidayMarkupPercent: number;
  selectedState: GermanFederalState;
}

export type OperationalMode = 'SOLO' | 'FLEET';

export interface VacationWindow {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  activeCoverPartnerName: string;
  activeCoverPartnerPhone: string;
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
  clientRecordedAt?: string;
  gpsLatitude: number;
  gpsLongitude: number;
  deviceId: string;
  cryptoSignature?: string;
  retryCount: number;
}

const BASE_TRANSPORT_TEMP_RANGES: Record<string, { min: number; max: number; label: string; desc: string }> = {
  'AMBIENT_15_25C': { min: 15.0, max: 25.0, label: 'Ambient (15°C to 25°C)', desc: 'Standard UN 3373 P650 insulated transport box' },
  'AMBIENT': { min: 15.0, max: 25.0, label: 'Ambient (15°C to 25°C)', desc: 'Standard UN 3373 P650 insulated transport box' },
  'REFRIGERATED_2_8C': { min: 2.0, max: 8.0, label: 'Cold Chain (2°C to 8°C)', desc: 'Calibrated cooling pack with active sensor' },
  'REFRIGERATED': { min: 2.0, max: 8.0, label: 'Cold Chain (2°C to 8°C)', desc: 'Calibrated cooling pack with active sensor' },
  'FROZEN_MINUS_20C': { min: -25.0, max: -15.0, label: 'Frozen (-20°C / Dry Ice)', desc: 'Dry ice container with pressure relief vent' },
  'FROZEN': { min: -25.0, max: -15.0, label: 'Frozen (-20°C / Dry Ice)', desc: 'Dry ice container with pressure relief vent' },
  'FROZEN_DRY_ICE': { min: -80.0, max: -20.0, label: 'Frozen / Dry Ice (-20°C / -80°C)', desc: 'Dry ice container with pressure relief vent' }
};

export function getTransportTempRange(type?: string | null): { min: number; max: number; label: string; desc: string } {
  if (type && BASE_TRANSPORT_TEMP_RANGES[type]) {
    return BASE_TRANSPORT_TEMP_RANGES[type];
  }
  const normalized = (type || '').toUpperCase().trim();
  if (normalized.includes('DRY') || normalized.includes('-80') || normalized === 'FROZEN_DRY_ICE') {
    return BASE_TRANSPORT_TEMP_RANGES['FROZEN_DRY_ICE'];
  }
  if (normalized.includes('FROZEN') || normalized.includes('MINUS')) {
    return BASE_TRANSPORT_TEMP_RANGES['FROZEN_MINUS_20C'];
  }
  if (normalized.includes('AMBIENT') || normalized.includes('ROOM')) {
    return BASE_TRANSPORT_TEMP_RANGES['AMBIENT_15_25C'];
  }
  return BASE_TRANSPORT_TEMP_RANGES['REFRIGERATED_2_8C'];
}

export const TRANSPORT_TEMP_RANGES: Record<string, { min: number; max: number; label: string; desc: string }> = new Proxy(BASE_TRANSPORT_TEMP_RANGES, {
  get(target, prop: string) {
    if (prop in target) {
      return (target as any)[prop];
    }
    return getTransportTempRange(prop);
  }
});

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
  digestTimeOfDay?: string;
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
