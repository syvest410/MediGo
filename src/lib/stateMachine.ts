// Strict Sequential State Machine for UN 3373 Medical Courier Workflow

import { Order, OrderStatus, PreTripCheck, ChainOfCustody, CancelReasonCode } from '../types';

export interface TransitionValidationResult {
  allowed: boolean;
  errors: string[];
}

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  SCHEDULED: ['PRE_TRIP_CHECK', 'CANCELLED'],
  PRE_TRIP_CHECK: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal
  CANCELLED: []  // Terminal
};

/**
 * Validate whether a status transition is allowed by ADR / UN 3373 compliance rules.
 */
export function validateStateTransition(
  order: Order,
  targetStatus: OrderStatus,
  context?: {
    preTripCheck?: Partial<PreTripCheck>;
    pickupSignature?: Partial<ChainOfCustody>;
    deliverySignature?: Partial<ChainOfCustody>;
    cancellationReason?: CancelReasonCode;
  }
): TransitionValidationResult {
  const currentStatus = order.status;
  const errors: string[] = [];

  // 1. Check state graph sequence
  const allowedNextStates = VALID_TRANSITIONS[currentStatus];
  if (!allowedNextStates.includes(targetStatus)) {
    return {
      allowed: false,
      errors: [`Invalid status sequence: Cannot transition directly from ${currentStatus} to ${targetStatus}. Expected sequence: SCHEDULED → PRE_TRIP_CHECK → PICKED_UP → IN_TRANSIT → DELIVERED.`]
    };
  }

  // 2. State-specific validation rules
  if (targetStatus === 'PRE_TRIP_CHECK') {
    if (!order.driverId) {
      errors.push('A licensed medical courier driver must be assigned to accept order.');
    }
  }

  if (targetStatus === 'PICKED_UP') {
    // Must have a valid and approved Pre-Trip Inspection
    const pt = context?.preTripCheck || order.preTripCheck;
    if (!pt) {
      errors.push('Mandatory Pre-Trip Vehicle & P650 Inspection is missing.');
    } else {
      if (!pt.p650OuterPackagingIntact) {
        errors.push('P650 packaging integrity check failed: Outer packaging is not intact.');
      }
      if (!pt.primarySecondaryLeakProof) {
        errors.push('P650 leak-proof requirement failed: Primary and secondary containers must be leak-proof.');
      }
      if (!pt.absorbentMaterialPresent) {
        errors.push('UN 3373 ADR requirement failed: Absorbent material between primary and secondary vessel is missing.');
      }
      if (!pt.tempBoxCalibrated) {
        errors.push('Temperature box calibration check failed: Cooling/heating box must be verified.');
      }
      if (!pt.driverSignatureBase64) {
        errors.push('Driver digital signature is required for Pre-Trip certification.');
      }
    }

    // Must have pickup signature & barcode scans
    const pickupSig = context?.pickupSignature;
    if (pickupSig) {
      if (!pickupSig.staffName || pickupSig.staffName.trim().length < 2) {
        errors.push('Clinic/Hospital staff member name is required for Chain of Custody.');
      }
      if (!pickupSig.signatureBase64) {
        errors.push('Clinic/Hospital staff signature is required upon handover.');
      }
      if (!pickupSig.scannedBarcodes || pickupSig.scannedBarcodes.length === 0) {
        errors.push('At least one specimen box barcode/QR code must be scanned at pickup.');
      }
    }
  }

  if (targetStatus === 'IN_TRANSIT') {
    // Verify that pickup was fully logged
    const pickupRecord = order.chainOfCustodyLogs.find(l => l.eventType === 'PICKUP_SIGNATURE') || context?.pickupSignature;
    if (!pickupRecord) {
      errors.push('Cannot transition to In Transit without verified Pickup Chain of Custody sign-off.');
    }
  }

  if (targetStatus === 'DELIVERED') {
    // Must have delivery signature at lab
    const deliverySig = context?.deliverySignature;
    if (deliverySig) {
      if (!deliverySig.staffName || deliverySig.staffName.trim().length < 2) {
        errors.push('Laboratory recipient name is required.');
      }
      if (!deliverySig.signatureBase64) {
        errors.push('Laboratory staff digital signature is required upon specimen handover.');
      }
      if (!deliverySig.scannedBarcodes || deliverySig.scannedBarcodes.length === 0) {
        errors.push('Verification scan of specimen barcodes required at lab acceptance.');
      }
    } else {
      const existingDel = order.chainOfCustodyLogs.find(l => l.eventType === 'DELIVERY_SIGNATURE');
      if (!existingDel) {
        errors.push('Laboratory handover sign-off and recipient signature are required.');
      }
    }
  }

  if (targetStatus === 'CANCELLED') {
    const reason = context?.cancellationReason || order.cancellationReason;
    if (!reason) {
      errors.push('Mandatory cancellation reason code selection required under medical logistics protocol.');
    }
  }

  return {
    allowed: errors.length === 0,
    errors
  };
}
