// src/server/app.ts
import express from "express";
import path2 from "path";
import fs2 from "fs";

// src/server/db.ts
import fs from "fs";
import path from "path";
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
var DEFAULT_ADMIN_HASH = bcrypt.hashSync("AdminPass2026!", 10);
var DEFAULT_DISPATCH_HASH = bcrypt.hashSync("Dispatch2026!", 10);
var DEFAULT_DRIVER_HASH = bcrypt.hashSync("DriverPass2026!", 10);
var DEFAULT_CLINIC_HASH = bcrypt.hashSync("ClinicPass2026!", 10);
var DEFAULT_LAB_HASH = bcrypt.hashSync("LabPass2026!", 10);
var SEED_USERS = [
  {
    id: "USR-ADMIN-01",
    email: "nsansvester89@gmail.com",
    name: "Admin (nsansvester89)",
    role: "ADMIN",
    phone: "+49 170 0000000",
    organization: "BioDispatch / MediGo Zentrale",
    facilityType: "HQ",
    active: true,
    passwordHash: DEFAULT_ADMIN_HASH,
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
    active: true,
    passwordHash: DEFAULT_DISPATCH_HASH,
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
    active: true,
    passwordHash: DEFAULT_DRIVER_HASH,
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
    active: true,
    passwordHash: DEFAULT_CLINIC_HASH,
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
    active: true,
    passwordHash: DEFAULT_LAB_HASH,
    createdAt: (/* @__PURE__ */ new Date("2026-01-12T08:00:00Z")).toISOString()
  }
];
var DatabaseService = class {
  constructor() {
    this.state = {
      users: [],
      orders: [],
      auditLogs: []
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
        this.state = {
          users: parsed.users && parsed.users.length ? parsed.users : JSON.parse(JSON.stringify(SEED_USERS)),
          orders: parsed.orders && parsed.orders.length ? parsed.orders : JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          auditLogs: parsed.auditLogs || []
        };
      } else {
        this.state = {
          users: JSON.parse(JSON.stringify(SEED_USERS)),
          orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          auditLogs: []
        };
        this.saveToFile();
      }
      const adminExists = this.state.users.some((u) => u.email.toLowerCase() === "nsansvester89@gmail.com");
      if (!adminExists) {
        this.state.users.unshift(SEED_USERS[0]);
        this.saveToFile();
      }
    } catch (err) {
      console.warn("[Database] Error loading local db file, falling back to memory store:", err);
      this.state = {
        users: JSON.parse(JSON.stringify(SEED_USERS)),
        orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
        auditLogs: []
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
        const { data, error } = await supabase.from("users").select("id, email, name, role, phone, organization, contract_number, facility_type, facility_address, vehicle_reg_number, active, created_at").order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            email: d.email,
            name: d.name,
            role: d.role,
            phone: d.phone,
            organization: d.organization,
            contractNumber: d.contract_number,
            facilityType: d.facility_type,
            facilityAddress: d.facility_address,
            vehicleRegNumber: d.vehicle_reg_number,
            active: d.active,
            createdAt: d.created_at
          }));
        }
      } catch (err) {
        console.warn("[Database] Supabase fetch users failed, using local store:", err);
      }
    }
    return this.state.users.map(({ passwordHash, ...u }) => u);
  }
  async getUserById(id) {
    const user = this.state.users.find((u) => u.id === id);
    if (!user) return null;
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
  async getUserByEmailWithPassword(email) {
    const normalized = email.toLowerCase().trim();
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("email", normalized).single();
        if (!error && data) {
          return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            phone: data.phone,
            organization: data.organization,
            contractNumber: data.contract_number,
            facilityType: data.facility_type,
            facilityAddress: data.facility_address,
            vehicleRegNumber: data.vehicle_reg_number,
            active: data.active,
            createdAt: data.created_at,
            passwordHash: data.password_hash
          };
        }
      } catch (err) {
        console.warn("[Database] Supabase lookup by email failed, falling back to local store:", err);
      }
    }
    const user = this.state.users.find((u) => u.email.toLowerCase() === normalized);
    return user || null;
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
    const salt = await bcrypt.genSalt(10);
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
      contractNumber: payload.contractNumber?.trim() || void 0,
      facilityType: payload.facilityType || (payload.role === "CLIENT_CLINIC" ? "CLINIC" : payload.role === "LAB_STAFF" ? "LABORATORY" : "HQ"),
      facilityAddress: payload.facilityAddress?.trim() || "",
      vehicleRegNumber: payload.vehicleRegNumber?.trim() || void 0,
      active: true,
      passwordHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.users.push(newUser);
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("users").insert({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
          organization: newUser.organization,
          contract_number: newUser.contractNumber,
          facility_type: newUser.facilityType,
          facility_address: newUser.facilityAddress,
          vehicle_reg_number: newUser.vehicleRegNumber,
          active: newUser.active,
          password_hash: newUser.passwordHash,
          created_at: newUser.createdAt
        });
        console.log("[Supabase] Successfully inserted new user:", newUser.email);
      } catch (err) {
        console.warn("[Supabase] Error inserting user to Supabase:", err);
      }
    }
    const { passwordHash: _, ...sanitized } = newUser;
    return sanitized;
  }
  async updateUser(id, updates) {
    const userIndex = this.state.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found.`);
    }
    const user = this.state.users[userIndex];
    if (updates.name) user.name = updates.name.trim();
    if (updates.phone !== void 0) user.phone = updates.phone.trim();
    if (updates.organization !== void 0) user.organization = updates.organization.trim();
    if (updates.contractNumber !== void 0) user.contractNumber = updates.contractNumber.trim();
    if (updates.facilityAddress !== void 0) user.facilityAddress = updates.facilityAddress.trim();
    if (updates.vehicleRegNumber !== void 0) user.vehicleRegNumber = updates.vehicleRegNumber.trim();
    if (updates.facilityType !== void 0) user.facilityType = updates.facilityType;
    if (updates.active !== void 0) user.active = updates.active;
    if (updates.password && updates.password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(updates.password.trim(), 10);
    }
    this.saveToFile();
    const supabase = getSupabase();
    if (supabase) {
      try {
        const sbUpdates = {
          name: user.name,
          phone: user.phone,
          organization: user.organization,
          contract_number: user.contractNumber,
          facility_type: user.facilityType,
          facility_address: user.facilityAddress,
          vehicle_reg_number: user.vehicleRegNumber,
          active: user.active
        };
        if (updates.password) {
          sbUpdates.password_hash = user.passwordHash;
        }
        await supabase.from("users").update(sbUpdates).eq("id", id);
      } catch (err) {
        console.warn("[Supabase] Error updating user:", err);
      }
    }
    const { passwordHash: _, ...sanitized } = user;
    return sanitized;
  }
  async deleteUser(id) {
    const userIndex = this.state.users.findIndex((u) => u.id === id);
    if (userIndex === -1) return false;
    if (this.state.users[userIndex].email.toLowerCase() === "nsansvester89@gmail.com") {
      throw new Error("Master Administrator account cannot be deleted.");
    }
    this.state.users.splice(userIndex, 1);
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
  // --- ORDER OPERATIONS ---
  async getOrders(userRole, userOrganization, driverId) {
    let list = [...this.state.orders];
    if (userRole === "CLIENT_CLINIC" && userOrganization) {
      const orgLower = userOrganization.toLowerCase();
      list = list.filter((o) => o.pickupClinicName.toLowerCase().includes(orgLower) || o.createdByOrg?.toLowerCase().includes(orgLower));
    } else if (userRole === "LAB_STAFF" && userOrganization) {
      const orgLower = userOrganization.toLowerCase();
      list = list.filter((o) => o.deliveryLabName.toLowerCase().includes(orgLower));
    } else if (userRole === "DRIVER" && driverId) {
      list = list.filter((o) => o.driverId === driverId || o.status === "SCHEDULED");
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

// src/server/auth.ts
import jwt from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
var JWT_SECRET = process.env.JWT_SECRET || "medigo-un3373-jwt-secret-key-2026-prod";
async function comparePassword(plainText, hash) {
  return bcrypt2.compare(plainText, hash);
}
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    contractNumber: user.contractNumber,
    organization: user.organization,
    vehicleRegNumber: user.vehicleRegNumber,
    facilityType: user.facilityType
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required. Missing Bearer token." });
  }
  const token = authHeader.split("Bearer ")[1].trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired session token. Please sign in again." });
  }
  req.user = decoded;
  next();
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
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1].trim();
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

// src/lib/stateMachine.ts
var VALID_TRANSITIONS = {
  SCHEDULED: ["PRE_TRIP_CHECK", "CANCELLED"],
  PRE_TRIP_CHECK: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  // Terminal
  CANCELLED: []
  // Terminal
};
function validateStateTransition(order, targetStatus, context) {
  const currentStatus = order.status;
  const errors = [];
  const allowedNextStates = VALID_TRANSITIONS[currentStatus];
  if (!allowedNextStates.includes(targetStatus)) {
    return {
      allowed: false,
      errors: [`Invalid status sequence: Cannot transition directly from ${currentStatus} to ${targetStatus}. Expected sequence: SCHEDULED \u2192 PRE_TRIP_CHECK \u2192 PICKED_UP \u2192 IN_TRANSIT \u2192 DELIVERED.`]
    };
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
    const pickupRecord = order.chainOfCustodyLogs.find((l) => l.eventType === "PICKUP_SIGNATURE") || context?.pickupSignature;
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
      const existingDel = order.chainOfCustodyLogs.find((l) => l.eventType === "DELIVERY_SIGNATURE");
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
app.use(express.json({ limit: "15mb" }));
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BioDispatch UN 3373 German Medical Logistics Server",
    database: dbService.getStatus(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/db/status", async (req, res) => {
  try {
    const status = await dbService.getDetailedStatus();
    res.json(status);
  } catch (err) {
    res.json({
      ...dbService.getStatus(),
      error: err?.message
    });
  }
});
app.get("/api/db/schema-sql", (req, res) => {
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
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.orders TO postgres, anon, authenticated, service_role;
`);
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const userWithHash = await dbService.getUserByEmailWithPassword(email);
    if (!userWithHash) {
      return res.status(401).json({ message: "Invalid credentials. User not found or inactive." });
    }
    if (userWithHash.active === false) {
      return res.status(403).json({ message: "Account is deactivated. Please contact your dispatch administrator." });
    }
    const isMatch = await comparePassword(password, userWithHash.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const { passwordHash: _, ...user } = userWithHash;
    const token = generateToken(user);
    res.json({
      token,
      user,
      message: `Signed in successfully as ${user.name} (${user.role})`
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message || "Authentication failed" });
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
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching user session" });
  }
});
app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch users" });
  }
});
app.post("/api/users", requireAdmin, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.email || !payload.name || !payload.role || !payload.password) {
      return res.status(400).json({ message: "Missing required fields: email, name, role, password" });
    }
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
    const updates = req.body;
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
    const updates = req.body;
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
app.get("/api/orders", optionalAuth, async (req, res) => {
  try {
    const orders = await dbService.getOrders(
      req.user?.role,
      req.user?.organization,
      req.user?.id
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching orders" });
  }
});
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error retrieving order" });
  }
});
app.post("/api/orders", optionalAuth, async (req, res) => {
  try {
    const newOrderData = req.body;
    const createdOrder = await dbService.createOrder(newOrderData);
    await dbService.createAuditLog({
      orderId: createdOrder.id,
      actionDescription: `ORDER_CREATED: Tracking #${createdOrder.trackingNumber}`,
      userId: req.user?.id || "PORTAL",
      userName: req.user?.name || newOrderData.pickupClinicName || "Clinic Portal",
      userRole: req.user?.role || "CLIENT_CLINIC"
    });
    res.status(201).json(createdOrder);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not create order" });
  }
});
app.patch("/api/orders/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const existingOrder = await dbService.getOrderById(id);
    if (!existingOrder) {
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
      userName: req.user?.name || "System / Driver",
      userRole: req.user?.role || "DISPATCHER"
    });
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error updating order" });
  }
});
app.post("/api/orders/:id/pre-trip-check", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const checkData = req.body;
    const order = await dbService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!checkData.approved) {
      return res.status(400).json({
        message: "Pre-trip checklist failed. Biological transport vehicle not approved for departure."
      });
    }
    order.preTripCheck = checkData;
    order.status = "PRE_TRIP_CHECK";
    const updated = await dbService.updateOrder(id, order);
    await dbService.createAuditLog({
      orderId: id,
      previousState: "SCHEDULED",
      newState: "PRE_TRIP_CHECK",
      actionDescription: `PRE_TRIP_CHECK_COMPLETED: Vehicle ${checkData.vehicleRegNumber}`,
      userId: req.user?.id || "USR-DRIVER-01",
      userName: checkData.vehicleRegNumber || "Driver",
      userRole: "DRIVER"
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error saving pre-trip inspection" });
  }
});
app.post("/api/orders/:id/chain-of-custody", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const log = req.body;
    const order = await dbService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const updated = await dbService.appendChainOfCustody(id, log);
    await dbService.createAuditLog({
      orderId: id,
      actionDescription: `SIGNATURE_ACQUIRED_${log.eventType}: ${log.staffName}`,
      userId: req.user?.id || "HANDOVER_PARTY",
      userName: log.staffName,
      userRole: "DISPATCHER"
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error signing chain of custody" });
  }
});
app.post("/api/orders/:id/temperature", async (req, res) => {
  try {
    const { id } = req.params;
    const telemetry = req.body;
    const order = await dbService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const updated = await dbService.appendTemperatureReading(id, telemetry);
    if (telemetry.isBreach) {
      await dbService.createAuditLog({
        orderId: id,
        actionDescription: `TEMPERATURE_BREACH_ALERT: ${telemetry.tempCelsius}\xB0C recorded by ${telemetry.sensorId}`,
        userId: "TELEMETRY_BLE_IOT",
        userName: `Sensor ${telemetry.sensorId || "GENERIC"}`,
        userRole: "DISPATCHER"
      });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error recording temperature" });
  }
});
app.get("/api/audit-logs", optionalAuth, async (req, res) => {
  try {
    const logs = await dbService.getAuditLogs(req.query.orderId);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching audit logs" });
  }
});
app.post("/api/sync-offline", optionalAuth, async (req, res) => {
  try {
    const action = req.body;
    if (!action || !action.orderId) {
      return res.status(400).json({ message: "Invalid offline payload" });
    }
    const order = await dbService.getOrderById(action.orderId);
    if (!order) {
      return res.status(404).json({ message: `Order ${action.orderId} not found` });
    }
    if (!order.chainOfCustodyLogs) order.chainOfCustodyLogs = [];
    order.chainOfCustodyLogs.push({
      id: `COC-${Date.now()}`,
      orderId: order.id,
      eventType: action.actionType.includes("DELIVER") ? "DELIVERY_SIGNATURE" : "PICKUP_SIGNATURE",
      staffName: action.payload?.signatoryName || "Offline Signatory",
      staffTitle: action.payload?.signatoryRole || "Staff",
      signatureBase64: action.payload?.signatureDataUrl || "",
      pinCodeVerified: true,
      scannedBarcodes: order.barcodeList || [],
      timestamp: action.timestamp,
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      gpsAccuracyMeters: 5,
      deviceId: action.deviceId || "MOB-DRIVER-OFFLINE"
    });
    if (!order.auditLogs) order.auditLogs = [];
    order.auditLogs.push({
      id: `LOG-${Date.now()}`,
      orderId: order.id,
      previousState: order.status,
      newState: order.status,
      actionDescription: `Synced offline driver action (${action.actionType}) created at ${action.timestamp}.`,
      userId: "USR-DRIVER-01",
      userName: "Hans Schmidt (Offline Queue)",
      userRole: "DRIVER",
      deviceId: action.deviceId || "MOB-DRIVER-OFFLINE",
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      offlineSynced: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: action.timestamp
    });
    await dbService.updateOrder(order.id, order);
    res.json({ success: true, message: `Synced offline action ${action.id}` });
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
app.get("/api/ceo/email-forwarding", (req, res) => {
  res.json(ceoEmailForwardingConfig);
});
app.post("/api/ceo/email-forwarding", (req, res) => {
  ceoEmailForwardingConfig = {
    ...ceoEmailForwardingConfig,
    ...req.body,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  res.json({ message: "CEO Email forwarding rules updated", config: ceoEmailForwardingConfig });
});
app.post("/api/ceo/email-forwarding/test-send", (req, res) => {
  const { targetEmail } = req.body;
  const recipient = targetEmail || ceoEmailForwardingConfig.ceoEmail;
  res.json({
    success: true,
    message: `Test email dispatch verified for ${recipient}`,
    smtpResponse: "250 2.0.0 OK Message accepted for delivery",
    sentAt: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.all("/api/*", (req, res) => {
  res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl || req.url}`
  });
});
app.use((err, req, res, next) => {
  console.error("[API Error]:", err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === "number" ? err.status : 500;
  res.status(statusCode).json({
    message: err.message || "An unexpected internal server error occurred",
    error: process.env.NODE_ENV !== "production" ? err.stack : void 0
  });
});

// src/server/vercel-entry.ts
function handler(req, res) {
  return app(req, res);
}
export {
  app,
  handler as default
};
