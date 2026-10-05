import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';
import { dbService } from '../src/server/db';
import { generateToken } from '../src/server/auth';
import { User, Order } from '../src/types';

describe('Phase 2 Authorization & IDOR Security Test Suite', () => {
  let adminUser: User;
  let adminToken: string;

  let dispatcherUser: User;
  let dispatcherToken: string;

  let clinicUserA: User;
  let clinicTokenA: string;

  let clinicUserB: User;
  let clinicTokenB: string;

  let driverUser1: User;
  let driverToken1: string;

  let driverUser2: User;
  let driverToken2: string;

  let orderOrgA: Order;
  let orderOrgB: Order;

  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Create Test Admin
    adminUser = await dbService.createUser({
      email: `admin.${timestamp}@medigo.test`,
      password: 'AdminPassword2026!Secure',
      name: 'Test Administrator',
      role: 'ADMIN',
      facilityType: 'HQ',
    });
    adminToken = generateToken(adminUser);

    // 2. Create Test Dispatcher
    dispatcherUser = await dbService.createUser({
      email: `dispatcher.${timestamp}@medigo.test`,
      password: 'DispatcherPass2026!Secure',
      name: 'Test Central Dispatcher',
      role: 'DISPATCHER',
      facilityType: 'HQ',
    });
    dispatcherToken = generateToken(dispatcherUser);

    // 3. Create Organizations
    const orgA = await dbService.upsertOrganization({
      id: `ORG-TEST-A-${timestamp}`,
      name: `Klinikum Alpha ${timestamp}`,
      type: 'CLINIC',
      contractNumber: `CTR-A-${timestamp}`,
      city: 'Frankfurt',
    });

    const orgB = await dbService.upsertOrganization({
      id: `ORG-TEST-B-${timestamp}`,
      name: `Klinikum Beta ${timestamp}`,
      type: 'CLINIC',
      contractNumber: `CTR-B-${timestamp}`,
      city: 'Wiesbaden',
    });

    // 4. Create Clinic Users in separate organizations
    clinicUserA = await dbService.createUser({
      email: `clinic.a.${timestamp}@medigo.test`,
      password: 'ClinicPassword2026!Secure',
      name: 'Dr. Alpha Member',
      role: 'CLIENT_CLINIC',
      organization: orgA.name,
      organizationId: orgA.id,
      contractNumber: orgA.contractNumber,
      facilityType: 'CLINIC',
    });
    clinicTokenA = generateToken(clinicUserA);

    clinicUserB = await dbService.createUser({
      email: `clinic.b.${timestamp}@medigo.test`,
      password: 'ClinicPassword2026!Secure',
      name: 'Dr. Beta Member',
      role: 'CLIENT_CLINIC',
      organization: orgB.name,
      organizationId: orgB.id,
      contractNumber: orgB.contractNumber,
      facilityType: 'CLINIC',
    });
    clinicTokenB = generateToken(clinicUserB);

    // 5. Create Driver Users
    driverUser1 = await dbService.createUser({
      email: `driver1.${timestamp}@medigo.test`,
      password: 'DriverPassword2026!Secure',
      name: 'Driver Hans One',
      role: 'DRIVER',
      vehicleRegNumber: 'F-SEC 101',
      facilityType: 'COURIER',
    });
    driverToken1 = generateToken(driverUser1);

    driverUser2 = await dbService.createUser({
      email: `driver2.${timestamp}@medigo.test`,
      password: 'DriverPassword2026!Secure',
      name: 'Driver Fritz Two',
      role: 'DRIVER',
      vehicleRegNumber: 'WI-SEC 202',
      facilityType: 'COURIER',
    });
    driverToken2 = generateToken(driverUser2);

    // 6. Create Test Orders
    // Order A: Belongs to Org A, scheduled, unassigned
    orderOrgA = await dbService.createOrder({
      id: `ORD-TEST-A-${timestamp}`,
      trackingNumber: `DE-UN3373-A-${timestamp}`,
      status: 'SCHEDULED',
      transportType: 'REFRIGERATED_2_8C',
      specimenCategory: 'UN3373_CATEGORY_B_SPECIMEN',
      pickupClinicName: orgA.name,
      pickupAddress: 'Theodor-Stern-Kai 7, 60590 Frankfurt, Hessen',
      pickupContactPhone: '+49 69 111111',
      originOrganizationId: orgA.id,
      deliveryLabName: 'Biosammlungszentrum Hessen - Synlab',
      deliveryAddress: 'Paul-Ehrlich-Straße 51, 60596 Frankfurt, Hessen',
      deliveryContactPhone: '+49 69 222222',
      scheduledPickupFrom: new Date().toISOString(),
      scheduledPickupTo: new Date(Date.now() + 3600000).toISOString(),
      scheduledDeliveryBy: new Date(Date.now() + 7200000).toISOString(),
      sampleCategory: 'UN 3373 Biological Substance Cat B',
      specimenBoxCount: 1,
      barcodeList: [`BAR-A-${timestamp}`],
      p650Verified: true,
      createdById: clinicUserA.id,
      createdByOrg: orgA.name,
      chainOfCustodyLogs: [],
      telemetryLogs: [],
      auditLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Order B: Belongs to Org B, assigned to Driver 2
    orderOrgB = await dbService.createOrder({
      id: `ORD-TEST-B-${timestamp}`,
      trackingNumber: `DE-UN3373-B-${timestamp}`,
      status: 'SCHEDULED',
      transportType: 'AMBIENT_15_25C',
      specimenCategory: 'UN3373_CATEGORY_B_SPECIMEN',
      pickupClinicName: orgB.name,
      pickupAddress: 'Mainzer Straße 98, 65189 Wiesbaden, Hessen',
      pickupContactPhone: '+49 611 333333',
      originOrganizationId: orgB.id,
      deliveryLabName: 'Biosammlungszentrum Hessen - Synlab',
      deliveryAddress: 'Paul-Ehrlich-Straße 51, 60596 Frankfurt, Hessen',
      deliveryContactPhone: '+49 69 222222',
      scheduledPickupFrom: new Date().toISOString(),
      scheduledPickupTo: new Date(Date.now() + 3600000).toISOString(),
      scheduledDeliveryBy: new Date(Date.now() + 7200000).toISOString(),
      sampleCategory: 'UN 3373 Biological Substance Cat B',
      specimenBoxCount: 2,
      barcodeList: [`BAR-B-${timestamp}`],
      p650Verified: true,
      driverId: driverUser2.id,
      driverName: driverUser2.name,
      vehicleRegNumber: driverUser2.vehicleRegNumber,
      createdById: clinicUserB.id,
      createdByOrg: orgB.name,
      chainOfCustodyLogs: [],
      telemetryLogs: [],
      auditLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // =========================================================================
  // TASK 2: Unauthenticated Exposure Tests
  // =========================================================================
  describe('Task 2: Unauthenticated Exposure Defenses', () => {
    it('/api/db/status returns safe minimal { ok: true } to anonymous callers', async () => {
      const res = await request(app).get('/api/db/status');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(res.body.supabaseUrl).toBeUndefined();
      expect(res.body.userCount).toBeUndefined();
      expect(res.body.orderCount).toBeUndefined();
      expect(res.body.tablesCreated).toBeUndefined();
    });

    it('/api/db/status returns detailed telemetry to authenticated ADMIN', async () => {
      const res = await request(app)
        .get('/api/db/status')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.provider).toBeDefined();
      expect(res.body.userCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/organizations requires authentication (anonymous rejected with 401)', async () => {
      const res = await request(app).get('/api/organizations');
      expect(res.status).toBe(401);
    });

    it('GET /api/organizations scopes results for clinic user to their own registered facility', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${clinicTokenA}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe(clinicUserA.organization);
    });

    it('GET /api/organizations returns all facilities for ADMIN', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/db/schema-sql requires ADMIN (rejected for anonymous and driver)', async () => {
      const anonRes = await request(app).get('/api/db/schema-sql');
      expect(anonRes.status).toBe(401);

      const driverRes = await request(app)
        .get('/api/db/schema-sql')
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(driverRes.status).toBe(403);
    });

    it('GET /api/orders/track/:trackingNumber stays public, rate-limited, and exposes NO patient/medical details', async () => {
      const res = await request(app).get(`/api/orders/track/${orderOrgA.trackingNumber}`);
      expect(res.status).toBe(200);
      expect(res.body.trackingNumber).toBe(orderOrgA.trackingNumber);
      expect(res.body.status).toBe('SCHEDULED');
      expect(res.body.originCity).toBe('Frankfurt');

      // CRITICAL GDPR & Medical Secrecy: Ensure sensitive fields are stripped
      expect(res.body.barcodeList).toBeUndefined();
      expect(res.body.pickupAddress).toBeUndefined();
      expect(res.body.pickupContactPhone).toBeUndefined();
      expect(res.body.pickupClinicName).toBeUndefined();
      expect(res.body.deliveryAddress).toBeUndefined();
      expect(res.body.deliveryContactPhone).toBeUndefined();
      expect(res.body.priceBreakdown).toBeUndefined();
      expect(res.body.calculatedPriceEur).toBeUndefined();
      expect(res.body.patientName).toBeUndefined();
    });

    it('/api/v1/sync requires authentication (anonymous rejected with 401)', async () => {
      const res = await request(app)
        .post('/api/v1/sync')
        .send({
          id: `SYNC-${timestamp}`,
          orderId: orderOrgA.id,
          actionType: 'ACCEPT',
          timestamp: new Date().toISOString(),
        });
      expect(res.status).toBe(401);
    });

    it('GET /api/ceo/email-forwarding requires ADMIN (anonymous 401, driver 403)', async () => {
      const anonRes = await request(app).get('/api/ceo/email-forwarding');
      expect(anonRes.status).toBe(401);

      const driverRes = await request(app)
        .get('/api/ceo/email-forwarding')
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(driverRes.status).toBe(403);

      const adminRes = await request(app)
        .get('/api/ceo/email-forwarding')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.ceoEmail).toBeDefined();
    });
  });

  // =========================================================================
  // TASK 3: User Management Authorization & IDOR Tests
  // =========================================================================
  describe('Task 3: User Directory Access Control & IDOR', () => {
    it('GET /api/users is restricted to ADMIN and DISPATCHER (DRIVER gets 403)', async () => {
      const driverRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(driverRes.status).toBe(403);

      const clinicRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${clinicTokenA}`);
      expect(clinicRes.status).toBe(403);

      const adminRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(Array.isArray(adminRes.body)).toBe(true);
    });

    it('GET /api/users/:id allows a user to fetch themselves', async () => {
      const res = await request(app)
        .get(`/api/users/${driverUser1.id}`)
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(driverUser1.id);
    });

    it('GET /api/users/:id returns 404 (not 403) when non-admin attempts to fetch another user', async () => {
      const res = await request(app)
        .get(`/api/users/${clinicUserB.id}`)
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('GET /api/audit-logs is restricted to ADMIN and DISPATCHER (DRIVER and CLINIC get 403)', async () => {
      const driverRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(driverRes.status).toBe(403);

      const clinicRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${clinicTokenA}`);
      expect(clinicRes.status).toBe(403);

      const dispRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      expect(dispRes.status).toBe(200);
    });
  });

  // =========================================================================
  // TASK 3: Order Authorization & IDOR Tests
  // =========================================================================
  describe('Task 3: Order Access Control & IDOR', () => {
    it('GET /api/orders: clinic user A cannot see orders of clinic user B', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${clinicTokenA}`);
      expect(res.status).toBe(200);
      const ids = res.body.map((o: Order) => o.id);
      expect(ids).toContain(orderOrgA.id);
      expect(ids).not.toContain(orderOrgB.id);
    });

    it('GET /api/orders/:id: clinic user A gets 404 (not 403) when attempting to access order of org B', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderOrgB.id}`)
        .set('Authorization', `Bearer ${clinicTokenA}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order not found');
    });

    it('POST /api/orders/:id/transition: clinic user A gets 404 when attempting to transition order of org B', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderOrgB.id}/transition`)
        .set('Authorization', `Bearer ${clinicTokenA}`)
        .send({
          targetStatus: 'CANCELLED',
          context: { cancellationReason: 'DUPLICATE_ORDER' },
        });
      expect(res.status).toBe(404);
    });

    it('POST /api/orders/:id/chain-of-custody: clinic user A gets 404 on order of org B', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderOrgB.id}/chain-of-custody`)
        .set('Authorization', `Bearer ${clinicTokenA}`)
        .send({
          eventType: 'PICKUP_SIGNATURE',
          staffName: 'Dr. Alpha Member',
          signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          scannedBarcodes: ['BAR-B-TEST'],
        });
      expect(res.status).toBe(404);
    });

    it('DRIVER 1 gets 404 on order assigned to DRIVER 2 (GET, claim, pre-trip, temperature)', async () => {
      // 1. GET
      const getRes = await request(app)
        .get(`/api/orders/${orderOrgB.id}`)
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(getRes.status).toBe(404);

      // 2. Claim
      const claimRes = await request(app)
        .post(`/api/orders/${orderOrgB.id}/claim`)
        .set('Authorization', `Bearer ${driverToken1}`);
      expect(claimRes.status).toBe(404);

      // 3. Pre-trip check
      const ptRes = await request(app)
        .post(`/api/orders/${orderOrgB.id}/pre-trip-check`)
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          p650OuterPackagingIntact: true,
          primarySecondaryLeakProof: true,
          absorbentMaterialPresent: true,
          tempBoxCalibrated: true,
          initialTempCelsius: 4.0,
          targetTempMinCelsius: 2.0,
          targetTempMaxCelsius: 8.0,
          driverSignatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          vehicleRegNumber: 'F-SEC 101',
          approved: true,
        });
      expect(ptRes.status).toBe(404);

      // 4. Temperature
      const tempRes = await request(app)
        .post(`/api/orders/${orderOrgB.id}/temperature`)
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          sensorId: 'BLE-SEC-01',
          tempCelsius: 4.5,
          isBreach: false,
          timestamp: new Date().toISOString(),
        });
      expect(tempRes.status).toBe(404);
    });

    it('Server-side Role Transition Validation: DRIVER cannot transition to CANCELLED (403)', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderOrgA.id}/transition`)
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          targetStatus: 'CANCELLED',
          context: { cancellationReason: 'CLINIC_REQUESTED_ABORT' },
        });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot directly cancel/i);
    });

    it('Server-side Role Transition Validation: CLINIC cannot transition to PICKED_UP (403)', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderOrgA.id}/transition`)
        .set('Authorization', `Bearer ${clinicTokenA}`)
        .send({
          targetStatus: 'PICKED_UP',
        });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only request order cancellation/i);
    });

    it('/api/v1/sync rejects sync action on order belonging to another organization with 404', async () => {
      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${clinicTokenA}`)
        .send({
          id: `SYNC-${timestamp}-CROSS`,
          orderId: orderOrgB.id,
          actionType: 'ACCEPT',
          timestamp: new Date().toISOString(),
        });
      expect(res.status).toBe(404);
      expect(res.body.results[0].status).toBe('REJECTED_NOT_FOUND');
    });
  });

  // =========================================================================
  // TASK 4: Strict Input Validation Tests (Zod Schema Rejection of Unknown Fields)
  // =========================================================================
  describe('Task 4: Strict Input Validation & Unknown Field Rejection', () => {
    it('POST /api/users rejects unknown fields (.strict())', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `strict.user.${timestamp}@medigo.test`,
          password: 'ValidPassword123!Secure',
          name: 'Strict Validation User',
          role: 'DRIVER',
          illegalInjectedField: 'hacked_property_should_fail',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('PATCH /api/users/:id rejects unknown fields (.strict())', async () => {
      const res = await request(app)
        .patch(`/api/users/${driverUser1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phone: '+49 171 0000000',
          illegalAdminGrant: true,
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('POST /api/organizations rejects unknown fields (.strict())', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Valid Clinic Name ${timestamp}`,
          type: 'CLINIC',
          maliciousAttribute: 'drop_database_flag',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('PATCH /api/orders/:id rejects unknown fields (.strict())', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderOrgA.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          specialNotes: 'Updated note via admin',
          arbitraryHackerPayload: 'injected_data',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('POST /api/orders/:id/temperature rejects unknown fields (.strict())', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderOrgA.id}/temperature`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sensorId: 'SENSOR-STRICT-01',
          tempCelsius: 5.2,
          isBreach: false,
          timestamp: new Date().toISOString(),
          forgedFirmwareSignature: 'bad_token',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('POST /api/ceo/email-forwarding rejects unknown fields (.strict())', async () => {
      const res = await request(app)
        .post('/api/ceo/email-forwarding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ceoEmail: 'valid@medigo.de',
          unauthorizedExfiltrationEndpoint: 'https://evil-server.test',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/validation failed/i);
    });
  });
});
