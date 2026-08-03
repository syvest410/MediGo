import { Order, ContractBillingConfig, MonthlyInvoice, BaseTariffSettings, GermanFederalState } from '../types';

export const DEFAULT_TARIFF_SETTINGS: BaseTariffSettings = {
  basePickupFeeEur: 25.00,
  ratePerKmEur: 1.85,
  expressEmergencySurchargeEur: 20.00,
  weekendMarkupPercent: 50, // +50% on Sat/Sun
  holidayMarkupPercent: 100, // +100% on Feiertag
  selectedState: 'ALL_MIX', // Covers Hessen, Bayern, NRW, Baden-Württemberg
};

export const SAMPLE_CONTRACTS: ContractBillingConfig[] = [
  {
    contractId: 'CTR-2026-UKF',
    clinicId: 'CLN-001',
    clinicName: 'Universitätsklinikum Frankfurt am Main',
    pricingModel: 'PER_BOX',
    baseRateEur: 18.50,
    perBoxRateEur: 6.00,
    billingCycle: 'MONTHLY',
    paymentTermsDays: 14,
    contractStartDate: '2026-01-01',
    active: true,
  },
  {
    contractId: 'CTR-2026-UKGM',
    clinicId: 'CLN-002',
    clinicName: 'Universitätsklinikum Gießen und Marburg',
    pricingModel: 'FIXED_ROUTE',
    baseRateEur: 42.00,
    billingCycle: 'MONTHLY',
    paymentTermsDays: 30,
    contractStartDate: '2026-02-15',
    active: true,
  },
  {
    contractId: 'CTR-2026-KASSEL',
    clinicId: 'CLN-003',
    clinicName: 'Klinikum Kassel GmbH',
    pricingModel: 'MONTHLY_RETAINER',
    baseRateEur: 890.00,
    monthlyIncludedTransports: 35,
    overagePerTransportEur: 28.00,
    billingCycle: 'MONTHLY',
    paymentTermsDays: 14,
    contractStartDate: '2026-03-01',
    active: true,
  },
  {
    contractId: 'CTR-2026-DARMSTADT',
    clinicId: 'CLN-004',
    clinicName: 'Klinikum Darmstadt GmbH',
    pricingModel: 'DISTANCE_BASED',
    baseRateEur: 14.00,
    perKmRateEur: 1.85,
    billingCycle: 'MONTHLY',
    paymentTermsDays: 14,
    contractStartDate: '2026-04-01',
    active: true,
  }
];

/**
 * Calculates Easter Sunday for any year using Meeus/Jones/Butcher algorithm
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed month
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month, day));
}

/**
 * Helper to check if two dates share the same month & day (UTC)
 */
function isSameMonthDay(d1: Date, monthZeroIdx: number, day: number): boolean {
  return d1.getUTCMonth() === monthZeroIdx && d1.getUTCDate() === day;
}

/**
 * Adds offset days to a given date
 */
function addDays(baseDate: Date, days: number): Date {
  const res = new Date(baseDate.getTime());
  res.setUTCDate(res.getUTCDate() + days);
  return res;
}

/**
 * Detects German Public Holidays (Feiertage) dynamically by Date & Federal State
 */
export function checkGermanPublicHoliday(
  dateInput: Date | string,
  state: GermanFederalState = 'ALL_MIX'
): { isHoliday: boolean; name?: string; isWeekend: boolean; dayOfWeekName: string } {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayOfWeekName = dayNames[dayOfWeek];

  const year = date.getUTCFullYear();
  const easter = getEasterSunday(year);

  // Easter-relative movable holidays
  const karfreitag = addDays(easter, -2); // Good Friday
  const ostermontag = addDays(easter, 1); // Easter Monday
  const christiHimmelfahrt = addDays(easter, 39); // Ascension Day
  const pfingstmontag = addDays(easter, 50); // Whit Monday
  const fronleichnam = addDays(easter, 60); // Corpus Christi (HE, BY, NW, BW, RP, SL)

  const isSame = (d: Date) => 
    date.getUTCFullYear() === d.getUTCFullYear() &&
    date.getUTCMonth() === d.getUTCMonth() &&
    date.getUTCDate() === d.getUTCDate();

  // 1. Fixed Nationwide German Holidays
  if (isSameMonthDay(date, 0, 1)) return { isHoliday: true, name: 'Neujahr (New Year)', isWeekend, dayOfWeekName };
  if (isSameMonthDay(date, 4, 1)) return { isHoliday: true, name: 'Tag der Arbeit (Labor Day)', isWeekend, dayOfWeekName };
  if (isSameMonthDay(date, 9, 3)) return { isHoliday: true, name: 'Tag der Deutschen Einheit (German Unity Day)', isWeekend, dayOfWeekName };
  if (isSameMonthDay(date, 11, 25)) return { isHoliday: true, name: '1. Weihnachtsfeiertag (Christmas Day)', isWeekend, dayOfWeekName };
  if (isSameMonthDay(date, 11, 26)) return { isHoliday: true, name: '2. Weihnachtsfeiertag (Boxing Day)', isWeekend, dayOfWeekName };

  // 2. Movable Nationwide Holidays
  if (isSame(karfreitag)) return { isHoliday: true, name: 'Karfreitag (Good Friday)', isWeekend, dayOfWeekName };
  if (isSame(ostermontag)) return { isHoliday: true, name: 'Ostermontag (Easter Monday)', isWeekend, dayOfWeekName };
  if (isSame(christiHimmelfahrt)) return { isHoliday: true, name: 'Christi Himmelfahrt (Ascension Day)', isWeekend, dayOfWeekName };
  if (isSame(pfingstmontag)) return { isHoliday: true, name: 'Pfingstmontag (Whit Monday)', isWeekend, dayOfWeekName };

  // 3. State Specific Holidays (Hessen, Bayern, NW, BW, etc.)
  const includeState = (validStates: GermanFederalState[]) => 
    state === 'ALL_MIX' || validStates.includes(state);

  // Fronleichnam (HE, BY, NW, BW, RP, SL)
  if (isSame(fronleichnam) && includeState(['HE', 'BY', 'NW', 'BW'])) {
    return { isHoliday: true, name: 'Fronleichnam (Corpus Christi)', isWeekend, dayOfWeekName };
  }

  // Heilige Drei Könige (06.01 - BY, BW, ST)
  if (isSameMonthDay(date, 0, 6) && includeState(['BY', 'BW'])) {
    return { isHoliday: true, name: 'Heilige Drei Könige (Epiphany)', isWeekend, dayOfWeekName };
  }

  // Reformationstag (31.10 - HB, HH, NI, SH, BB, MV, SN, ST, TH)
  if (isSameMonthDay(date, 9, 31) && includeState(['NI'])) {
    return { isHoliday: true, name: 'Reformationstag (Reformation Day)', isWeekend, dayOfWeekName };
  }

  // Allerheiligen (01.11 - BW, BY, NW, RP, SL)
  if (isSameMonthDay(date, 10, 1) && includeState(['BW', 'BY', 'NW'])) {
    return { isHoliday: true, name: 'Allerheiligen (All Saints Day)', isWeekend, dayOfWeekName };
  }

  return { isHoliday: false, isWeekend, dayOfWeekName };
}

/**
 * Calculates dynamic order tariff with Distance, Express, Weekend, and German Feiertag surcharges
 */
export function calculateDynamicOrderTariff(
  params: {
    distanceKm?: number;
    specimenBoxCount?: number;
    isExpressEmergency?: boolean;
    pickupDate?: string;
  },
  tariffSettings: BaseTariffSettings = DEFAULT_TARIFF_SETTINGS
) {
  const distanceKm = params.distanceKm || 16.5; // Default average urban transport distance
  const boxCount = params.specimenBoxCount || 1;
  const isExpress = params.isExpressEmergency || false;
  const pickupDate = params.pickupDate || new Date().toISOString();

  const holidayInfo = checkGermanPublicHoliday(pickupDate, tariffSettings.selectedState);

  const basePickupFeeEur = tariffSettings.basePickupFeeEur;
  const distanceFeeEur = Math.round(distanceKm * tariffSettings.ratePerKmEur * 100) / 100;
  const expressSurchargeEur = isExpress ? tariffSettings.expressEmergencySurchargeEur : 0;

  // Box surcharge if > 1 box
  const boxSurchargeEur = boxCount > 1 ? (boxCount - 1) * 5.00 : 0;

  const baseSubtotal = basePickupFeeEur + distanceFeeEur + expressSurchargeEur + boxSurchargeEur;

  // Surcharges (Weekend or Holiday)
  let weekendMarkupPercent = 0;
  let weekendSurchargeEur = 0;

  let holidayMarkupPercent = 0;
  let holidaySurchargeEur = 0;

  if (holidayInfo.isHoliday) {
    holidayMarkupPercent = tariffSettings.holidayMarkupPercent;
    holidaySurchargeEur = Math.round((baseSubtotal * (holidayMarkupPercent / 100)) * 100) / 100;
  } else if (holidayInfo.isWeekend) {
    weekendMarkupPercent = tariffSettings.weekendMarkupPercent;
    weekendSurchargeEur = Math.round((baseSubtotal * (weekendMarkupPercent / 100)) * 100) / 100;
  }

  const subtotalNetEur = Math.round((baseSubtotal + weekendSurchargeEur + holidaySurchargeEur) * 100) / 100;
  const vatEur = Math.round(subtotalNetEur * 0.19 * 100) / 100; // 19% MwSt
  const totalEur = Math.round((subtotalNetEur + vatEur) * 100) / 100;

  return {
    calculatedPriceEur: totalEur,
    priceBreakdown: {
      basePickupFeeEur,
      distanceKm,
      distanceFeeEur,
      expressSurchargeEur,
      weekendMarkupPercent,
      weekendSurchargeEur,
      holidayMarkupPercent,
      holidaySurchargeEur,
      holidayName: holidayInfo.name,
      subtotalNetEur,
      vatEur,
      totalEur,
    }
  };
}

/**
 * Calculates individual order transport charge based on client contract model or dynamic tariff
 */
export function calculateOrderPrice(
  order: Order, 
  contract?: ContractBillingConfig,
  tariffSettings: BaseTariffSettings = DEFAULT_TARIFF_SETTINGS
): number {
  if (!contract) {
    // Dynamic Tariff Engine for Ad-Hoc / On-Demand Orders
    const dynamicRes = calculateDynamicOrderTariff(
      {
        distanceKm: 16.5,
        specimenBoxCount: order.specimenBoxCount,
        isExpressEmergency: order.scheduledPickupFrom ? order.scheduledPickupFrom.includes('EXPRESS') : false,
        pickupDate: order.scheduledPickupFrom || order.createdAt
      },
      tariffSettings
    );
    return dynamicRes.calculatedPriceEur;
  }

  switch (contract.pricingModel) {
    case 'FIXED_ROUTE':
      return contract.baseRateEur;
    case 'PER_BOX':
      return contract.baseRateEur + (order.specimenBoxCount * (contract.perBoxRateEur || 0));
    case 'DISTANCE_BASED': {
      const estKm = 14.5;
      return contract.baseRateEur + (estKm * (contract.perKmRateEur || 1.75));
    }
    case 'MONTHLY_RETAINER':
      return 0;
    default:
      return 35.00;
  }
}

/**
 * Generates itemized monthly invoice for a given clinic contract
 */
export function generateMonthlyInvoice(
  clinicName: string,
  orders: Order[],
  billingPeriod: string = 'Juli 2026'
): MonthlyInvoice {
  const contract = SAMPLE_CONTRACTS.find(c => c.clinicName.toLowerCase().includes(clinicName.toLowerCase())) 
    || SAMPLE_CONTRACTS[0];

  const clinicOrders = orders.filter(
    o => o.pickupClinicName.toLowerCase().includes(clinicName.toLowerCase())
  );

  let subtotal = 0;
  const items: MonthlyInvoice['items'] = [];

  if (contract.pricingModel === 'MONTHLY_RETAINER') {
    subtotal = contract.baseRateEur;
    const count = clinicOrders.length;
    const included = contract.monthlyIncludedTransports || 30;
    
    if (count > included) {
      const overageCount = count - included;
      const overageCharge = overageCount * (contract.overagePerTransportEur || 28.00);
      subtotal += overageCharge;
    }

    clinicOrders.forEach(ord => {
      items.push({
        orderId: ord.id,
        trackingNumber: ord.trackingNumber,
        date: new Date(ord.createdAt).toLocaleDateString('de-DE'),
        route: `${ord.pickupClinicName} → ${ord.deliveryLabName}`,
        boxCount: ord.specimenBoxCount,
        amountEur: 0
      });
    });
  } else {
    clinicOrders.forEach(ord => {
      const cost = calculateOrderPrice(ord, contract);
      subtotal += cost;
      items.push({
        orderId: ord.id,
        trackingNumber: ord.trackingNumber,
        date: new Date(ord.createdAt).toLocaleDateString('de-DE'),
        route: `${ord.pickupClinicName} → ${ord.deliveryLabName}`,
        boxCount: ord.specimenBoxCount,
        amountEur: cost
      });
    });
  }

  const vatEur = Math.round(subtotal * 0.19 * 100) / 100;
  const totalEur = Math.round((subtotal + vatEur) * 100) / 100;

  return {
    id: `INV-${Date.now().toString().slice(-6)}`,
    invoiceNumber: `DE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    clinicName: contract.clinicName,
    contractId: contract.contractId,
    billingPeriod,
    issueDate: new Date().toLocaleDateString('de-DE'),
    dueDate: new Date(Date.now() + contract.paymentTermsDays * 86400000).toLocaleDateString('de-DE'),
    totalTransports: clinicOrders.length,
    subtotalEur: Math.round(subtotal * 100) / 100,
    vatEur,
    totalEur,
    status: 'ISSUED',
    pricingModelLabel: getPricingModelLabel(contract.pricingModel),
    items
  };
}

export function getPricingModelLabel(model: ContractBillingConfig['pricingModel']): string {
  switch (model) {
    case 'FIXED_ROUTE': return 'Fixed Fee per Transport Route';
    case 'PER_BOX': return 'Base Rate + Per Specimen Box';
    case 'DISTANCE_BASED': return 'Base Rate + Distance (€/km)';
    case 'MONTHLY_RETAINER': return 'Flat Monthly Retainer Package';
    default: return 'Custom Contract';
  }
}
