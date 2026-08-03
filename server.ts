import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_ORDERS, INITIAL_USERS } from './src/lib/db';
import { Order, User, OrderStatus, PreTripCheck, ChainOfCustody, TemperatureTelemetry, AuditLog, PendingOfflineAction } from './src/types';
import { validateStateTransition } from './src/lib/stateMachine';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory Database State
let orders: Order[] = JSON.parse(JSON.stringify(INITIAL_ORDERS));
let users: User[] = JSON.parse(JSON.stringify(INITIAL_USERS));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BioDispatch UN 3373 German Medical Logistics Server',
    timestamp: new Date().toISOString()
  });
});

// GET Orders
app.get('/api/orders', (req, res) => {
  const { status, driverId, role } = req.query;
  let filtered = [...orders];

  if (status) {
    filtered = filtered.filter(o => o.status === status);
  }
  if (driverId) {
    filtered = filtered.filter(o => o.driverId === driverId);
  }

  res.json(filtered);
});

// GET Order by ID or Tracking
app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const order = orders.find(o => o.id === id || o.trackingNumber === id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  res.json(order);
});

// POST Create Order (Clinic / Dispatcher)
app.post('/api/orders', (req, res) => {
  const body = req.body;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const trackingNumber = `DE-UN3373-2026-${randomNum}`;

  const newOrder: Order = {
    id: `ORD-DE-${randomNum}`,
    trackingNumber,
    status: 'SCHEDULED',
    transportType: body.transportType || 'REFRIGERATED_2_8C',
    pickupClinicName: body.pickupClinicName || 'Charité Berlin',
    pickupAddress: body.pickupAddress || 'Augustenburger Platz 1, Berlin',
    pickupDepartment: body.pickupDepartment || 'Station 1A',
    pickupContactPhone: body.pickupContactPhone || '+49 30 123456',
    deliveryLabName: body.deliveryLabName || 'Labor Berlin',
    deliveryAddress: body.deliveryAddress || 'Sylter Straße 2, Berlin',
    deliveryDepartment: body.deliveryDepartment || 'Zentrallabor',
    deliveryContactPhone: body.deliveryContactPhone || '+49 30 987654',
    scheduledPickupFrom: body.scheduledPickupFrom || new Date().toISOString(),
    scheduledPickupTo: body.scheduledPickupTo || new Date(Date.now() + 60 * 60000).toISOString(),
    scheduledDeliveryBy: body.scheduledDeliveryBy || new Date(Date.now() + 180 * 60000).toISOString(),
    sampleCategory: body.sampleCategory || 'UN 3373 Category B Biological Specimen',
    specimenBoxCount: Number(body.specimenBoxCount) || 1,
    barcodeList: body.barcodeList || [`SPEC-DE-${randomNum}-A`],
    specialNotes: body.specialNotes || 'Standard P650 specimen box.',
    p650Verified: true,
    driverId: body.driverId || 'USR-DRIVER-01',
    driverName: body.driverName || 'Hans Schmidt (Kurier 104)',
    createdById: body.createdById || 'USR-CLINIC-01',
    createdByOrg: body.createdByOrg || 'Charité Berlin',
    vehicleRegNumber: 'B-BD 7741 (Thermo Van)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chainOfCustodyLogs: [],
    telemetryLogs: [],
    auditLogs: [
      {
        id: `AUD-${Date.now()}`,
        orderId: `ORD-DE-${randomNum}`,
        previousState: null,
        newState: 'SCHEDULED',
        actionDescription: `Order ${trackingNumber} created and assigned to driver.`,
        userId: body.createdById || 'USR-CLINIC-01',
        userName: body.createdByName || 'Dr. Martin Hoffmann',
        userRole: 'CLIENT_CLINIC',
        deviceId: 'WEB-PORTAL-01',
        gpsLatitude: 52.5200,
        gpsLongitude: 13.4050,
        offlineSynced: true,
        createdAt: new Date().toISOString()
      }
    ]
  };

  orders.unshift(newOrder);
  res.status(201).json(newOrder);
});

// POST State Transition (Strict State Machine + Audit Trail)
app.post('/api/orders/:id/transition', (req, res) => {
  const { id } = req.params;
  const { targetStatus, context, userId, userName, userRole, deviceId, coords } = req.body;

  const orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const order = orders[orderIndex];

  // Validate state machine rules
  const validation = validateStateTransition(order, targetStatus as OrderStatus, context);
  if (!validation.allowed) {
    return res.status(400).json({
      message: 'State machine transition rejected under UN 3373 compliance rules.',
      errors: validation.errors
    });
  }

  const previousState = order.status;
  order.status = targetStatus as OrderStatus;
  order.updatedAt = new Date().toISOString();

  // Apply context payloads
  if (targetStatus === 'PRE_TRIP_CHECK' && context?.preTripCheck) {
    order.preTripCheck = {
      id: `PTC-${Date.now()}`,
      orderId: order.id,
      driverId: userId || 'USR-DRIVER-01',
      vehicleRegNumber: order.vehicleRegNumber || 'B-BD 7741',
      p650OuterPackagingIntact: !!context.preTripCheck.p650OuterPackagingIntact,
      primarySecondaryLeakProof: !!context.preTripCheck.primarySecondaryLeakProof,
      absorbentMaterialPresent: !!context.preTripCheck.absorbentMaterialPresent,
      tempBoxCalibrated: !!context.preTripCheck.tempBoxCalibrated,
      initialTempCelsius: Number(context.preTripCheck.initialTempCelsius) || 5.0,
      targetTempMinCelsius: Number(context.preTripCheck.targetTempMinCelsius) || 2.0,
      targetTempMaxCelsius: Number(context.preTripCheck.targetTempMaxCelsius) || 8.0,
      inspectedAt: new Date().toISOString(),
      driverSignatureBase64: context.preTripCheck.driverSignatureBase64 || '',
      approved: true
    };
  }

  if ((targetStatus === 'PICKED_UP' || targetStatus === 'DELIVERED') && context?.chainOfCustody) {
    const cocRecord: ChainOfCustody = {
      id: `COC-${Date.now()}`,
      orderId: order.id,
      eventType: targetStatus === 'PICKED_UP' ? 'PICKUP_SIGNATURE' : 'DELIVERY_SIGNATURE',
      staffName: context.chainOfCustody.staffName || 'Staff Member',
      staffTitle: context.chainOfCustody.staffTitle || 'Authorized Recipient',
      signatureBase64: context.chainOfCustody.signatureBase64 || '',
      pinCodeVerified: !!context.chainOfCustody.pinCodeVerified,
      scannedBarcodes: context.chainOfCustody.scannedBarcodes || order.barcodeList,
      timestamp: new Date().toISOString(),
      gpsLatitude: coords?.lat || 52.5200,
      gpsLongitude: coords?.lng || 13.4050,
      gpsAccuracyMeters: 3.0,
      deviceId: deviceId || 'MOB-DRIVER-104'
    };
    order.chainOfCustodyLogs.push(cocRecord);
  }

  if (targetStatus === 'CANCELLED' && context?.cancellationReason) {
    order.cancellationReason = context.cancellationReason;
    order.cancellationNotes = context.cancellationNotes || 'Cancelled per driver protocol.';
  }

  // Create Immutable Audit Log
  const auditLog: AuditLog = {
    id: `AUD-${Date.now()}`,
    orderId: order.id,
    previousState,
    newState: targetStatus as OrderStatus,
    actionDescription: `Transitioned status from ${previousState} to ${targetStatus}.${context?.notes ? ' Notes: ' + context.notes : ''}`,
    userId: userId || 'USR-DRIVER-01',
    userName: userName || 'Hans Schmidt',
    userRole: userRole || 'DRIVER',
    deviceId: deviceId || 'MOB-DRIVER-APP',
    gpsLatitude: coords?.lat || 52.5200,
    gpsLongitude: coords?.lng || 13.4050,
    offlineSynced: true,
    syncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  order.auditLogs.unshift(auditLog);

  res.json({
    message: `Order transitioned to ${targetStatus}`,
    order,
    auditLog
  });
});

// POST Temperature Telemetry Logging
app.post('/api/orders/:id/telemetry', (req, res) => {
  const { id } = req.params;
  const { tempCelsius, ambientTempCelsius, humidityPercent, batteryLevelPercent, gpsLatitude, gpsLongitude, sensorId } = req.body;

  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  let isBreach = false;
  if (order.transportType === 'REFRIGERATED_2_8C' && (tempCelsius < 2.0 || tempCelsius > 8.0)) isBreach = true;
  if (order.transportType === 'AMBIENT_15_25C' && (tempCelsius < 15.0 || tempCelsius > 25.0)) isBreach = true;
  if (order.transportType === 'FROZEN_MINUS_20C' && tempCelsius > -15.0) isBreach = true;

  const telemetry: TemperatureTelemetry = {
    id: `TEL-${Date.now()}`,
    orderId: order.id,
    sensorId: sensorId || 'SENS-GER-01',
    tempCelsius: Number(tempCelsius),
    ambientTempCelsius: Number(ambientTempCelsius) || 22.0,
    humidityPercent: Number(humidityPercent) || 50,
    batteryLevelPercent: Number(batteryLevelPercent) || 98,
    isBreach,
    timestamp: new Date().toISOString(),
    gpsLatitude: Number(gpsLatitude) || 52.5200,
    gpsLongitude: Number(gpsLongitude) || 13.4050
  };

  order.telemetryLogs.push(telemetry);

  if (isBreach) {
    // Add breach audit entry
    order.auditLogs.unshift({
      id: `AUD-BREACH-${Date.now()}`,
      orderId: order.id,
      previousState: order.status,
      newState: order.status,
      actionDescription: `⚠️ TEMPERATURE BREACH ALERT: Recorded ${tempCelsius}°C (Target range violation).`,
      userId: 'SYSTEM-SENSOR',
      userName: 'ThermoSensor Telemetry',
      userRole: 'DRIVER',
      deviceId: sensorId || 'SENS-GER-01',
      gpsLatitude: Number(gpsLatitude) || 52.5200,
      gpsLongitude: Number(gpsLongitude) || 13.4050,
      offlineSynced: true,
      createdAt: new Date().toISOString()
    });
  }

  res.status(201).json({ telemetry, isBreach });
});

// POST Offline Queue Synchronization Endpoint
app.post('/api/sync', (req, res) => {
  const action: PendingOfflineAction = req.body;

  const order = orders.find(o => o.id === action.orderId);
  if (!order) {
    return res.status(404).json({ message: `Order ${action.orderId} not found` });
  }

  try {
    if (action.actionType === 'PRE_TRIP_CHECK' || action.actionType === 'ACCEPT') {
      order.status = action.payload.targetStatus || 'PRE_TRIP_CHECK';
      if (action.payload.preTripCheck) {
        order.preTripCheck = action.payload.preTripCheck;
      }
    } else if (action.actionType === 'PICKUP') {
      order.status = 'PICKED_UP';
      if (action.payload.chainOfCustody) {
        order.chainOfCustodyLogs.push(action.payload.chainOfCustody);
      }
    } else if (action.actionType === 'DELIVER') {
      order.status = 'DELIVERED';
      if (action.payload.chainOfCustody) {
        order.chainOfCustodyLogs.push(action.payload.chainOfCustody);
      }
    } else if (action.actionType === 'CANCEL') {
      order.status = 'CANCELLED';
      order.cancellationReason = action.payload.cancellationReason;
    }

    order.updatedAt = new Date().toISOString();

    // Log offline sync in Audit Trail
    order.auditLogs.unshift({
      id: `AUD-SYNC-${Date.now()}`,
      orderId: order.id,
      previousState: null,
      newState: order.status,
      actionDescription: `Synced offline driver action (${action.actionType}) created at ${action.timestamp}.`,
      userId: 'USR-DRIVER-01',
      userName: 'Hans Schmidt (Offline Queue)',
      userRole: 'DRIVER',
      deviceId: action.deviceId || 'MOB-DRIVER-OFFLINE',
      gpsLatitude: action.gpsLatitude,
      gpsLongitude: action.gpsLongitude,
      offlineSynced: true,
      syncedAt: new Date().toISOString(),
      createdAt: action.timestamp
    });

    res.json({ success: true, message: `Synced offline action ${action.id}` });
  } catch (err: any) {
    res.status(500).json({ message: `Sync error: ${err.message}` });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BioDispatch DE] Medical Courier Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
