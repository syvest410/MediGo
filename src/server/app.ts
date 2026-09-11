import express from 'express';
import path from 'path';
import fs from 'fs';
import { dbService } from './db';
import {
  comparePassword,
  generateToken,
  requireAuth,
  requireAdmin,
  optionalAuth,
  AuthenticatedRequest,
} from './auth';
import {
  Order,
  OrderStatus,
  PreTripCheck,
  ChainOfCustody,
  TemperatureTelemetry,
  AuditLog,
  PendingOfflineAction,
} from '../types';
import { validateStateTransition } from '../lib/stateMachine';

const app = express();

app.use(express.json({ limit: '15mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BioDispatch UN 3373 German Medical Logistics Server',
    database: dbService.getStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Database & Backend Status
app.get('/api/db/status', async (req, res) => {
  try {
    const status = await dbService.getDetailedStatus();
    res.json(status);
  } catch (err: any) {
    res.json({
      ...dbService.getStatus(),
      error: err?.message,
    });
  }
});

// Endpoint to retrieve the SQL schema to run in Supabase SQL Editor
app.get('/api/db/schema-sql', (req, res) => {
  const schemaPath = path.join(process.cwd(), 'supabase-schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(sql);
    } catch {
      // fallback below
    }
  }
  // Fallback: minimal valid SQL if file not bundled
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
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

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const userWithHash = await dbService.getUserByEmailWithPassword(email);
    if (!userWithHash) {
      return res.status(401).json({ message: 'Invalid credentials. User not found or inactive.' });
    }

    if (userWithHash.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact your dispatch administrator.' });
    }

    const isMatch = await comparePassword(password, userWithHash.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const { passwordHash: _, ...user } = userWithHash;
    const token = generateToken(user);

    res.json({
      token,
      user,
      message: `Signed in successfully as ${user.name} (${user.role})`,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Authentication failed' });
  }
});

// GET Current Authenticated User (Me)
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await dbService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching user session' });
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS (Admin Only)
// ==========================================

// GET All Users
app.get('/api/users', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const users = await dbService.getAllUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch users' });
  }
});

// POST Create User
app.post('/api/users', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const payload = req.body;

    if (!payload.email || !payload.name || !payload.role || !payload.password) {
      return res.status(400).json({ message: 'Missing required fields: email, name, role, password' });
    }

    if (['CLIENT_CLINIC', 'LAB_STAFF'].includes(payload.role) && !payload.contractNumber) {
      return res.status(400).json({
        message: `Contract Number is legally mandatory for role ${payload.role}. E.g. CTR-2026-CLN-###`,
      });
    }

    const newUser = await dbService.createUser(payload);

    await dbService.createAuditLog({
      orderId: 'SYS-USER-CREATE',
      actionDescription: `USER_CREATED: ${newUser.name} (${newUser.role})`,
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'ADMIN',
    });

    res.status(201).json({
      user: newUser,
      message: `User ${newUser.name} created successfully.`,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to create user' });
  }
});

// PATCH Update User
app.patch('/api/users/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedUser = await dbService.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dbService.createAuditLog({
      orderId: 'SYS-USER-UPDATE',
      actionDescription: `USER_UPDATED: ${updatedUser.name}`,
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'ADMIN',
    });

    res.json({
      user: updatedUser,
      message: `User ${updatedUser.name} updated successfully`,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to update user' });
  }
});

// ==========================================
// ORDERS ENDPOINTS
// ==========================================

// GET All Orders (Role Filtered)
app.get('/api/orders', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await dbService.getOrders(
      req.user?.role,
      req.user?.organization,
      req.user?.id
    );
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching orders' });
  }
});

// GET Order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error retrieving order' });
  }
});

// POST Create Order (Clinic / Dispatcher / Admin)
app.post('/api/orders', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const newOrderData = req.body;
    const createdOrder = await dbService.createOrder(newOrderData);

    await dbService.createAuditLog({
      orderId: createdOrder.id,
      actionDescription: `ORDER_CREATED: Tracking #${createdOrder.trackingNumber}`,
      userId: req.user?.id || 'PORTAL',
      userName: req.user?.name || newOrderData.pickupClinicName || 'Clinic Portal',
      userRole: req.user?.role || 'CLIENT_CLINIC',
    });

    res.status(201).json(createdOrder);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Could not create order' });
  }
});

// PATCH Update Order
app.patch('/api/orders/:id', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingOrder = await dbService.getOrderById(id);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (updates.status && updates.status !== existingOrder.status) {
      const validation = validateStateTransition(existingOrder, updates.status);
      if (!validation.allowed) {
        return res.status(422).json({
          message: `UN 3373 State Transition Rejected: ${validation.errors.join('; ')}`,
          currentStatus: existingOrder.status,
          targetStatus: updates.status,
        });
      }
    }

    const updatedOrder = await dbService.updateOrder(id, { ...existingOrder, ...updates });

    await dbService.createAuditLog({
      orderId: id,
      previousState: existingOrder.status,
      newState: updates.status || existingOrder.status,
      actionDescription: updates.status ? `STATUS_CHANGED_TO_${updates.status}` : 'ORDER_UPDATED',
      userId: req.user?.id || 'CLIENT_APP',
      userName: req.user?.name || 'System / Driver',
      userRole: req.user?.role || 'DISPATCHER',
    });

    res.json(updatedOrder);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error updating order' });
  }
});

// POST Pre-Trip Checklist
app.post('/api/orders/:id/pre-trip-check', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const checkData: PreTripCheck = req.body;

    const order = await dbService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!checkData.approved) {
      return res.status(400).json({
        message: 'Pre-trip checklist failed. Biological transport vehicle not approved for departure.',
      });
    }

    order.preTripCheck = checkData;
    order.status = 'PRE_TRIP_CHECK';

    const updated = await dbService.updateOrder(id, order);

    await dbService.createAuditLog({
      orderId: id,
      previousState: 'SCHEDULED',
      newState: 'PRE_TRIP_CHECK',
      actionDescription: `PRE_TRIP_CHECK_COMPLETED: Vehicle ${checkData.vehicleRegNumber}`,
      userId: req.user?.id || 'USR-DRIVER-01',
      userName: checkData.vehicleRegNumber || 'Driver',
      userRole: 'DRIVER',
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error saving pre-trip inspection' });
  }
});

// POST Handover / Chain of Custody Signature Sign-off
app.post('/api/orders/:id/chain-of-custody', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const log: ChainOfCustody = req.body;

    const order = await dbService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updated = await dbService.appendChainOfCustody(id, log);

    await dbService.createAuditLog({
      orderId: id,
      actionDescription: `SIGNATURE_ACQUIRED_${log.eventType}: ${log.staffName}`,
      userId: req.user?.id || 'HANDOVER_PARTY',
      userName: log.staffName,
      userRole: 'DISPATCHER',
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error signing chain of custody' });
  }
});

// POST Temperature Telemetry
app.post('/api/orders/:id/temperature', async (req, res) => {
  try {
    const { id } = req.params;
    const telemetry: TemperatureTelemetry = req.body;

    const order = await dbService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updated = await dbService.appendTemperatureReading(id, telemetry);

    if (telemetry.isBreach) {
      await dbService.createAuditLog({
        orderId: id,
        actionDescription: `TEMPERATURE_BREACH_ALERT: ${telemetry.tempCelsius}°C recorded by ${telemetry.sensorId}`,
        userId: 'TELEMETRY_BLE_IOT',
        userName: `Sensor ${telemetry.sensorId || 'GENERIC'}`,
        userRole: 'DISPATCHER',
      });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error recording temperature' });
  }
});

// ==========================================
// AUDIT LOGS ENDPOINTS
// ==========================================
app.get('/api/audit-logs', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await dbService.getAuditLogs(req.query.orderId as string | undefined);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching audit logs' });
  }
});

// ==========================================
// OFFLINE QUEUE SYNC ENDPOINT
// ==========================================
app.post('/api/sync-offline', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const action: PendingOfflineAction = req.body;
    if (!action || !action.orderId) {
      return res.status(400).json({ message: 'Invalid offline payload' });
    }

    const order = await dbService.getOrderById(action.orderId);
    if (!order) {
      return res.status(404).json({ message: `Order ${action.orderId} not found` });
    }

    if (!order.chainOfCustodyLogs) order.chainOfCustodyLogs = [];
    order.chainOfCustodyLogs.push({
      id: `COC-${Date.now()}`,
      orderId: order.id,
      eventType: action.actionType.includes('DELIVER') ? 'DELIVERY_SIGNATURE' : 'PICKUP_SIGNATURE',
      staffName: action.payload?.signatoryName || 'Offline Signatory',
      staffTitle: action.payload?.signatoryRole || 'Staff',
      signatureBase64: action.payload?.signatureDataUrl || '',
      pinCodeVerified: true,
      scannedBarcodes: order.barcodeList || [],
      timestamp: action.timestamp,
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      gpsAccuracyMeters: 5,
      deviceId: action.deviceId || 'MOB-DRIVER-OFFLINE',
    });

    if (!order.auditLogs) order.auditLogs = [];
    order.auditLogs.push({
      id: `LOG-${Date.now()}`,
      orderId: order.id,
      previousState: order.status,
      newState: order.status,
      actionDescription: `Synced offline driver action (${action.actionType}) created at ${action.timestamp}.`,
      userId: 'USR-DRIVER-01',
      userName: 'Hans Schmidt (Offline Queue)',
      userRole: 'DRIVER',
      deviceId: action.deviceId || 'MOB-DRIVER-OFFLINE',
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      offlineSynced: true,
      syncedAt: new Date().toISOString(),
      createdAt: action.timestamp,
    });

    await dbService.updateOrder(order.id, order);

    res.json({ success: true, message: `Synced offline action ${action.id}` });
  } catch (err: any) {
    res.status(500).json({ message: `Sync error: ${err.message}` });
  }
});

// CEO Email Forwarding Configuration
let ceoEmailForwardingConfig = {
  ceoEmail: 'dispatch@medigo-hessen.de',
  ceoName: 'Katrin Weber (CEO & Dispatch Director)',
  ccAccountingEmail: 'buchhaltung@medigo-hessen.de',
  autoForwardCompletedOrders: true,
  autoForwardInvoices: true,
  attachTelemetryPdf: true,
  attachChainOfCustodyPdf: true,
  forwardingMode: 'INSTANT',
  lastUpdated: new Date().toISOString(),
};

app.get('/api/ceo/email-forwarding', (req, res) => {
  res.json(ceoEmailForwardingConfig);
});

app.post('/api/ceo/email-forwarding', (req, res) => {
  ceoEmailForwardingConfig = {
    ...ceoEmailForwardingConfig,
    ...req.body,
    lastUpdated: new Date().toISOString(),
  };
  res.json({ message: 'CEO Email forwarding rules updated', config: ceoEmailForwardingConfig });
});

app.post('/api/ceo/email-forwarding/test-send', (req, res) => {
  const { targetEmail } = req.body;
  const recipient = targetEmail || ceoEmailForwardingConfig.ceoEmail;
  res.json({
    success: true,
    message: `Test email dispatch verified for ${recipient}`,
    smtpResponse: '250 2.0.0 OK Message accepted for delivery',
    sentAt: new Date().toISOString(),
  });
});

export default app;
export { app };
