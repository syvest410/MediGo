import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, Order, AuditLog, TemperatureTelemetry, Role, CreateUserPayload, Organization, LoginAttemptRecord, RefreshTokenRecord } from '../types';
import { INITIAL_ORDERS, INITIAL_USERS } from '../lib/db';
import { getSupabase, checkSupabaseStatus, verifySupabaseTables, SupabaseDetailedStatus } from './supabase';

export interface StoredUser extends User {
  passwordHash: string;
  mustChangePassword?: boolean;
  tokenVersion?: number;
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'medigo_store.json');

interface SeedAccountConfig {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  organization?: string;
  facilityType?: 'HQ' | 'COURIER' | 'CLINIC' | 'LABORATORY';
  contractNumber?: string;
  facilityAddress?: string;
  vehicleRegNumber?: string;
  envVar: string;
  createdAt: string;
}

const SEED_CONFIGS: SeedAccountConfig[] = [
  {
    id: 'USR-ADMIN-01',
    email: 'nsansvester89@gmail.com',
    name: 'Admin (nsansvester89)',
    role: 'ADMIN',
    phone: '+49 170 0000000',
    organization: 'BioDispatch / MediGo Zentrale',
    facilityType: 'HQ',
    envVar: 'SEED_ADMIN_PASSWORD',
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
    envVar: 'SEED_DISPATCHER_PASSWORD',
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
    envVar: 'SEED_DRIVER_PASSWORD',
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
    envVar: 'SEED_CLINIC_PASSWORD',
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
    envVar: 'SEED_LAB_PASSWORD',
    createdAt: new Date('2026-01-12T08:00:00Z').toISOString(),
  },
];

/**
 * Generates initial seed accounts without storing hardcoded password literals in source.
 * In production: accounts without env passwords are not created.
 * In development/test: secure random 20-character passwords are generated, logged once, and never persisted plaintext.
 */
export function generateSeedUsers(): StoredUser[] {
  const isProd = process.env.NODE_ENV === 'production';
  const seeds: StoredUser[] = [];

  for (const cfg of SEED_CONFIGS) {
    const envPassword = process.env[cfg.envVar];
    let passwordPlaintext: string | null = null;

    if (envPassword && envPassword.trim()) {
      passwordPlaintext = envPassword.trim();
    } else if (isProd) {
      console.warn(`[Security Notice] Seed account for ${cfg.email} was omitted in production because ${cfg.envVar} is not set.`);
      continue;
    } else {
      // In development/test, generate random 20-char password and print once
      const generated = crypto.randomBytes(15).toString('base64url').slice(0, 20);
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
        createdAt: cfg.createdAt,
      });
    }
  }

  return seeds;
}

const SEED_ORGANIZATIONS: Organization[] = [
  {
    id: 'ORG-UKF-01',
    name: 'Universitätsklinikum Frankfurt am Main',
    type: 'HOSPITAL',
    contractNumber: 'CTR-2026-UKF-HE-01',
    addressStreet: 'Theodor-Stern-Kai 7',
    postalCode: '60590',
    city: 'Frankfurt am Main',
    state: 'HE',
    contactPhone: '+49 69 6301 5120',
    contactEmail: 'probeneingang@kgu.de',
    active: true,
  },
  {
    id: 'ORG-SYNLAB-01',
    name: 'Biosammlungszentrum Hessen - Synlab MVZ',
    type: 'LABORATORY',
    contractNumber: 'CTR-2026-SYNLAB-04',
    addressStreet: 'Paul-Ehrlich-Straße 51',
    postalCode: '60596',
    city: 'Frankfurt am Main',
    state: 'HE',
    contactPhone: '+49 69 7000 881',
    contactEmail: 'empfang@synlab-hessen.de',
    active: true,
  },
  {
    id: 'ORG-UKGM-01',
    name: 'Universitätsklinikum Gießen und Marburg',
    type: 'HOSPITAL',
    contractNumber: 'CTR-2026-UKGM-02',
    addressStreet: 'Rudolf-Buchheim-Straße 8',
    postalCode: '35392',
    city: 'Gießen',
    state: 'HE',
    contactPhone: '+49 641 9854 3000',
    contactEmail: 'zentrallabor@ukgm.de',
    active: true,
  },
  {
    id: 'ORG-MEDIGO-HQ',
    name: 'MediGo Hessen Zentrale & Leitstand',
    type: 'CLINIC',
    contractNumber: 'CTR-MEDIGO-INTERNAL',
    addressStreet: 'Gustav-Stresemann-Ring 1',
    postalCode: '65189',
    city: 'Wiesbaden',
    state: 'HE',
    contactPhone: '+49 611 9900 100',
    contactEmail: 'dispatch@medigo-hessen.de',
    active: true,
  },
];

interface DatabaseState {
  users: StoredUser[];
  orders: Order[];
  auditLogs: AuditLog[];
  organizations: Organization[];
  loginAttempts: LoginAttemptRecord[];
  refreshTokens: RefreshTokenRecord[];
}

class DatabaseService {
  private state: DatabaseState = {
    users: [],
    orders: [],
    auditLogs: [],
    organizations: [],
    loginAttempts: [],
    refreshTokens: [],
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

        // Only seed when users table is completely empty or explicit SEED_ON_START=true
        const shouldSeed = !parsed.users || parsed.users.length === 0 || process.env.SEED_ON_START === 'true';
        const initialUsers = shouldSeed ? generateSeedUsers() : parsed.users;

        this.state = {
          users: initialUsers,
          orders: parsed.orders && parsed.orders.length ? parsed.orders : JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          auditLogs: parsed.auditLogs || [],
          organizations: parsed.organizations && parsed.organizations.length ? parsed.organizations : JSON.parse(JSON.stringify(SEED_ORGANIZATIONS)),
          loginAttempts: parsed.loginAttempts || [],
          refreshTokens: parsed.refreshTokens || [],
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
          refreshTokens: [],
        };
        this.saveToFile();
      }
    } catch (err) {
      console.warn('[Database] Error loading local db file, falling back to memory store:', err);
      this.state = {
        users: generateSeedUsers(),
        orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
        auditLogs: [],
        organizations: JSON.parse(JSON.stringify(SEED_ORGANIZATIONS)),
        loginAttempts: [],
        refreshTokens: [],
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
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            email: d.email,
            name: d.name,
            role: d.role,
            phone: d.phone || '',
            organization: d.organization || '',
            contractNumber: d.contract_number || d.contractNumber || undefined,
            facilityType: d.facility_type || d.facilityType || undefined,
            facilityAddress: d.facility_address || d.facilityAddress || '',
            vehicleRegNumber: d.vehicle_reg_number || d.assigned_vehicle_reg || d.vehicleRegNumber || undefined,
            active: d.active !== undefined ? Boolean(d.active) : (d.is_active !== undefined ? Boolean(d.is_active) : true),
            tokenVersion: d.token_version !== undefined ? Number(d.token_version) : 0,
            createdAt: d.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[Database] Supabase fetch users failed, using local store:', err);
      }
    }

    // Return sanitized users (without password hash)
    return this.state.users.map(({ passwordHash, ...u }) => ({
      ...u,
      tokenVersion: u.tokenVersion ?? 0,
    }));
  }

  public async getUserById(id: string): Promise<User | null> {
    const localUser = this.state.users.find(u => u.id === id);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const activeStatus = data.active !== undefined ? Boolean(data.active) : (data.is_active !== undefined ? Boolean(data.is_active) : true);
          const vehicleReg = data.vehicle_reg_number || data.assigned_vehicle_reg || data.vehicleRegNumber || '';
          const mustChange = data.must_change_password !== undefined
            ? Boolean(data.must_change_password)
            : (data.mustChangePassword !== undefined ? Boolean(data.mustChangePassword) : (localUser?.mustChangePassword ?? false));
          const tVersion = data.token_version !== undefined
            ? Number(data.token_version)
            : (localUser?.tokenVersion ?? 0);

          return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            phone: data.phone || '',
            organization: data.organization || '',
            organizationId: data.organization_id || undefined,
            contractNumber: data.contract_number || data.contractNumber || undefined,
            facilityType: data.facility_type || data.facilityType || undefined,
            facilityAddress: data.facility_address || data.facilityAddress || '',
            vehicleRegNumber: vehicleReg || undefined,
            active: activeStatus,
            mustChangePassword: mustChange,
            tokenVersion: tVersion,
            createdAt: data.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('[Database] Supabase lookup by id failed, using local store:', err);
      }
    }

    if (!localUser) return null;
    const { passwordHash, ...sanitized } = localUser;
    return {
      ...sanitized,
      tokenVersion: localUser.tokenVersion ?? 0,
    };
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const userWithHash = await this.getUserByEmailWithPassword(email);
    if (!userWithHash) return null;
    const { passwordHash, ...sanitized } = userWithHash;
    return sanitized;
  }

  public async getUserByEmailWithPassword(email: string): Promise<StoredUser | null> {
    const normalized = email.toLowerCase().trim();
    const localUser = this.state.users.find(u => u.email.toLowerCase() === normalized);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalized)
          .single();

        if (!error && data) {
          const rawHash = data.password || data.password_hash || data.passwordHash || '';
          const activeStatus = data.active !== undefined ? Boolean(data.active) : (data.is_active !== undefined ? Boolean(data.is_active) : true);
          const vehicleReg = data.vehicle_reg_number || data.assigned_vehicle_reg || data.vehicleRegNumber || '';
          const finalPasswordHash = rawHash || localUser?.passwordHash || '';
          const mustChange = data.must_change_password !== undefined
            ? Boolean(data.must_change_password)
            : (data.mustChangePassword !== undefined ? Boolean(data.mustChangePassword) : (localUser?.mustChangePassword ?? false));
          const tVersion = data.token_version !== undefined
            ? Number(data.token_version)
            : (localUser?.tokenVersion ?? 0);

          return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            phone: data.phone || '',
            organization: data.organization || '',
            contractNumber: data.contract_number || data.contractNumber || undefined,
            facilityType: data.facility_type || data.facilityType || undefined,
            facilityAddress: data.facility_address || data.facilityAddress || '',
            vehicleRegNumber: vehicleReg || undefined,
            active: activeStatus,
            mustChangePassword: mustChange,
            tokenVersion: tVersion,
            createdAt: data.created_at || new Date().toISOString(),
            passwordHash: finalPasswordHash,
          };
        }
      } catch (err) {
        console.warn('[Database] Supabase lookup by email failed, falling back to local store:', err);
      }
    }

    if (!localUser) return null;
    return {
      ...localUser,
      tokenVersion: localUser.tokenVersion ?? 0,
    };
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

    // Work factor cost 12 everywhere
    const salt = await bcrypt.genSalt(12);
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
      organizationId: payload.organizationId?.trim() || undefined,
      contractNumber: payload.contractNumber?.trim() || undefined,
      facilityType: payload.facilityType || (payload.role === 'CLIENT_CLINIC' ? 'CLINIC' : payload.role === 'LAB_STAFF' ? 'LABORATORY' : 'HQ'),
      facilityAddress: payload.facilityAddress?.trim() || '',
      vehicleRegNumber: payload.vehicleRegNumber?.trim() || undefined,
      active: true,
      mustChangePassword: payload.mustChangePassword !== undefined ? payload.mustChangePassword : false,
      tokenVersion: payload.tokenVersion ?? 0,
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
          organization_id: newUser.organizationId,
          contract_number: newUser.contractNumber,
          facility_type: newUser.facilityType,
          facility_address: newUser.facilityAddress,
          vehicle_reg_number: newUser.vehicleRegNumber,
          assigned_vehicle_reg: newUser.vehicleRegNumber,
          active: newUser.active,
          is_active: newUser.active,
          password: newUser.passwordHash,
          password_hash: newUser.passwordHash,
          token_version: newUser.tokenVersion ?? 0,
          created_at: newUser.createdAt,
        });
        console.log('[Supabase] Successfully inserted new user:', newUser.email);
      } catch (err) {
        console.warn('[Supabase] Error inserting user to Supabase:', err);
      }
    }

    const { passwordHash: _, ...sanitized } = newUser;

    // Automatically sync facility to organizations registry if role represents a healthcare facility
    if (newUser.role === 'CLIENT_CLINIC' || newUser.role === 'LAB_STAFF' || newUser.facilityType === 'CLINIC' || newUser.facilityType === 'LABORATORY') {
      try {
        await this.upsertOrganization({
          name: newUser.organization || newUser.name,
          type: newUser.facilityType === 'LABORATORY' || newUser.role === 'LAB_STAFF' ? 'LABORATORY' : 'CLINIC',
          contractNumber: newUser.contractNumber,
          addressStreet: newUser.facilityAddress || 'Hessen Region Hub',
          postalCode: '60590',
          city: 'Frankfurt am Main',
          state: 'HE',
          contactEmail: newUser.email,
          contactPhone: newUser.phone || '+49 69 6301 0',
          active: newUser.active,
        });
      } catch (e) {
        console.warn('[Database] Auto-sync facility failed:', e);
      }
    }

    return sanitized;
  }

  public async updateUser(id: string, updates: Partial<User & { password?: string; passwordHash?: string }>): Promise<User> {
    let userIndex = this.state.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data } = await supabase.from('users').select('*').eq('id', id).single();
          if (data) {
            const rawHash = data.password || data.password_hash || data.passwordHash || '';
            this.state.users.push({
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              phone: data.phone || '',
              organization: data.organization || '',
              contractNumber: data.contract_number,
              facilityType: data.facility_type,
              facilityAddress: data.facility_address || '',
              vehicleRegNumber: data.vehicle_reg_number,
              active: data.active !== undefined ? Boolean(data.active) : true,
              createdAt: data.created_at || new Date().toISOString(),
              passwordHash: rawHash,
            });
            userIndex = this.state.users.length - 1;
          }
        } catch {
          // ignore lookup error
        }
      }
    }

    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found.`);
    }

    const user = this.state.users[userIndex];

    const isPasswordChange = Boolean(updates.passwordHash || (updates.password && updates.password.trim().length >= 12));
    const isDeactivation = updates.active === false && user.active !== false;
    const isRoleChange = Boolean(updates.role && updates.role !== user.role);

    if (updates.name) user.name = updates.name.trim();
    if (updates.phone !== undefined) user.phone = updates.phone.trim();
    if (updates.organization !== undefined) user.organization = updates.organization.trim();
    if (updates.organizationId !== undefined) user.organizationId = updates.organizationId.trim();
    if (updates.contractNumber !== undefined) user.contractNumber = updates.contractNumber.trim();
    if (updates.facilityAddress !== undefined) user.facilityAddress = updates.facilityAddress.trim();
    if (updates.vehicleRegNumber !== undefined) user.vehicleRegNumber = updates.vehicleRegNumber.trim();
    if (updates.facilityType !== undefined) user.facilityType = updates.facilityType;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.active !== undefined) user.active = updates.active;

    if (updates.mustChangePassword !== undefined) {
      user.mustChangePassword = updates.mustChangePassword;
    }

    if (updates.tokenVersion !== undefined) {
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

    // Sync to Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        const sbUpdates: any = {
          name: user.name,
          phone: user.phone,
          organization: user.organization,
          organization_id: user.organizationId,
          contract_number: user.contractNumber,
          facility_type: user.facilityType,
          facility_address: user.facilityAddress,
          vehicle_reg_number: user.vehicleRegNumber,
          assigned_vehicle_reg: user.vehicleRegNumber,
          role: user.role,
          active: user.active,
          is_active: user.active,
          token_version: user.tokenVersion ?? 0,
        };
        if (updates.mustChangePassword !== undefined) {
          sbUpdates.must_change_password = updates.mustChangePassword;
        }
        if (updates.passwordHash || updates.password) {
          sbUpdates.password = user.passwordHash;
          sbUpdates.password_hash = user.passwordHash;
        }
        await supabase.from('users').update(sbUpdates).eq('id', id);
      } catch (err) {
        console.warn('[Supabase] Error updating user:', err);
      }
    }

    const { passwordHash: _, ...sanitized } = user;
    return {
      ...sanitized,
      tokenVersion: user.tokenVersion ?? 0,
    };
  }

  public async incrementTokenVersion(userId: string): Promise<number> {
    let newVersion = 1;
    const userIndex = this.state.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const current = this.state.users[userIndex].tokenVersion ?? 0;
      newVersion = current + 1;
      this.state.users[userIndex].tokenVersion = newVersion;
      this.saveToFile();
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('users')
          .select('token_version')
          .eq('id', userId)
          .single();
        const currentSb = data?.token_version !== undefined ? Number(data.token_version) : 0;
        newVersion = Math.max(newVersion, currentSb + 1);
        await supabase
          .from('users')
          .update({ token_version: newVersion })
          .eq('id', userId);
      } catch (err) {
        console.warn('[Database] Supabase increment token_version failed:', err);
      }
    }

    return newVersion;
  }

  // ==========================================
  // PERSISTENT BRUTE-FORCE RATE LIMIT STORAGE
  // ==========================================

  public async getLoginAttempt(key: string): Promise<LoginAttemptRecord | null> {
    const normalizedKey = key.toLowerCase().trim();
    if (!this.state.loginAttempts) {
      this.state.loginAttempts = [];
    }
    const localRecord = this.state.loginAttempts.find(r => r.key === normalizedKey);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('login_attempts')
          .select('*')
          .eq('key', normalizedKey)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            key: data.key,
            type: data.type as 'EMAIL' | 'IP',
            identifier: data.identifier,
            attempts: data.attempts,
            firstAttemptAt: data.first_attempt_at,
            lockedUntil: data.locked_until || null,
            lockoutDurationMinutes: data.lockout_duration_minutes || 0,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('[Database] Supabase getLoginAttempt failed, using local store:', err);
      }
    }

    return localRecord ? { ...localRecord } : null;
  }

  public async upsertLoginAttempt(record: LoginAttemptRecord): Promise<void> {
    const normalizedKey = record.key.toLowerCase().trim();
    if (!this.state.loginAttempts) {
      this.state.loginAttempts = [];
    }
    const index = this.state.loginAttempts.findIndex(r => r.key === normalizedKey);
    const updatedRecord: LoginAttemptRecord = {
      ...record,
      key: normalizedKey,
      updatedAt: new Date().toISOString(),
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
        await supabase.from('login_attempts').upsert({
          id: updatedRecord.id,
          key: updatedRecord.key,
          type: updatedRecord.type,
          identifier: updatedRecord.identifier,
          attempts: updatedRecord.attempts,
          first_attempt_at: updatedRecord.firstAttemptAt,
          locked_until: updatedRecord.lockedUntil || null,
          lockout_duration_minutes: updatedRecord.lockoutDurationMinutes,
          updated_at: updatedRecord.updatedAt,
        }, { onConflict: 'key' });
      } catch (err) {
        console.warn('[Database] Supabase upsertLoginAttempt failed:', err);
      }
    }
  }

  public async clearLoginAttempt(key: string): Promise<void> {
    const normalizedKey = key.toLowerCase().trim();
    if (!this.state.loginAttempts) {
      this.state.loginAttempts = [];
    }
    this.state.loginAttempts = this.state.loginAttempts.filter(r => r.key !== normalizedKey);
    this.saveToFile();

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('login_attempts').delete().eq('key', normalizedKey);
      } catch (err) {
        console.warn('[Database] Supabase clearLoginAttempt failed:', err);
      }
    }
  }

  // ==========================================
  // REFRESH TOKEN OPERATIONS (Phase 4 Sessions)
  // ==========================================

  public async createRefreshToken(record: RefreshTokenRecord): Promise<RefreshTokenRecord> {
    if (!this.state.refreshTokens) {
      this.state.refreshTokens = [];
    }
    this.state.refreshTokens.push(record);
    this.saveToFile();

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('refresh_tokens').insert({
          id: record.id,
          user_id: record.userId,
          token_hash: record.tokenHash,
          family_id: record.familyId,
          expires_at: record.expiresAt,
          revoked_at: record.revokedAt || null,
          replaced_by_id: record.replacedById || null,
          created_at: record.createdAt,
          ip: record.ip || null,
          user_agent: record.userAgent || null,
        });
      } catch (err) {
        console.warn('[Database] Supabase create refresh token failed:', err);
      }
    }

    return record;
  }

  public async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('refresh_tokens')
          .select('*')
          .eq('token_hash', tokenHash)
          .single();

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
            ip: data.ip || undefined,
            userAgent: data.user_agent || undefined,
          };
        }
      } catch (err) {
        console.warn('[Database] Supabase find refresh token failed, using local store:', err);
      }
    }

    if (!this.state.refreshTokens) {
      this.state.refreshTokens = [];
    }
    const found = this.state.refreshTokens.find(r => r.tokenHash === tokenHash);
    return found ? { ...found } : null;
  }

  public async revokeRefreshToken(id: string, replacedById?: string): Promise<void> {
    const nowIso = new Date().toISOString();
    if (this.state.refreshTokens) {
      const idx = this.state.refreshTokens.findIndex(r => r.id === id);
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
        const updates: any = { revoked_at: nowIso };
        if (replacedById) {
          updates.replaced_by_id = replacedById;
        }
        await supabase.from('refresh_tokens').update(updates).eq('id', id);
      } catch (err) {
        console.warn('[Database] Supabase revoke refresh token failed:', err);
      }
    }
  }

  public async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    const nowIso = new Date().toISOString();
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
        await supabase
          .from('refresh_tokens')
          .update({ revoked_at: nowIso })
          .eq('family_id', familyId)
          .is('revoked_at', null);
      } catch (err) {
        console.warn('[Database] Supabase revoke refresh token family failed:', err);
      }
    }
  }

  public async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    const nowIso = new Date().toISOString();
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
        await supabase
          .from('refresh_tokens')
          .update({ revoked_at: nowIso })
          .eq('user_id', userId)
          .is('revoked_at', null);
      } catch (err) {
        console.warn('[Database] Supabase revoke all user refresh tokens failed:', err);
      }
    }
  }

  public async cleanupExpiredRefreshTokens(): Promise<number> {
    const nowMs = Date.now();
    let cleaned = 0;
    if (this.state.refreshTokens) {
      const initialCount = this.state.refreshTokens.length;
      this.state.refreshTokens = this.state.refreshTokens.filter(r => new Date(r.expiresAt).getTime() > nowMs);
      cleaned = initialCount - this.state.refreshTokens.length;
      if (cleaned > 0) this.saveToFile();
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('refresh_tokens')
          .delete()
          .lt('expires_at', new Date(nowMs).toISOString());
      } catch (err) {
        console.warn('[Database] Supabase cleanup expired refresh tokens failed:', err);
      }
    }

    return cleaned;
  }

  public async deleteUser(id: string): Promise<boolean> {
    const userIndex = this.state.users.findIndex(u => u.id === id);
    if (userIndex === -1) return false;

    // Prevent deleting master admin
    if (this.state.users[userIndex].email.toLowerCase() === 'nsansvester89@gmail.com') {
      throw new Error('Master Administrator account cannot be deleted.');
    }

    this.state.users.splice(userIndex, 1);
    await this.revokeAllUserRefreshTokens(id);
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

  // --- ORGANIZATION / FACILITY OPERATIONS ---

  public async getAllOrganizations(): Promise<Organization[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            contractNumber: d.contract_number || d.contractNumber || undefined,
            addressStreet: d.address_street || d.addressStreet || '',
            postalCode: d.postal_code || d.postalCode || '',
            city: d.city || '',
            state: d.state || 'HE',
            contactPhone: d.contact_phone || d.contactPhone || '',
            contactEmail: d.contact_email || d.contactEmail || '',
            active: d.active !== false,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (err) {
        console.warn('[Database] Supabase fetch organizations failed, using local store:', err);
      }
    }

    return this.state.organizations || [];
  }

  public async upsertOrganization(org: Partial<Organization> & { name: string }): Promise<Organization> {
    const list = this.state.organizations || [];
    const existingIndex = list.findIndex(
      o => (org.id && o.id === org.id) || 
           (org.contractNumber && o.contractNumber === org.contractNumber) ||
           o.name.toLowerCase() === org.name.toLowerCase()
    );

    const fullOrg: Organization = {
      id: existingIndex !== -1 ? list[existingIndex].id : (org.id || `ORG-${Date.now().toString().slice(-4)}`),
      name: org.name.trim(),
      type: org.type || 'CLINIC',
      contractNumber: org.contractNumber?.trim() || undefined,
      addressStreet: org.addressStreet?.trim() || 'Theodor-Stern-Kai 7',
      postalCode: org.postalCode?.trim() || '60590',
      city: org.city?.trim() || 'Frankfurt am Main',
      state: org.state || 'HE',
      contactPhone: org.contactPhone?.trim() || '+49 69 6301 0',
      contactEmail: org.contactEmail?.trim() || 'info@medigo-partner.de',
      active: org.active !== false,
      createdAt: existingIndex !== -1 ? list[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
        await supabase.from('organizations').upsert({
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
          updated_at: fullOrg.updatedAt,
        });
      } catch (err) {
        console.warn('[Supabase] Error upserting organization:', err);
      }
    }

    return fullOrg;
  }

  // --- ORDER OPERATIONS ---

  public async getOrders(userRole?: Role, userOrganization?: string, driverId?: string, userId?: string, contractNumber?: string): Promise<Order[]> {
    let list = [...this.state.orders];

    // Role-based data isolation enforcing Principle of Least Privilege
    if (userRole === 'CLIENT_CLINIC') {
      const orgLower = (userOrganization || '').toLowerCase().trim();
      const contractLower = (contractNumber || '').toLowerCase().trim();
      list = list.filter(o => {
        const orgMatch = Boolean(orgLower && (
          o.pickupClinicName.toLowerCase().includes(orgLower) ||
          (o.createdByOrg && o.createdByOrg.toLowerCase().includes(orgLower))
        ));
        const userMatch = Boolean(userId && o.createdById === userId);
        const contractMatch = Boolean(contractLower && (
          o.trackingNumber.toLowerCase().includes(contractLower) ||
          (o.specialNotes && o.specialNotes.toLowerCase().includes(contractLower))
        ));
        return orgMatch || userMatch || contractMatch;
      });
    } else if (userRole === 'LAB_STAFF') {
      const orgLower = (userOrganization || '').toLowerCase().trim();
      const contractLower = (contractNumber || '').toLowerCase().trim();
      list = list.filter(o => {
        const labMatch = Boolean(orgLower && o.deliveryLabName.toLowerCase().includes(orgLower));
        const contractMatch = Boolean(contractLower && (
          o.trackingNumber.toLowerCase().includes(contractLower) ||
          (o.specialNotes && o.specialNotes.toLowerCase().includes(contractLower))
        ));
        return labMatch || contractMatch;
      });
    } else if (userRole === 'DRIVER') {
      // Drivers can only see their assigned orders or open unassigned SCHEDULED orders on the marketplace
      list = list.filter(o => o.driverId === driverId || (!o.driverId && o.status === 'SCHEDULED'));
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
