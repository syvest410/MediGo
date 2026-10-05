import { z } from 'zod';
import { isCommonPassword } from './commonPasswords';

export const GpsCoordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().default(5.0).optional(),
}).strict();

export const PreTripCheckSchema = z.object({
  id: z.string().optional(),
  orderId: z.string().optional(),
  driverId: z.string().optional(),
  p650OuterPackagingIntact: z.boolean().refine(val => val === true, {
    message: 'ADR P650 Outer Packaging must be verified intact.',
  }),
  primarySecondaryLeakProof: z.boolean().refine(val => val === true, {
    message: 'ADR P650 Primary/Secondary containers must be leakproof.',
  }),
  absorbentMaterialPresent: z.boolean().refine(val => val === true, {
    message: 'ADR P650 Absorbent material must be present.',
  }),
  tempBoxCalibrated: z.boolean().refine(val => val === true, {
    message: 'Temperature container calibration check failed.',
  }),
  initialTempCelsius: z.number().min(-50).max(60),
  targetTempMinCelsius: z.number().min(-50).max(60),
  targetTempMaxCelsius: z.number().min(-50).max(60),
  driverSignatureBase64: z.string().min(20, 'Valid digital signature required.'),
  vehicleRegNumber: z.string().min(2).max(30),
  approved: z.boolean().default(true),
  timestamp: z.string().optional(),
}).strict();

export const CustodySignOffSchema = z.object({
  id: z.string().optional(),
  orderId: z.string().optional(),
  eventType: z.enum(['PICKUP_SIGNATURE', 'DELIVERY_SIGNATURE']),
  staffName: z.string().min(2).max(100, 'Signatory staff member name is required.'),
  staffTitle: z.string().max(100).optional(),
  signatureBase64: z.string().min(20, 'Signature payload is required.'),
  cryptoSignature: z.string().max(512).optional(),
  pinCode: z.string().regex(/^\d{4}$/, 'Staff PIN must be a 4-digit number.').optional(),
  pinCodeVerified: z.boolean().optional(),
  scannedBarcodes: z.array(z.string().min(2).max(100)).min(1, 'At least one specimen barcode is mandatory.'),
  timestamp: z.string().optional(),
  clientRecordedAt: z.string().optional(),
  serverIngestedAt: z.string().optional(),
  coords: GpsCoordsSchema.optional(),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  gpsAccuracyMeters: z.number().positive().optional(),
  deviceId: z.string().min(2).max(100).optional(),
}).strict();

export const TransitionOrderSchema = z.object({
  targetStatus: z.enum([
    'SCHEDULED',
    'PRE_TRIP_CHECK',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'QUARANTINED_UNSYNCED',
    'CANCELLED',
  ]),
  context: z
    .object({
      preTripCheck: PreTripCheckSchema.optional(),
      pickupSignature: CustodySignOffSchema.optional(),
      deliverySignature: CustodySignOffSchema.optional(),
      cancellationReason: z.string().max(500).optional(),
    })
    .strict()
    .optional(),
  coords: GpsCoordsSchema.optional(),
  deviceId: z.string().max(100).optional(),
}).strict();

export const OfflineSyncItemSchema = z.object({
  id: z.string().min(1).max(100),
  orderId: z.string().min(1).max(100),
  actionType: z.enum(['ACCEPT', 'PRE_TRIP_CHECK', 'PICKUP', 'TELEMETRY', 'DELIVER', 'CANCEL']),
  payload: z.record(z.string(), z.any()).optional(),
  timestamp: z.string(),
  clientRecordedAt: z.string().optional(),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  deviceId: z.string().max(100).optional(),
  cryptoSignature: z.string().max(512).optional(),
  retryCount: z.number().int().min(0).max(100).optional(),
}).strict();

export const PasswordPolicySchema = z.string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password cannot exceed 128 characters.')
  .refine(pwd => !isCommonPassword(pwd), {
    message: 'Password is too common or easily guessable. Please choose a stronger password.',
  });

export const LoginSchema = z.object({
  email: z.string().email('A valid email address is required.').max(150),
  password: z.string().min(1, 'Password is required.').max(128),
}).strict();

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: PasswordPolicySchema,
}).strict().refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password.',
  path: ['newPassword'],
});

export function validatePasswordAgainstUser(
  password: string,
  user: { email?: string; name?: string }
): { valid: boolean; error?: string } {
  if (!password || password.length < 12) {
    return { valid: false, error: 'Password must be between 12 and 128 characters.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters.' };
  }
  const normalized = password.toLowerCase().trim();
  if (isCommonPassword(normalized)) {
    return { valid: false, error: 'Password is too common and easily guessable.' };
  }
  if (user.email) {
    const emailNorm = user.email.toLowerCase().trim();
    const prefix = emailNorm.split('@')[0];
    if (normalized === emailNorm || (prefix && prefix.length >= 3 && normalized === prefix)) {
      return { valid: false, error: 'Password cannot be identical to your email address or username.' };
    }
  }
  if (user.name) {
    const nameNorm = user.name.toLowerCase().trim();
    if (normalized === nameNorm) {
      return { valid: false, error: 'Password cannot be identical to your name.' };
    }
  }
  return { valid: true };
}

export const CreateUserSchema = z.object({
  email: z.string().email().max(150),
  password: PasswordPolicySchema,
  name: z.string().min(2).max(100),
  role: z.enum(['ADMIN', 'DISPATCHER', 'DRIVER', 'ORG_STAFF', 'PATIENT', 'CLIENT_CLINIC', 'LAB_STAFF']),
  phone: z.string().max(50).optional(),
  organization: z.string().max(100).optional(),
  organizationId: z.string().max(100).optional(),
  contractNumber: z.string().max(50).optional(),
  facilityType: z.enum(['CLINIC', 'LABORATORY', 'HQ', 'COURIER']).optional(),
  facilityAddress: z.string().max(250).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  pinCode: z.string().regex(/^\d{4}$/, 'PIN must be a 4-digit number.').optional(),
  devicePublicKey: z.string().max(512).optional(),
  mustChangePassword: z.boolean().optional(),
}).strict();

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  phone: z.string().max(50).optional(),
  organization: z.string().max(100).optional(),
  organizationId: z.string().max(100).optional(),
  contractNumber: z.string().max(50).optional(),
  facilityType: z.enum(['CLINIC', 'LABORATORY', 'HQ', 'COURIER']).optional(),
  facilityAddress: z.string().max(250).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  active: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  password: PasswordPolicySchema.optional(),
}).strict();

export const UpsertOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['HOSPITAL', 'CLINIC', 'PHARMACY', 'CARE_HOME', 'LABORATORY', 'INDIVIDUAL_PATIENT']).default('CLINIC'),
  contractNumber: z.string().max(50).optional(),
  addressStreet: z.string().max(150).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).default('HE').optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(150).optional(),
}).strict();

export const CreateOrderSchema = z.object({
  id: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  transportType: z.enum(['AMBIENT_15_25C', 'REFRIGERATED_2_8C', 'FROZEN_MINUS_20C', 'FROZEN_DRY_ICE']).default('REFRIGERATED_2_8C'),
  specimenCategory: z.enum(['UN3373_CATEGORY_B_SPECIMEN', 'PHARMACEUTICAL_APBETRO', 'STEM_CELLS_APHERESIS', 'CRYOPRESERVED_SPECIMEN']).default('UN3373_CATEGORY_B_SPECIMEN'),
  sampleCategory: z.string().max(100).optional(),
  originOrganizationId: z.string().max(100).optional(),
  pickupClinicName: z.string().min(2).max(150, 'Pickup clinic name is required.'),
  pickupAddress: z.string().min(5).max(250, 'Pickup address is required.'),
  pickupDepartment: z.string().max(100).optional(),
  pickupContactPhone: z.string().min(5).max(50),
  destinationOrgId: z.string().max(100).optional(),
  deliveryLabName: z.string().min(2).max(150, 'Delivery lab name is required.'),
  deliveryAddress: z.string().min(5).max(250, 'Delivery address is required.'),
  deliveryDepartment: z.string().max(100).optional(),
  deliveryContactPhone: z.string().min(5).max(50),
  scheduledPickupFrom: z.string().optional(),
  scheduledPickupTo: z.string().optional(),
  scheduledDeliveryBy: z.string().optional(),
  specimenBoxCount: z.number().int().positive().max(500).default(1),
  barcodeList: z.array(z.string().min(1).max(100)).min(1, 'At least one barcode is required.'),
  specialNotes: z.string().max(1000).optional(),
  p650Verified: z.boolean().default(true),
  createdById: z.string().max(100).optional(),
  createdByOrg: z.string().max(100).optional(),
  driverId: z.string().max(100).optional(),
  driverName: z.string().max(100).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  publicAccessToken: z.string().max(100).optional(),
  status: z.enum(['SCHEDULED', 'PRE_TRIP_CHECK', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'QUARANTINED_UNSYNCED', 'CANCELLED']).optional(),
}).strict();

export const PatchOrderSchema = z.object({
  status: z.enum(['SCHEDULED', 'PRE_TRIP_CHECK', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'QUARANTINED_UNSYNCED', 'CANCELLED']).optional(),
  transportType: z.enum(['AMBIENT_15_25C', 'REFRIGERATED_2_8C', 'FROZEN_MINUS_20C', 'FROZEN_DRY_ICE']).optional(),
  specimenCategory: z.enum(['UN3373_CATEGORY_B_SPECIMEN', 'PHARMACEUTICAL_APBETRO', 'STEM_CELLS_APHERESIS', 'CRYOPRESERVED_SPECIMEN']).optional(),
  driverId: z.string().max(100).optional(),
  driverName: z.string().max(100).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  scheduledPickupFrom: z.string().optional(),
  scheduledPickupTo: z.string().optional(),
  scheduledDeliveryBy: z.string().optional(),
  specimenBoxCount: z.number().int().positive().max(500).optional(),
  specialNotes: z.string().max(1000).optional(),
  quarantineReason: z.string().max(500).optional(),
}).strict();

export const TemperatureTelemetrySchema = z.object({
  id: z.string().max(100).optional(),
  orderId: z.string().max(100).optional(),
  sensorId: z.string().min(1).max(100),
  tempCelsius: z.number().min(-100).max(100),
  ambientTempCelsius: z.number().min(-100).max(100).optional(),
  humidityPercent: z.number().min(0).max(100).optional(),
  batteryLevelPercent: z.number().min(0).max(100).optional(),
  isBreach: z.boolean(),
  timestamp: z.string(),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
}).strict();

export const CeoEmailForwardingSchema = z.object({
  ceoEmail: z.string().email().max(150).optional(),
  ceoName: z.string().min(2).max(100).optional(),
  ccAccountingEmail: z.string().email().max(150).optional(),
  autoForwardCompletedOrders: z.boolean().optional(),
  autoForwardInvoices: z.boolean().optional(),
  attachTelemetryPdf: z.boolean().optional(),
  attachChainOfCustodyPdf: z.boolean().optional(),
  forwardingMode: z.enum(['INSTANT', 'BATCH_DAILY', 'OFF']).optional(),
}).strict();

export const CeoTestSendSchema = z.object({
  targetEmail: z.string().email().max(150).optional(),
}).strict();
