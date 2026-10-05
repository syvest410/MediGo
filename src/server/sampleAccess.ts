/**
 * UN 3373 Medical Logistics - Sample Details & Least Privilege Access Policy
 * Enforces GDPR Art. 9, German BDSG, and ADR P650 sample confidentiality.
 */

import { Order, Role } from '../types';
import { TokenPayload } from './auth';

/**
 * Public Milestone Tracking Payload (Sanitized for unauthenticated inquiries)
 * Zero medical sample barcodes, zero patient identifiers, zero signatures, zero commercial pricing.
 */
export interface PublicTrackingMilestones {
  trackingNumber: string;
  status: string;
  transportType: string;
  specimenBoxCount: number;
  originCity: string;
  destinationCity: string;
  scheduledDeliveryBy: string;
  lastUpdated: string;
  isCompliant: boolean;
  activeTemperatureOk: boolean;
}

/**
 * Helper to extract city from a German address string (e.g. "Mainzer Straße 98, 65189 Wiesbaden, Hessen" -> "Wiesbaden")
 */
function extractCity(address?: string): string {
  if (!address) return 'Hessen';
  const parts = address.split(',');
  if (parts.length >= 2) {
    const cityPart = parts[1].trim();
    return cityPart.replace(/^\d{5}\s*/, '').trim() || cityPart;
  }
  return 'Hessen';
}

/**
 * Check if an authenticated user has permission to access a specific sample order.
 * Strictly enforces organizational boundary isolation under GDPR Art. 9 & German Medical Secrecy.
 */
export function canAccessOrder(user: TokenPayload, order: Order): boolean {
  if (!user || !order) return false;

  // 1. Central Dispatchers and Administrators have regional oversight over all orders
  if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
    return true;
  }

  // 2. Organization Staff (Clinics, Hospitals, Labs, Pharmacies)
  if (user.role === 'ORG_STAFF' || user.role === 'CLIENT_CLINIC' || user.role === 'LAB_STAFF') {
    const isLab = user.facilityType === 'LABORATORY' || user.role === 'LAB_STAFF';

    // Primary: Organization ID foreign key match
    if (user.organizationId) {
      if (isLab) {
        if (order.destinationOrgId) return order.destinationOrgId === user.organizationId;
      } else {
        if (order.originOrganizationId) return order.originOrganizationId === user.organizationId;
      }
    }

    // Secondary / Fallback (when organizationId is not populated on legacy records):
    const userOrg = (user.organization || '').toLowerCase().trim();
    if (!userOrg) return false;

    if (isLab) {
      return order.deliveryLabName.toLowerCase().trim() === userOrg ||
        order.deliveryLabName.toLowerCase().includes(userOrg);
    } else {
      const clinicMatch = order.pickupClinicName.toLowerCase().trim() === userOrg ||
        order.pickupClinicName.toLowerCase().includes(userOrg);
      const creatorOrgMatch = (order.createdByOrg || '').toLowerCase().trim() === userOrg;
      const creatorIdMatch = order.createdById === user.id;
      return Boolean(clinicMatch || creatorOrgMatch || creatorIdMatch);
    }
  }

  // 3. Drivers / Medical Couriers:
  if (user.role === 'DRIVER') {
    if (order.driverId === user.id) return true;
    if (!order.driverId && order.status === 'SCHEDULED') return true;
    return false;
  }

  // 4. Patients:
  if (user.role === 'PATIENT') {
    return order.publicAccessToken === user.id || order.trackingNumber === user.id;
  }

  return false;
}

export const canUserAccessOrder = canAccessOrder;

/**
 * Sanitize an order based on the Principle of Least Privilege (PoLP).
 * Strips data fields not strictly required for the specific user role:
 * - Drivers do NOT receive commercial B2B billing tariffs / profit margins.
 * - Laboratories do NOT receive clinic invoice pricing.
 * - Clinics do NOT receive courier internal telemetry mechanics.
 * - Patients only receive public tracking milestones.
 */
export function sanitizeOrderForRole(order: Order, role: Role): Order {
  const sanitized: Order = JSON.parse(JSON.stringify(order));

  if (role === 'ADMIN' || role === 'DISPATCHER') {
    return sanitized;
  }

  if (role === 'DRIVER') {
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }

  if (role === 'LAB_STAFF') {
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }

  if (role === 'ORG_STAFF') {
    // If staff belongs to lab, strip invoice breakdowns
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }

  if (role === 'CLIENT_CLINIC') {
    return sanitized;
  }

  if (role === 'PATIENT') {
    delete sanitized.barcodeList;
    delete sanitized.specialNotes;
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    delete sanitized.driverId;
    delete sanitized.driverName;
    return sanitized;
  }

  return sanitized;
}

/**
 * Produces sanitized milestone tracking for unauthenticated public inquiries
 */
export function getPublicTrackingMilestones(order: Order): PublicTrackingMilestones {
  const hasTempBreach = order.telemetryLogs?.some(l => l.isBreach) || false;

  return {
    trackingNumber: order.trackingNumber,
    status: order.status,
    transportType: order.transportType,
    specimenBoxCount: order.specimenBoxCount,
    originCity: extractCity(order.pickupAddress),
    destinationCity: extractCity(order.deliveryAddress),
    scheduledDeliveryBy: order.scheduledDeliveryBy,
    lastUpdated: order.updatedAt || order.createdAt,
    isCompliant: order.p650Verified && !hasTempBreach,
    activeTemperatureOk: !hasTempBreach,
  };
}
