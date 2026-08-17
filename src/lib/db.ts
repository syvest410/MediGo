// Sample Seed Database & In-Memory Data Store for MediGo Hessen UN 3373 Medical Courier Service

import { Order, User, PreTripCheck, ChainOfCustody, TemperatureTelemetry, AuditLog } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-DISPATCHER-01',
    email: 'dispatch@medigo-hessen.de',
    name: 'Katrin Weber (MediGo Dispatch Wiesbaden Zentrale)',
    role: 'DISPATCHER',
    phone: '+49 611 9882 100',
    organization: 'MediGo Hauptstandort & Dispatch Zentrale (Wiesbaden)'
  },
  {
    id: 'USR-DRIVER-01',
    email: 'hans.schmidt@medigo-hessen.de',
    name: 'Hans Schmidt (MediGo Kurier WI-MG 7741)',
    role: 'DRIVER',
    phone: '+49 171 9882310',
    organization: 'MediGo Wiesbaden Fleet & Hessen Express Logistics'
  },
  {
    id: 'USR-CLINIC-01',
    email: 'probeneingang@kgu.de',
    name: 'Dr. Martin Hoffmann',
    role: 'CLIENT_CLINIC',
    phone: '+49 69 6301 0',
    organization: 'Universitätsklinikum Frankfurt am Main (Hessen)'
  },
  {
    id: 'USR-LAB-01',
    email: 'empfang@synlab-hessen.de',
    name: 'Sabine Neumann (Laborleitung)',
    role: 'LAB_STAFF',
    phone: '+49 69 7000 88',
    organization: 'Synlab Medizinisches Versorgungszentrum Frankfurt-Hessen'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-DE-8821',
    trackingNumber: 'DE-UN3373-2026-8821',
    status: 'SCHEDULED',
    transportType: 'REFRIGERATED_2_8C',
    pickupClinicName: 'Universitätsklinikum Frankfurt am Main',
    pickupAddress: 'Theodor-Stern-Kai 7, 60590 Frankfurt am Main, Hessen',
    pickupDepartment: 'Station 12B - Infektiologie & Virologie',
    pickupContactPhone: '+49 69 6301 5120',
    deliveryLabName: 'Biosammlungszentrum Hessen - Synlab',
    deliveryAddress: 'Paul-Ehrlich-Straße 51, 60596 Frankfurt am Main',
    deliveryDepartment: 'Trakt 4, Labor-Eingang C',
    deliveryContactPhone: '+49 69 7000 881',
    scheduledPickupFrom: new Date(Date.now() - 30 * 60000).toISOString(),
    scheduledPickupTo: new Date(Date.now() + 30 * 60000).toISOString(),
    scheduledDeliveryBy: new Date(Date.now() + 120 * 60000).toISOString(),
    sampleCategory: 'UN 3373 Biological Substance Cat B (Blood Serum Samples)',
    specimenBoxCount: 2,
    barcodeList: ['SPEC-FRA-9901-A', 'SPEC-FRA-9901-B'],
    specialNotes: 'MediGo Hessen express. P650 packaging checked. Keep upright at 2-8°C.',
    p650Verified: true,
    driverId: 'USR-DRIVER-01',
    driverName: 'Hans Schmidt (MediGo Kurier 104)',
    createdById: 'USR-CLINIC-01',
    createdByOrg: 'Universitätsklinikum Frankfurt',
    vehicleRegNumber: 'F-MG 7741 (MediGo Hessen Thermo Van)',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    chainOfCustodyLogs: [],
    telemetryLogs: [
      {
        id: 'TEL-001',
        orderId: 'ORD-DE-8821',
        sensorId: 'SENS-REFRIG-01',
        tempCelsius: 4.8,
        ambientTempCelsius: 21.2,
        humidityPercent: 52,
        batteryLevelPercent: 99,
        isBreach: false,
        timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
        gpsLatitude: 50.0911,
        gpsLongitude: 8.6651
      }
    ],
    auditLogs: [
      {
        id: 'AUD-101',
        orderId: 'ORD-DE-8821',
        previousState: null,
        newState: 'SCHEDULED',
        actionDescription: 'Order created by UK Frankfurt Clinic and assigned to MediGo Courier Hans Schmidt.',
        userId: 'USR-CLINIC-01',
        userName: 'Dr. Martin Hoffmann',
        userRole: 'CLIENT_CLINIC',
        deviceId: 'WEB-CLINIC-DESK-01',
        gpsLatitude: 50.0911,
        gpsLongitude: 8.6651,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 45 * 60000).toISOString()
      }
    ]
  },
  {
    id: 'ORD-DE-8822',
    trackingNumber: 'DE-UN3373-2026-8822',
    status: 'IN_TRANSIT',
    transportType: 'AMBIENT_15_25C',
    pickupClinicName: 'Universitätsklinikum Gießen und Marburg (Location Marburg)',
    pickupAddress: 'Baldingerstraße, 35043 Marburg, Hessen',
    pickupDepartment: 'Station 3 - Hämatologie & Pathologie',
    pickupContactPhone: '+49 6421 5860',
    deliveryLabName: 'Labor Dr. Risch Wiesbaden / Hessen Central',
    deliveryAddress: 'Mainzer Straße 98, 65189 Wiesbaden, Hessen',
    deliveryDepartment: 'Empfang Mikrobiologie',
    deliveryContactPhone: '+49 611 99120',
    scheduledPickupFrom: new Date(Date.now() - 120 * 60000).toISOString(),
    scheduledPickupTo: new Date(Date.now() - 60 * 60000).toISOString(),
    scheduledDeliveryBy: new Date(Date.now() + 60 * 60000).toISOString(),
    sampleCategory: 'UN 3373 Category B (Tissue Biopsy Specimen)',
    specimenBoxCount: 1,
    barcodeList: ['SPEC-MR-4412'],
    specialNotes: 'MediGo Hessen express courier. Store in P650 ambient thermal container at 15-25°C.',
    p650Verified: true,
    driverId: 'USR-DRIVER-01',
    driverName: 'Hans Schmidt (MediGo Kurier 104)',
    createdById: 'USR-DISPATCHER-01',
    createdByOrg: 'MediGo Zentrale Hessen',
    vehicleRegNumber: 'F-MG 7741 (MediGo Hessen Thermo Van)',
    createdAt: new Date(Date.now() - 150 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    preTripCheck: {
      id: 'PTC-8822',
      orderId: 'ORD-DE-8822',
      driverId: 'USR-DRIVER-01',
      vehicleRegNumber: 'F-MG 7741 (MediGo Hessen Thermo Van)',
      p650OuterPackagingIntact: true,
      primarySecondaryLeakProof: true,
      absorbentMaterialPresent: true,
      tempBoxCalibrated: true,
      initialTempCelsius: 21.0,
      targetTempMinCelsius: 15.0,
      targetTempMaxCelsius: 25.0,
      inspectedAt: new Date(Date.now() - 100 * 60000).toISOString(),
      driverSignatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      approved: true
    },
    chainOfCustodyLogs: [
      {
        id: 'COC-8822-PICKUP',
        orderId: 'ORD-DE-8822',
        eventType: 'PICKUP_SIGNATURE',
        staffName: 'Schwester Elena Meyer',
        staffTitle: 'Stationsleitung 3',
        signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        pinCodeVerified: true,
        scannedBarcodes: ['SPEC-MR-4412'],
        timestamp: new Date(Date.now() - 85 * 60000).toISOString(),
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        gpsAccuracyMeters: 4.2,
        deviceId: 'MOB-MEDIGO-104'
      }
    ],
    telemetryLogs: [
      {
        id: 'TEL-8822-01',
        orderId: 'ORD-DE-8822',
        sensorId: 'SENS-AMBIENT-01',
        tempCelsius: 20.8,
        ambientTempCelsius: 22.0,
        humidityPercent: 48,
        batteryLevelPercent: 95,
        isBreach: false,
        timestamp: new Date(Date.now() - 70 * 60000).toISOString(),
        gpsLatitude: 50.1109,
        gpsLongitude: 8.6821
      },
      {
        id: 'TEL-8822-02',
        orderId: 'ORD-DE-8822',
        sensorId: 'SENS-AMBIENT-01',
        tempCelsius: 21.4,
        ambientTempCelsius: 23.1,
        humidityPercent: 50,
        batteryLevelPercent: 94,
        isBreach: false,
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        gpsLatitude: 50.1150,
        gpsLongitude: 8.6880
      }
    ],
    auditLogs: [
      {
        id: 'AUD-201',
        orderId: 'ORD-DE-8822',
        previousState: 'SCHEDULED',
        newState: 'PRE_TRIP_CHECK',
        actionDescription: 'MediGo driver completed mandatory P650 integrity and box temperature calibration.',
        userId: 'USR-DRIVER-01',
        userName: 'Hans Schmidt',
        userRole: 'DRIVER',
        deviceId: 'MOB-MEDIGO-104',
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 100 * 60000).toISOString()
      },
      {
        id: 'AUD-202',
        orderId: 'ORD-DE-8822',
        previousState: 'PRE_TRIP_CHECK',
        newState: 'PICKED_UP',
        actionDescription: 'Specimen SPEC-MR-4412 scanned. Signature captured from Schwester Elena Meyer at UK Marburg.',
        userId: 'USR-DRIVER-01',
        userName: 'Hans Schmidt',
        userRole: 'DRIVER',
        deviceId: 'MOB-MEDIGO-104',
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 85 * 60000).toISOString()
      },
      {
        id: 'AUD-203',
        orderId: 'ORD-DE-8822',
        previousState: 'PICKED_UP',
        newState: 'IN_TRANSIT',
        actionDescription: 'MediGo courier departed UK Marburg towards Wiesbaden lab. Live sensor telemetry active.',
        userId: 'USR-DRIVER-01',
        userName: 'Hans Schmidt',
        userRole: 'DRIVER',
        deviceId: 'MOB-MEDIGO-104',
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 80 * 60000).toISOString()
      }
    ]
  },
  {
    id: 'ORD-DE-8823',
    trackingNumber: 'DE-UN3373-2026-8823',
    status: 'DELIVERED',
    transportType: 'FROZEN_MINUS_20C',
    pickupClinicName: 'Klinikum Kassel GmbH (Hessen Nord)',
    pickupAddress: 'Mönchebergstraße 41, 34125 Kassel, Hessen',
    pickupDepartment: 'Zentralinstitut für Laboratoriumsmedizin',
    pickupContactPhone: '+49 561 9800',
    deliveryLabName: 'Biosammlungszentrum Hessen - Frankfurt Hub',
    deliveryAddress: 'Paul-Ehrlich-Straße 51, 60596 Frankfurt am Main',
    deliveryDepartment: 'Kryo-Labor - Eingang B',
    deliveryContactPhone: '+49 69 7000 88',
    scheduledPickupFrom: new Date(Date.now() - 240 * 60000).toISOString(),
    scheduledPickupTo: new Date(Date.now() - 180 * 60000).toISOString(),
    scheduledDeliveryBy: new Date(Date.now() - 60 * 60000).toISOString(),
    sampleCategory: 'UN 3373 Cryo-Preserved Viral RNA Swabs',
    specimenBoxCount: 3,
    barcodeList: ['SPEC-KS-101-A', 'SPEC-KS-101-B', 'SPEC-KS-101-C'],
    specialNotes: 'Dry Ice Transport via MediGo Express A5 Kassel-Frankfurt corridor.',
    p650Verified: true,
    driverId: 'USR-DRIVER-01',
    driverName: 'Hans Schmidt (MediGo Kurier 104)',
    createdById: 'USR-DISPATCHER-01',
    createdByOrg: 'MediGo Zentrale Hessen',
    vehicleRegNumber: 'F-MG 7741 (MediGo Hessen Thermo Van)',
    createdAt: new Date(Date.now() - 300 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 60000).toISOString(),
    chainOfCustodyLogs: [
      {
        id: 'COC-8823-PICKUP',
        orderId: 'ORD-DE-8823',
        eventType: 'PICKUP_SIGNATURE',
        staffName: 'Dr. Michael Wagner',
        staffTitle: 'Klinikum Kassel Labor',
        signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        pinCodeVerified: true,
        scannedBarcodes: ['SPEC-KS-101-A', 'SPEC-KS-101-B', 'SPEC-KS-101-C'],
        timestamp: new Date(Date.now() - 190 * 60000).toISOString(),
        gpsLatitude: 51.3201,
        gpsLongitude: 9.5011,
        gpsAccuracyMeters: 3.5,
        deviceId: 'MOB-MEDIGO-104'
      },
      {
        id: 'COC-8823-DELIVERY',
        orderId: 'ORD-DE-8823',
        eventType: 'DELIVERY_SIGNATURE',
        staffName: 'Sabine Neumann',
        staffTitle: 'Laborleitung Kryo Frankfurt',
        signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        pinCodeVerified: true,
        scannedBarcodes: ['SPEC-KS-101-A', 'SPEC-KS-101-B', 'SPEC-KS-101-C'],
        timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
        gpsLatitude: 50.0980,
        gpsLongitude: 8.6720,
        gpsAccuracyMeters: 2.8,
        deviceId: 'MOB-MEDIGO-104'
      }
    ],
    telemetryLogs: [
      {
        id: 'TEL-8823-01',
        orderId: 'ORD-DE-8823',
        sensorId: 'SENS-CRYO-02',
        tempCelsius: -22.4,
        ambientTempCelsius: 21.0,
        humidityPercent: 40,
        batteryLevelPercent: 92,
        isBreach: false,
        timestamp: new Date(Date.now() - 150 * 60000).toISOString(),
        gpsLatitude: 50.0950,
        gpsLongitude: 8.6680
      }
    ],
    auditLogs: [
      {
        id: 'AUD-301',
        orderId: 'ORD-DE-8823',
        previousState: 'IN_TRANSIT',
        newState: 'DELIVERED',
        actionDescription: 'Handover complete at Biosammlungszentrum Frankfurt. Lab signature verified by Sabine Neumann.',
        userId: 'USR-DRIVER-01',
        userName: 'Hans Schmidt',
        userRole: 'DRIVER',
        deviceId: 'MOB-MEDIGO-104',
        gpsLatitude: 50.0980,
        gpsLongitude: 8.6720,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 50 * 60000).toISOString()
      }
    ]
  }
];

// Operational & System State Stores
import { BaseTariffSettings, OperationalMode, VacationWindow, SubcontractorEmergencyLog } from '../types';
import { DEFAULT_TARIFF_SETTINGS, calculateDynamicOrderTariff } from './billingEngine';

let currentTariffSettings: BaseTariffSettings = { ...DEFAULT_TARIFF_SETTINGS };
let currentOperationalMode: OperationalMode = 'SOLO';

let vacationWindows: VacationWindow[] = [
  {
    id: 'VAC-2026-01',
    title: 'Ostermarkt Kurzpause (1-Woche)',
    startDate: '2026-04-03',
    endDate: '2026-04-10',
    activeCoverPartnerName: 'Express Courier Hessen GmbH',
    activeCoverPartnerPhone: '+49 69 9882200',
    allowEmergencyDelegation: true,
    notes: 'Geplante 1-Woche Frühlingspause. Eilaufträge werden automatisch an Partner Express Courier Hessen weitergeleitet.'
  },
  {
    title: 'Sommerurlaub Hauptfenster (2-Wochen)',
    id: 'VAC-2026-02',
    startDate: '2026-08-10',
    endDate: '2026-08-24',
    activeCoverPartnerName: 'MedLog Partner Süd-Hessen',
    activeCoverPartnerPhone: '+49 611 771122',
    allowEmergencyDelegation: true,
    notes: '2-Wochen Sommerbetriebsruhe. Vertretungspartner übernimmt UN 3373 Notfalltransporte.'
  }
];

let subcontractorEmergencyLogs: SubcontractorEmergencyLog[] = [];

export function getTariffSettings(): BaseTariffSettings {
  return currentTariffSettings;
}

export function updateTariffSettings(newSettings: Partial<BaseTariffSettings>): BaseTariffSettings {
  currentTariffSettings = { ...currentTariffSettings, ...newSettings };
  return currentTariffSettings;
}

export function getOperationalMode(): OperationalMode {
  return currentOperationalMode;
}

export function setOperationalMode(mode: OperationalMode): OperationalMode {
  currentOperationalMode = mode;
  return currentOperationalMode;
}

export function getVacationWindows(): VacationWindow[] {
  return vacationWindows;
}

export function addVacationWindow(win: Omit<VacationWindow, 'id'>): VacationWindow {
  const newWin: VacationWindow = {
    ...win,
    id: `VAC-${Date.now().toString().slice(-6)}`
  };
  vacationWindows.push(newWin);
  return newWin;
}

export function deleteVacationWindow(id: string): void {
  vacationWindows = vacationWindows.filter(v => v.id !== id);
}

export function isCurrentlyInVacationWindow(checkDateStr?: string): { inVacation: boolean; activeWindow?: VacationWindow } {
  const checkTime = checkDateStr ? new Date(checkDateStr).getTime() : Date.now();
  
  for (const win of vacationWindows) {
    const start = new Date(win.startDate).getTime();
    const end = new Date(win.endDate).getTime() + (86400000 - 1); // include full end day
    if (checkTime >= start && checkTime <= end) {
      return { inVacation: true, activeWindow: win };
    }
  }
  return { inVacation: false };
}

export function getSubcontractorLogs(): SubcontractorEmergencyLog[] {
  return subcontractorEmergencyLogs;
}

export function logSubcontractorEmergency(log: Omit<SubcontractorEmergencyLog, 'id' | 'createdAt'>): SubcontractorEmergencyLog {
  const entry: SubcontractorEmergencyLog = {
    ...log,
    id: `SUB-EMG-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString()
  };
  subcontractorEmergencyLogs.unshift(entry);
  return entry;
}

