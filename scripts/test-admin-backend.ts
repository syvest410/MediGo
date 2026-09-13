import http from 'http';

async function request(options: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ status: number; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string> = {
      ...options.headers,
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: options.path,
        method: options.method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode || 0, data, raw });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Backend & Admin User/Client Creation Test Suite...\n');

  // Test 1: Health check
  console.log('1️⃣ Checking /api/health ...');
  const health = await request({ method: 'GET', path: '/api/health' });
  console.log(`   Status: ${health.status}, Provider: ${health.data?.database?.provider}, Configured: ${health.data?.database?.supabaseConfigured}`);
  if (health.status !== 200) throw new Error('Health check failed');

  // Test 2: Admin Authentication
  console.log('\n2️⃣ Authenticating as Master Admin (nsansvester89@gmail.com)...');
  const adminAuth = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nsansvester89@gmail.com',
      password: 'AdminPass2026!',
    },
  });
  console.log(`   Status: ${adminAuth.status}, User: ${adminAuth.data?.user?.name} (${adminAuth.data?.user?.role})`);
  const adminToken = adminAuth.data?.token;
  if (!adminToken) throw new Error('Admin login failed');

  // Test 3: Fetch all users
  console.log('\n3️⃣ Fetching all users via GET /api/users ...');
  const usersRes = await request({
    method: 'GET',
    path: '/api/users',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   Status: ${usersRes.status}, Total Users: ${usersRes.data?.length}`);
  if (!Array.isArray(usersRes.data)) throw new Error('GET /api/users did not return an array');

  // Test 4: Validation Rule Check - Clinic client without contract number must be rejected (HTTP 400)
  console.log('\n4️⃣ Testing Validation: Clinic client creation WITHOUT mandatory contract number (Expect 400)...');
  const invalidClinicRes = await request({
    method: 'POST',
    path: '/api/users',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      email: 'invalid.clinic@hospital-hessen.de',
      name: 'Dr. med. Invalid Clinic',
      role: 'CLIENT_CLINIC',
      password: 'SecurePass2026!',
      organization: 'Privatklinik Wiesbaden',
    },
  });
  console.log(`   Status: ${invalidClinicRes.status}, Error Message: "${invalidClinicRes.data?.message}"`);
  if (invalidClinicRes.status !== 400) throw new Error('Expected 400 Bad Request for missing contract number');

  // Test 5: Create a new valid Client / Clinic account
  console.log('\n5️⃣ Creating new Client / Clinic account WITH legal Contract Number (Expect 201)...');
  const clinicPayload = {
    email: 'andrea.wagner@klinik-wiesbaden.de',
    name: 'Dr. med. Andrea Wagner (Leitende Ärztin)',
    role: 'CLIENT_CLINIC',
    password: 'WagnerPassword2026!',
    phone: '+49 611 987654',
    organization: 'Klinik für Innere Medizin Wiesbaden',
    contractNumber: 'CTR-2026-CLN-992',
    facilityType: 'CLINIC',
    facilityAddress: 'Wilhelmstraße 40, 65183 Wiesbaden, Hessen',
  };
  const createClinicRes = await request({
    method: 'POST',
    path: '/api/users',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: clinicPayload,
  });
  console.log(`   Status: ${createClinicRes.status}, Result: ${createClinicRes.data?.message}`);
  console.log(`   Generated User ID: ${createClinicRes.data?.user?.id}, Contract: ${createClinicRes.data?.user?.contractNumber}`);
  const createdClinic = createClinicRes.data?.user;
  if (createClinicRes.status !== 201 || !createdClinic) throw new Error('Failed to create clinic user');

  // Test 6: Create a new Medical Courier / Driver account
  console.log('\n6️⃣ Creating new Medical Courier (DRIVER) account...');
  const driverPayload = {
    email: 'stefan.meyer@medigo-hessen.de',
    name: 'Stefan Meyer (MediGo Express Kurier)',
    role: 'DRIVER',
    password: 'MeyerPassword2026!',
    phone: '+49 171 4455667',
    organization: 'MediGo Express Flotte Hessen',
    vehicleRegNumber: 'WI-MG 9912 (Kühl-Transporter)',
    facilityType: 'COURIER',
  };
  const createDriverRes = await request({
    method: 'POST',
    path: '/api/users',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: driverPayload,
  });
  console.log(`   Status: ${createDriverRes.status}, Result: ${createDriverRes.data?.message}`);
  const createdDriver = createDriverRes.data?.user;
  if (createDriverRes.status !== 201 || !createdDriver) throw new Error('Failed to create driver user');

  // Test 7: Verify login with the newly created Clinic Client credentials
  console.log('\n7️⃣ Testing Login as the newly created Client account...');
  const clientLogin = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: clinicPayload.email,
      password: clinicPayload.password,
    },
  });
  console.log(`   Status: ${clientLogin.status}, Logged In User: ${clientLogin.data?.user?.name}, Role: ${clientLogin.data?.user?.role}`);
  const clientToken = clientLogin.data?.token;
  if (clientLogin.status !== 200 || !clientToken) throw new Error('Newly created clinic user failed to log in');

  // Test 8: Security & Role-Based Access Control (RBAC)
  console.log('\n8️⃣ Testing RBAC: Non-admin trying to modify users (Expect 403 Forbidden)...');
  const forbiddenRes = await request({
    method: 'POST',
    path: '/api/users',
    headers: { Authorization: `Bearer ${clientToken}` },
    body: {
      email: 'hacker@test.com',
      name: 'Unauthorized',
      role: 'ADMIN',
      password: 'password123',
    },
  });
  console.log(`   Status: ${forbiddenRes.status}, Message: "${forbiddenRes.data?.message}"`);
  if (forbiddenRes.status !== 403) throw new Error('Client user was unexpectedly able to call admin endpoint');

  // Test 9: Update User / Toggle Active status
  console.log('\n9️⃣ Updating User / Toggling Active Status via PUT /api/users/:id ...');
  const updateRes = await request({
    method: 'PUT',
    path: `/api/users/${createdClinic.id}`,
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      active: false,
      phone: '+49 611 112233',
    },
  });
  console.log(`   Status: ${updateRes.status}, Active: ${updateRes.data?.user?.active}, Phone: ${updateRes.data?.user?.phone}`);
  if (updateRes.status !== 200 || updateRes.data?.user?.active !== false) throw new Error('User update failed');

  // Test 10: Delete test users (Clean up)
  console.log('\n🔟 Cleaning up test users via DELETE /api/users/:id ...');
  const deleteClinic = await request({
    method: 'DELETE',
    path: `/api/users/${createdClinic.id}`,
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deleteDriver = await request({
    method: 'DELETE',
    path: `/api/users/${createdDriver.id}`,
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   Deleted Clinic (${createdClinic.id}): ${deleteClinic.data?.message}`);
  console.log(`   Deleted Driver (${createdDriver.id}): ${deleteDriver.data?.message}`);

  // Test 11: Protect Master Administrator from deletion
  console.log('\n1️⃣1️⃣ Protecting Master Admin from deletion (Expect 400)...');
  const deleteAdmin = await request({
    method: 'DELETE',
    path: '/api/users/USR-ADMIN-01',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`   Status: ${deleteAdmin.status}, Message: "${deleteAdmin.data?.message}"`);
  if (deleteAdmin.status !== 400) throw new Error('Master administrator account should not be deletable');

  console.log('\n🎉 ALL 11 TESTS PASSED! Backend, Security, Validation & User/Client Management are 100% operational.');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
