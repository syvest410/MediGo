import React, { useState } from 'react';
import { FileCode, BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const PrismaSchemaViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SCHEMA' | 'ADR_RULES'>('SCHEMA');

  const prismaSchemaCode = `// Prisma Schema for UN 3373 Category B Biological Specimen Logistics
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  DISPATCHER
  DRIVER
  CLIENT_CLINIC
  LAB_STAFF
}

enum TransportType {
  AMBIENT_15_25C
  REFRIGERATED_2_8C
  FROZEN_MINUS_20C
}

enum OrderStatus {
  SCHEDULED
  PRE_TRIP_CHECK
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  CANCELLED
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  role          Role     @default(DRIVER)
  phone         String?
  organization  String?
}

model Order {
  id                   String            @id @default(uuid())
  trackingNumber       String            @unique
  status               OrderStatus       @default(SCHEDULED)
  transportType        TransportType     @default(REFRIGERATED_2_8C)
  
  pickupClinicName     String
  pickupAddress        String
  deliveryLabName      String
  deliveryAddress      String

  scheduledPickupFrom  DateTime
  scheduledDeliveryBy  DateTime

  sampleCategory       String
  specimenBoxCount     Int               @default(1)
  barcodeList          String[]
  p650Verified         Boolean           @default(false)

  driverId             String?
  createdById          String
  vehicleRegNumber     String?

  preTripCheck         PreTripCheck?
  chainOfCustodyLogs   ChainOfCustody[]
  telemetryLogs        TemperatureTelemetry[]
  auditLogs            AuditLog[]
}

model PreTripCheck {
  id                            String   @id @default(uuid())
  orderId                       String   @unique
  p650OuterPackagingIntact     Boolean  @default(true)
  primarySecondaryLeakProof     Boolean  @default(true)
  absorbentMaterialPresent      Boolean  @default(true)
  tempBoxCalibrated             Boolean  @default(true)
  driverSignatureBase64         String
}

model ChainOfCustody {
  id                  String   @id @default(uuid())
  orderId             String
  eventType           String   // PICKUP_SIGNATURE | DELIVERY_SIGNATURE
  staffName           String
  signatureBase64     String
  pinCodeVerified     Boolean
  scannedBarcodes     String[]
  timestamp           DateTime @default(now())
  gpsLatitude         Float
  gpsLongitude        Float
}

model AuditLog {
  id                  String   @id @default(uuid())
  orderId             String
  previousState       OrderStatus?
  newState            OrderStatus
  actionDescription   String
  userId              String
  gpsLatitude         Float
  gpsLongitude        Float
  offlineSynced       Boolean
}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-slate-100 shadow-xl max-w-5xl mx-auto my-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <FileCode className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-white">System Architecture & UN 3373 Regulatory Specification</h2>
            <p className="text-xs text-slate-400">PostgreSQL Prisma ORM Schema & German ADR Packaging Rules</p>
          </div>
        </div>

        <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setActiveTab('SCHEMA')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'SCHEMA' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            Prisma Schema
          </button>
          <button
            onClick={() => setActiveTab('ADR_RULES')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'ADR_RULES' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            P650 Compliance Rules
          </button>
        </div>
      </div>

      {activeTab === 'SCHEMA' ? (
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto max-h-[500px]">
          <pre>{prismaSchemaCode}</pre>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4 text-xs text-slate-300">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>ADR Packaging Instruction P650 Requirements (UN 3373 Biological Substance)</span>
          </h3>

          <ul className="space-y-2.5">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">1. Triple Packaging System</strong>
                <span>Primary leak-proof receptacle + Secondary leak-proof enclosure + Rigid outer packaging with minimum dimensions 100 mm x 100 mm.</span>
              </div>
            </li>

            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">2. Absorbent Material Mandate</strong>
                <span>For liquids, absorbent material must be placed between primary receptacle and secondary packaging, capable of absorbing 100% of liquid volume.</span>
              </div>
            </li>

            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">3. Pressure Differential Standard</strong>
                <span>Primary or secondary packaging must withstand without leakage an internal pressure differential of 95 kPa (0.95 bar).</span>
              </div>
            </li>

            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">4. Temperature Control & Calibration</strong>
                <span>Calibrated cooling boxes must maintain 2-8°C (Cold Chain) or 15-25°C (Ambient) with active Bluetooth thermo sensors recording continuous logs.</span>
              </div>
            </li>
          </ul>
        </div>
      )}

    </div>
  );
};
