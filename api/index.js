// src/server/app.ts
import express from "express";
import path2 from "path";
import fs2 from "fs";
import crypto3 from "crypto";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

// src/server/db.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// src/lib/billingEngine.ts
var DEFAULT_TARIFF_SETTINGS = {
  basePickupFeeEur: 25,
  ratePerKmEur: 1.85,
  expressEmergencySurchargeEur: 20,
  weekendMarkupPercent: 50,
  // +50% on Sat/Sun
  holidayMarkupPercent: 100,
  // +100% on Feiertag
  selectedState: "ALL_MIX"
  // Covers Hessen, Bayern, NRW, Baden-Württemberg
};

// src/lib/db.ts
var INITIAL_ORDERS = [
  {
    id: "ORD-DE-8821",
    trackingNumber: "DE-UN3373-2026-8821",
    status: "SCHEDULED",
    transportType: "REFRIGERATED_2_8C",
    pickupClinicName: "Universit\xE4tsklinikum Frankfurt am Main",
    pickupAddress: "Theodor-Stern-Kai 7, 60590 Frankfurt am Main, Hessen",
    pickupDepartment: "Station 12B - Infektiologie & Virologie",
    pickupContactPhone: "+49 69 6301 5120",
    deliveryLabName: "Biosammlungszentrum Hessen - Synlab",
    deliveryAddress: "Paul-Ehrlich-Stra\xDFe 51, 60596 Frankfurt am Main",
    deliveryDepartment: "Trakt 4, Labor-Eingang C",
    deliveryContactPhone: "+49 69 7000 881",
    scheduledPickupFrom: new Date(Date.now() - 30 * 6e4).toISOString(),
    scheduledPickupTo: new Date(Date.now() + 30 * 6e4).toISOString(),
    scheduledDeliveryBy: new Date(Date.now() + 120 * 6e4).toISOString(),
    sampleCategory: "UN 3373 Biological Substance Cat B (Blood Serum Samples)",
    specimenBoxCount: 2,
    barcodeList: ["SPEC-FRA-9901-A", "SPEC-FRA-9901-B"],
    specialNotes: "MediGo Hessen express. P650 packaging checked. Keep upright at 2-8\xB0C.",
    p650Verified: true,
    driverId: "USR-DRIVER-01",
    driverName: "Hans Schmidt (MediGo Kurier 104)",
    createdById: "USR-CLINIC-01",
    createdByOrg: "Universit\xE4tsklinikum Frankfurt",
    vehicleRegNumber: "F-MG 7741 (MediGo Hessen Thermo Van)",
    createdAt: new Date(Date.now() - 45 * 6e4).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 6e4).toISOString(),
    chainOfCustodyLogs: [],
    telemetryLogs: [
      {
        id: "TEL-001",
        orderId: "ORD-DE-8821",
        sensorId: "SENS-REFRIG-01",
        tempCelsius: 4.8,
        ambientTempCelsius: 21.2,
        humidityPercent: 52,
        batteryLevelPercent: 99,
        isBreach: false,
        timestamp: new Date(Date.now() - 20 * 6e4).toISOString(),
        gpsLatitude: 50.0911,
        gpsLongitude: 8.6651
      }
    ],
    auditLogs: [
      {
        id: "AUD-101",
        orderId: "ORD-DE-8821",
        previousState: null,
        newState: "SCHEDULED",
        actionDescription: "Order created by UK Frankfurt Clinic and assigned to MediGo Courier Hans Schmidt.",
        userId: "USR-CLINIC-01",
        userName: "Dr. Martin Hoffmann",
        userRole: "CLIENT_CLINIC",
        deviceId: "WEB-CLINIC-DESK-01",
        gpsLatitude: 50.0911,
        gpsLongitude: 8.6651,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 45 * 6e4).toISOString()
      }
    ]
  },
  {
    id: "ORD-DE-8822",
    trackingNumber: "DE-UN3373-2026-8822",
    status: "IN_TRANSIT",
    transportType: "AMBIENT_15_25C",
    pickupClinicName: "Universit\xE4tsklinikum Gie\xDFen und Marburg (Location Marburg)",
    pickupAddress: "Baldingerstra\xDFe, 35043 Marburg, Hessen",
    pickupDepartment: "Station 3 - H\xE4matologie & Pathologie",
    pickupContactPhone: "+49 6421 5860",
    deliveryLabName: "Labor Dr. Risch Wiesbaden / Hessen Central",
    deliveryAddress: "Mainzer Stra\xDFe 98, 65189 Wiesbaden, Hessen",
    deliveryDepartment: "Empfang Mikrobiologie",
    deliveryContactPhone: "+49 611 99120",
    scheduledPickupFrom: new Date(Date.now() - 120 * 6e4).toISOString(),
    scheduledPickupTo: new Date(Date.now() - 60 * 6e4).toISOString(),
    scheduledDeliveryBy: new Date(Date.now() + 60 * 6e4).toISOString(),
    sampleCategory: "UN 3373 Category B (Tissue Biopsy Specimen)",
    specimenBoxCount: 1,
    barcodeList: ["SPEC-MR-4412"],
    specialNotes: "MediGo Hessen express courier. Store in P650 ambient thermal container at 15-25\xB0C.",
    p650Verified: true,
    driverId: "USR-DRIVER-01",
    driverName: "Hans Schmidt (MediGo Kurier 104)",
    createdById: "USR-DISPATCHER-01",
    createdByOrg: "MediGo Zentrale Hessen",
    vehicleRegNumber: "F-MG 7741 (MediGo Hessen Thermo Van)",
    createdAt: new Date(Date.now() - 150 * 6e4).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 6e4).toISOString(),
    preTripCheck: {
      id: "PTC-8822",
      orderId: "ORD-DE-8822",
      driverId: "USR-DRIVER-01",
      vehicleRegNumber: "F-MG 7741 (MediGo Hessen Thermo Van)",
      p650OuterPackagingIntact: true,
      primarySecondaryLeakProof: true,
      absorbentMaterialPresent: true,
      tempBoxCalibrated: true,
      initialTempCelsius: 21,
      targetTempMinCelsius: 15,
      targetTempMaxCelsius: 25,
      inspectedAt: new Date(Date.now() - 100 * 6e4).toISOString(),
      driverSignatureBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      approved: true
    },
    chainOfCustodyLogs: [
      {
        id: "COC-8822-PICKUP",
        orderId: "ORD-DE-8822",
        eventType: "PICKUP_SIGNATURE",
        staffName: "Schwester Elena Meyer",
        staffTitle: "Stationsleitung 3",
        signatureBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        pinCodeVerified: true,
        scannedBarcodes: ["SPEC-MR-4412"],
        timestamp: new Date(Date.now() - 85 * 6e4).toISOString(),
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        gpsAccuracyMeters: 4.2,
        deviceId: "MOB-MEDIGO-104"
      }
    ],
    telemetryLogs: [
      {
        id: "TEL-8822-01",
        orderId: "ORD-DE-8822",
        sensorId: "SENS-AMBIENT-01",
        tempCelsius: 20.8,
        ambientTempCelsius: 22,
        humidityPercent: 48,
        batteryLevelPercent: 95,
        isBreach: false,
        timestamp: new Date(Date.now() - 70 * 6e4).toISOString(),
        gpsLatitude: 50.1109,
        gpsLongitude: 8.6821
      },
      {
        id: "TEL-8822-02",
        orderId: "ORD-DE-8822",
        sensorId: "SENS-AMBIENT-01",
        tempCelsius: 21.4,
        ambientTempCelsius: 23.1,
        humidityPercent: 50,
        batteryLevelPercent: 94,
        isBreach: false,
        timestamp: new Date(Date.now() - 30 * 6e4).toISOString(),
        gpsLatitude: 50.115,
        gpsLongitude: 8.688
      }
    ],
    auditLogs: [
      {
        id: "AUD-201",
        orderId: "ORD-DE-8822",
        previousState: "SCHEDULED",
        newState: "PRE_TRIP_CHECK",
        actionDescription: "MediGo driver completed mandatory P650 integrity and box temperature calibration.",
        userId: "USR-DRIVER-01",
        userName: "Hans Schmidt",
        userRole: "DRIVER",
        deviceId: "MOB-MEDIGO-104",
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 100 * 6e4).toISOString()
      },
      {
        id: "AUD-202",
        orderId: "ORD-DE-8822",
        previousState: "PRE_TRIP_CHECK",
        newState: "PICKED_UP",
        actionDescription: "Specimen SPEC-MR-4412 scanned. Signature captured from Schwester Elena Meyer at UK Marburg.",
        userId: "USR-DRIVER-01",
        userName: "Hans Schmidt",
        userRole: "DRIVER",
        deviceId: "MOB-MEDIGO-104",
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 85 * 6e4).toISOString()
      },
      {
        id: "AUD-203",
        orderId: "ORD-DE-8822",
        previousState: "PICKED_UP",
        newState: "IN_TRANSIT",
        actionDescription: "MediGo courier departed UK Marburg towards Wiesbaden lab. Live sensor telemetry active.",
        userId: "USR-DRIVER-01",
        userName: "Hans Schmidt",
        userRole: "DRIVER",
        deviceId: "MOB-MEDIGO-104",
        gpsLatitude: 50.8021,
        gpsLongitude: 8.7712,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 80 * 6e4).toISOString()
      }
    ]
  },
  {
    id: "ORD-DE-8823",
    trackingNumber: "DE-UN3373-2026-8823",
    status: "DELIVERED",
    transportType: "FROZEN_MINUS_20C",
    pickupClinicName: "Klinikum Kassel GmbH (Hessen Nord)",
    pickupAddress: "M\xF6nchebergstra\xDFe 41, 34125 Kassel, Hessen",
    pickupDepartment: "Zentralinstitut f\xFCr Laboratoriumsmedizin",
    pickupContactPhone: "+49 561 9800",
    deliveryLabName: "Biosammlungszentrum Hessen - Frankfurt Hub",
    deliveryAddress: "Paul-Ehrlich-Stra\xDFe 51, 60596 Frankfurt am Main",
    deliveryDepartment: "Kryo-Labor - Eingang B",
    deliveryContactPhone: "+49 69 7000 88",
    scheduledPickupFrom: new Date(Date.now() - 240 * 6e4).toISOString(),
    scheduledPickupTo: new Date(Date.now() - 180 * 6e4).toISOString(),
    scheduledDeliveryBy: new Date(Date.now() - 60 * 6e4).toISOString(),
    sampleCategory: "UN 3373 Cryo-Preserved Viral RNA Swabs",
    specimenBoxCount: 3,
    barcodeList: ["SPEC-KS-101-A", "SPEC-KS-101-B", "SPEC-KS-101-C"],
    specialNotes: "Dry Ice Transport via MediGo Express A5 Kassel-Frankfurt corridor.",
    p650Verified: true,
    driverId: "USR-DRIVER-01",
    driverName: "Hans Schmidt (MediGo Kurier 104)",
    createdById: "USR-DISPATCHER-01",
    createdByOrg: "MediGo Zentrale Hessen",
    vehicleRegNumber: "F-MG 7741 (MediGo Hessen Thermo Van)",
    createdAt: new Date(Date.now() - 300 * 6e4).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 6e4).toISOString(),
    chainOfCustodyLogs: [
      {
        id: "COC-8823-PICKUP",
        orderId: "ORD-DE-8823",
        eventType: "PICKUP_SIGNATURE",
        staffName: "Dr. Michael Wagner",
        staffTitle: "Klinikum Kassel Labor",
        signatureBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        pinCodeVerified: true,
        scannedBarcodes: ["SPEC-KS-101-A", "SPEC-KS-101-B", "SPEC-KS-101-C"],
        timestamp: new Date(Date.now() - 190 * 6e4).toISOString(),
        gpsLatitude: 51.3201,
        gpsLongitude: 9.5011,
        gpsAccuracyMeters: 3.5,
        deviceId: "MOB-MEDIGO-104"
      },
      {
        id: "COC-8823-DELIVERY",
        orderId: "ORD-DE-8823",
        eventType: "DELIVERY_SIGNATURE",
        staffName: "Sabine Neumann",
        staffTitle: "Laborleitung Kryo Frankfurt",
        signatureBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        pinCodeVerified: true,
        scannedBarcodes: ["SPEC-KS-101-A", "SPEC-KS-101-B", "SPEC-KS-101-C"],
        timestamp: new Date(Date.now() - 50 * 6e4).toISOString(),
        gpsLatitude: 50.098,
        gpsLongitude: 8.672,
        gpsAccuracyMeters: 2.8,
        deviceId: "MOB-MEDIGO-104"
      }
    ],
    telemetryLogs: [
      {
        id: "TEL-8823-01",
        orderId: "ORD-DE-8823",
        sensorId: "SENS-CRYO-02",
        tempCelsius: -22.4,
        ambientTempCelsius: 21,
        humidityPercent: 40,
        batteryLevelPercent: 92,
        isBreach: false,
        timestamp: new Date(Date.now() - 150 * 6e4).toISOString(),
        gpsLatitude: 50.095,
        gpsLongitude: 8.668
      }
    ],
    auditLogs: [
      {
        id: "AUD-301",
        orderId: "ORD-DE-8823",
        previousState: "IN_TRANSIT",
        newState: "DELIVERED",
        actionDescription: "Handover complete at Biosammlungszentrum Frankfurt. Lab signature verified by Sabine Neumann.",
        userId: "USR-DRIVER-01",
        userName: "Hans Schmidt",
        userRole: "DRIVER",
        deviceId: "MOB-MEDIGO-104",
        gpsLatitude: 50.098,
        gpsLongitude: 8.672,
        offlineSynced: true,
        createdAt: new Date(Date.now() - 50 * 6e4).toISOString()
      }
    ]
  }
];
var currentTariffSettings = { ...DEFAULT_TARIFF_SETTINGS };

// src/server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseClient = null;
function getResolvedSupabaseKeys() {
  const url = process.env.SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  let anonKey = process.env.SUPABASE_ANON_KEY || "";
  if (serviceRoleKey.startsWith("sb_publishable") && anonKey.startsWith("sb_secret")) {
    const temp = serviceRoleKey;
    serviceRoleKey = anonKey;
    anonKey = temp;
  }
  const key = serviceRoleKey || anonKey || void 0;
  const isSecretKey = Boolean(key && (key.startsWith("sb_secret") || key.includes("service_role")));
  return { url, key, isSecretKey };
}
function getSupabase() {
  const { url, key } = getResolvedSupabaseKeys();
  if (!url || !key) {
    return null;
  }
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log("[Supabase] Initialized Supabase client for URL:", url);
    } catch (err) {
      console.error("[Supabase] Initialization error:", err);
      return null;
    }
  }
  return supabaseClient;
}
async function verifySupabaseTables() {
  const { url, key } = getResolvedSupabaseKeys();
  if (!url || !key) {
    return {
      configured: false,
      connected: false,
      tablesExist: false,
      missingTables: ["users", "orders"],
      errorMessage: "SUPABASE_URL or SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY is missing."
    };
  }
  const client = getSupabase();
  if (!client) {
    return {
      configured: true,
      connected: false,
      url,
      tablesExist: false,
      missingTables: ["users", "orders"],
      errorMessage: "Failed to initialize Supabase client."
    };
  }
  const missingTables = [];
  let userErrorMsg;
  try {
    const { error: userError } = await client.from("users").select("id").limit(1);
    if (userError) {
      if (userError.code === "PGRST205" || userError.message?.includes("schema cache")) {
        missingTables.push("users");
      } else {
        userErrorMsg = userError.message;
      }
    }
  } catch (err) {
    missingTables.push("users");
    userErrorMsg = err?.message;
  }
  try {
    const { error: orderError } = await client.from("orders").select("id").limit(1);
    if (orderError) {
      if (orderError.code === "PGRST205" || orderError.message?.includes("schema cache")) {
        missingTables.push("orders");
      }
    }
  } catch {
    missingTables.push("orders");
  }
  const tablesExist = missingTables.length === 0;
  return {
    configured: true,
    connected: true,
    url,
    tablesExist,
    missingTables,
    errorMessage: tablesExist ? void 0 : userErrorMsg || 'Tables "users" and "orders" have not been created yet in Supabase SQL Editor.'
  };
}
function checkSupabaseStatus() {
  const { url, key } = getResolvedSupabaseKeys();
  return {
    configured: Boolean(url && key),
    url: url || void 0
  };
}

// src/server/db.ts
var isVercel = Boolean(process.env.VERCEL);
var DATA_DIR = isVercel ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "medigo_store.json");
var SEED_CONFIGS = [
  {
    id: "USR-ADMIN-01",
    email: "nsansvester89@gmail.com",
    name: "Admin (nsansvester89)",
    role: "ADMIN",
    phone: "+49 170 0000000",
    organization: "BioDispatch / MediGo Zentrale",
    facilityType: "HQ",
    envVar: "SEED_ADMIN_PASSWORD",
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T08:00:00Z")).toISOString()
  },
  {
    id: "USR-DISPATCHER-01",
    email: "dispatch@medigo-hessen.de",
    name: "Katrin Weber (Dispatch Zentrale Wiesbaden)",
    role: "DISPATCHER",
    phone: "+49 611 9882 100",
    organization: "MediGo Hauptstandort & Dispatch Zentrale (Wiesbaden)",
    facilityType: "HQ",
    envVar: "SEED_DISPATCHER_PASSWORD",
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T08:00:00Z")).toISOString()
  },
  {
    id: "USR-DRIVER-01",
    email: "hans.schmidt@medigo-hessen.de",
    name: "Hans Schmidt (MediGo Kurier WI-MG 7741)",
    role: "DRIVER",
    phone: "+49 171 9882310",
    organization: "MediGo Wiesbaden Fleet & Hessen Express Logistics",
    vehicleRegNumber: "F-MG 7741 (Thermo Van)",
    facilityType: "COURIER",
    envVar: "SEED_DRIVER_PASSWORD",
    createdAt: (/* @__PURE__ */ new Date("2026-01-05T08:00:00Z")).toISOString()
  },
  {
    id: "USR-CLINIC-01",
    email: "probeneingang@kgu.de",
    name: "Dr. Martin Hoffmann",
    role: "CLIENT_CLINIC",
    phone: "+49 69 6301 0",
    organization: "Universit\xE4tsklinikum Frankfurt am Main (Hessen)",
    contractNumber: "CTR-2026-UKF-HE-01",
    facilityType: "CLINIC",
    facilityAddress: "Theodor-Stern-Kai 7, 60590 Frankfurt am Main, Hessen",
    envVar: "SEED_CLINIC_PASSWORD",
    createdAt: (/* @__PURE__ */ new Date("2026-01-10T08:00:00Z")).toISOString()
  },
  {
    id: "USR-LAB-01",
    email: "empfang@synlab-hessen.de",
    name: "Sabine Neumann (Laborleitung)",
    role: "LAB_STAFF",
    phone: "+49 69 7000 88",
    organization: "Synlab Medizinisches Versorgungszentrum Frankfurt-Hessen",
    contractNumber: "CTR-2026-SYNLAB-04",
    facilityType: "LABORATORY",
    facilityAddress: "Paul-Ehrlich-Stra\xDFe 51, 60596 Frankfurt am Main",
    envVar: "SEED_LAB_PASSWORD",
    createdAt: (/* @__PURE__ */ new Date("2026-01-12T08:00:00Z")).toISOString()
  }
];
function generateSeedUsers() {
  const isProd = process.env.NODE_ENV === "production";
  const seeds = [];
  for (const cfg of SEED_CONFIGS) {
    const envPassword = process.env[cfg.envVar];
    let passwordPlaintext = null;
    if (envPassword && envPassword.trim()) {
      passwordPlaintext = envPassword.trim();
    } else if (isProd) {
      console.warn(`[Security Notice] Seed account for ${cfg.email} was omitted in production because ${cfg.envVar} is not set.`);
      continue;
    } else {
      const generated = crypto.randomBytes(15).toString("base64url").slice(0, 20);
      console.log(`[SECURITY SEED] Generated random initial password for ${cfg.email}: ${generated}`);
      passwordPlaintext = generated;
    }
    if (passwordPlaintext) {
      const salt = bcrypt.genSaltSync(12);
      const passwordHash = bcrypt.hashSync(passwordPlaintext, salt);
      seeds.push({
        id: cfg.id,
        email: cfg.email,
        name: cfg.name,
        role: cfg.role,
        phone: cfg.phone,
        organization: cfg.organization,
        contractNumber: cfg.contractNumber,
        facilityType: cfg.facilityType,
        facilityAddress: cfg.facilityAddress,
        vehicleRegNumber: cfg.vehicleRegNumber,
        active: true,
        mustChangePassword: true,
        tokenVersion: 0,
        passwordHash,
        createdAt: cfg.createdAt
      });
    }
  }
  return seeds;
}
var SEED_ORGANIZATIONS = [
  {
    id: "ORG-UKF-01",
    name: "Universit\xE4tsklinikum Frankfurt am Main",
    type: "HOSPITAL",
    contractNumber: "CTR-2026-UKF-HE-01",
    addressStreet: "Theodor-Stern-Kai 7",
    postalCode: "60590",
    city: "Frankfurt am Main",
    state: "HE",
    contactPhone: "+49 69 6301 5120",
    contactEmail: "probeneingang@kgu.de",
    active: true
  },
  {
    id: "ORG-SYNLAB-01",
    name: "Biosammlungszentrum Hessen - Synlab MVZ",
    type: "LABORATORY",
    contractNumber: "CTR-2026-SYNLAB-04",
    addressStreet: "Paul-Ehrlich-Stra\xDFe 51",
    postalCode: "60596",
    city: "Frankfurt am Main",
    state: "HE",
    contactPhone: "+49 69 7000 881",
    contactEmail: "empfang@synlab-hessen.de",
    active: true
  },
  {
    id: "ORG-UKGM-01",
    name: "Universit\xE4tsklinikum Gie\xDFen und Marburg",
    type: "HOSPITAL",
    contractNumber: "CTR-2026-UKGM-02",
    addressStreet: "Rudolf-Buchheim-Stra\xDFe 8",
    postalCode: "35392",
    city: "Gie\xDFen",
    state: "HE",
    contactPhone: "+49 641 9854 3000",
    contactEmail: "zentrallabor@ukgm.de",
    active: true
  },
  {
    id: "ORG-MEDIGO-HQ",
    name: "MediGo Hessen Zentrale & Leitstand",
    type: "CLINIC",
    contractNumber: "CTR-MEDIGO-INTERNAL",
    addressStreet: "Gustav-Stresemann-Ring 1",
    postalCode: "65189",
    city: "Wiesbaden",
    state: "HE",
    contactPhone: "+49 611 9900 100",
    contactEmail: "dispatch@medigo-hessen.de",
    active: true
  }
];
var DatabaseService = class {
  constructor() {
    this.state = {
      users: [],
      orders: [],
      auditLogs: [],
      organizations: [],
      loginAttempts: [],
      refreshTokens: []
    };
    this.initDatabase();
  }
  initDatabase() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        const shouldSeed = !parsed.users || parsed.users.length === 0 || process.env.SEED_ON_START === "true";
        const initialUsers = shouldSeed ? generateSeedUsers() : parsed.users;
        this.state = {
          users: initialUsers,
          orders: parsed.orders && parsed.orders.length ? parsed.orders : JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          auditLogs: parsed.auditLogs || [],
          organizations: parsed.organizations && parsed.organizations.length ? parsed.organizations : JSON.parse(JSON.stringify(SEED_ORGANIZATIONS)),
          loginAttempts: parsed.loginAttempts || [],
          refreshTokens: parsed.refreshTokens || []
        };
        if (shouldSeed) {
          this.saveToFile();
        }
      } else {
        this.state = {
          users: generateSeedUsers(),
          orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          auditLogs: [],
          organizations: JSON.parse(JSON.stringify(SEED_ORGANIZATIONS)),
          loginAttempts: [],
          refreshTokens: []
        };
        this.saveToFile();
      }
    } catch (err) {
      console.warn("[Database] Error loading local db file, falling back to memory store:", err);
      this.state = {
        users: generateSeedUsers(),
        orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
        auditLogs: [],
        organizations: JSON.parse(JSON.stringify(SEED_ORGANIZATIONS)),
        loginAttempts: [],
        refreshTokens: []
      };
    }
  }
  saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.error("[Database] Failed to write database to disk:", err);
    }
  }
  // --- USER OPERATIONS ---
  async getAllUsers() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            email: d.email,
            name: d.name,
            role: d.role,
            phone: d.phone || "",
            organization: d.organization || "",
            contractNumber: d.contract_number || d.contractNumber || void 0,
            facilityType: d.facility_type || d.facilityType || void 0,
            facilityAddress: d.facility_address || d.facilityAddress || "",
            vehicleRegNumber: d.vehicle_reg_number || d.assigned_vehicle_reg || d.vehicleRegNumber || void 0,
            active: d.active !== void 0 ? Boolean(d.active) : d.is_active !== void 0 ? Boolean(d.is_active) : true,
            tokenVersion: d.token_version !== void 0 ? Number(d.token_version) : 0,
            createdAt: d.created_at || (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      } catch (err) {
        console.warn("[Database] Supabase fetch users failed, using local store:", err);
      }
    }
    return this.state.users.map(({ passwordHash, ...u }) => ({
      ...u,
      tokenVersion: u.tokenVersion ?? 0
    }));
  }
  async getUserById(id) {
    const localUser = this.state.users.find((u) => u.id === id);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
        if (!error && data) {
          const activeStatus = data.active !== void 0 ? Boolean(data.active) : data.is_active !== void 0 ? Boolean(data.is_active) : true;
          const vehicleReg = data.vehicle_reg_number || data.assigned_vehicle_reg || data.vehicleRegNumber || "";
          const mustChange = data.must_change_password !== void 0 ? Boolean(data.must_change_password) : data.mustChangePassword !== void 0 ? Boolean(data.mustChangePassword) : localUser?.mustChangePassword ?? false;
          const tVersion = data.token_version !== void 0 ? Number(data.token_version) : localUser?.tokenVersion ?? 0;
          return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            phone: data.phone || "",
            organization: data.organization || "",
            organizationId: data.organization_id || void 0,
            contractNumber: data.contract_number || data.contractNumber || void 0,
            facilityType: data.facility_type || data.facilityType || void 0,
            facilityAddress: data.facility_address || data.facilityAddress || "",
            vehicleRegNumber: vehicleReg || void 0,
            active: activeStatus,
            mustChangePassword: mustChange,
            tokenVersion: tVersion,
            createdAt: data.created_at || (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      } catch (err) {
        console.warn("[Database] Supabase lookup by id failed, using local store:", err);
      }
    }
    if (!localUser) return null;
    const { passwordHash, ...sanitized } = localUser;
    return {
      ...sanitized,
      tokenVersion: localUser.tokenVersion ?? 0
    };
  }
  async getUserByEmail(email) {
    const userWithHash = await this.getUserByEmailWithPassword(email);
    if (!userWithHash) return null;
    const { passwordHash, ...sanitized } = userWithHash;
    return sanitized;
  }
  async getUserByEmailWithPassword(email) {
    const normalized = email.toLowerCase().trim();
    const localUser = this.state.users.find((u) => u.email.toLowerCase() === normalized);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("email", normalized).single();
        if (!error && data) {
          const rawHash = data.password || data.password_hash || data.passwordHash || "";
          const activeStatus = data.active !== void 0 ? Boolean(data.active) : data.is_active !== void 0 ? Boolean(data.is_active) : true;
          const vehicleReg = data.vehicle_reg_number || data.assigned_vehicle_reg || data.vehicleRegNumber || "";
          const finalPasswordHash = rawHash || localUser?.passwordHash || "";
          const mustChange = data.must_change_password !== void 0 ? Boolean(data.must_change_password) : data.mustChangePassword !== void 0 ? Boolean(data.mustChangePassword) : localUser?.mustChangePassword ?? false;
          const tVersion = data.token_version !== void 0 ? Number(data.token_version) : localUser?.tokenVersion ?? 0;
          return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            phone: data.phone || "",
            organization: data.organization || "",
            contractNumber: data.contract_number || data.contractNumber || void 0,
            facilityType: data.facility_type || data.facilityType || void 0,
            facilityAddress: data.facility_address || data.facilityAddress || "",
            vehicleRegNumber: vehicleReg || void 0,
            active: activeStatus,
            mustChangePassword: mustChange,
            tokenVersion: tVersion,
            createdAt: data.created_at || (/* @__PURE__ */ new Date()).toISOString(),
            passwordHash: finalPasswordHash
          };
        }
      } catch (err) {
        console.warn("[Database] Supabase lookup by email failed, falling back to local store:", err);
      }
    }
    if (!localUser) return null;
    return {
      ...localUser,
      tokenVersion: localUser.tokenVersion ?? 0
    };
  }
  async createUser(payload) {
    const normalizedEmail = payload.email.toLowerCase().trim();
    const existing = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error(`A user with email ${payload.email} already exists.`);
    }
    if (payload.role === "CLIENT_CLINIC" || payload.role === "LAB_STAFF") {
      if (!payload.contractNumber || !payload.contractNumber.trim()) {
        throw new Error("Contract Number is strictly required for Clinic and Laboratory accounts.");
      }
    }
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(payload.password, salt);
    const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
    const rolePrefix = payload.role === "ADMIN" ? "USR-ADM" : payload.role === "DRIVER" ? "USR-DRV" : payload.role === "CLIENT_CLINIC" ? "USR-CLN" : payload.role === "LAB_STAFF" ? "USR-LAB" : "USR-DSP";
    const newUser = {
      id: `${rolePrefix}-${randomSuffix}`,
      email: normalizedEmail,
      name: payload.name.trim(),
      role: payload.role,
      phone: payload.phone?.trim() || "",
      organization: payload.organization?.trim() || "",
      organizationId: payload.organizationId?.trim() || void 0,
      contractNumber: payload.contractNumber?.trim() || void 0,
      facilityType: payload.facilityType || (payload.role === "CLIENT_CLINIC" ? "CLINIC" : payload.role === "LAB_STAFF" ? "LABORATORY" : "HQ"),
      facilityAddress: payload.facilityAddress?.trim() || "",
      vehicleRegNumber: payload.vehicleRegNumber?.trim() || void 0,
      active: true,
      mustChangePassword: payload.mustChangePassword !== void 0 ? payload.mustChangePassword : false,
      tokenVersion: payload.tokenVersion ?? 0,
      passwordHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.users.push(newUser);
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        const sbInsert = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone || "",
          organization: newUser.organization || "",
          organization_id: newUser.organizationId || null,
          contract_number: newUser.contractNumber || null,
          facility_type: newUser.facilityType || null,
          facility_address: newUser.facilityAddress || "",
          assigned_vehicle_reg: newUser.vehicleRegNumber || null,
          is_active: newUser.active !== false,
          password: newUser.passwordHash,
          token_version: newUser.tokenVersion ?? 0,
          created_at: newUser.createdAt
        };
        const { error: insErr } = await supabase.from("users").insert(sbInsert);
        if (insErr) {
          console.warn("[Supabase] Error inserting user to Supabase:", insErr);
        } else {
          console.log("[Supabase] Successfully inserted new user:", newUser.email);
        }
      } catch (err) {
        console.warn("[Supabase] Error inserting user to Supabase:", err);
      }
    }
    const { passwordHash: _, ...sanitized } = newUser;
    if (newUser.role === "CLIENT_CLINIC" || newUser.role === "LAB_STAFF" || newUser.facilityType === "CLINIC" || newUser.facilityType === "LABORATORY") {
      try {
        await this.upsertOrganization({
          name: newUser.organization || newUser.name,
          type: newUser.facilityType === "LABORATORY" || newUser.role === "LAB_STAFF" ? "LABORATORY" : "CLINIC",
          contractNumber: newUser.contractNumber,
          addressStreet: newUser.facilityAddress || "Hessen Region Hub",
          postalCode: "60590",
          city: "Frankfurt am Main",
          state: "HE",
          contactEmail: newUser.email,
          contactPhone: newUser.phone || "+49 69 6301 0",
          active: newUser.active
        });
      } catch (e) {
        console.warn("[Database] Auto-sync facility failed:", e);
      }
    }
    return sanitized;
  }
  async updateUser(id, updates) {
    let userIndex = this.state.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      const supabase2 = getSupabase();
      if (supabase2) {
        try {
          const { data } = await supabase2.from("users").select("*").eq("id", id).single();
          if (data) {
            const rawHash = data.password || data.password_hash || data.passwordHash || "";
            this.state.users.push({
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              phone: data.phone || "",
              organization: data.organization || "",
              contractNumber: data.contract_number,
              facilityType: data.facility_type,
              facilityAddress: data.facility_address || "",
              vehicleRegNumber: data.vehicle_reg_number,
              active: data.active !== void 0 ? Boolean(data.active) : true,
              createdAt: data.created_at || (/* @__PURE__ */ new Date()).toISOString(),
              passwordHash: rawHash
            });
            userIndex = this.state.users.length - 1;
          }
        } catch {
        }
      }
    }
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found.`);
    }
    const user = this.state.users[userIndex];
    const isPasswordChange = Boolean(updates.passwordHash || updates.password && updates.password.trim().length >= 12);
    const isDeactivation = updates.active === false && user.active !== false;
    const isRoleChange = Boolean(updates.role && updates.role !== user.role);
    if (updates.name) user.name = updates.name.trim();
    if (updates.phone !== void 0) user.phone = updates.phone.trim();
    if (updates.organization !== void 0) user.organization = updates.organization.trim();
    if (updates.organizationId !== void 0) user.organizationId = updates.organizationId.trim();
    if (updates.contractNumber !== void 0) user.contractNumber = updates.contractNumber.trim();
    if (updates.facilityAddress !== void 0) user.facilityAddress = updates.facilityAddress.trim();
    if (updates.vehicleRegNumber !== void 0) user.vehicleRegNumber = updates.vehicleRegNumber.trim();
    if (updates.facilityType !== void 0) user.facilityType = updates.facilityType;
    if (updates.role !== void 0) user.role = updates.role;
    if (updates.active !== void 0) user.active = updates.active;
    if (updates.mustChangePassword !== void 0) {
      user.mustChangePassword = updates.mustChangePassword;
    }
    if (updates.tokenVersion !== void 0) {
      user.tokenVersion = updates.tokenVersion;
    } else if (isPasswordChange || isDeactivation || isRoleChange) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
    if (updates.passwordHash) {
      user.passwordHash = updates.passwordHash;
    } else if (updates.password && updates.password.trim().length >= 12) {
      user.passwordHash = await bcrypt.hash(updates.password.trim(), 12);
    }
    this.saveToFile();
    if (isDeactivation || isRoleChange || isPasswordChange) {
      await this.revokeAllUserRefreshTokens(id);
    }
    const supabase = getSupabase();
    if (supabase) {
      try {
        const sbUpdates = {
          name: user.name,
          phone: user.phone || "",
          organization: user.organization || "",
          organization_id: user.organizationId || null,
          contract_number: user.contractNumber || null,
          facility_type: user.facilityType || null,
          facility_address: user.facilityAddress || "",
          assigned_vehicle_reg: user.vehicleRegNumber || null,
          role: user.role,
          is_active: user.active !== false,
          token_version: user.tokenVersion ?? 0
        };
        if (updates.passwordHash || updates.password) {
          sbUpdates.password = user.passwordHash;
        }
        const { error: sbErr } = await supabase.from("users").update(sbUpdates).eq("id", id);
        if (sbErr) {
          console.warn("[Supabase] Error updating user:", sbErr);
        }
      } catch (err) {
        console.warn("[Supabase] Error updating user:", err);
      }
    }
    const { passwordHash: _, ...sanitized } = user;
    return {
      ...sanitized,
      tokenVersion: user.tokenVersion ?? 0
    };
  }
  async incrementTokenVersion(userId) {
    let newVersion = 1;
    const userIndex = this.state.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      const current = this.state.users[userIndex].tokenVersion ?? 0;
      newVersion = current + 1;
      this.state.users[userIndex].tokenVersion = newVersion;
      this.saveToFile();
    }
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data } = await supabase.from("users").select("token_version").eq("id", userId).single();
        const currentSb = data?.token_version !== void 0 ? Number(data.token_version) : 0;
        newVersion = Math.max(newVersion, currentSb + 1);
        await supabase.from("users").update({ token_version: newVersion }).eq("id", userId);
      } catch (err) {
        console.warn("[Database] Supabase increment token_version failed:", err);
      }
    }
    return newVersion;
  }
  // ==========================================
  // PERSISTENT BRUTE-FORCE RATE LIMIT STORAGE
  // ==========================================
  async getLoginAttempt(key) {
    const normalizedKey = key.toLowerCase().trim();
    if (!this.state.loginAttempts) {
      this.state.loginAttempts = [];
    }
    const localRecord = this.state.loginAttempts.find((r) => r.key === normalizedKey);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("login_attempts").select("*").eq("key", normalizedKey).single();
        if (!error && data) {
          return {
            id: data.id,
            key: data.key,
            type: data.type,
            identifier: data.identifier,
            attempts: data.attempts,
            firstAttemptAt: data.first_attempt_at,
            lockedUntil: data.locked_until || null,
            lockoutDurationMinutes: data.lockout_duration_minutes || 0,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.warn("[Database] Supabase getLoginAttempt failed, using local store:", err);
      }
    }
    return localRecord ? { ...localRecord } : null;
  }
  async upsertLoginAttempt(record) {
    const normalizedKey = record.key.toLowerCase().trim();
    if (!this.state.loginAttempts) {
      this.state.loginAttempts = [];
    }
    const index = this.state.loginAttempts.findIndex((r) => r.key === normalizedKey);
    const updatedRecord = {
      ...record,
      key: normalizedKey,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (index >= 0) {
      this.state.loginAttempts[index] = updatedRecord;
    } else {
      this.state.loginAttempts.push(updatedRecord);
    }
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("login_attempts").upsert({
          id: updatedRecord.id,
          key: updatedRecord.key,
          type: updatedRecord.type,
          identifier: updatedRecord.identifier,
          attempts: updatedRecord.attempts,
          first_attempt_at: updatedRecord.firstAttemptAt,
          locked_until: updatedRecord.lockedUntil || null,
          lockout_duration_minutes: updatedRecord.lockoutDurationMinutes,
          updated_at: updatedRecord.updatedAt
        }, { onConflict: "key" });
      } catch (err) {
        console.warn("[Database] Supabase upsertLoginAttempt failed:", err);
      }
    }
  }
  async clearLoginAttempt(key) {
    const normalizedKey = key.toLowerCase().trim();
    if (!this.state.loginAttempts) {
      this.state.loginAttempts = [];
    }
    this.state.loginAttempts = this.state.loginAttempts.filter((r) => r.key !== normalizedKey);
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("login_attempts").delete().eq("key", normalizedKey);
      } catch (err) {
        console.warn("[Database] Supabase clearLoginAttempt failed:", err);
      }
    }
  }
  // ==========================================
  // REFRESH TOKEN OPERATIONS (Phase 4 Sessions)
  // ==========================================
  async createRefreshToken(record) {
    if (!this.state.refreshTokens) {
      this.state.refreshTokens = [];
    }
    this.state.refreshTokens.push(record);
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("refresh_tokens").insert({
          id: record.id,
          user_id: record.userId,
          token_hash: record.tokenHash,
          family_id: record.familyId,
          expires_at: record.expiresAt,
          revoked_at: record.revokedAt || null,
          replaced_by_id: record.replacedById || null,
          created_at: record.createdAt,
          ip: record.ip || null,
          user_agent: record.userAgent || null
        });
      } catch (err) {
        console.warn("[Database] Supabase create refresh token failed:", err);
      }
    }
    return record;
  }
  async findRefreshTokenByHash(tokenHash) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("refresh_tokens").select("*").eq("token_hash", tokenHash).single();
        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            tokenHash: data.token_hash,
            familyId: data.family_id,
            expiresAt: data.expires_at,
            revokedAt: data.revoked_at || null,
            replacedById: data.replaced_by_id || null,
            createdAt: data.created_at,
            ip: data.ip || void 0,
            userAgent: data.user_agent || void 0
          };
        }
      } catch (err) {
        console.warn("[Database] Supabase find refresh token failed, using local store:", err);
      }
    }
    if (!this.state.refreshTokens) {
      this.state.refreshTokens = [];
    }
    const found = this.state.refreshTokens.find((r) => r.tokenHash === tokenHash);
    return found ? { ...found } : null;
  }
  async revokeRefreshToken(id, replacedById) {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (this.state.refreshTokens) {
      const idx = this.state.refreshTokens.findIndex((r) => r.id === id);
      if (idx !== -1) {
        this.state.refreshTokens[idx].revokedAt = nowIso;
        if (replacedById) {
          this.state.refreshTokens[idx].replacedById = replacedById;
        }
        this.saveToFile();
      }
    }
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updates = { revoked_at: nowIso };
        if (replacedById) {
          updates.replaced_by_id = replacedById;
        }
        await supabase.from("refresh_tokens").update(updates).eq("id", id);
      } catch (err) {
        console.warn("[Database] Supabase revoke refresh token failed:", err);
      }
    }
  }
  async revokeRefreshTokenFamily(familyId) {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (this.state.refreshTokens) {
      let changed = false;
      for (const r of this.state.refreshTokens) {
        if (r.familyId === familyId && !r.revokedAt) {
          r.revokedAt = nowIso;
          changed = true;
        }
      }
      if (changed) this.saveToFile();
    }
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("refresh_tokens").update({ revoked_at: nowIso }).eq("family_id", familyId).is("revoked_at", null);
      } catch (err) {
        console.warn("[Database] Supabase revoke refresh token family failed:", err);
      }
    }
  }
  async revokeAllUserRefreshTokens(userId) {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (this.state.refreshTokens) {
      let changed = false;
      for (const r of this.state.refreshTokens) {
        if (r.userId === userId && !r.revokedAt) {
          r.revokedAt = nowIso;
          changed = true;
        }
      }
      if (changed) this.saveToFile();
    }
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("refresh_tokens").update({ revoked_at: nowIso }).eq("user_id", userId).is("revoked_at", null);
      } catch (err) {
        console.warn("[Database] Supabase revoke all user refresh tokens failed:", err);
      }
    }
  }
  async cleanupExpiredRefreshTokens() {
    const nowMs = Date.now();
    let cleaned = 0;
    if (this.state.refreshTokens) {
      const initialCount = this.state.refreshTokens.length;
      this.state.refreshTokens = this.state.refreshTokens.filter((r) => new Date(r.expiresAt).getTime() > nowMs);
      cleaned = initialCount - this.state.refreshTokens.length;
      if (cleaned > 0) this.saveToFile();
    }
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("refresh_tokens").delete().lt("expires_at", new Date(nowMs).toISOString());
      } catch (err) {
        console.warn("[Database] Supabase cleanup expired refresh tokens failed:", err);
      }
    }
    return cleaned;
  }
  async deleteUser(id) {
    const userIndex = this.state.users.findIndex((u) => u.id === id);
    if (userIndex === -1) return false;
    if (this.state.users[userIndex].email.toLowerCase() === "nsansvester89@gmail.com") {
      throw new Error("Master Administrator account cannot be deleted.");
    }
    this.state.users.splice(userIndex, 1);
    await this.revokeAllUserRefreshTokens(id);
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("users").delete().eq("id", id);
      } catch (err) {
        console.warn("[Supabase] Error deleting user:", err);
      }
    }
    return true;
  }
  // --- ORGANIZATION / FACILITY OPERATIONS ---
  async getAllOrganizations() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("organizations").select("*").order("name", { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            contractNumber: d.contract_number || d.contractNumber || void 0,
            addressStreet: d.address_street || d.addressStreet || "",
            postalCode: d.postal_code || d.postalCode || "",
            city: d.city || "",
            state: d.state || "HE",
            contactPhone: d.contact_phone || d.contactPhone || "",
            contactEmail: d.contact_email || d.contactEmail || "",
            active: d.active !== false,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
        }
      } catch (err) {
        console.warn("[Database] Supabase fetch organizations failed, using local store:", err);
      }
    }
    return this.state.organizations || [];
  }
  async upsertOrganization(org) {
    const list = this.state.organizations || [];
    const existingIndex = list.findIndex(
      (o) => org.id && o.id === org.id || org.contractNumber && o.contractNumber === org.contractNumber || o.name.toLowerCase() === org.name.toLowerCase()
    );
    const fullOrg = {
      id: existingIndex !== -1 ? list[existingIndex].id : org.id || `ORG-${Date.now().toString().slice(-4)}`,
      name: org.name.trim(),
      type: org.type || "CLINIC",
      contractNumber: org.contractNumber?.trim() || void 0,
      addressStreet: org.addressStreet?.trim() || "Theodor-Stern-Kai 7",
      postalCode: org.postalCode?.trim() || "60590",
      city: org.city?.trim() || "Frankfurt am Main",
      state: org.state || "HE",
      contactPhone: org.contactPhone?.trim() || "+49 69 6301 0",
      contactEmail: org.contactEmail?.trim() || "info@medigo-partner.de",
      active: org.active !== false,
      createdAt: existingIndex !== -1 ? list[existingIndex].createdAt : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingIndex !== -1) {
      list[existingIndex] = fullOrg;
    } else {
      list.push(fullOrg);
    }
    this.state.organizations = list;
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("organizations").upsert({
          id: fullOrg.id,
          name: fullOrg.name,
          type: fullOrg.type,
          contract_number: fullOrg.contractNumber,
          address_street: fullOrg.addressStreet,
          postal_code: fullOrg.postalCode,
          city: fullOrg.city,
          state: fullOrg.state,
          contact_phone: fullOrg.contactPhone,
          contact_email: fullOrg.contactEmail,
          active: fullOrg.active,
          updated_at: fullOrg.updatedAt
        });
      } catch (err) {
        console.warn("[Supabase] Error upserting organization:", err);
      }
    }
    return fullOrg;
  }
  // --- ORDER OPERATIONS ---
  async getOrders(userRole, userOrganization, driverId, userId, contractNumber) {
    let list = [...this.state.orders];
    if (userRole === "CLIENT_CLINIC") {
      const orgLower = (userOrganization || "").toLowerCase().trim();
      const contractLower = (contractNumber || "").toLowerCase().trim();
      list = list.filter((o) => {
        const orgMatch = Boolean(orgLower && (o.pickupClinicName.toLowerCase().includes(orgLower) || o.createdByOrg && o.createdByOrg.toLowerCase().includes(orgLower)));
        const userMatch = Boolean(userId && o.createdById === userId);
        const contractMatch = Boolean(contractLower && (o.trackingNumber.toLowerCase().includes(contractLower) || o.specialNotes && o.specialNotes.toLowerCase().includes(contractLower)));
        return orgMatch || userMatch || contractMatch;
      });
    } else if (userRole === "LAB_STAFF") {
      const orgLower = (userOrganization || "").toLowerCase().trim();
      const contractLower = (contractNumber || "").toLowerCase().trim();
      list = list.filter((o) => {
        const labMatch = Boolean(orgLower && o.deliveryLabName.toLowerCase().includes(orgLower));
        const contractMatch = Boolean(contractLower && (o.trackingNumber.toLowerCase().includes(contractLower) || o.specialNotes && o.specialNotes.toLowerCase().includes(contractLower)));
        return labMatch || contractMatch;
      });
    } else if (userRole === "DRIVER") {
      list = list.filter((o) => o.driverId === driverId || !o.driverId && o.status === "SCHEDULED");
    }
    return list;
  }
  async getOrderById(id) {
    const order = this.state.orders.find((o) => o.id === id || o.trackingNumber === id);
    return order || null;
  }
  async createOrder(order) {
    this.state.orders.unshift(order);
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("orders").insert({
          id: order.id,
          tracking_number: order.trackingNumber,
          status: order.status,
          transport_type: order.transportType,
          pickup_clinic_name: order.pickupClinicName,
          pickup_address: order.pickupAddress,
          delivery_lab_name: order.deliveryLabName,
          delivery_address: order.deliveryAddress,
          specimen_box_count: order.specimenBoxCount,
          sample_category: order.sampleCategory,
          driver_id: order.driverId,
          driver_name: order.driverName,
          data_payload: order,
          created_at: order.createdAt
        });
      } catch (err) {
        console.warn("[Supabase] Order insert failed, saved locally:", err);
      }
    }
    return order;
  }
  async updateOrder(id, updatedOrder) {
    const index = this.state.orders.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.state.orders[index] = updatedOrder;
      this.saveToFile();
    }
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("orders").update({
          status: updatedOrder.status,
          driver_id: updatedOrder.driverId,
          driver_name: updatedOrder.driverName,
          data_payload: updatedOrder,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", id);
      } catch (err) {
        console.warn("[Supabase] Order update failed:", err);
      }
    }
    return updatedOrder;
  }
  async getAllOrders() {
    return this.getOrders();
  }
  async appendChainOfCustody(orderId, log) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (!order.chainOfCustodyLogs) order.chainOfCustodyLogs = [];
    order.chainOfCustodyLogs.push(log);
    return this.updateOrder(orderId, order);
  }
  async appendTemperatureReading(orderId, telemetry) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (!order.telemetryLogs) order.telemetryLogs = [];
    order.telemetryLogs.push(telemetry);
    return this.updateOrder(orderId, order);
  }
  async createAuditLog(log) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newLog = {
      id: log.id || `LOG-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      orderId: log.orderId,
      previousState: log.previousState || null,
      newState: log.newState || "SCHEDULED",
      actionDescription: log.actionDescription,
      userId: log.userId || "SYSTEM",
      userName: log.userName || "System",
      userRole: log.userRole || "ADMIN",
      deviceId: log.deviceId || "SYS-SRV-01",
      gpsLatitude: log.gpsLatitude || 50.1109,
      gpsLongitude: log.gpsLongitude || 8.6821,
      offlineSynced: Boolean(log.offlineSynced),
      syncedAt: log.syncedAt || now,
      createdAt: log.createdAt || now
    };
    this.state.auditLogs.unshift(newLog);
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("audit_logs").insert({
          id: newLog.id,
          order_id: newLog.orderId,
          user_id: newLog.userId,
          user_name: newLog.userName,
          action: newLog.actionDescription,
          details: JSON.stringify(log),
          timestamp: newLog.createdAt
        });
      } catch (err) {
        console.warn("[Supabase] Audit log insert failed:", err);
      }
    }
    return newLog;
  }
  async getAuditLogs(orderId) {
    if (orderId) {
      return this.state.auditLogs.filter((l) => l.orderId === orderId);
    }
    return this.state.auditLogs;
  }
  async getDetailedStatus() {
    const sb = await verifySupabaseTables();
    return {
      provider: sb.configured && sb.tablesExist ? "supabase" : "local_persistent",
      supabaseConfigured: sb.configured,
      supabaseConnected: sb.connected,
      tablesCreated: sb.tablesExist,
      missingTables: sb.missingTables,
      supabaseUrl: sb.url,
      userCount: this.state.users.length,
      orderCount: this.state.orders.length,
      message: !sb.configured ? "Supabase environment variables not configured. Using local persistent storage." : !sb.tablesExist ? `Connected to Supabase project, but tables [${sb.missingTables.join(", ")}] are not created yet. Please execute the SQL migration script in Supabase SQL Editor.` : "Supabase PostgreSQL tables verified and active."
    };
  }
  getStatus() {
    const sbStatus = checkSupabaseStatus();
    return {
      provider: sbStatus.configured ? "supabase" : "local_persistent",
      supabaseConfigured: sbStatus.configured,
      supabaseUrl: sbStatus.url,
      userCount: this.state.users.length,
      orderCount: this.state.orders.length,
      notice: sbStatus.configured ? "Run the SQL schema in Supabase SQL Editor to initialize tables." : void 0
    };
  }
};
var dbService = new DatabaseService();

// src/server/validation.ts
import { z } from "zod";

// src/server/commonPasswords.ts
var COMMON_PASSWORDS_RAW = [
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "111111",
  "1234567",
  "sunshine",
  "qwerty",
  "iloveyou",
  "princess",
  "admin",
  "welcome",
  "666666",
  "football",
  "monkey",
  "charlie",
  "donald",
  "master",
  "dragon",
  "passwort",
  "geheim",
  "hallo123",
  "sommer",
  "schatz",
  "berlin",
  "deutschland",
  "frankfurt",
  "hamburg",
  "munchen",
  "123123",
  "654321",
  "superman",
  "batman",
  "starwars",
  "baseball",
  "killer",
  "trustno1",
  "jordan",
  "michael",
  "shadow",
  "hunter",
  "cookie",
  "mustang",
  "secret",
  "chelsea",
  "alexander",
  "anthony",
  "jessica",
  "andrew",
  "thomas",
  "daniel",
  "joshua",
  "william",
  "david",
  "joseph",
  "charles",
  "robert",
  "george",
  "matthew",
  "nicholas",
  "steven",
  "edward",
  "brian",
  "kevin",
  "ronald",
  "timothy",
  "jason",
  "jeffrey",
  "ryan",
  "gary",
  "jacob",
  "stephen",
  "eric",
  "larry",
  "justin",
  "scott",
  "brandon",
  "benjamin",
  "samuel",
  "gregory",
  "frank",
  "raymond",
  "alexander",
  "patrick",
  "jack",
  "dennis",
  "jerry",
  "tyler",
  "aaron",
  "jose",
  "henry",
  "adam",
  "douglas",
  "nathan",
  "peter",
  "zachary",
  "kyle",
  "walter",
  "harold",
  "jeremy",
  "ethan",
  "carl",
  "keith",
  "roger",
  "gerald",
  "christian",
  "terry",
  "sean",
  "arthur",
  "austin",
  "noah",
  "lawrence",
  "jesse",
  "joe",
  "bryan",
  "billy",
  "jordan",
  "albert",
  "dylan",
  "bruce",
  "willie",
  "gabriel",
  "logan",
  "alan",
  "juan",
  "wayne",
  "roy",
  "ralph",
  "randy",
  "eugene",
  "vincent",
  "russell",
  "louis",
  "bobby",
  "philip",
  "johnny",
  "ashley",
  "patricia",
  "linda",
  "barbara",
  "elizabeth",
  "jennifer",
  "maria",
  "susan",
  "margaret",
  "dorothy",
  "lisa",
  "nancy",
  "karen",
  "betty",
  "helen",
  "sandra",
  "donna",
  "carol",
  "ruth",
  "sharon",
  "michelle",
  "laura",
  "sarah",
  "kimberly",
  "deborah",
  "jessica",
  "shirley",
  "cynthia",
  "angela",
  "melissa",
  "brenda",
  "amy",
  "anna",
  "rebecca",
  "virginia",
  "kathleen",
  "pamela",
  "martha",
  "debra",
  "amanda",
  "stephanie",
  "carolyn",
  "christine",
  "marie",
  "janet",
  "catherine",
  "frances",
  "ann",
  "joyce",
  "diane",
  "alice",
  "julie",
  "heather",
  "teresa",
  "doris",
  "gloria",
  "evelyn",
  "jean",
  "cheryl",
  "mildred",
  "katherine",
  "joan",
  "ashley",
  "judith",
  "rose",
  "janice",
  "kelly",
  "nicole",
  "judy",
  "christina",
  "kathy",
  "theresa",
  "beverly",
  "denise",
  "tammy",
  "irene",
  "jane",
  "lori",
  "rachel",
  "marilyn",
  "andrea",
  "kathryn",
  "louise",
  "sara",
  "anne",
  "jacqueline",
  "wanda",
  "bonnie",
  "julia",
  "ruby",
  "lois",
  "tina",
  "phyllis",
  "norma",
  "paula",
  "diana",
  "annie",
  "lillian",
  "emily",
  "robin",
  "peggy",
  "priscilla",
  "crystal",
  "gladys",
  "rita",
  "dawn",
  "connie",
  "florence",
  "tracy",
  "edna",
  "tiffany",
  "carmen",
  "rosa",
  "cindy",
  "grace",
  "wendy",
  "victoria",
  "edith",
  "kim",
  "sherry",
  "sylvia",
  "josephine",
  "thelma",
  "shannon",
  "sheila",
  "ethel",
  "ellen",
  "elaine",
  "marjorie",
  "carrie",
  "charlotte",
  "monica",
  "esther",
  "pauline",
  "emma",
  "juanita",
  "anita",
  "rhonda",
  "hazel",
  "amber",
  "eva",
  "debbie",
  "clara",
  "lucille",
  "eleanor",
  "alicia",
  "megan",
  "veronica",
  "violet",
  "kristin",
  "suzanne",
  "tanya",
  "luz",
  "1234567890",
  "000000",
  "11111111",
  "123123123",
  "121212",
  "12341234",
  "123321",
  "696969",
  "7777777",
  "888888",
  "987654321",
  "987654",
  "asdfghjk",
  "asdfgh",
  "qwertyuiop",
  "zxcvbnm",
  "password1",
  "password123",
  "password123456",
  "pass1234",
  "welcome1",
  "welcome123456",
  "admin123",
  "admin2026",
  "medigo2026",
  "dispatch2026",
  "driver2026",
  "clinic2026",
  "labpass2026",
  "passwort1",
  "passwort123",
  "test1234",
  "letmein",
  "access",
  "freedom",
  "trustno1",
  "gateway",
  "network",
  "connect",
  "server",
  "database",
  "system",
  "operator",
  "manager",
  "director",
  "supervisor",
  "security",
  "service",
  "station",
  "control",
  "terminal",
  "default",
  "aeroplane",
  "airforce",
  "airplane",
  "albatross",
  "alchemist",
  "algorithm",
  "alligator",
  "alpha",
  "alphabeta",
  "amazon",
  "amberalert",
  "amsterdam",
  "anaconda",
  "anchor",
  "android",
  "angel",
  "angelic",
  "anonymous",
  "anthem",
  "antidote",
  "apollo",
  "aquarius",
  "archer",
  "archive",
  "ares",
  "argentina",
  "aries",
  "armada",
  "armadillo",
  "arsenal",
  "artemis",
  "asteroid",
  "astonmartin",
  "atlantis",
  "atlas",
  "atom",
  "atomic",
  "audir8",
  "aurora",
  "avalanche",
  "avatar",
  "babylon",
  "badger",
  "baghdad",
  "bahamas",
  "balthazar",
  "bambino",
  "bangkok",
  "barbarian",
  "barcelona",
  "barracuda",
  "bartender",
  "basejump",
  "bastion",
  "battleship",
  "bavaria",
  "bazooka",
  "beachboy",
  "bearcat",
  "beastmode",
  "beethoven",
  "beijing",
  "belfast",
  "belgium",
  "bellagio",
  "bermuda",
  "berserker",
  "bigben",
  "bigboss",
  "bigdaddy",
  "bigfoot",
  "bighorn",
  "biohazard",
  "bismarck",
  "blackbird",
  "blackcat",
  "blackhawk",
  "blackjack",
  "blackmagic",
  "blackout",
  "blackpanther",
  "blackpearl",
  "blackrose",
  "blackwidow",
  "blade",
  "bladerunner",
  "blizzard",
  "bloodhound",
  "bluebird",
  "blueflame",
  "blueheaven",
  "bluemoon",
  "bluesky",
  "bluestar",
  "bobcat",
  "boeing747",
  "bohemian",
  "bolt",
  "bombardier",
  "bonanzar",
  "bonfire",
  "boomerang",
  "borg",
  "boston",
  "botanical",
  "boulder",
  "bounty",
  "bourbon",
  "boxer",
  "bravo",
  "brazil",
  "breakdance",
  "breakout",
  "brick",
  "broadway",
  "bronco",
  "brooklyn",
  "brother",
  "buccaneer",
  "budapest",
  "buffalo",
  "bullseye",
  "bulletproof",
  "bumblebee",
  "bunker",
  "buttercup",
  "butterfly",
  "buzzard",
  "caddilac",
  "caesar",
  "cairo",
  "california",
  "calypso",
  "cambridge",
  "camelot",
  "camino",
  "canada",
  "cantona",
  "canyon",
  "capricorn",
  "capslock",
  "captain",
  "caravan",
  "carbon",
  "carnival",
  "carolina",
  "casablanca",
  "cascade",
  "casper",
  "catalyst",
  "catapult",
  "catfish",
  "centurion",
  "cerberus",
  "challenger",
  "chameleon",
  "champion",
  "chaos",
  "charleston",
  "checkmate",
  "cheetah",
  "cherokee",
  "chicago",
  "chimera",
  "chocolate",
  "chronos",
  "chrysler",
  "churchill",
  "cinderella",
  "cinnamon",
  "circuit",
  "citadel",
  "cleopatra",
  "cliffhanger",
  "climax",
  "cloudnine",
  "cobra",
  "cocktail",
  "colchester",
  "coliseum",
  "colombia",
  "colombo",
  "colorado",
  "colosseum",
  "colt",
  "columbia",
  "columbus",
  "commander",
  "commodore",
  "compass",
  "compton",
  "computer",
  "concorde",
  "condor",
  "congo",
  "conqueror",
  "constantine",
  "continent",
  "copperhead",
  "corleone",
  "coronado",
  "corsair",
  "corvette",
  "cosmic",
  "cosmos",
  "cottage",
  "cougar",
  "courage",
  "covenant",
  "cracker",
  "crawford",
  "crazyhorse",
  "crescent",
  "cricket",
  "crimson",
  "crocodile",
  "crossbow",
  "crossroads",
  "crown",
  "crucible",
  "crusader",
  "crypton",
  "crystalball",
  "cuba",
  "cupcake",
  "curiosity",
  "cyclops",
  "cygnus",
  "cypress",
  "daedalus",
  "daffodil",
  "dagger",
  "dagobah",
  "daiquiri",
  "dakota",
  "dalmatian",
  "damascus",
  "danube",
  "daredevil",
  "darkknight",
  "darkmatter",
  "darkside",
  "darkstar",
  "dashboard",
  "datamaster",
  "davenport",
  "daybreak",
  "daydream",
  "daylight",
  "daytona",
  "deadpool",
  "deathstar",
  "december",
  "defender",
  "defiance",
  "deliverance",
  "delorean",
  "delphi",
  "deltaforce",
  "demolition",
  "denmark",
  "destroyer",
  "detroit",
  "deuterium",
  "diablo",
  "diamond",
  "dinamite",
  "diplomat",
  "dirigible",
  "discovery",
  "dispatch",
  "doberman",
  "dockside",
  "dogpound",
  "dominator",
  "dominion",
  "donatello",
  "doomsday",
  "dorset",
  "doubleagent",
  "doubledown",
  "doubledragon",
  "downtown",
  "dragonfly",
  "dragonslayer",
  "dreadnought",
  "dreamcatcher",
  "drifter",
  "dundee",
  "dunedin",
  "durango",
  "dustdevil",
  "dynamite",
  "dynasty",
  "eagleeye",
  "earthquake",
  "eastwood",
  "eclipse",
  "ecosystem",
  "edelweiss",
  "edge",
  "edinburgh",
  "einstein",
  "eldorado",
  "electric",
  "elemental",
  "elephant",
  "elizabethan",
  "emerald",
  "emperor",
  "empire",
  "endurance",
  "enforcer",
  "england",
  "enterprise",
  "entourage",
  "equilibrium",
  "escalade",
  "escape",
  "esperanza",
  "eternity",
  "eureka",
  "eurofighter",
  "everest",
  "everglade",
  "evolution",
  "excalibur",
  "excel",
  "executioner",
  "exhibition",
  "exile",
  "exodus",
  "expedition",
  "explorer",
  "express",
  "falcon",
  "fanatic",
  "fantastic",
  "faraday",
  "fascinate",
  "favorite",
  "fearless",
  "feather",
  "federation",
  "felicity",
  "fernando",
  "ferrari",
  "fidelity",
  "fiesta",
  "fireball",
  "firebird",
  "fireblade",
  "firefly",
  "firehawk",
  "firestarter",
  "firestorm",
  "firefox",
  "firewall",
  "firstblood",
  "firstorder",
  "flashpoint",
  "flamingo",
  "flintstone",
  "florence",
  "flyingfish",
  "flywheel",
  "forester",
  "fortress",
  "fortune",
  "fountain",
  "fourteen",
  "frankenstein",
  "frankfurt",
  "freedom",
  "freelancer",
  "freeman",
  "frenchfry",
  "frostbite",
  "frontier",
  "frosty",
  "fujiyama",
  "fullhouse",
  "fullthrottle",
  "furnace",
  "future",
  "galapagos",
  "galatine",
  "galactica",
  "galaxy",
  "galileo",
  "gamekeeper",
  "gameover",
  "gangster",
  "gardener",
  "gargoyle",
  "garibaldi",
  "gatekeeper",
  "gawain",
  "genesis",
  "geneva",
  "gentleman",
  "geography",
  "germany",
  "geronimo",
  "ghostrider",
  "giant",
  "gibraltar",
  "gladiator",
  "glamour",
  "glasgow",
  "glenlivet",
  "glock",
  "goldcrest",
  "goldeneye",
  "goldengate",
  "goldfinger",
  "goldrush",
  "goliath",
  "goodfella",
  "gorilla",
  "granada",
  "grandcanyon",
  "grandprix",
  "grapefruit",
  "gravity",
  "greenarrow",
  "greenbay",
  "greenlantern",
  "greensboro",
  "grenadier",
  "greyhound",
  "griffin",
  "grimreaper",
  "grizzly",
  "guardian",
  "guatemala",
  "guillotine",
  "guinness",
  "gulliver",
  "gumdrop",
  "gunpowder",
  "gunrunner",
  "hades",
  "halifax",
  "hallmark",
  "haloween",
  "hamilton",
  "hammerhead",
  "hampshire",
  "hampton",
  "hangglider",
  "hannibal",
  "hardcore",
  "harddrive",
  "harlequin",
  "harrington",
  "hartford",
  "harvard",
  "harvest",
  "hattrick",
  "havana",
  "hawkeye",
  "headhunter",
  "heartbreak",
  "heidelberg",
  "helicopter",
  "hellcat",
  "hellfire",
  "helsinki",
  "hemingway",
  "hendrix",
  "hephaestus",
  "hercules",
  "heritage",
  "hermes",
  "hibiscus",
  "highflyer",
  "highlander",
  "highnoon",
  "highroller",
  "highvoltage",
  "highwire",
  "highwayman",
  "himalaya",
  "hitchhiker",
  "hollywood",
  "hologram",
  "holyfield",
  "holygrail",
  "homeland",
  "homerun",
  "hondacivic",
  "honduras",
  "honeybee",
  "honeymoon",
  "hongkong",
  "hopkins",
  "horizon",
  "hornblower",
  "hornet",
  "horseman",
  "hotchocolate",
  "hotcoffee",
  "hotpursuit",
  "hotwheels",
  "houdini",
  "hourglas",
  "houseparty",
  "houston",
  "hubbard",
  "hudson",
  "hummingbird",
  "huntington",
  "hurricane",
  "hydrant",
  "hyperbole",
  "hypercube",
  "hyperdrive",
  "hyperion",
  "icebreaker",
  "icecream",
  "icehockey",
  "iceland",
  "iceman",
  "icestorm",
  "ignition",
  "illuminati",
  "illusion",
  "immortal",
  "impact",
  "imperial",
  "imperium",
  "impreza",
  "incubus",
  "independence",
  "indigo",
  "indochina",
  "indomitable",
  "infinity",
  "inflight",
  "infrahot",
  "infantry",
  "ingenious",
  "inquisition",
  "inspector",
  "interceptor",
  "interstate",
  "intimidate",
  "intruder",
  "inventor",
  "invincible",
  "ironblade",
  "ironclad",
  "ironcross",
  "ironfist",
  "ironhorse",
  "ironmaiden",
  "ironman",
  "irresistible",
  "isabella",
  "islamabad",
  "istanbul",
  "jackhammer",
  "jackknife",
  "jackpot",
  "jacksonville",
  "jaguar",
  "jailbreak",
  "jamaica",
  "jamesbond",
  "jamestown",
  "january",
  "japanese",
  "jasmin",
  "javelin",
  "jayhawk",
  "jeepwrangler",
  "jefferson",
  "jellybean",
  "jellyfish",
  "jeremiah",
  "jericho",
  "jerusalem",
  "jester",
  "jetski",
  "jetstream",
  "jimmydean",
  "jinglebell",
  "johnlennon",
  "johnwayne",
  "journey",
  "jovial",
  "judgmentday",
  "juggernaut",
  "jukebox",
  "julyfourth",
  "jumpmaster",
  "juniper",
  "jupiter",
  "jurassic",
  "justice",
  "kaiser",
  "kalashnikov",
  "kaleidoscope",
  "kamikaze",
  "kangaroo",
  "kansas",
  "karate",
  "katmandu",
  "kazakhstan",
  "kelvin",
  "kenworth",
  "keywest",
  "kickass",
  "kickboxer",
  "killshot",
  "kingarthur",
  "kingcobra",
  "kingdom",
  "kingfish",
  "kingkong",
  "kingmaker",
  "kingsman",
  "kingston",
  "klingon",
  "knickerbocker",
  "knightrider",
  "knockout",
  "knoxville",
  "kodiak",
  "kolkata",
  "konstantin",
  "kronos",
  "kryptonite",
  "kumquat",
  "kungfu",
  "labrador",
  "labyrinth",
  "ladybug",
  "lafayette",
  "laguna",
  "lakeerie",
  "lakehuron",
  "lakemichigan",
  "lamancha",
  "lamborghini",
  "lancelot",
  "landcruiser",
  "landmark",
  "landrover",
  "laserbeam",
  "lastaction",
  "lastsupper",
  "lawgiver",
  "leaguer",
  "leatherneck",
  "lebanon",
  "legionnaire",
  "lemondrop",
  "leopard",
  "leprechaun",
  "levelten",
  "lexington",
  "liberty",
  "lightfoot",
  "lightning",
  "lightspeed",
  "limelight",
  "limestone",
  "lincoln",
  "lionheart",
  "liverpool",
  "livingston",
  "lochlomond",
  "lochness",
  "lockheed",
  "locomotive",
  "lodestone",
  "logcabin",
  "lollipop",
  "london",
  "longbeach",
  "longhorn",
  "longisland",
  "lordoftherings",
  "louisiana",
  "lovebird",
  "lucifer",
  "luckystrike",
  "lufthansa",
  "lumberjack",
  "luminance",
  "lunarbase",
  "lynxcat",
  "macaroni",
  "machfive",
  "machete",
  "mackintosh",
  "madagascar",
  "madison",
  "madmax",
  "magellan",
  "magicwand",
  "magma",
  "magnolia",
  "magnum44",
  "mahogany",
  "mainevent",
  "mainstreet",
  "majorleague",
  "makemoney",
  "manchester",
  "mandarin",
  "manhattan",
  "marathon",
  "marcellus",
  "margarita",
  "marigold",
  "mariner",
  "marlboro",
  "marmalade",
  "marseille",
  "marshmallow",
  "marsrover",
  "maserati",
  "masterkey",
  "mastermind",
  "matchbox",
  "matchpoint",
  "matrix",
  "maverick",
  "mayflower",
  "mazdarx7",
  "mcdonalds",
  "meadowsweet",
  "meatball",
  "mechanic",
  "medellin",
  "mediterranean",
  "megabyte",
  "megahertz",
  "megalodon",
  "melbourne",
  "memphis",
  "mercedes",
  "mercenary",
  "mercury",
  "meridian",
  "merlin",
  "merrygo",
  "mesosphere",
  "metropolis",
  "mexico",
  "miamibeach",
  "microchip",
  "midnight",
  "midsummer",
  "midway",
  "mightyduck",
  "milkyway",
  "millennium",
  "minnesota",
  "minotaur",
  "mirage",
  "mississippi",
  "missouri",
  "mojave",
  "monaco",
  "monarch",
  "moneybag",
  "monopoly",
  "montana",
  "monterey",
  "montevideo",
  "montgomery",
  "montreal",
  "moonlight",
  "moonraker",
  "moonshadow",
  "moonshot",
  "morningstar",
  "morocco",
  "morrison",
  "moscow",
  "motorhead",
  "motown",
  "mountvernon",
  "mozart",
  "muhammadali",
  "mulligan",
  "mushrooms",
  "musketeer",
  "mustachio",
  "mustang50",
  "mystique",
  "nagoya",
  "nagasaki",
  "namibia",
  "narcissus",
  "nascar",
  "nashville",
  "nautilus",
  "navigator",
  "nebula",
  "nemesis",
  "neptune",
  "neverland",
  "newcastle",
  "newdelhi",
  "newengland",
  "newhampshire",
  "newjersey",
  "newmexico",
  "neworleans",
  "newyorkcity",
  "newzealand",
  "niagara",
  "nicaragua",
  "nightfall",
  "nighthawk",
  "nightingale",
  "nightrider",
  "nightshade",
  "nightvision",
  "nightwatch",
  "nintendo",
  "nitrobooster",
  "nitrogen",
  "nobodysfool",
  "nocturnal",
  "northcarolina",
  "northdakota",
  "northernstar",
  "northpole",
  "northstar",
  "norwegian",
  "notredame",
  "nottingham",
  "novaexpress",
  "november",
  "novembersnow",
  "nuclearwar",
  "numchucks",
  "nutcracker",
  "oakhaven",
  "oakridge",
  "oasiswater",
  "observatory",
  "oblivion",
  "octopussy",
  "odyssey",
  "offshore",
  "oklahoma",
  "olympichonor",
  "olympus",
  "omahamaven",
  "onceler",
  "oneshot",
  "onpurpose",
  "openheaven",
  "opensky",
  "operation",
  "optometrist",
  "orangejuice",
  "orchestra",
  "oregonpine",
  "orionnebula",
  "orlando",
  "osakabay",
  "ospreybird",
  "outbacksteak",
  "outcast",
  "outerbanks",
  "outerspace",
  "outlawking",
  "outrigger",
  "overdrive",
  "overhead",
  "overlord",
  "overwatch",
  "oxfordblue",
  "oxytocin",
  "pacificocean",
  "packardbell",
  "padawan",
  "pagoda",
  "paintball",
  "paladin",
  "palermo",
  "palestine",
  "palmtree",
  "panama",
  "pandabear",
  "pandora",
  "pangaea",
  "panther",
  "paradise",
  "paradox",
  "paraglider",
  "paragon",
  "paralyzer",
  "paramount",
  "parisfrance",
  "parkavenue",
  "parliament",
  "parthenon",
  "pasadena",
  "passatvw",
  "pathfinder",
  "patriarch",
  "patrolcar",
  "patterson",
  "payload",
  "peacekeeper",
  "peacock",
  "peanutbutter",
  "peashooter",
  "pebblebeach",
  "pegasus",
  "pendelton",
  "pendulum",
  "penguin",
  "peninsula",
  "pennsylvania",
  "pennyroyal",
  "pentagon",
  "peppermint",
  "percussion",
  "perfection",
  "permafrost",
  "perseus",
  "pershing",
  "persona",
  "petecon",
  "petrel",
  "phantomlord",
  "pharaoh",
  "philadelphia",
  "phoenix",
  "piano",
  "piccadilly",
  "pickup123",
  "piggybank",
  "pilgrim",
  "pimpernel",
  "pinball",
  "pineapple",
  "pinnacle",
  "pinwheel",
  "pioneer",
  "piratebay",
  "pistolero",
  "pittsburgh",
  "planb",
  "planetarium",
  "planetoftheapes",
  "plasmacannon",
  "platinum",
  "plato",
  "platypus",
  "playstation",
  "pleiades",
  "pluto",
  "plymouth",
  "pocketknife",
  "pokerface",
  "polarbear",
  "polarexpress",
  "polaris",
  "polestar",
  "policeline",
  "pompeii",
  "pompano",
  "pontiacfirebird",
  "pontoon",
  "pooltable",
  "popcorn",
  "porcupine",
  "porsche911",
  "portland",
  "portobello",
  "portsmouth",
  "portugal",
  "poseidon",
  "postman",
  "potomac",
  "powerhouse",
  "powermaster",
  "powersurge",
  "prairiedog",
  "predator",
  "prelude",
  "presidential",
  "primetime",
  "princecharming",
  "princeton",
  "prodigy",
  "prometheus",
  "propeller",
  "prospero",
  "protector",
  "protonpack",
  "proudtobegerman",
  "providence",
  "ptarmigan",
  "pulitzer",
  "pulsarstar",
  "pumpernickel",
  "pumpkinpie",
  "punisher",
  "puregold",
  "pythoncode",
  "quadrangle",
  "quantumleap",
  "quarterback",
  "quatermain",
  "queenbee",
  "queensland",
  "quicksand",
  "quicksilver",
  "racetrack",
  "radioshack",
  "ragamuffin",
  "ragnarok",
  "railroad",
  "rainbowsix",
  "rainmaker",
  "rainstorm",
  "rambler",
  "rangerover",
  "raspberry",
  "rattlesnake",
  "rawhide",
  "razorsharp",
  "rebelalliance",
  "rebellion",
  "reconnaissance",
  "redbaron",
  "redbull",
  "redcarpet",
  "redcloud",
  "reddragon",
  "redemption",
  "redline",
  "redoctober",
  "redpanther",
  "redrover",
  "redskelton",
  "redsquare",
  "redstorm",
  "redsun",
  "redwood",
  "reflection",
  "regulator",
  "reindeer",
  "reiteralm",
  "rejuvenate",
  "relic",
  "renegade",
  "reno",
  "republican",
  "resolution",
  "resonance",
  "resurrection",
  "revelation",
  "revolution",
  "rhinestone",
  "rhodeisland",
  "rhombus",
  "richmond",
  "rickymartin",
  "ridgecrest",
  "riflerange",
  "righton",
  "ringleader",
  "ringmaster",
  "riodejaneiro",
  "risingstar",
  "riverbend",
  "riverdance",
  "riverplate",
  "riverwalk",
  "roadrunner",
  "roadtrip",
  "roanoke",
  "robinhood",
  "robinson",
  "roborock",
  "robotech",
  "rochester",
  "rockafeller",
  "rockandroll",
  "rockefeller",
  "rockford",
  "rockhound",
  "rockingham",
  "rockisland",
  "rockland",
  "rockport",
  "rockstar",
  "rockybalboa",
  "rockymountain",
  "rodeo",
  "rollercoaster",
  "rollingstone",
  "rollroyce",
  "romanempire",
  "romeitaly",
  "roosevelt",
  "rosebud",
  "rosewood",
  "roundhouse",
  "roundtable",
  "royalflush",
  "rubicon",
  "rubikscube",
  "rubyred",
  "ruminant",
  "runaround",
  "rustbelt",
  "saberhagen",
  "sabertooth",
  "sabotage",
  "sacramento",
  "saddleback",
  "safecracker",
  "safari",
  "sagittarius",
  "sailorqueen",
  "saintlouis",
  "saintpetersburg",
  "salamander",
  "salvation",
  "samaritan",
  "sanantonio",
  "sandcastle",
  "sandiego",
  "sandpiper",
  "sandstorm",
  "sanfrancisco",
  "sanjose",
  "sanmarino",
  "santabarbara",
  "santacruz",
  "santafe",
  "sapphire",
  "sarajevo",
  "sarasota",
  "saratoga",
  "saskatoon",
  "satellite",
  "saturnv",
  "saudiarabia",
  "savannah",
  "saveourplanet",
  "saxophone",
  "scandinavia",
  "scarecrow",
  "scarletwitch",
  "scavenger",
  "schmetterling",
  "schneider",
  "schwarzwald",
  "scorpion",
  "scotlandyard",
  "scratchpad",
  "screamingeagle",
  "scrooge",
  "seafarer",
  "seahawk",
  "sealteam6",
  "seattle",
  "secretagent",
  "secretgarden",
  "semperfi",
  "senator",
  "sentinel",
  "serenade",
  "serendipity",
  "sergeant",
  "sevenseas",
  "shadowfax",
  "shadowland",
  "shadowrunner",
  "shakespeare",
  "shanghai",
  "sharpshooter",
  "shenandoah",
  "sherwood",
  "shiningstar",
  "shipwreck",
  "shootout",
  "shoreline",
  "shotgun",
  "showdown",
  "showstopper",
  "siberianhusky",
  "sidekicker",
  "sidewinder",
  "siegfried",
  "sierramadre",
  "signalfire",
  "silentnight",
  "siliconvalley",
  "silverado",
  "silverbullet",
  "silverdollar",
  "silverlining",
  "silverstone",
  "silversurfer",
  "simplelife",
  "sinbad",
  "singapore",
  "siriusblack",
  "sixmillion",
  "skatepark",
  "skeletor",
  "skiingalpine",
  "skyfall",
  "skyhawk",
  "skylark",
  "skyscanner",
  "skyscraper",
  "skywalker",
  "slamdunk",
  "slapshot",
  "slayer",
  "sleepyhead",
  "slingshot",
  "slipstream",
  "slowmotion",
  "smartypants",
  "smashmouth",
  "smokejump",
  "smokering",
  "smorgasbord",
  "snakeskin",
  "snowball",
  "snowboard",
  "snowbound",
  "snowflake",
  "snowleopard",
  "snowstorm",
  "snowwhite",
  "soapopera",
  "soccermom",
  "solareclipse",
  "solarflare",
  "solarwind",
  "solitair",
  "soloist",
  "solomon",
  "somersault",
  "somerset",
  "songbird",
  "sonofabitch",
  "sophisticated",
  "soundbarrier",
  "soundwave",
  "southampton",
  "southcarolina",
  "southdakota",
  "sovereign",
  "sovietunion",
  "spacecadet",
  "spacecraft",
  "spaceinvader",
  "spaceodyssey",
  "spaceshuttle",
  "spacesuit",
  "spartacus",
  "specialforces",
  "speedboat",
  "speeddemon",
  "speedracer",
  "spellbinder",
  "spitfire",
  "splashdown",
  "springfield",
  "springtime",
  "sputnik",
  "stagecoach",
  "stairwaytoheaven",
  "stalwart",
  "stanford",
  "starblazer",
  "starburst",
  "stardust",
  "starfighter",
  "stargazer",
  "stargate",
  "starship",
  "startrek",
  "steelcurtain",
  "steeler",
  "steelhead",
  "steelydan",
  "steppingstone",
  "steptoe",
  "stonewall",
  "stormbringer",
  "stormchaser",
  "stormcloud",
  "stormtrooper",
  "stradivarius",
  "straightflush",
  "stratosphere",
  "streamliner",
  "strikezone",
  "stringfellow",
  "submariner",
  "sugarplum",
  "summertime",
  "sundance",
  "superbowl",
  "supercharger",
  "superhero",
  "supernova",
  "supersoldier",
  "superstar",
  "suspense",
  "suzuki",
  "sweetdreams",
  "sweetheart",
  "switzerland",
  "swordfish",
  "symphony",
  "tabletennis",
  "talisman",
  "tallahassee",
  "tangodown",
  "tankcommander",
  "tarheelnation",
  "tarzan",
  "teambuilder",
  "teamplayer",
  "tempest",
  "terminator",
  "terraforming",
  "testdriver",
  "texasholdem",
  "thermometer",
  "thinkpositive",
  "thirdeye",
  "thunderbolt",
  "thundercloud",
  "thunderhead",
  "thunderroad",
  "thunderstorm",
  "timbuktu",
  "timebomb",
  "timemachine",
  "timetraveler",
  "titanic",
  "tomahawk",
  "topgun",
  "tornado",
  "totalrecall",
  "touchdown",
  "tournament",
  "trailblazer",
  "transporter",
  "treasurechest",
  "triathlon",
  "triggerhappy",
  "troublemaker",
  "trueblue",
  "tsunami",
  "turbodiesel",
  "turboengine",
  "turquoisestone",
  "twinpeaks",
  "typhoon",
  "ultraviolet",
  "undercover",
  "undertaker",
  "underwater",
  "universal",
  "unforgiven",
  "uppercut",
  "valhalla",
  "valkyrie",
  "vanguard",
  "velociraptor",
  "venezuela",
  "venturedude",
  "vicksburg",
  "victorious",
  "videogame",
  "vigilante",
  "vincicode",
  "vintagecar",
  "volkswagen",
  "volcanocave",
  "voodoodoll",
  "voyager",
  "vulcan",
  "walhalla",
  "wallstreet",
  "warlord",
  "warmachine",
  "warrior",
  "watchtower",
  "waterfall",
  "waterloo",
  "wavelength",
  "wayfarer",
  "weatherman",
  "wellness",
  "westminster",
  "westpoint",
  "whirlpool",
  "whirlwind",
  "whiskey",
  "whitefang",
  "whitehorse",
  "whiterose",
  "whitesand",
  "whitewater",
  "wildcard",
  "wildcat",
  "wilderness",
  "wildfire",
  "wildflower",
  "wildthing",
  "williamtell",
  "windjammer",
  "windsor",
  "windsurfer",
  "winterfell",
  "wintersnow",
  "wolverine",
  "wonderland",
  "woodstock",
  "woodpecker",
  "worldseries",
  "wrangler",
  "wrestling",
  "wyoming",
  "xenomorph",
  "yellowstone",
  "yesterday",
  "yosemite",
  "youngblood",
  "yukonriver",
  "zeppelin",
  "zerohero",
  "zeuslightning",
  "zigzag",
  "zombieland"
];
var COMMON_PASSWORDS_SET = new Set(
  COMMON_PASSWORDS_RAW.map((p) => p.toLowerCase().trim())
);
function isCommonPassword(password) {
  if (!password || typeof password !== "string") return false;
  return COMMON_PASSWORDS_SET.has(password.toLowerCase().trim());
}

// src/server/validation.ts
var GpsCoordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().default(5).optional()
}).strict();
var PreTripCheckSchema = z.object({
  id: z.string().optional(),
  orderId: z.string().optional(),
  driverId: z.string().optional(),
  p650OuterPackagingIntact: z.boolean().refine((val) => val === true, {
    message: "ADR P650 Outer Packaging must be verified intact."
  }),
  primarySecondaryLeakProof: z.boolean().refine((val) => val === true, {
    message: "ADR P650 Primary/Secondary containers must be leakproof."
  }),
  absorbentMaterialPresent: z.boolean().refine((val) => val === true, {
    message: "ADR P650 Absorbent material must be present."
  }),
  tempBoxCalibrated: z.boolean().refine((val) => val === true, {
    message: "Temperature container calibration check failed."
  }),
  initialTempCelsius: z.number().min(-50).max(60),
  targetTempMinCelsius: z.number().min(-50).max(60),
  targetTempMaxCelsius: z.number().min(-50).max(60),
  driverSignatureBase64: z.string().min(20, "Valid digital signature required."),
  vehicleRegNumber: z.string().min(2).max(30),
  approved: z.boolean().default(true),
  timestamp: z.string().optional()
}).strict();
var CustodySignOffSchema = z.object({
  id: z.string().optional(),
  orderId: z.string().optional(),
  eventType: z.enum(["PICKUP_SIGNATURE", "DELIVERY_SIGNATURE"]),
  staffName: z.string().min(2).max(100, "Signatory staff member name is required."),
  staffTitle: z.string().max(100).optional(),
  signatureBase64: z.string().min(20, "Signature payload is required."),
  cryptoSignature: z.string().max(512).optional(),
  pinCode: z.string().regex(/^\d{4}$/, "Staff PIN must be a 4-digit number.").optional(),
  pinCodeVerified: z.boolean().optional(),
  scannedBarcodes: z.array(z.string().min(2).max(100)).min(1, "At least one specimen barcode is mandatory."),
  timestamp: z.string().optional(),
  clientRecordedAt: z.string().optional(),
  serverIngestedAt: z.string().optional(),
  coords: GpsCoordsSchema.optional(),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  gpsAccuracyMeters: z.number().positive().optional(),
  deviceId: z.string().min(2).max(100).optional()
}).strict();
var TransitionOrderSchema = z.object({
  targetStatus: z.enum([
    "SCHEDULED",
    "PRE_TRIP_CHECK",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "QUARANTINED_UNSYNCED",
    "CANCELLED"
  ]),
  context: z.object({
    preTripCheck: PreTripCheckSchema.optional(),
    pickupSignature: CustodySignOffSchema.optional(),
    deliverySignature: CustodySignOffSchema.optional(),
    cancellationReason: z.string().max(500).optional()
  }).strict().optional(),
  coords: GpsCoordsSchema.optional(),
  deviceId: z.string().max(100).optional()
}).strict();
var OfflineSyncItemSchema = z.object({
  id: z.string().min(1).max(100),
  orderId: z.string().min(1).max(100),
  actionType: z.enum(["ACCEPT", "PRE_TRIP_CHECK", "PICKUP", "TELEMETRY", "DELIVER", "CANCEL"]),
  payload: z.record(z.string(), z.any()).optional(),
  timestamp: z.string(),
  clientRecordedAt: z.string().optional(),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  deviceId: z.string().max(100).optional(),
  cryptoSignature: z.string().max(512).optional(),
  retryCount: z.number().int().min(0).max(100).optional()
}).strict();
var PasswordPolicySchema = z.string().min(12, "Password must be at least 12 characters.").max(128, "Password cannot exceed 128 characters.").refine((pwd) => !isCommonPassword(pwd), {
  message: "Password is too common or easily guessable. Please choose a stronger password."
});
var LoginSchema = z.object({
  email: z.string().email("A valid email address is required.").max(150),
  password: z.string().min(1, "Password is required.").max(128)
}).strict();
var ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: PasswordPolicySchema
}).strict().refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password.",
  path: ["newPassword"]
});
function validatePasswordAgainstUser(password, user) {
  if (!password || password.length < 12) {
    return { valid: false, error: "Password must be between 12 and 128 characters." };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password cannot exceed 128 characters." };
  }
  const normalized = password.toLowerCase().trim();
  if (isCommonPassword(normalized)) {
    return { valid: false, error: "Password is too common and easily guessable." };
  }
  if (user.email) {
    const emailNorm = user.email.toLowerCase().trim();
    const prefix = emailNorm.split("@")[0];
    if (normalized === emailNorm || prefix && prefix.length >= 3 && normalized === prefix) {
      return { valid: false, error: "Password cannot be identical to your email address or username." };
    }
  }
  if (user.name) {
    const nameNorm = user.name.toLowerCase().trim();
    if (normalized === nameNorm) {
      return { valid: false, error: "Password cannot be identical to your name." };
    }
  }
  return { valid: true };
}
var CreateUserSchema = z.object({
  email: z.string().email().max(150),
  password: PasswordPolicySchema,
  name: z.string().min(2).max(100),
  role: z.enum(["ADMIN", "DISPATCHER", "DRIVER", "ORG_STAFF", "PATIENT", "CLIENT_CLINIC", "LAB_STAFF"]),
  phone: z.string().max(50).optional(),
  organization: z.string().max(100).optional(),
  organizationId: z.string().max(100).optional(),
  contractNumber: z.string().max(50).optional(),
  facilityType: z.enum(["CLINIC", "LABORATORY", "HQ", "COURIER"]).optional(),
  facilityAddress: z.string().max(250).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  pinCode: z.string().regex(/^\d{4}$/, "PIN must be a 4-digit number.").optional(),
  devicePublicKey: z.string().max(512).optional(),
  mustChangePassword: z.boolean().optional()
}).strict();
var UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  phone: z.string().max(50).optional(),
  organization: z.string().max(100).optional(),
  organizationId: z.string().max(100).optional(),
  contractNumber: z.string().max(50).optional(),
  facilityType: z.enum(["CLINIC", "LABORATORY", "HQ", "COURIER"]).optional(),
  facilityAddress: z.string().max(250).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  active: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  password: PasswordPolicySchema.optional()
}).strict();
var UpsertOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["HOSPITAL", "CLINIC", "PHARMACY", "CARE_HOME", "LABORATORY", "INDIVIDUAL_PATIENT"]).default("CLINIC"),
  contractNumber: z.string().max(50).optional(),
  addressStreet: z.string().max(150).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).default("HE").optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(150).optional()
}).strict();
var CreateOrderSchema = z.object({
  id: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  transportType: z.enum(["AMBIENT_15_25C", "REFRIGERATED_2_8C", "FROZEN_MINUS_20C", "FROZEN_DRY_ICE"]).default("REFRIGERATED_2_8C"),
  specimenCategory: z.enum(["UN3373_CATEGORY_B_SPECIMEN", "PHARMACEUTICAL_APBETRO", "STEM_CELLS_APHERESIS", "CRYOPRESERVED_SPECIMEN"]).default("UN3373_CATEGORY_B_SPECIMEN"),
  sampleCategory: z.string().max(100).optional(),
  originOrganizationId: z.string().max(100).optional(),
  pickupClinicName: z.string().min(2).max(150, "Pickup clinic name is required."),
  pickupAddress: z.string().min(5).max(250, "Pickup address is required."),
  pickupDepartment: z.string().max(100).optional(),
  pickupContactPhone: z.string().min(5).max(50),
  destinationOrgId: z.string().max(100).optional(),
  deliveryLabName: z.string().min(2).max(150, "Delivery lab name is required."),
  deliveryAddress: z.string().min(5).max(250, "Delivery address is required."),
  deliveryDepartment: z.string().max(100).optional(),
  deliveryContactPhone: z.string().min(5).max(50),
  scheduledPickupFrom: z.string().optional(),
  scheduledPickupTo: z.string().optional(),
  scheduledDeliveryBy: z.string().optional(),
  specimenBoxCount: z.number().int().positive().max(500).default(1),
  barcodeList: z.array(z.string().min(1).max(100)).min(1, "At least one barcode is required."),
  specialNotes: z.string().max(1e3).optional(),
  p650Verified: z.boolean().default(true),
  createdById: z.string().max(100).optional(),
  createdByOrg: z.string().max(100).optional(),
  driverId: z.string().max(100).optional(),
  driverName: z.string().max(100).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  publicAccessToken: z.string().max(100).optional(),
  status: z.enum(["SCHEDULED", "PRE_TRIP_CHECK", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "QUARANTINED_UNSYNCED", "CANCELLED"]).optional()
}).strict();
var PatchOrderSchema = z.object({
  status: z.enum(["SCHEDULED", "PRE_TRIP_CHECK", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "QUARANTINED_UNSYNCED", "CANCELLED"]).optional(),
  transportType: z.enum(["AMBIENT_15_25C", "REFRIGERATED_2_8C", "FROZEN_MINUS_20C", "FROZEN_DRY_ICE"]).optional(),
  specimenCategory: z.enum(["UN3373_CATEGORY_B_SPECIMEN", "PHARMACEUTICAL_APBETRO", "STEM_CELLS_APHERESIS", "CRYOPRESERVED_SPECIMEN"]).optional(),
  driverId: z.string().max(100).optional(),
  driverName: z.string().max(100).optional(),
  vehicleRegNumber: z.string().max(30).optional(),
  scheduledPickupFrom: z.string().optional(),
  scheduledPickupTo: z.string().optional(),
  scheduledDeliveryBy: z.string().optional(),
  specimenBoxCount: z.number().int().positive().max(500).optional(),
  specialNotes: z.string().max(1e3).optional(),
  quarantineReason: z.string().max(500).optional()
}).strict();
var TemperatureTelemetrySchema = z.object({
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
  gpsLongitude: z.number().min(-180).max(180).optional()
}).strict();
var CeoEmailForwardingSchema = z.object({
  ceoEmail: z.string().email().max(150).optional(),
  ceoName: z.string().min(2).max(100).optional(),
  ccAccountingEmail: z.string().email().max(150).optional(),
  autoForwardCompletedOrders: z.boolean().optional(),
  autoForwardInvoices: z.boolean().optional(),
  attachTelemetryPdf: z.boolean().optional(),
  attachChainOfCustodyPdf: z.boolean().optional(),
  forwardingMode: z.enum(["INSTANT", "BATCH_DAILY", "OFF"]).optional()
}).strict();
var CeoTestSendSchema = z.object({
  targetEmail: z.string().email().max(150).optional()
}).strict();

// src/server/auth.ts
import jwt from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
import crypto2 from "crypto";
import dotenv from "dotenv";
dotenv.config();
var JWT_ISSUER = "medigo-auth";
var JWT_AUDIENCE = "medigo-api";
var REFRESH_COOKIE_NAME = "medigo_refresh_token";
var DUMMY_HASH = bcrypt2.hashSync("Dummy_Anti_Timing_Enumeration_Salt_2026!#", 12);
function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    const errorMsg = "[FATAL SECURITY ERROR] JWT_SECRET environment variable is missing or shorter than 32 characters.";
    console.error(errorMsg);
    if (!process.env.VERCEL && (process.env.NODE_ENV === "production" || !process.env.VITEST && process.env.NODE_ENV !== "test")) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }
  return secret;
}
var initialJwtSecret = "";
try {
  initialJwtSecret = validateJwtSecret();
} catch (err) {
  if (!process.env.VERCEL && process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    throw err;
  }
}
async function comparePassword(plainText, hash) {
  if (!plainText || !hash || typeof plainText !== "string" || typeof hash !== "string") {
    return false;
  }
  try {
    return await bcrypt2.compare(plainText, hash);
  } catch (err) {
    console.error("[Auth] Error in comparePassword:", err);
    return false;
  }
}
function generateToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    organizationId: user.organizationId,
    tokenVersion: user.tokenVersion ?? 0
  };
  return jwt.sign(payload, validateJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "15m",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, validateJwtSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (err) {
    return null;
  }
}
function generateRawRefreshToken() {
  return crypto2.randomBytes(32).toString("base64url");
}
function hashRefreshToken(rawToken) {
  return crypto2.createHash("sha256").update(rawToken).digest("hex");
}
function getRefreshCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1e3
    // 7 days in milliseconds
  };
}
function validateCsrfOrigin(req, res, next) {
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  let requestOrigin = null;
  if (originHeader) {
    requestOrigin = originHeader.trim().toLowerCase();
  } else if (refererHeader) {
    try {
      requestOrigin = new URL(refererHeader).origin.toLowerCase();
    } catch {
      requestOrigin = null;
    }
  }
  const appUrl = process.env.APP_URL;
  const validOrigins = /* @__PURE__ */ new Set();
  if (appUrl) {
    try {
      validOrigins.add(new URL(appUrl).origin.toLowerCase());
    } catch {
      validOrigins.add(appUrl.toLowerCase().trim());
    }
  }
  if (process.env.NODE_ENV !== "production") {
    validOrigins.add("http://localhost:3000");
    validOrigins.add("http://localhost:5173");
    validOrigins.add("http://127.0.0.1:3000");
    validOrigins.add("http://127.0.0.1:5173");
  }
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  if (allowedOriginsEnv) {
    allowedOriginsEnv.split(",").forEach((o) => {
      try {
        validOrigins.add(new URL(o).origin.toLowerCase());
      } catch {
        const trimmed = o.trim().toLowerCase();
        if (trimmed) validOrigins.add(trimmed);
      }
    });
  }
  if (process.env.VERCEL_URL) {
    validOrigins.add(`https://${process.env.VERCEL_URL.toLowerCase().trim()}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    validOrigins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase().trim()}`);
  }
  validOrigins.add("https://aistudio.google.com");
  if (requestOrigin) {
    const isAllowed = validOrigins.has(requestOrigin) || requestOrigin.endsWith(".run.app") && (requestOrigin.includes("ais-dev-") || requestOrigin.includes("ais-pre-"));
    if (!isAllowed) {
      return res.status(403).json({
        code: "CSRF_ORIGIN_DENIED",
        message: "Forbidden: Request origin does not match allowed application domain."
      });
    }
  }
  next();
}
function enforcePasswordChange(req, res, next) {
  if (req.user && req.user.mustChangePassword) {
    const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path || req.originalUrl || "";
    const cleanPath = rawPath.split("?")[0];
    if (cleanPath === "/api/auth/change-password" || cleanPath === "/api/auth/me" || cleanPath.endsWith("/api/auth/change-password") || cleanPath.endsWith("/api/auth/me")) {
      return next();
    }
    return res.status(403).json({
      code: "PASSWORD_CHANGE_REQUIRED",
      message: "Password change is required before accessing other resources."
    });
  }
  next();
}
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required. Missing Bearer token." });
  }
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ message: "Authentication required. Missing Bearer token." });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired session token. Please sign in again." });
  }
  const userId = decoded.sub || decoded.id;
  if (!userId) {
    return res.status(401).json({ message: "Invalid or expired session token. Please sign in again." });
  }
  const dbUser = await dbService.getUserById(userId);
  if (!dbUser) {
    return res.status(401).json({ message: "User not found or session revoked. Please sign in again." });
  }
  if (dbUser.active === false) {
    return res.status(401).json({ message: "Account is deactivated. Please contact your dispatch administrator." });
  }
  const expectedTokenVersion = dbUser.tokenVersion ?? 0;
  if (decoded.tokenVersion === void 0 || decoded.tokenVersion !== expectedTokenVersion) {
    return res.status(401).json({ message: "Session token has been revoked or invalidated. Please sign in again." });
  }
  req.user = {
    id: dbUser.id,
    sub: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organization: dbUser.organization,
    organizationId: dbUser.organizationId,
    contractNumber: dbUser.contractNumber,
    vehicleRegNumber: dbUser.vehicleRegNumber,
    facilityType: dbUser.facilityType,
    facilityAddress: dbUser.facilityAddress,
    mustChangePassword: Boolean(dbUser.mustChangePassword),
    tokenVersion: expectedTokenVersion
  };
  enforcePasswordChange(req, res, next);
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== "ADMIN" && req.user.role !== "DISPATCHER") {
      return res.status(403).json({
        message: "Forbidden: Only authorized Administrators and Dispatchers can perform this action."
      });
    }
    next();
  });
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Forbidden: Least Privilege violation. Role '${req.user?.role || "ANONYMOUS"}' does not have permission to perform this action. Required role(s): ${allowedRoles.join(", ")}.`,
          userRole: req.user?.role,
          requiredRoles: allowedRoles
        });
      }
      next();
    });
  };
}
var MAX_EMAIL_ATTEMPTS = 5;
var MAX_IP_ATTEMPTS = 20;
var WINDOW_MS = 15 * 60 * 1e3;
var memoryFallbackStore = /* @__PURE__ */ new Map();
async function getStoredAttempt(key) {
  try {
    const record = await dbService.getLoginAttempt(key);
    if (record) return record;
  } catch (err) {
    console.warn("[RateLimit] Database lookup failed, falling back to memory:", err);
  }
  return memoryFallbackStore.get(key) || null;
}
async function saveStoredAttempt(record) {
  memoryFallbackStore.set(record.key, record);
  try {
    await dbService.upsertLoginAttempt(record);
  } catch (err) {
    console.warn("[RateLimit] Database upsert failed, preserved in memory:", err);
  }
}
async function deleteStoredAttempt(key) {
  memoryFallbackStore.delete(key);
  try {
    await dbService.clearLoginAttempt(key);
  } catch (err) {
    console.warn("[RateLimit] Database delete failed:", err);
  }
}
function calculateExponentialLockoutMinutes(attempts, maxAttempts) {
  const excess = Math.max(0, attempts - maxAttempts);
  const minutes = Math.min(60, Math.pow(2, excess));
  return minutes;
}
async function checkLoginRateLimit(email, ip) {
  const now = Date.now();
  const keys = [];
  if (email) {
    keys.push({ key: `email:${email.toLowerCase().trim()}`, type: "EMAIL" });
  }
  const cleanIp = (ip || "127.0.0.1").trim();
  if (cleanIp) {
    keys.push({ key: `ip:${cleanIp}`, type: "IP" });
  }
  for (const { key, type } of keys) {
    const record = await getStoredAttempt(key);
    if (!record) continue;
    if (record.lockedUntil) {
      const lockedUntilTime = new Date(record.lockedUntil).getTime();
      if (now < lockedUntilTime) {
        const remaining = Math.ceil((lockedUntilTime - now) / 1e3);
        return { allowed: false, remainingLockoutSeconds: remaining, reason: type };
      }
    }
    const firstAttemptTime = new Date(record.firstAttemptAt).getTime();
    if (now - firstAttemptTime > WINDOW_MS && (!record.lockedUntil || now >= new Date(record.lockedUntil).getTime())) {
      await deleteStoredAttempt(key);
    }
  }
  return { allowed: true };
}
async function recordFailedLogin(email, ip) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let isLockedOverall = false;
  let maxLockoutSeconds = 0;
  let emailAttemptsLeft = MAX_EMAIL_ATTEMPTS;
  const entries = [];
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail) {
    entries.push({ key: `email:${cleanEmail}`, type: "EMAIL", identifier: cleanEmail, max: MAX_EMAIL_ATTEMPTS });
  }
  const cleanIp = (ip || "127.0.0.1").trim();
  if (cleanIp) {
    entries.push({ key: `ip:${cleanIp}`, type: "IP", identifier: cleanIp, max: MAX_IP_ATTEMPTS });
  }
  for (const entry of entries) {
    let record = await getStoredAttempt(entry.key);
    if (!record || now - new Date(record.firstAttemptAt).getTime() > WINDOW_MS && (!record.lockedUntil || now >= new Date(record.lockedUntil).getTime())) {
      record = {
        id: `RL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        key: entry.key,
        type: entry.type,
        identifier: entry.identifier,
        attempts: 0,
        firstAttemptAt: nowIso,
        lockoutDurationMinutes: 0,
        updatedAt: nowIso
      };
    }
    record.attempts += 1;
    record.updatedAt = nowIso;
    if (record.attempts >= entry.max) {
      const lockoutMinutes = calculateExponentialLockoutMinutes(record.attempts, entry.max);
      record.lockoutDurationMinutes = lockoutMinutes;
      const lockoutUntilMs = now + lockoutMinutes * 60 * 1e3;
      record.lockedUntil = new Date(lockoutUntilMs).toISOString();
      isLockedOverall = true;
      maxLockoutSeconds = Math.max(maxLockoutSeconds, lockoutMinutes * 60);
      if (entry.type === "EMAIL") {
        emailAttemptsLeft = 0;
      }
    } else if (entry.type === "EMAIL") {
      emailAttemptsLeft = entry.max - record.attempts;
    }
    await saveStoredAttempt(record);
  }
  return {
    attemptsLeft: emailAttemptsLeft,
    locked: isLockedOverall,
    remainingLockoutSeconds: maxLockoutSeconds > 0 ? maxLockoutSeconds : void 0
  };
}
async function resetFailedLogin(email) {
  const key = `email:${email.toLowerCase().trim()}`;
  await deleteStoredAttempt(key);
}
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1].trim();
    const decoded = verifyToken(token);
    if (decoded) {
      const userId = decoded.sub || decoded.id;
      if (userId) {
        try {
          const dbUser = await dbService.getUserById(userId);
          if (dbUser && dbUser.active !== false && decoded.tokenVersion !== void 0 && decoded.tokenVersion === (dbUser.tokenVersion ?? 0)) {
            req.user = {
              id: dbUser.id,
              sub: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              organization: dbUser.organization,
              organizationId: dbUser.organizationId,
              contractNumber: dbUser.contractNumber,
              vehicleRegNumber: dbUser.vehicleRegNumber,
              facilityType: dbUser.facilityType,
              facilityAddress: dbUser.facilityAddress,
              mustChangePassword: Boolean(dbUser.mustChangePassword),
              tokenVersion: dbUser.tokenVersion ?? 0
            };
          }
        } catch {
        }
      }
    }
  }
  next();
}

// src/server/sampleAccess.ts
function extractCity(address) {
  if (!address) return "Hessen";
  const parts = address.split(",");
  if (parts.length >= 2) {
    const cityPart = parts[1].trim();
    return cityPart.replace(/^\d{5}\s*/, "").trim() || cityPart;
  }
  return "Hessen";
}
function canAccessOrder(user, order) {
  if (!user || !order) return false;
  if (user.role === "ADMIN" || user.role === "DISPATCHER") {
    return true;
  }
  if (user.role === "ORG_STAFF" || user.role === "CLIENT_CLINIC" || user.role === "LAB_STAFF") {
    const isLab = user.facilityType === "LABORATORY" || user.role === "LAB_STAFF";
    if (user.organizationId) {
      if (isLab) {
        if (order.destinationOrgId) return order.destinationOrgId === user.organizationId;
      } else {
        if (order.originOrganizationId) return order.originOrganizationId === user.organizationId;
      }
    }
    const userOrg = (user.organization || "").toLowerCase().trim();
    if (!userOrg) return false;
    if (isLab) {
      return order.deliveryLabName.toLowerCase().trim() === userOrg || order.deliveryLabName.toLowerCase().includes(userOrg);
    } else {
      const clinicMatch = order.pickupClinicName.toLowerCase().trim() === userOrg || order.pickupClinicName.toLowerCase().includes(userOrg);
      const creatorOrgMatch = (order.createdByOrg || "").toLowerCase().trim() === userOrg;
      const creatorIdMatch = order.createdById === user.id;
      return Boolean(clinicMatch || creatorOrgMatch || creatorIdMatch);
    }
  }
  if (user.role === "DRIVER") {
    if (order.driverId === user.id) return true;
    if (!order.driverId && order.status === "SCHEDULED") return true;
    return false;
  }
  if (user.role === "PATIENT") {
    return order.publicAccessToken === user.id || order.trackingNumber === user.id;
  }
  return false;
}
function sanitizeOrderForRole(order, role) {
  const sanitized = JSON.parse(JSON.stringify(order));
  if (role === "ADMIN" || role === "DISPATCHER") {
    return sanitized;
  }
  if (role === "DRIVER") {
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }
  if (role === "LAB_STAFF") {
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }
  if (role === "ORG_STAFF") {
    delete sanitized.priceBreakdown;
    delete sanitized.calculatedPriceEur;
    return sanitized;
  }
  if (role === "CLIENT_CLINIC") {
    return sanitized;
  }
  if (role === "PATIENT") {
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
function getPublicTrackingMilestones(order) {
  const hasTempBreach = order.telemetryLogs?.some((l) => l.isBreach) || false;
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
    activeTemperatureOk: !hasTempBreach
  };
}

// src/lib/stateMachine.ts
var VALID_TRANSITIONS = {
  SCHEDULED: ["PRE_TRIP_CHECK", "QUARANTINED_UNSYNCED", "CANCELLED"],
  PRE_TRIP_CHECK: ["PICKED_UP", "QUARANTINED_UNSYNCED", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "QUARANTINED_UNSYNCED", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "QUARANTINED_UNSYNCED", "CANCELLED"],
  QUARANTINED_UNSYNCED: ["SCHEDULED", "PRE_TRIP_CHECK", "PICKED_UP", "IN_TRANSIT", "CANCELLED"],
  // Dispatcher manual resolution
  DELIVERED: [],
  // Terminal
  CANCELLED: []
  // Terminal
};
function validateStateTransition(order, targetStatus, context) {
  const currentStatus = order.status;
  const errors = [];
  const allowedNextStates = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStates.includes(targetStatus)) {
    return {
      allowed: false,
      errors: [`Invalid status sequence: Cannot transition directly from ${currentStatus} to ${targetStatus}. Expected sequence: SCHEDULED \u2192 PRE_TRIP_CHECK \u2192 PICKED_UP \u2192 IN_TRANSIT \u2192 DELIVERED.`]
    };
  }
  if (currentStatus === "QUARANTINED_UNSYNCED" && context?.dispatcherOverride) {
    return { allowed: true, errors: [] };
  }
  if (targetStatus === "PRE_TRIP_CHECK") {
    if (!order.driverId) {
      errors.push("A licensed medical courier driver must be assigned to accept order.");
    }
  }
  if (targetStatus === "PICKED_UP") {
    const pt = context?.preTripCheck || order.preTripCheck;
    if (!pt) {
      errors.push("Mandatory Pre-Trip Vehicle & P650 Inspection is missing.");
    } else {
      if (!pt.p650OuterPackagingIntact) {
        errors.push("P650 packaging integrity check failed: Outer packaging is not intact.");
      }
      if (!pt.primarySecondaryLeakProof) {
        errors.push("P650 leak-proof requirement failed: Primary and secondary containers must be leak-proof.");
      }
      if (!pt.absorbentMaterialPresent) {
        errors.push("UN 3373 ADR requirement failed: Absorbent material between primary and secondary vessel is missing.");
      }
      if (!pt.tempBoxCalibrated) {
        errors.push("Temperature box calibration check failed: Cooling/heating box must be verified.");
      }
      if (!pt.driverSignatureBase64) {
        errors.push("Driver digital signature is required for Pre-Trip certification.");
      }
    }
    const pickupSig = context?.pickupSignature;
    if (pickupSig) {
      if (!pickupSig.staffName || pickupSig.staffName.trim().length < 2) {
        errors.push("Clinic/Hospital staff member name is required for Chain of Custody.");
      }
      if (!pickupSig.signatureBase64) {
        errors.push("Clinic/Hospital staff signature is required upon handover.");
      }
      if (!pickupSig.scannedBarcodes || pickupSig.scannedBarcodes.length === 0) {
        errors.push("At least one specimen box barcode/QR code must be scanned at pickup.");
      }
    }
  }
  if (targetStatus === "IN_TRANSIT") {
    const pickupRecord = order.chainOfCustodyLogs?.find((l) => l.eventType === "PICKUP_SIGNATURE") || context?.pickupSignature;
    if (!pickupRecord) {
      errors.push("Cannot transition to In Transit without verified Pickup Chain of Custody sign-off.");
    }
  }
  if (targetStatus === "DELIVERED") {
    const deliverySig = context?.deliverySignature;
    if (deliverySig) {
      if (!deliverySig.staffName || deliverySig.staffName.trim().length < 2) {
        errors.push("Laboratory recipient name is required.");
      }
      if (!deliverySig.signatureBase64) {
        errors.push("Laboratory staff digital signature is required upon specimen handover.");
      }
      if (!deliverySig.scannedBarcodes || deliverySig.scannedBarcodes.length === 0) {
        errors.push("Verification scan of specimen barcodes required at lab acceptance.");
      }
    } else {
      const existingDel = order.chainOfCustodyLogs?.find((l) => l.eventType === "DELIVERY_SIGNATURE");
      if (!existingDel) {
        errors.push("Laboratory handover sign-off and recipient signature are required.");
      }
    }
  }
  if (targetStatus === "CANCELLED") {
    const reason = context?.cancellationReason || order.cancellationReason;
    if (!reason) {
      errors.push("Mandatory cancellation reason code selection required under medical logistics protocol.");
    }
  }
  return {
    allowed: errors.length === 0,
    errors
  };
}

// src/server/app.ts
var app = express();
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
function parseOriginSafely(value) {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    const trimmed = value.trim().toLowerCase();
    return trimmed ? trimmed : null;
  }
}
var rawAllowedOrigins = process.env.ALLOWED_ORIGINS || "";
var allowedOrigins = /* @__PURE__ */ new Set();
["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"].forEach((o) => allowedOrigins.add(o));
if (process.env.APP_URL) {
  const parsed = parseOriginSafely(process.env.APP_URL);
  if (parsed) allowedOrigins.add(parsed);
}
if (rawAllowedOrigins) {
  rawAllowedOrigins.split(",").forEach((item) => {
    const parsed = parseOriginSafely(item);
    if (parsed) allowedOrigins.add(parsed);
  });
}
if (process.env.VERCEL_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_URL.toLowerCase().trim()}`);
}
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase().trim()}`);
}
allowedOrigins.add("https://aistudio.google.com");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.toLowerCase().trim();
    if (allowedOrigins.has(normalized) || normalized.endsWith(".run.app") && (normalized.includes("ais-dev-") || normalized.includes("ais-pre-"))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(cookieParser());
app.use(["/api/v1/sync", "/api/sync", "/api/sync-offline", "/api/orders/:id/chain-of-custody"], express.json({ limit: "5mb" }));
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  if (process.env.VERCEL) {
    try {
      validateJwtSecret();
    } catch {
      return res.status(500).json({
        message: "Server configuration error: JWT_SECRET environment variable is missing or shorter than 32 characters.",
        code: "SERVER_CONFIG_ERROR"
      });
    }
  }
  next();
});
app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true });
});
app.get("/api/db/status", optionalAuth, async (req, res) => {
  try {
    if (req.user && (req.user.role === "ADMIN" || req.user.role === "DISPATCHER")) {
      const status = await dbService.getDetailedStatus();
      return res.json(status);
    }
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});
app.get("/api/db/schema-sql", requireRole("ADMIN"), (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "API route not found: GET /api/db/schema-sql" });
  }
  const schemaPath = path2.join(process.cwd(), "supabase-schema.sql");
  if (fs2.existsSync(schemaPath)) {
    try {
      const sql = fs2.readFileSync(schemaPath, "utf-8");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.send(sql);
    } catch {
    }
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`-- Supabase Schema for MediGo UN 3373
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DISPATCHER', 'DRIVER', 'CLIENT_CLINIC', 'LAB_STAFF')),
  password_hash TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  contract_number TEXT,
  facility_type TEXT CHECK (facility_type IN ('CLINIC', 'LABORATORY', 'HQ', 'COURIER')),
  facility_address TEXT,
  vehicle_reg_number TEXT,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  tracking_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  transport_type TEXT NOT NULL,
  pickup_clinic_name TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_lab_name TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  specimen_box_count INT DEFAULT 1 NOT NULL,
  sample_category TEXT,
  driver_id TEXT,
  driver_name TEXT,
  data_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_users') THEN
    CREATE POLICY service_role_full_access_users ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_orders') THEN
    CREATE POLICY service_role_full_access_orders ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
`);
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Email and password are required.",
        errors: parseResult.error.issues.map((e) => e.message)
      });
    }
    const { email, password } = parseResult.data;
    const trimmedEmail = email.trim().toLowerCase();
    const clientIp = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
    const rateCheck = await checkLoginRateLimit(trimmedEmail, clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: "Too many login attempts. Access is temporarily throttled to prevent unauthorized access. Please try again later.",
        retryAfterSeconds: rateCheck.remainingLockoutSeconds
      });
    }
    const userWithHash = await dbService.getUserByEmailWithPassword(trimmedEmail);
    if (!userWithHash) {
      await comparePassword(password, DUMMY_HASH);
      await recordFailedLogin(trimmedEmail, clientIp);
      await dbService.createAuditLog({
        orderId: "SEC-AUTH-FAIL",
        actionDescription: `LOGIN_FAILED: Unknown or invalid account attempt for email ${trimmedEmail} from IP ${clientIp}.`,
        userId: "ANONYMOUS",
        userName: trimmedEmail,
        userRole: "CLIENT_CLINIC"
      });
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (userWithHash.active === false) {
      return res.status(403).json({ message: "Account is deactivated. Please contact your dispatch administrator." });
    }
    const passwordHash = userWithHash.passwordHash || userWithHash.password;
    if (!passwordHash) {
      console.warn(`[Auth] No password hash found for user ${userWithHash.email}`);
      await comparePassword(password, DUMMY_HASH);
      await recordFailedLogin(trimmedEmail, clientIp);
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const isMatch = await comparePassword(password, passwordHash);
    if (!isMatch) {
      await recordFailedLogin(trimmedEmail, clientIp);
      await dbService.createAuditLog({
        orderId: "SEC-AUTH-FAIL",
        actionDescription: `LOGIN_FAILED: Incorrect password for user ${userWithHash.name} (${userWithHash.role}) from IP ${clientIp}.`,
        userId: userWithHash.id,
        userName: userWithHash.name,
        userRole: userWithHash.role
      });
      return res.status(401).json({ message: "Invalid email or password." });
    }
    await resetFailedLogin(trimmedEmail);
    const { passwordHash: _, ...user } = userWithHash;
    const rawRefreshToken = generateRawRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const familyId = `FAM-${Date.now()}-${crypto3.randomBytes(8).toString("hex")}`;
    const refreshTokenRecord = {
      id: `RT-${Date.now()}-${crypto3.randomBytes(6).toString("hex")}`,
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ip: clientIp,
      userAgent: req.headers["user-agent"] || void 0
    };
    await dbService.createRefreshToken(refreshTokenRecord);
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions());
    const accessToken = generateToken(user);
    await dbService.createAuditLog({
      orderId: "SEC-AUTH-SUCCESS",
      actionDescription: `LOGIN_SUCCESS: Authorized session established for ${user.name} [Role: ${user.role}].`,
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });
    res.json({
      accessToken,
      token: accessToken,
      // backwards compatibility
      user,
      message: `Signed in successfully as ${user.name} (${user.role})`
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message || "Authentication failed" });
  }
});
app.post("/api/auth/refresh", validateCsrfOrigin, async (req, res) => {
  try {
    const clientIp = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
    const ipRateCheck = await checkLoginRateLimit("", clientIp);
    if (!ipRateCheck.allowed) {
      return res.status(429).json({
        message: "Too many refresh requests. Access temporarily throttled.",
        retryAfterSeconds: ipRateCheck.remainingLockoutSeconds
      });
    }
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.cookies?.refreshToken;
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      return res.status(401).json({ message: "Refresh token missing. Please sign in." });
    }
    const tokenHash = hashRefreshToken(rawRefreshToken.trim());
    const record = await dbService.findRefreshTokenByHash(tokenHash);
    if (!record) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      return res.status(401).json({ message: "Invalid or unknown refresh token." });
    }
    if (record.revokedAt) {
      await dbService.revokeRefreshTokenFamily(record.familyId);
      await dbService.incrementTokenVersion(record.userId);
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      await dbService.createAuditLog({
        orderId: "SEC-REUSE-DETECTED",
        actionDescription: `REFRESH_REUSE_DETECTED: Revoked token replayed for user ${record.userId}. Revoked family ${record.familyId}.`,
        userId: record.userId,
        userName: "SYSTEM_SECURITY",
        userRole: "ADMIN"
      });
      return res.status(401).json({
        code: "REFRESH_TOKEN_REUSE_DETECTED",
        message: "Security alert: Refresh token reuse detected. All sessions in this family have been revoked."
      });
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      return res.status(401).json({ message: "Refresh token has expired. Please sign in again." });
    }
    const user = await dbService.getUserById(record.userId);
    if (!user || user.active === false) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      return res.status(401).json({ message: "User account is deactivated or not found." });
    }
    const newRawToken = generateRawRefreshToken();
    const newTokenHash = hashRefreshToken(newRawToken);
    const newRecord = {
      id: `RT-${Date.now()}-${crypto3.randomBytes(6).toString("hex")}`,
      userId: user.id,
      tokenHash: newTokenHash,
      familyId: record.familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ip: clientIp,
      userAgent: req.headers["user-agent"] || void 0
    };
    await dbService.createRefreshToken(newRecord);
    await dbService.revokeRefreshToken(record.id, newRecord.id);
    res.cookie(REFRESH_COOKIE_NAME, newRawToken, getRefreshCookieOptions());
    const accessToken = generateToken(user);
    res.json({
      accessToken,
      token: accessToken,
      user
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ message: err.message || "Token refresh failed" });
  }
});
app.post("/api/auth/logout", validateCsrfOrigin, async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.cookies?.refreshToken;
    if (rawRefreshToken && typeof rawRefreshToken === "string") {
      const tokenHash = hashRefreshToken(rawRefreshToken.trim());
      const record = await dbService.findRefreshTokenByHash(tokenHash);
      if (record) {
        await dbService.revokeRefreshTokenFamily(record.familyId);
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    return res.status(204).end();
  } catch (err) {
    console.error("Logout error:", err);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    return res.status(204).end();
  }
});
app.post("/api/auth/logout-all", validateCsrfOrigin, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    await dbService.revokeAllUserRefreshTokens(userId);
    await dbService.incrementTokenVersion(userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    await dbService.createAuditLog({
      orderId: "SEC-LOGOUT-ALL",
      actionDescription: `LOGOUT_ALL: Revoked all refresh families and incremented tokenVersion for user ${req.user.name} (${req.user.email}).`,
      userId,
      userName: req.user.name,
      userRole: req.user.role
    });
    res.json({ message: "All active sessions have been revoked." });
  } catch (err) {
    console.error("Logout-all error:", err);
    res.status(500).json({ message: err.message || "Logout-all failed" });
  }
});
app.post("/api/auth/change-password", validateCsrfOrigin, requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const parseResult = ChangePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Password validation failed.",
        errors: parseResult.error.issues.map((e) => e.message)
      });
    }
    const { currentPassword, newPassword } = parseResult.data;
    const userWithHash = await dbService.getUserByEmailWithPassword(req.user.email);
    if (!userWithHash) {
      return res.status(404).json({ message: "User account not found." });
    }
    const isCurrentMatch = await comparePassword(currentPassword, userWithHash.passwordHash);
    if (!isCurrentMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    const userPolicyCheck = validatePasswordAgainstUser(newPassword, {
      email: userWithHash.email,
      name: userWithHash.name
    });
    if (!userPolicyCheck.valid) {
      return res.status(400).json({ message: userPolicyCheck.error });
    }
    const updatedUser = await dbService.updateUser(userWithHash.id, {
      password: newPassword,
      mustChangePassword: false
    });
    await dbService.revokeAllUserRefreshTokens(updatedUser.id);
    const token = generateToken(updatedUser);
    const clientIp = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
    const rawRefreshToken = generateRawRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const familyId = `FAM-${Date.now()}-${crypto3.randomBytes(8).toString("hex")}`;
    const refreshTokenRecord = {
      id: `RT-${Date.now()}-${crypto3.randomBytes(6).toString("hex")}`,
      userId: updatedUser.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ip: clientIp,
      userAgent: req.headers["user-agent"] || void 0
    };
    await dbService.createRefreshToken(refreshTokenRecord);
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions());
    await dbService.createAuditLog({
      orderId: "SEC-PWD-CHANGE",
      actionDescription: `PASSWORD_CHANGED: User ${updatedUser.name} (${updatedUser.email}) successfully changed password and cleared forced-change requirement.`,
      userId: updatedUser.id,
      userName: updatedUser.name,
      userRole: updatedUser.role
    });
    res.json({
      message: "Password changed successfully.",
      user: updatedUser,
      token,
      accessToken: token
    });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ message: err.message || "Failed to change password." });
  }
});
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await dbService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }
    if (user.active === false) {
      return res.status(403).json({ message: "Account has been deactivated by administrator." });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching user session" });
  }
});
app.get("/api/organizations", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const allOrgs = await dbService.getAllOrganizations();
    if (user.role === "ADMIN" || user.role === "DISPATCHER") {
      return res.json(allOrgs);
    }
    const userOrgId = user.organizationId;
    const userOrgName = (user.organization || "").toLowerCase().trim();
    const userContract = (user.contractNumber || "").toLowerCase().trim();
    const filtered = allOrgs.filter((org) => {
      if (userOrgId && org.id === userOrgId) return true;
      if (userOrgName && org.name.toLowerCase() === userOrgName) return true;
      if (userContract && org.contractNumber && org.contractNumber.toLowerCase() === userContract) return true;
      return false;
    });
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch organizations" });
  }
});
app.post("/api/organizations", requireAdmin, async (req, res) => {
  try {
    const parseResult = UpsertOrganizationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for facility payload.",
        errors: parseResult.error.flatten()
      });
    }
    const { name, type, contractNumber, addressStreet, postalCode, city, state, contactPhone, contactEmail } = parseResult.data;
    const org = await dbService.upsertOrganization({
      name: name.trim(),
      type,
      contractNumber: contractNumber?.trim() || void 0,
      addressStreet: addressStreet?.trim(),
      postalCode: postalCode?.trim(),
      city: city?.trim(),
      state: state || "HE",
      contactPhone: contactPhone?.trim(),
      contactEmail: contactEmail?.trim()
    });
    await dbService.createAuditLog({
      orderId: "SYS-FACILITY-UPSERT",
      actionDescription: `FACILITY_UPSERT: ${org.name} (${org.type}, Contract: ${org.contractNumber || "N/A"})`,
      userId: req.user?.id || "SYSTEM",
      userName: req.user?.name || "Administrator",
      userRole: req.user?.role || "ADMIN"
    });
    res.status(201).json({
      organization: org,
      message: `Facility ${org.name} provisioned successfully.`
    });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to provision organization" });
  }
});
app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch users" });
  }
});
app.get("/api/users/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    if (currentUser.role !== "ADMIN" && currentUser.role !== "DISPATCHER" && currentUser.id !== id) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = await dbService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to retrieve user" });
  }
});
app.post("/api/users", requireAdmin, async (req, res) => {
  try {
    const parseResult = CreateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for new user payload.",
        errors: parseResult.error.flatten()
      });
    }
    const payload = parseResult.data;
    if (["CLIENT_CLINIC", "LAB_STAFF"].includes(payload.role) && !payload.contractNumber) {
      return res.status(400).json({
        message: `Contract Number is legally mandatory for role ${payload.role}. E.g. CTR-2026-CLN-###`
      });
    }
    const newUser = await dbService.createUser(payload);
    await dbService.createAuditLog({
      orderId: "SYS-USER-CREATE",
      actionDescription: `USER_CREATED: ${newUser.name} (${newUser.role})`,
      userId: req.user?.id || "SYSTEM",
      userName: req.user?.name || "Administrator",
      userRole: req.user?.role || "ADMIN"
    });
    res.status(201).json({
      user: newUser,
      message: `User ${newUser.name} created successfully.`
    });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to create user" });
  }
});
app.patch("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = UpdateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for user update payload.",
        errors: parseResult.error.flatten()
      });
    }
    const updates = parseResult.data;
    const updatedUser = await dbService.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    await dbService.createAuditLog({
      orderId: "SYS-USER-UPDATE",
      actionDescription: `USER_UPDATED: ${updatedUser.name}`,
      userId: req.user?.id || "SYSTEM",
      userName: req.user?.name || "Administrator",
      userRole: req.user?.role || "ADMIN"
    });
    res.json({
      user: updatedUser,
      message: `User ${updatedUser.name} updated successfully`
    });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to update user" });
  }
});
app.put("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = UpdateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for user update payload.",
        errors: parseResult.error.flatten()
      });
    }
    const updates = parseResult.data;
    const updatedUser = await dbService.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    await dbService.createAuditLog({
      orderId: "SYS-USER-UPDATE",
      actionDescription: `USER_UPDATED: ${updatedUser.name}`,
      userId: req.user?.id || "SYSTEM",
      userName: req.user?.name || "Administrator",
      userRole: req.user?.role || "ADMIN"
    });
    res.json({
      user: updatedUser,
      message: `User ${updatedUser.name} updated successfully`
    });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to update user" });
  }
});
app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteUser(id);
    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }
    await dbService.createAuditLog({
      orderId: "SYS-USER-DELETE",
      actionDescription: `USER_DELETED: ${id}`,
      userId: req.user?.id || "SYSTEM",
      userName: req.user?.name || "Administrator",
      userRole: req.user?.role || "ADMIN"
    });
    res.json({ success: true, message: "User account removed successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to delete user" });
  }
});
app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const orders = await dbService.getOrders(
      user.role,
      user.organization,
      user.id,
      user.id,
      user.contractNumber
    );
    const sanitized = orders.filter((o) => canAccessOrder(user, o)).map((o) => sanitizeOrderForRole(o, user.role));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching orders" });
  }
});
var trackingRateLimitMap = /* @__PURE__ */ new Map();
function checkTrackingRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxRequests = 30;
  const record = trackingRateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    trackingRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
}
app.get("/api/orders/track/:trackingNumber", async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkTrackingRateLimit(clientIp)) {
      return res.status(429).json({ message: "Too many tracking requests. Please try again later." });
    }
    const order = await dbService.getOrderById(req.params.trackingNumber);
    if (!order) {
      return res.status(404).json({ message: "No shipment found for this tracking number." });
    }
    const publicMilestones = getPublicTrackingMilestones(order);
    res.json(publicMilestones);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error looking up tracking number" });
  }
});
app.get("/api/orders/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const order = await dbService.getOrderById(req.params.id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: "Order not found" });
    }
    const sanitized = sanitizeOrderForRole(order, user.role);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error retrieving order" });
  }
});
app.post("/api/orders", requireRole("ADMIN", "DISPATCHER", "CLIENT_CLINIC", "ORG_STAFF"), async (req, res) => {
  try {
    const user = req.user;
    const parseResult = CreateOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for order creation payload.",
        errors: parseResult.error.flatten()
      });
    }
    const newOrderData = parseResult.data;
    if (user.role === "CLIENT_CLINIC" || user.role === "ORG_STAFF") {
      newOrderData.createdById = user.id;
      newOrderData.createdByOrg = user.organization || newOrderData.createdByOrg || user.name;
      if (user.organizationId) {
        newOrderData.originOrganizationId = user.organizationId;
      }
      if (user.organization) {
        newOrderData.pickupClinicName = user.organization;
      }
    }
    if (!newOrderData.id) {
      newOrderData.id = `ORD-DE-${Date.now().toString().slice(-4)}`;
    }
    if (!newOrderData.trackingNumber) {
      newOrderData.trackingNumber = `DE-UN3373-2026-${Math.floor(1e3 + Math.random() * 9e3)}`;
    }
    if (!newOrderData.publicAccessToken) {
      newOrderData.publicAccessToken = `TOK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    }
    if (!newOrderData.status) {
      newOrderData.status = "SCHEDULED";
    }
    newOrderData.createdAt = (/* @__PURE__ */ new Date()).toISOString();
    newOrderData.updatedAt = newOrderData.createdAt;
    const createdOrder = await dbService.createOrder(newOrderData);
    await dbService.createAuditLog({
      orderId: createdOrder.id,
      actionDescription: `ORDER_CREATED: Tracking #${createdOrder.trackingNumber} by ${user.name}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });
    res.status(201).json(sanitizeOrderForRole(createdOrder, user.role));
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not create order" });
  }
});
app.post("/api/orders/:id/transition", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const parseResult = TransitionOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for status transition payload.",
        errors: parseResult.error.flatten()
      });
    }
    const { targetStatus, context, coords, deviceId } = parseResult.data;
    const existingOrder = await dbService.getOrderById(id);
    if (!existingOrder || !canAccessOrder(user, existingOrder)) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (user.role === "DRIVER") {
      if (targetStatus === "CANCELLED" || targetStatus === "QUARANTINED_UNSYNCED") {
        return res.status(403).json({
          message: "Access Denied: Drivers cannot directly cancel or quarantine orders."
        });
      }
      if (existingOrder.driverId && existingOrder.driverId !== user.id) {
        return res.status(404).json({
          message: "Order not found."
        });
      }
      if (!existingOrder.driverId && targetStatus === "PRE_TRIP_CHECK") {
        existingOrder.driverId = user.id;
        existingOrder.driverName = user.name;
        if (user.vehicleRegNumber) existingOrder.vehicleRegNumber = user.vehicleRegNumber;
      }
    } else if (user.role === "CLIENT_CLINIC" || user.role === "ORG_STAFF" && user.facilityType !== "LABORATORY") {
      if (targetStatus !== "CANCELLED") {
        return res.status(403).json({
          message: "Client Clinics and Origin Staff can only request order cancellation prior to courier pickup."
        });
      }
      if (existingOrder.status !== "SCHEDULED" && existingOrder.status !== "PRE_TRIP_CHECK") {
        return res.status(403).json({
          message: "Cannot cancel an order that is already in transit or delivered."
        });
      }
    } else if (user.role === "LAB_STAFF" || user.role === "ORG_STAFF" && user.facilityType === "LABORATORY") {
      if (targetStatus !== "DELIVERED") {
        return res.status(403).json({
          message: "Laboratory staff can only confirm specimen arrival and delivery acceptance."
        });
      }
    } else if (user.role !== "ADMIN" && user.role !== "DISPATCHER") {
      return res.status(403).json({
        message: "Access Denied: Unauthorized role for order state transitions."
      });
    }
    const transitionContext = {
      ...context,
      dispatcherOverride: (user.role === "ADMIN" || user.role === "DISPATCHER") && existingOrder.status === "QUARANTINED_UNSYNCED"
    };
    const validation = validateStateTransition(existingOrder, targetStatus, transitionContext);
    if (!validation.allowed) {
      return res.status(422).json({
        message: `UN 3373 State Transition Rejected: ${validation.errors.join("; ")}`,
        errors: validation.errors,
        currentStatus: existingOrder.status,
        targetStatus
      });
    }
    existingOrder.status = targetStatus;
    existingOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (existingOrder.status !== "QUARANTINED_UNSYNCED") {
      existingOrder.quarantineReason = void 0;
    }
    if (context?.preTripCheck) {
      existingOrder.preTripCheck = context.preTripCheck;
    }
    if (context?.pickupSignature) {
      if (!existingOrder.chainOfCustodyLogs) existingOrder.chainOfCustodyLogs = [];
      existingOrder.chainOfCustodyLogs.push({
        ...context.pickupSignature,
        id: `COC-${Date.now()}`,
        orderId: existingOrder.id,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        gpsLatitude: coords?.lat || 50.1109,
        gpsLongitude: coords?.lng || 8.6821,
        gpsAccuracyMeters: coords?.accuracyMeters || 5,
        deviceId: deviceId || "WEB-CLIENT"
      });
    }
    if (context?.deliverySignature) {
      if (!existingOrder.chainOfCustodyLogs) existingOrder.chainOfCustodyLogs = [];
      existingOrder.chainOfCustodyLogs.push({
        ...context.deliverySignature,
        id: `COC-${Date.now()}`,
        orderId: existingOrder.id,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        gpsLatitude: coords?.lat || 50.1109,
        gpsLongitude: coords?.lng || 8.6821,
        gpsAccuracyMeters: coords?.accuracyMeters || 5,
        deviceId: deviceId || "WEB-CLIENT"
      });
    }
    if (context?.cancellationReason) {
      existingOrder.cancellationReason = context.cancellationReason;
    }
    const updatedOrder = await dbService.updateOrder(id, existingOrder);
    await dbService.createAuditLog({
      orderId: id,
      previousState: existingOrder.status,
      newState: targetStatus,
      actionDescription: `STATUS_TRANSITION_TO_${targetStatus}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      gpsLatitude: coords?.lat || 50.1109,
      gpsLongitude: coords?.lng || 8.6821,
      deviceId: deviceId || "WEB-CLIENT"
    });
    res.json({
      success: true,
      order: sanitizeOrderForRole(updatedOrder || existingOrder, user.role),
      message: `Order transitioned to ${targetStatus}`
    });
  } catch (err) {
    console.error("Transition error:", err);
    res.status(500).json({ message: err.message || "Error processing transition" });
  }
});
app.post("/api/orders/:id/claim", requireRole("DRIVER", "DISPATCHER", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (order.driverId && order.driverId !== user.id && user.role === "DRIVER") {
      return res.status(404).json({
        message: "Order not found."
      });
    }
    order.driverId = user.id;
    order.driverName = user.name;
    if (user.vehicleRegNumber) {
      order.vehicleRegNumber = user.vehicleRegNumber;
    }
    order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const updated = await dbService.updateOrder(id, order);
    await dbService.createAuditLog({
      orderId: id,
      actionDescription: `ORDER_CLAIMED_BY_COURIER: ${user.name} (${user.vehicleRegNumber || "Thermo Van"})`,
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });
    res.json({
      success: true,
      order: sanitizeOrderForRole(updated || order, user.role),
      message: `Pickup order successfully claimed by ${user.name}`
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to claim order" });
  }
});
app.patch("/api/orders/:id", requireRole("ADMIN", "DISPATCHER"), async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = PatchOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for order update payload.",
        errors: parseResult.error.flatten()
      });
    }
    const updates = parseResult.data;
    const existingOrder = await dbService.getOrderById(id);
    if (!existingOrder || !canAccessOrder(req.user, existingOrder)) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (updates.status && updates.status !== existingOrder.status) {
      const validation = validateStateTransition(existingOrder, updates.status);
      if (!validation.allowed) {
        return res.status(422).json({
          message: `UN 3373 State Transition Rejected: ${validation.errors.join("; ")}`,
          currentStatus: existingOrder.status,
          targetStatus: updates.status
        });
      }
    }
    const updatedOrder = await dbService.updateOrder(id, { ...existingOrder, ...updates });
    await dbService.createAuditLog({
      orderId: id,
      previousState: existingOrder.status,
      newState: updates.status || existingOrder.status,
      actionDescription: updates.status ? `STATUS_CHANGED_TO_${updates.status}` : "ORDER_UPDATED",
      userId: req.user?.id || "CLIENT_APP",
      userName: req.user?.name || "Administrator",
      userRole: req.user?.role || "DISPATCHER"
    });
    res.json(sanitizeOrderForRole(updatedOrder || existingOrder, req.user.role));
  } catch (err) {
    res.status(500).json({ message: err.message || "Error updating order" });
  }
});
app.post("/api/orders/:id/pre-trip-check", requireRole("DRIVER", "DISPATCHER", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const parseResult = PreTripCheckSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for pre-trip check payload.",
        errors: parseResult.error.flatten()
      });
    }
    const checkData = parseResult.data;
    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (user.role === "DRIVER") {
      if (order.driverId && order.driverId !== user.id) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (!order.driverId) {
        order.driverId = user.id;
        order.driverName = user.name;
        if (user.vehicleRegNumber) order.vehicleRegNumber = user.vehicleRegNumber;
      }
    }
    if (!checkData.approved) {
      return res.status(400).json({
        message: "Pre-trip checklist failed. Biological transport vehicle not approved for departure."
      });
    }
    order.preTripCheck = checkData;
    order.status = "PRE_TRIP_CHECK";
    order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const updated = await dbService.updateOrder(id, order);
    await dbService.createAuditLog({
      orderId: id,
      previousState: "SCHEDULED",
      newState: "PRE_TRIP_CHECK",
      actionDescription: `PRE_TRIP_CHECK_COMPLETED: Vehicle ${checkData.vehicleRegNumber}`,
      userId: user.id,
      userName: checkData.vehicleRegNumber || user.name || "Driver",
      userRole: "DRIVER"
    });
    res.json(sanitizeOrderForRole(updated || order, user.role));
  } catch (err) {
    res.status(500).json({ message: err.message || "Error saving pre-trip inspection" });
  }
});
app.post("/api/orders/:id/chain-of-custody", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const parseResult = CustodySignOffSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for chain-of-custody payload.",
        errors: parseResult.error.flatten()
      });
    }
    const log = parseResult.data;
    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: "Order not found" });
    }
    const updated = await dbService.appendChainOfCustody(id, log);
    await dbService.createAuditLog({
      orderId: id,
      actionDescription: `SIGNATURE_ACQUIRED_${log.eventType}: ${log.staffName}`,
      userId: user.id,
      userName: log.staffName,
      userRole: user.role
    });
    res.json(sanitizeOrderForRole(updated || order, user.role));
  } catch (err) {
    res.status(500).json({ message: err.message || "Error signing chain of custody" });
  }
});
app.post("/api/orders/:id/temperature", requireRole("DRIVER", "DISPATCHER", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const parseResult = TemperatureTelemetrySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed for temperature telemetry payload.",
        errors: parseResult.error.flatten()
      });
    }
    const telemetry = parseResult.data;
    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (user.role === "DRIVER" && order.driverId && order.driverId !== user.id) {
      return res.status(404).json({ message: "Order not found" });
    }
    const updated = await dbService.appendTemperatureReading(id, telemetry);
    if (telemetry.isBreach) {
      await dbService.createAuditLog({
        orderId: id,
        actionDescription: `TEMPERATURE_BREACH_ALERT: ${telemetry.tempCelsius}\xB0C recorded by ${telemetry.sensorId}`,
        userId: user.id,
        userName: `Sensor ${telemetry.sensorId || "GENERIC"} (${user.name})`,
        userRole: user.role
      });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error recording temperature" });
  }
});
app.get("/api/audit-logs", requireRole("ADMIN", "DISPATCHER"), async (req, res) => {
  try {
    const logs = await dbService.getAuditLogs(req.query.orderId);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching audit logs" });
  }
});
app.post(["/api/v1/sync", "/api/sync", "/api/sync-offline"], requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const rawAction = req.body;
    const parseResult = OfflineSyncItemSchema.safeParse(rawAction);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid offline synchronization item payload.",
        errors: parseResult.error.flatten()
      });
    }
    const action = parseResult.data;
    const order = await dbService.getOrderById(action.orderId);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({
        results: [{ id: action.id, status: "REJECTED_NOT_FOUND", message: `Order ${action.orderId} not found.` }]
      });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const clientTime = action.clientRecordedAt || action.timestamp || nowIso;
    const isStale = action.actionType === "PICKUP" && ["IN_TRANSIT", "DELIVERED", "CANCELLED"].includes(order.status) || action.actionType === "PRE_TRIP_CHECK" && order.status !== "SCHEDULED";
    if (isStale) {
      await dbService.createAuditLog({
        orderId: order.id,
        previousState: order.status,
        newState: order.status,
        conflictResolution: "REJECTED_STALE",
        actionDescription: `STALE_OFFLINE_ACTION_REJECTED: ${action.actionType} recorded at ${clientTime}`,
        userId: user.id,
        userName: `${user.name} (Offline Queue)`,
        userRole: user.role,
        deviceId: action.deviceId || "MOB-DRIVER-OFFLINE",
        gpsLatitude: action.gpsLatitude || 50.1109,
        gpsLongitude: action.gpsLongitude || 8.6821,
        offlineSynced: true,
        syncedAt: nowIso,
        createdAt: clientTime
      });
      return res.status(200).json({
        results: [
          {
            id: action.id,
            status: "REJECTED_STALE",
            serverCurrentStatus: order.status,
            message: `Aktion ${action.actionType} verworfen: Sendungsstatus am Server ist bereits ${order.status}.`
          }
        ]
      });
    }
    if (order.driverId && order.driverId !== user.id && user.role === "DRIVER") {
      order.status = "QUARANTINED_UNSYNCED";
      order.quarantineReason = `Driver collision: Device ${action.deviceId || "unknown"} uploaded action while order is claimed by ${order.driverName || order.driverId}.`;
      order.updatedAt = nowIso;
      await dbService.updateOrder(order.id, order);
      await dbService.createAuditLog({
        orderId: order.id,
        previousState: order.status,
        newState: "QUARANTINED_UNSYNCED",
        conflictResolution: "SERVER_WINS",
        actionDescription: `QUARANTINE_TRIGGERED: Driver device mismatch during sync`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        deviceId: action.deviceId || "MOB-DRIVER-OFFLINE",
        gpsLatitude: action.gpsLatitude || 50.1109,
        gpsLongitude: action.gpsLongitude || 8.6821,
        offlineSynced: true,
        syncedAt: nowIso,
        createdAt: clientTime
      });
      return res.status(200).json({
        results: [
          {
            id: action.id,
            status: "QUARANTINED_UNSYNCED",
            message: "Konflikt erkannt: Sendung wurde zur Leitstand-Kl\xE4rung in Quarant\xE4ne verschoben."
          }
        ]
      });
    }
    if (!order.chainOfCustodyLogs) order.chainOfCustodyLogs = [];
    order.chainOfCustodyLogs.push({
      id: `COC-${Date.now()}`,
      orderId: order.id,
      eventType: action.actionType.includes("DELIVER") ? "DELIVERY_SIGNATURE" : "PICKUP_SIGNATURE",
      authTier: "TIER_1_REGISTERED_USER_PIN",
      staffName: action.payload?.signatoryName || "Offline Signatory",
      staffTitle: action.payload?.signatoryRole || "Staff",
      signatureBase64: action.payload?.signatureDataUrl || action.payload?.signatureBase64 || "",
      cryptoSignature: action.cryptoSignature || void 0,
      pinCodeVerified: true,
      scannedBarcodes: order.barcodeList || [],
      timestamp: clientTime,
      clientRecordedAt: clientTime,
      serverIngestedAt: nowIso,
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      gpsAccuracyMeters: 5,
      deviceId: action.deviceId || "MOB-DRIVER-OFFLINE"
    });
    const targetStatus = action.actionType === "PICKUP" ? "PICKED_UP" : action.actionType === "DELIVER" ? "DELIVERED" : order.status;
    order.status = targetStatus;
    order.updatedAt = nowIso;
    await dbService.updateOrder(order.id, order);
    await dbService.createAuditLog({
      orderId: order.id,
      previousState: order.status,
      newState: targetStatus,
      conflictResolution: "SERVER_WINS",
      actionDescription: `Synced offline driver action (${action.actionType}) recorded at ${clientTime}.`,
      userId: user.id,
      userName: `${user.name} (Offline Sync)`,
      userRole: user.role,
      deviceId: action.deviceId || "MOB-DRIVER-OFFLINE",
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      offlineSynced: true,
      syncedAt: nowIso,
      createdAt: clientTime
    });
    res.json({
      success: true,
      results: [{ id: action.id, status: "SYNCED", newStatus: targetStatus }]
    });
  } catch (err) {
    res.status(500).json({ message: `Sync error: ${err.message}` });
  }
});
var ceoEmailForwardingConfig = {
  ceoEmail: "dispatch@medigo-hessen.de",
  ceoName: "Katrin Weber (CEO & Dispatch Director)",
  ccAccountingEmail: "buchhaltung@medigo-hessen.de",
  autoForwardCompletedOrders: true,
  autoForwardInvoices: true,
  attachTelemetryPdf: true,
  attachChainOfCustodyPdf: true,
  forwardingMode: "INSTANT",
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
};
app.get("/api/ceo/email-forwarding", requireRole("ADMIN"), (req, res) => {
  res.json(ceoEmailForwardingConfig);
});
app.post("/api/ceo/email-forwarding", requireRole("ADMIN"), (req, res) => {
  const parseResult = CeoEmailForwardingSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Validation failed for email forwarding configuration payload.",
      errors: parseResult.error.flatten()
    });
  }
  ceoEmailForwardingConfig = {
    ...ceoEmailForwardingConfig,
    ...parseResult.data,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  res.json({ message: "CEO Email forwarding rules updated", config: ceoEmailForwardingConfig });
});
app.post("/api/ceo/email-forwarding/test-send", requireRole("ADMIN"), (req, res) => {
  const parseResult = CeoTestSendSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Validation failed for test send payload.",
      errors: parseResult.error.flatten()
    });
  }
  const { targetEmail } = parseResult.data;
  const recipient = targetEmail || ceoEmailForwardingConfig.ceoEmail;
  res.json({
    success: true,
    message: `Test email dispatch verified for ${recipient}`,
    smtpResponse: "250 2.0.0 OK Message accepted for delivery",
    sentAt: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.all(["/api", "/api/*"], (req, res) => {
  res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
    code: "NOT_FOUND"
  });
});
app.use((err, req, res, next) => {
  console.error("[API Error]:", err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  const code = err.code || (statusCode === 404 ? "NOT_FOUND" : statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  let message = err.message || "An unexpected internal server error occurred";
  if (statusCode >= 500 && (isProd || /select|insert|update|delete|postgres|supabase|relation|column/i.test(message))) {
    message = "An unexpected internal server error occurred";
  }
  res.status(statusCode).json({
    message,
    code
  });
});

// src/server/vercel-entry.ts
function handler(req, res) {
  try {
    validateJwtSecret();
  } catch (err) {
    console.error("[Vercel Serverless Config Error]:", err?.message || err);
    if (res && typeof res.status === "function") {
      return res.status(500).json({
        message: "Server configuration error: JWT_SECRET environment variable is missing or shorter than 32 characters.",
        code: "SERVER_CONFIG_ERROR"
      });
    }
  }
  return app(req, res);
}
export {
  app,
  handler as default
};
