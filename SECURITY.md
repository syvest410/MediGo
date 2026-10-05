# MediGo Security Architecture & Compliance Specification

**Classification**: Medical Courier Diagnostics (UN 3373 ADR) & GDPR Article 9 Health Data Protection  
**Jurisdiction**: Federal Republic of Germany (BfDI / DSGVO)  
**Security Policy Version**: 5.0 (Audited October 2026)

---

## 1. Authentication & Session Architecture

MediGo implements a zero-trust, memory-only session model designed to eliminate XSS token persistence while providing cryptographic replay defense.

### Token Types & Lifetimes

| Token Type | Medium | Payload / Storage | Lifetime | Cookie Flags / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Access Token** | HTTP Header (`Authorization: Bearer <JWT>`) | JWT HS256 (`sub`, `role`, `organizationId`, `tokenVersion`, `iss: medigo-auth-server`, `aud: medigo-client-app`) held **strictly in React RAM memory**. Never written to `localStorage` or `sessionStorage`. | **15 minutes** | N/A (Client RAM only) |
| **Refresh Token** | Secure HTTP Cookie | Random 32 bytes (base64url). Server stores only **SHA-256 hash** with metadata: `userId`, `familyId`, `expiresAt`, `revokedAt`, `replacedById`, `ip`, `userAgent`. | **7 days** | `HttpOnly`, `Secure` (in production), `SameSite=Strict`, `Path=/api/auth`, name: `__Secure-medigo_refresh` (`medigo_refresh` in dev). |

### Cryptographic Rotation & Reuse Detection
- **Token Rotation**: Every call to `POST /api/auth/refresh` revokes the old refresh token record (`revokedAt` set, `replacedById` assigned), generates a new 32-byte secret in the **same family**, updates the cookie, and returns a new 15-minute access token.
- **Automatic Reuse Detection**: If a spent/revoked refresh token is replayed, the server immediately revokes the **entire token family**, increments the user's `tokenVersion`, wipes the cookie, and emits an `AUDIT_LOG` alert (`REFRESH_REUSE_DETECTED`).

### Database-Authoritative Session Versioning (`tokenVersion`)
- Middleware (`requireAuth`) loads the user from the database (backed by a 15-second TTL memory cache to shield connection pools).
- If `jwt.tokenVersion !== dbUser.tokenVersion`, or `dbUser.active === false`, or the user is deleted, the request is instantly rejected with **HTTP 401 Unauthorized**.
- `tokenVersion` is automatically incremented upon:
  1. Password change (`POST /api/auth/change-password`).
  2. Administrative account deactivation (`PATCH /api/users/:id`).
  3. Administrative role change (`PATCH /api/users/:id`).
  4. Global logout (`POST /api/auth/logout-all`).

---

## 2. Roles & Permissions Matrix

MediGo enforces strict role-based access control (RBAC) and object-level IDOR scoping:

| Role | Scope / Permissions | Object-Level Constraints |
| :--- | :--- | :--- |
| **ADMIN** | Full administrative and compliance governance across all hubs. | Unrestricted cross-hub visibility; schema inspection in non-production. |
| **DISPATCHER** | Fleet dispatching, order claiming, route tracking, and manual intervention. | Read/write across all order transitions and driver allocations. |
| **DRIVER** | Mobile courier execution: pre-trip check, barcode scanning, signatures, GPS telemetry. | Can view only orders assigned to self (`driverId === user.id`) or unclaimed orders (`status === 'SCHEDULED'`). |
| **CLIENT_CLINIC** | Medical clinic/hospital reception: order booking, live tracking, custody signoff. | Scoped strictly to orders where `originOrganizationId === user.organizationId` or `createdById === user.id`. |
| **ORG_STAFF** | Secondary clinic/pharmacy personnel. | Same as `CLIENT_CLINIC`. |
| **LAB_STAFF** | Medical laboratory receiving dock: delivery signoff, cold-chain handover verification. | Scoped strictly to orders where `destinationOrgId === user.organizationId` or lab name matches. |
| **PATIENT** | Patient portal: tracking sample status milestones. | Public tracking milestones only; zero medical telemetry, clinic contacts, or diagnostic contents revealed. |

---

## 3. Rate-Limiting & Anti-Timing Defenses

### Brute-Force & Credential Stuffing Shield (`POST /api/auth/login`)
- **Storage**: Backed by PostgreSQL `login_attempts` table (or atomic local store). Survives serverless cold starts.
- **Threshold**: 5 consecutive failed attempts trigger an exponential lockout starting at 60 seconds (escalating by 2x for subsequent failures).
- **Anti-Timing Defense**: If an unknown email address is queried, the server executes a dummy bcrypt comparison (`cost = 12`) against a precomputed dummy hash (`DUMMY_HASH`), guaranteeing identical response latency regardless of account existence.
- **Uniform Errors**: Always returns `{"message": "Invalid email or password."}`. Never leaks remaining attempts or whether the email exists.
- **Independent Counter Reset**: Successful authentication clears *only* the email counter; the IP failure count is preserved to prevent rotating attacks.

### API Rate Limits
- `POST /api/auth/refresh`: 30 requests per 15 minutes per IP.
- `GET /api/orders/track/:trackingNumber`: 60 requests per 10 minutes per IP (prevents automated tracking number enumeration).

---

## 4. Key Management & Rotation Procedures

### Rotating `JWT_SECRET`
If `JWT_SECRET` is suspected of being compromised or during regular 90-day cryptographic rotation:

1. **Generate New High-Entropy Secret**:
   ```bash
   openssl rand -base64 48
   ```
2. **Update Environment Secret**:
   - In Vercel / Cloud Run: Update `JWT_SECRET` in Secret Manager / Environment Settings.
3. **Trigger Rolling Deployment**:
   - Deploy new container revision. Existing access tokens (15-min lifetime) will fail signature verification immediately upon rollout.
   - Client applications will automatically hit `/api/auth/refresh` using their HTTP-only cookie. However, because new access tokens require the new secret, users will refresh into valid new tokens transparently.
4. **Audit Revocations**:
   - If an active breach occurred, execute `POST /api/auth/logout-all` or increment `token_version` in the database to invalidate all active refresh families.

---

## 5. Password Reset & Session Revocation Procedures

### Resetting a User's Password (`scripts/reset-password.ts`)
Run the automated password reset script in the server environment:
```bash
npx tsx scripts/reset-password.ts <user-email> "<NewStrongPassword2026!#>"
```
- Validates password against the German BSI / MediGo password policy (minimum 12 chars, no common passwords).
- Hashes with bcrypt `cost = 12`.
- Sets `mustChangePassword = true`, forcing the user to change password on first login.
- Increments `tokenVersion` and revokes all active refresh token families.

### Revoking All Active Sessions for a User
To instantly revoke all sessions (lost phone, suspected compromise):
1. **Via API** (Self-Service or Admin):
   ```bash
   curl -X POST https://app.medigo.de/api/auth/logout-all \
     -H "Authorization: Bearer <ADMIN_OR_USER_TOKEN>" \
     -H "Origin: https://app.medigo.de"
   ```
2. **Direct SQL (Emergency Revocation)**:
   ```sql
   UPDATE public.users SET token_version = token_version + 1 WHERE email = 'compromised.driver@medigo.de';
   UPDATE public.refresh_tokens SET revoked_at = timezone('utc'::text, now()) WHERE user_id = (SELECT id FROM public.users WHERE email = 'compromised.driver@medigo.de');
   ```

---

## 6. Security Incident Response Checklist

In the event of a suspected security event or GDPR Article 33 breach:

- [ ] **Step 1: Isolate & Revoke**
  - Execute database emergency revocation SQL for targeted accounts.
  - If server credentials leaked, rotate `JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in environment manager.
- [ ] **Step 2: Inspect Audit Logs**
  - Query compliance audit logs for unauthorized access:
    ```sql
    SELECT * FROM public.audit_logs 
    WHERE created_at >= NOW() - INTERVAL '24 hours' 
    ORDER BY created_at DESC;
    ```
- [ ] **Step 3: Analyze Replay Detection Alerts**
  - Check for `REFRESH_REUSE_DETECTED` entries in audit logs to identify stolen cookies.
- [ ] **Step 4: German GDPR Art. 33 / 34 Notification Assessment**
  - Determine if medical telemetry or diagnostic specimen details (Art. 9) were exposed.
  - If personal data breach is confirmed, notify the competent German supervisory authority (e.g. *Der Hessische Beauftragte für Datenschutz und Informationsfreiheit*) within **72 hours**.
