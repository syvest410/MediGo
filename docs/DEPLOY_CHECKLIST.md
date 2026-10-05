# MediGo Production Deployment Readiness & Verification Checklist

**Classification**: High-Security Medical Infrastructure (GDPR Art. 9 & ADR UN 3373)  
**Target Environment**: Vercel Serverless / Cloud Run Node.js Containers with Supabase Managed PostgreSQL

---

## 1. Environment Variables Configuration

Ensure the following variables are configured in the production environment secret manager (e.g., Vercel Project Settings > Environment Variables):

| Variable | Security Requirement | Production Guidance |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables cookie `Secure` flag and suppresses debug stack traces. |
| `JWT_SECRET` | 32+ characters, high-entropy random | Generate with `openssl rand -base64 48`. Server crashes at boot if < 32 chars. |
| `APP_URL` | Canonical HTTPS URL | Must be the exact production domain, e.g. `https://app.medigo.de` (No trailing slash). |
| `ALLOWED_ORIGINS` | Strict origin list | E.g. `https://app.medigo.de`. Never include `*` or untrusted origins. |
| `DATABASE_URL` | Transaction connection pooler | Supabase connection string with pooling (`?pgbouncer=true` or port 6543). |
| `SUPABASE_URL` | HTTPS endpoint | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret token | Elevated key. Never prefix with `NEXT_PUBLIC_` or `VITE_`. |
| `SEED_ON_START` | `false` | Must be `false` in production to prevent altering existing fleet records. |

---

## 2. Database Migrations (Execute in Order)

Execute the following SQL scripts in the Supabase PostgreSQL SQL Editor before traffic cutover:

### Step 1: Base Core Schema (Tables, Indexes, RLS)
Apply `supabase-schema.sql` (defines `users`, `orders`, `audit_logs`, `organizations`).

### Step 2: Rate Limit Storage Migration (Phase 3)
```sql
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON public.login_attempts(key);
CREATE INDEX IF NOT EXISTS idx_login_attempts_locked_until ON public.login_attempts(locked_until);
```

### Step 3: Refresh Token Storage & Versioning Migration (Phase 4)
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  family_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON public.refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);
```

---

## 3. Vercel Domain, Proxy & Cookie Considerations

1. **Reverse Proxy Trust (`trust proxy`)**:
   - `src/server/app.ts` is configured with `app.set('trust proxy', 1)`. This allows Express to correctly interpret `req.ip` from the immediate Vercel fronting edge proxy without trusting client-spoofed `X-Forwarded-For` headers.
2. **Domain Structure & Cookie Scoping**:
   - Refresh tokens use cookie attribute `SameSite=Strict` and path `/api/auth`.
   - **Critical Architecture Requirement**: The frontend client and API endpoints MUST reside on the same eTLD+1 domain (e.g. `app.medigo.de` and `app.medigo.de/api`, or `api.medigo.de` with domain cookie sharing). If frontend and backend are hosted on separate apex domains without URL rewrites, the browser will refuse to attach `SameSite=Strict` cookies to fetch calls.
3. **Cookie Prefix**:
   - In production (`NODE_ENV === 'production'`), the refresh cookie is named `__Secure-medigo_refresh` and enforces the `Secure` flag. All connections MUST be HTTPS.

---

## 4. Post-Deploy Smoke Test Commands (Run Immediately After Cutover)

Run these `curl` commands against the live production deployment to verify security controls:

### Smoke Test 1: Verify Quick-Session Route is Gone (Must return HTTP 404)
```bash
curl -i -X POST https://app.medigo.de/api/auth/quick-session
```
*Expected Result*: `HTTP/1.1 404 Not Found` (Never 200 or 500).

### Smoke Test 2: Anonymous Access to Protected Route Fails (Must return HTTP 401)
```bash
curl -i -X GET https://app.medigo.de/api/orders
```
*Expected Result*: `HTTP/1.1 401 Unauthorized` with JSON error message.

### Smoke Test 3: Standard Login Sets Secure Cookie and Returns No Refresh Token in Body
```bash
curl -i -c /tmp/medigo_cookies.txt -X POST https://app.medigo.de/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@medigo.de", "password": "YOUR_ADMIN_PASSWORD"}'
```
*Expected Result*:
- `HTTP/1.1 200 OK`
- Header contains `Set-Cookie: __Secure-medigo_refresh=...; Path=/api/auth; HttpOnly; Secure; SameSite=Strict`
- JSON response body contains `accessToken` and `user`, but `refreshToken` is undefined.

### Smoke Test 4: Authenticated Access Works with Memory Token
```bash
curl -i -X GET https://app.medigo.de/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN_FROM_STEP_3>"
```
*Expected Result*: `HTTP/1.1 200 OK` returning authenticated user profile.

### Smoke Test 5: Logout Revokes Session Cookie and Server State
```bash
curl -i -b /tmp/medigo_cookies.txt -X POST https://app.medigo.de/api/auth/logout \
  -H "Origin: https://app.medigo.de"
```
*Expected Result*: `HTTP/1.1 204 No Content` and cookie cleared.

### Smoke Test 6: Refresh Attempt with Cleared Cookie Fails (Must return HTTP 401)
```bash
curl -i -b /tmp/medigo_cookies.txt -X POST https://app.medigo.de/api/auth/refresh \
  -H "Origin: https://app.medigo.de"
```
*Expected Result*: `HTTP/1.1 401 Unauthorized`.
