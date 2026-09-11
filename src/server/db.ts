import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Order, AuditLog, TemperatureTelemetry, Role, CreateUserPayload } from '../types';
import { INITIAL_ORDERS, INITIAL_USERS } from '../lib/db';
import { getSupabase, checkSupabaseStatus, verifySupabaseTables, SupabaseDetailedStatus } from './supabase';

export interface StoredUser extends User {
  passwordHash: string;
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'medigo_store.json');

// Default initial passwords for seed accounts
// Hash for "AdminPass2026!"
const DEFAULT_ADMIN_HASH = bcrypt.hashSync('AdminPass2026!', 10);
// Hash for "Dispatch2026!"
const DEFAULT_DISPATCH_HASH = bcrypt.hashSync('Dispatch2026!', 10);
// Hash for "DriverPass2026!"
const DEFAULT_DRIVER_HASH = bcrypt.hashSync('DriverPass2026!', 10);
// Hash for "ClinicPass2026!"
const DEFAULT_CLINIC_HASH = bcrypt.hashSync('ClinicPass2026!', 10);
// Hash for "LabPass2026!"
const DEFAULT_LAB_HASH = bcrypt.hashSync('LabPass2026!', 10);

const SEED_USERS: StoredUser[] = [
  {
    id: 'USR-ADMIN-01',
    email: 'nsansvester89@gmail.com',
    name: 'Admin (nsansvester89)',
    role: 'ADMIN',
    phone: '+49 170 0000000',
    organization: 'BioDispatch / MediGo Zentrale',
    facilityType: 'HQ',
    active: true,
    passwordHash: DEFAULT_ADMIN_HASH,
    createdAt: new Date('2026-01-01T08:00:00Z').toISOString(),
  },
  {
    id: 'USR-DISPATCHER-01',
    email: 'dispatch@medigo-hessen.de',
    name: 'Katrin Weber (Dispatch Zentrale Wiesbaden)',
    role: 'DISPATCHER',
    phone: '+49 611 9882 100',
    organization: 'MediGo Hauptstandort & Dispatch Zentrale (Wiesbaden)',
    facilityType: 'HQ',
    active: true,
    passwordHash: DEFAULT_DISPATCH_HASH,
    createdAt: new Date('2026-01-01T08:00:00Z').toISOString(),
  },
  {
    id: 'USR-DRIVER-01',
    email: 'hans.schmidt@medigo-hessen.de',
    name: 'Hans Schmidt (MediGo Kurier WI-MG 7741)',
    role: 'DRIVER',
    phone: '+49 171 9882310',
    organization: 'MediGo Wiesbaden Fleet & Hessen Express Logistics',
    vehicleRegNumber: 'F-MG 7741 (Thermo Van)',
    facilityType: 'COURIER',
    active: true,
    passwordHash: DEFAULT_DRIVER_HASH,
    createdAt: new Date('2026-01-05T08:00:00Z').toISOString(),
  },
  {
    id: 'USR-CLINIC-01',
    email: 'probeneingang@kgu.de',
    name: 'Dr. Martin Hoffmann',
    role: 'CLIENT_CLINIC',
    phone: '+49 69 6301 0',
    organization: 'Universitätsklinikum Frankfurt am Main (Hessen)',
    contractNumber: 'CTR-2026-UKF-HE-01',
    facilityType: 'CLINIC',
    facilityAddress: 'Theodor-Stern-Kai 7, 60590 Frankfurt am Main, Hessen',
    active: true,
    passwordHash: DEFAULT_CLINIC_HASH,
    createdAt: new Date('2026-01-10T08:00:00Z').toISOString(),
  },
  {
    id: 'USR-LAB-01',
    email: 'empfang@synlab-hessen.de',
    name: 'Sabine Neumann (Laborleitung)',
    role: 'LAB_STAFF',
    phone: '+49 69 7000 88',
    organization: 'Synlab Medizinisches Versorgungszentrum Frankfurt-Hessen',
    contractNumber: 'CTR-2026-SYNLAB-04',
    facilityType: 'LABORATORY',
    facilityAddress: 'Paul-Ehrlich-Straße 51, 60596 Frankfurt am Main',
    active: true,
    passwordHash: DEFAULT_LAB_HASH,
    createdAt: new Date('2026-01-12T08:00:00Z').toISOString(),
  },
];

interface DatabaseState {
  users: StoredUser[];
  orders: Order[];
  auditLogs: AuditLog[];
}

class DatabaseService {
  private state: DatabaseState = {
    users: [],
    orders: [],
    auditLogs: [],
  };

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.state = {
          users: parsed.users && parsed.users.length ? parsed.users : JSON.parse(JSON.stringify(SEED_USERS)),
          orders: parsed.orders && parsed.orders.length ? parsed.orders : JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          auditLogs: parsed.auditLogs || [],
        };
      } else {
        this.state = {
          users: JSON.parse(JSON.stringify(SEED_USERS)),
          orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          auditLogs: [],
        };
        this.saveToFile();
      }

      // Ensure primary admin user always exists
      const adminExists = this.state.users.some(u => u.email.toLowerCase() === 'nsansvester89@gmail.com');
      if (!adminExists) {
        this.state.users.unshift(SEED_USERS[0]);
        this.saveToFile();
      }
    } catch (err) {
      console.warn('[Database] Error loading local db file, falling back to memory store:', err);
      this.state = {
        users: JSON.parse(JSON.stringify(SEED_USERS)),
        orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
        auditLogs: [],
      };
    }
  }

  private saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database] Failed to write database to disk:', err);
    }
  }

  // --- USER OPERATIONS ---

  public async getAllUsers(): Promise<User[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, role, phone, organization, contract_number, facility_type, facility_address, vehicle_reg_number, active, created_at')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
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
            createdAt: d.created_at,
          }));
        }
      } catch (err) {
        console.warn('[Database] Supabase fetch users failed, using local store:', err);
      }
    }

    // Return sanitized users (without password hash)
    return this.state.users.map(({ passwordHash, ...u }) => u);
  }

  public async getUserById(id: string): Promise<User | null> {
    const user = this.state.users.find(u => u.id === id);
    if (!user) return null;
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  public async getUserByEmailWithPassword(email: string): Promise<StoredUser | null> {
    const normalized = email.toLowerCase().trim();
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalized)
          .single();

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
            passwordHash: data.password_hash,
          };
        }
      } catch (err) {
        console.warn('[Database] Supabase lookup by email failed, falling back to local store:', err);
      }
    }

    const user = this.state.users.find(u => u.email.toLowerCase() === normalized);
    return user || null;
  }

  public async createUser(payload: CreateUserPayload): Promise<User> {
    const normalizedEmail = payload.email.toLowerCase().trim();

    // Check existing email
    const existing = this.state.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error(`A user with email ${payload.email} already exists.`);
    }

    // Validate Contract Number rule for Clinics and Laboratories
    if (payload.role === 'CLIENT_CLINIC' || payload.role === 'LAB_STAFF') {
      if (!payload.contractNumber || !payload.contractNumber.trim()) {
        throw new Error('Contract Number is strictly required for Clinic and Laboratory accounts.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password, salt);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const rolePrefix =
      payload.role === 'ADMIN'
        ? 'USR-ADM'
        : payload.role === 'DRIVER'
        ? 'USR-DRV'
        : payload.role === 'CLIENT_CLINIC'
        ? 'USR-CLN'
        : payload.role === 'LAB_STAFF'
        ? 'USR-LAB'
        : 'USR-DSP';

    const newUser: StoredUser = {
      id: `${rolePrefix}-${randomSuffix}`,
      email: normalizedEmail,
      name: payload.name.trim(),
      role: payload.role,
      phone: payload.phone?.trim() || '',
      organization: payload.organization?.trim() || '',
      contractNumber: payload.contractNumber?.trim() || undefined,
      facilityType: payload.facilityType || (payload.role === 'CLIENT_CLINIC' ? 'CLINIC' : payload.role === 'LAB_STAFF' ? 'LABORATORY' : 'HQ'),
      facilityAddress: payload.facilityAddress?.trim() || '',
      vehicleRegNumber: payload.vehicleRegNumber?.trim() || undefined,
      active: true,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Save to local store
    this.state.users.push(newUser);
    this.saveToFile();

    // Sync to Supabase if connected
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('users').insert({
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
          created_at: newUser.createdAt,
        });
        console.log('[Supabase] Successfully inserted new user:', newUser.email);
      } catch (err) {
        console.warn('[Supabase] Error inserting user to Supabase:', err);
      }
    }

    const { passwordHash: _, ...sanitized } = newUser;
    return sanitized;
  }

  public async updateUser(id: string, updates: Partial<User & { password?: string }>): Promise<User> {
    const userIndex = this.state.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found.`);
    }

    const user = this.state.users[userIndex];

    if (updates.name) user.name = updates.name.trim();
    if (updates.phone !== undefined) user.phone = updates.phone.trim();
    if (updates.organization !== undefined) user.organization = updates.organization.trim();
    if (updates.contractNumber !== undefined) user.contractNumber = updates.contractNumber.trim();
    if (updates.facilityAddress !== undefined) user.facilityAddress = updates.facilityAddress.trim();
    if (updates.vehicleRegNumber !== undefined) user.vehicleRegNumber = updates.vehicleRegNumber.trim();
    if (updates.facilityType !== undefined) user.facilityType = updates.facilityType;
    if (updates.active !== undefined) user.active = updates.active;

    if (updates.password && updates.password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(updates.password.trim(), 10);
    }

    this.saveToFile();

    // Sync to Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        const sbUpdates: any = {
          name: user.name,
          phone: user.phone,
          organization: user.organization,
          contract_number: user.contractNumber,
          facility_type: user.facilityType,
          facility_address: user.facilityAddress,
          vehicle_reg_number: user.vehicleRegNumber,
          active: user.active,
        };
        if (updates.password) {
          sbUpdates.password_hash = user.passwordHash;
        }
        await supabase.from('users').update(sbUpdates).eq('id', id);
      } catch (err) {
        console.warn('[Supabase] Error updating user:', err);
      }
    }

    const { passwordHash: _, ...sanitized } = user;
    return sanitized;
  }

  public async deleteUser(id: string): Promise<boolean> {
    const userIndex = this.state.users.findIndex(u => u.id === id);
    if (userIndex === -1) return false;

    // Prevent deleting master admin
    if (this.state.users[userIndex].email.toLowerCase() === 'nsansvester89@gmail.com') {
      throw new Error('Master Administrator account cannot be deleted.');
    }

    this.state.users.splice(userIndex, 1);
    this.saveToFile();

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('users').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase] Error deleting user:', err);
      }
    }

    return true;
  }

  // --- ORDER OPERATIONS ---

  public async getOrders(userRole?: Role, userOrganization?: string, driverId?: string): Promise<Order[]> {
    let list = [...this.state.orders];

    // Role-based data isolation
    if (userRole === 'CLIENT_CLINIC' && userOrganization) {
      const orgLower = userOrganization.toLowerCase();
      list = list.filter(o => o.pickupClinicName.toLowerCase().includes(orgLower) || o.createdByOrg?.toLowerCase().includes(orgLower));
    } else if (userRole === 'LAB_STAFF' && userOrganization) {
      const orgLower = userOrganization.toLowerCase();
      list = list.filter(o => o.deliveryLabName.toLowerCase().includes(orgLower));
    } else if (userRole === 'DRIVER' && driverId) {
      list = list.filter(o => o.driverId === driverId || o.status === 'SCHEDULED');
    }

    return list;
  }

  public async getOrderById(id: string): Promise<Order | null> {
    const order = this.state.orders.find(o => o.id === id || o.trackingNumber === id);
    return order || null;
  }

  public async createOrder(order: Order): Promise<Order> {
    this.state.orders.unshift(order);
    this.saveToFile();

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('orders').insert({
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
          created_at: order.createdAt,
        });
      } catch (err) {
        console.warn('[Supabase] Order insert failed, saved locally:', err);
      }
    }

    return order;
  }

  public async updateOrder(id: string, updatedOrder: Order): Promise<Order> {
    const index = this.state.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.state.orders[index] = updatedOrder;
      this.saveToFile();
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('orders').update({
          status: updatedOrder.status,
          driver_id: updatedOrder.driverId,
          driver_name: updatedOrder.driverName,
          data_payload: updatedOrder,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase] Order update failed:', err);
      }
    }

    return updatedOrder;
  }

  public async getAllOrders(): Promise<Order[]> {
    return this.getOrders();
  }

  public async appendChainOfCustody(orderId: string, log: any): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (!order.chainOfCustodyLogs) order.chainOfCustodyLogs = [];
    order.chainOfCustodyLogs.push(log);
    return this.updateOrder(orderId, order);
  }

  public async appendTemperatureReading(orderId: string, telemetry: TemperatureTelemetry): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (!order.telemetryLogs) order.telemetryLogs = [];
    order.telemetryLogs.push(telemetry);
    return this.updateOrder(orderId, order);
  }

  public async createAuditLog(log: Partial<AuditLog> & { orderId: string; actionDescription: string }): Promise<AuditLog> {
    const now = new Date().toISOString();
    const newLog: AuditLog = {
      id: log.id || `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: log.orderId,
      previousState: log.previousState || null,
      newState: log.newState || 'SCHEDULED',
      actionDescription: log.actionDescription,
      userId: log.userId || 'SYSTEM',
      userName: log.userName || 'System',
      userRole: log.userRole || 'ADMIN',
      deviceId: log.deviceId || 'SYS-SRV-01',
      gpsLatitude: log.gpsLatitude || 50.1109,
      gpsLongitude: log.gpsLongitude || 8.6821,
      offlineSynced: Boolean(log.offlineSynced),
      syncedAt: log.syncedAt || now,
      createdAt: log.createdAt || now,
    };
    this.state.auditLogs.unshift(newLog);
    this.saveToFile();

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert({
          id: newLog.id,
          order_id: newLog.orderId,
          user_id: newLog.userId,
          user_name: newLog.userName,
          action: newLog.actionDescription,
          details: JSON.stringify(log),
          timestamp: newLog.createdAt,
        });
      } catch (err) {
        console.warn('[Supabase] Audit log insert failed:', err);
      }
    }
    return newLog;
  }

  public async getAuditLogs(orderId?: string): Promise<AuditLog[]> {
    if (orderId) {
      return this.state.auditLogs.filter(l => (l as any).orderId === orderId);
    }
    return this.state.auditLogs;
  }

  public async getDetailedStatus(): Promise<{
    provider: 'supabase' | 'local_persistent';
    supabaseConfigured: boolean;
    supabaseConnected: boolean;
    tablesCreated: boolean;
    missingTables: string[];
    supabaseUrl?: string;
    userCount: number;
    orderCount: number;
    message?: string;
  }> {
    const sb = await verifySupabaseTables();

    return {
      provider: sb.configured && sb.tablesExist ? 'supabase' : 'local_persistent',
      supabaseConfigured: sb.configured,
      supabaseConnected: sb.connected,
      tablesCreated: sb.tablesExist,
      missingTables: sb.missingTables,
      supabaseUrl: sb.url,
      userCount: this.state.users.length,
      orderCount: this.state.orders.length,
      message: !sb.configured
        ? 'Supabase environment variables not configured. Using local persistent storage.'
        : !sb.tablesExist
        ? `Connected to Supabase project, but tables [${sb.missingTables.join(', ')}] are not created yet. Please execute the SQL migration script in Supabase SQL Editor.`
        : 'Supabase PostgreSQL tables verified and active.',
    };
  }

  public getStatus(): {
    provider: 'supabase' | 'local_persistent';
    supabaseConfigured: boolean;
    userCount: number;
    orderCount: number;
    supabaseUrl?: string;
    tablesCreated?: boolean;
    notice?: string;
  } {
    const sbStatus = checkSupabaseStatus();
    return {
      provider: sbStatus.configured ? 'supabase' : 'local_persistent',
      supabaseConfigured: sbStatus.configured,
      supabaseUrl: sbStatus.url,
      userCount: this.state.users.length,
      orderCount: this.state.orders.length,
      notice: sbStatus.configured
        ? 'Run the SQL schema in Supabase SQL Editor to initialize tables.'
        : undefined,
    };
  }
}

export const dbService = new DatabaseService();
