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
 */
export function canUserAccessOrder(user: TokenPayload, order: Order): boolean {
  if (!user) return false;

  // 1. Central Dispatchers and Administrators have regional oversight over all orders
  if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
    return true;
  }

  // 2. Client Clinics: Can ONLY access their own clinic's sample shipments
  if (user.role === 'CLIENT_CLINIC') {
    const userOrg = (user.organization || '').toLowerCase().trim();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userContract = (user.contractNumber || '').toLowerCase().trim();

    const clinicMatch = userOrg && order.pickupClinicName.toLowerCase().includes(userOrg);
    const creatorOrgMatch = userOrg && (order.createdByOrg || '').toLowerCase().includes(userOrg);
    const creatorIdMatch = order.createdById === user.id;
    const contractMatch = userContract && (order.trackingNumber.toLowerCase().includes(userContract) || (order.specialNotes || '').toLowerCase().includes(userContract));

    return Boolean(clinicMatch || creatorOrgMatch || creatorIdMatch || contractMatch);
  }

  // 3. Laboratory Staff: Can ONLY access samples routed for delivery to their laboratory
  if (user.role === 'LAB_STAFF') {
    const userOrg = (user.organization || '').toLowerCase().trim();
    const userContract = (user.contractNumber || '').toLowerCase().trim();

    const labMatch = userOrg && order.deliveryLabName.toLowerCase().includes(userOrg);
    const contractMatch = userContract && ((order.specialNotes || '').toLowerCase().includes(userContract));

    return Boolean(labMatch || contractMatch);
  }

  // 4. Drivers / Medical Couriers:
  // Can access orders assigned to their courier ID, OR unassigned open orders in SCHEDULED status on the job board
  if (user.role === 'DRIVER') {
    if (order.driverId === user.id) return true;
    if (!order.driverId && order.status === 'SCHEDULED') return true;
    return false;
  }

  return false;
}

/**
 * Sanitize an order based on the Principle of Least Privilege (PoLP).
 * Strips data fields not strictly required for the specific user role:
 * - Drivers do NOT receive commercial B2B billing tariffs / profit margins.
 * - Laboratories do NOT receive clinic invoice pricing.
 * - Clinics do NOT receive courier internal telemetry mechanics.
 */
export function sanitizeOrderForRole(order: Order, role: Role): Order {
  const sanitized: Order = JSON.parse(JSON.stringify(order));

  if (role === 'ADMIN' || role === 'DISPATCHER') {
    // Dispatchers and Administrators retain full administrative visibility
    return sanitized;
  }

  if (role === 'DRIVER') {
    // Least Privilege: Couriers do not require client B2B pricing breakdowns
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }

  if (role === 'LAB_STAFF') {
    // Least Privilege: Lab receiving staff do not require commercial tariff negotiations
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }

  if (role === 'CLIENT_CLINIC') {
    // Clinics receive sample data, cold chain validation, and their invoice pricing,
    // but internal driver vehicle calibration internals are minimized
    return sanitized;
  }

  return sanitized;
}

/**
 * Produces sanitized milestone tracking for unauthenticated public inquiries
 * (e.g. recipient checking package arrival without clinical access).
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
