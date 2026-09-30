import { z } from 'zod';

export const GpsCoordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().default(5.0).optional(),
});

export const PreTripCheckSchema = z.object({
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
  initialTempCelsius: z.number(),
  targetTempMinCelsius: z.number(),
  targetTempMaxCelsius: z.number(),
  driverSignatureBase64: z.string().min(20, 'Valid digital signature required.'),
  vehicleRegNumber: z.string().min(2),
  approved: z.boolean().default(true),
});

export const CustodySignOffSchema = z.object({
  eventType: z.enum(['PICKUP_SIGNATURE', 'DELIVERY_SIGNATURE']),
  staffName: z.string().min(2, 'Signatory staff member name is required.'),
  staffTitle: z.string().optional(),
  signatureBase64: z.string().min(20, 'Signature payload is required.'),
  cryptoSignature: z.string().optional(),
  pinCode: z.string().regex(/^\d{4}$/, 'Staff PIN must be a 4-digit number.').optional(),
  scannedBarcodes: z.array(z.string().min(2)).min(1, 'At least one specimen barcode is mandatory.'),
  clientRecordedAt: z.string().optional(),
  coords: GpsCoordsSchema.optional(),
  deviceId: z.string().min(2).optional(),
});

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
      cancellationReason: z.string().optional(),
    })
    .optional(),
  coords: GpsCoordsSchema.optional(),
  deviceId: z.string().optional(),
});

export const OfflineSyncItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  actionType: z.enum(['ACCEPT', 'PRE_TRIP_CHECK', 'PICKUP', 'TELEMETRY', 'DELIVER', 'CANCEL']),
  payload: z.any(),
  timestamp: z.string(),
  clientRecordedAt: z.string().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  deviceId: z.string().optional(),
  cryptoSignature: z.string().optional(),
  retryCount: z.number().optional(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'DISPATCHER', 'DRIVER', 'ORG_STAFF', 'PATIENT', 'CLIENT_CLINIC', 'LAB_STAFF']),
  phone: z.string().optional(),
  organization: z.string().optional(),
  organizationId: z.string().optional(),
  contractNumber: z.string().optional(),
  facilityType: z.enum(['CLINIC', 'LABORATORY', 'HQ', 'COURIER']).optional(),
  facilityAddress: z.string().optional(),
  vehicleRegNumber: z.string().optional(),
  pinCode: z.string().regex(/^\d{4}$/, 'PIN must be a 4-digit number.').optional(),
  devicePublicKey: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  trackingNumber: z.string().optional(),
  transportType: z.enum(['AMBIENT_15_25C', 'REFRIGERATED_2_8C', 'FROZEN_MINUS_20C']).default('REFRIGERATED_2_8C'),
  specimenCategory: z.enum(['UN3373_CATEGORY_B_SPECIMEN', 'PHARMACEUTICAL_APBETRO', 'STEM_CELLS_APHERESIS', 'CRYOPRESERVED_SPECIMEN']).default('UN3373_CATEGORY_B_SPECIMEN'),
  sampleCategory: z.string().optional(),
  originOrganizationId: z.string().optional(),
  pickupClinicName: z.string().min(2, 'Pickup clinic name is required.'),
  pickupAddress: z.string().min(5, 'Pickup address is required.'),
  pickupDepartment: z.string().optional(),
  pickupContactPhone: z.string().min(5),
  destinationOrgId: z.string().optional(),
  deliveryLabName: z.string().min(2, 'Delivery lab name is required.'),
  deliveryAddress: z.string().min(5, 'Delivery address is required.'),
  deliveryDepartment: z.string().optional(),
  deliveryContactPhone: z.string().min(5),
  scheduledPickupFrom: z.string().optional(),
  scheduledPickupTo: z.string().optional(),
  scheduledDeliveryBy: z.string().optional(),
  specimenBoxCount: z.number().int().positive().default(1),
  barcodeList: z.array(z.string()).min(1, 'At least one barcode is required.'),
  specialNotes: z.string().optional(),
  p650Verified: z.boolean().default(true),
  createdById: z.string().optional(),
  createdByOrg: z.string().optional(),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  vehicleRegNumber: z.string().optional(),
});
