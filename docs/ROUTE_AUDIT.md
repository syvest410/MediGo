# MediGo UN 3373 API Route Security & Authorization Audit

**Audit Date**: October 2, 2026  
**Scope**: `src/server/app.ts` Express REST API Endpoints  
**Classification**: German Medical Diagnostics, Transport & GDPR Art. 9 Healthcare Compliance  
**Author**: Senior Security-Focused Full-Stack Engineer  

---

## Executive Summary

Prior to this Phase 2 authorization hardening, an audit of `src/server/app.ts` revealed critical security vulnerabilities:
1. **Unauthenticated Infrastructure & PII Leaks**: `/api/organizations` allowed unauthenticated anonymous callers to scrape all clinic, hospital, and laboratory names, contact emails, phone numbers, and contract numbers. `/api/db/status` exposed Supabase backend URLs, database table states, and exact user/order database record counts.
2. **Exposed Database Schema**: `/api/db/schema-sql` exposed the entire internal PostgreSQL schema definition and RLS policy statements without authentication or production environment guards.
3. **Unprotected Diagnostic Telemetry & CEO Email Configuration**: `/api/orders/:id/temperature` had zero authentication, allowing unauthorized callers to forge IoT sensor readings and trigger false alarm breaches. `/api/ceo/email-forwarding` and its test-send routes were completely open to unauthenticated modifications.
4. **Information Disclosure (User Directory)**: `GET /api/users` used `requireAuth` without role restrictions, permitting couriers, drivers, or clinic receptionists to enumerate all administrative users, phone numbers, and credentials metadata.
5. **IDOR & State Machine Bypass**: Order endpoints returned HTTP 403 instead of HTTP 404 for records outside a caller's scope, enabling order existence enumeration. Furthermore, couriers could execute pre-trip inspections on orders assigned to other drivers, and offline synchronization accepted unauthenticated callers (`optionalAuth`).

---

## Route Inventory & Audit Matrix

| Method | Path | Middleware (BEFORE) | Roles Reaching (BEFORE) | Middleware (AFTER) | Roles Reaching (AFTER) | Data Returned / Mutated | Security Status (BEFORE → AFTER) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | `none` | Anyone | `none` | Anyone | System operational flag & timestamp | `PUBLIC_SAFE` → `PUBLIC_SAFE` |
| **GET** | `/api/db/status` | `none` | Anyone | `optionalAuth` | Anonymous: `{ ok: true }`. ADMIN: Full diagnostic telemetry | **VULN: LEAK**: Exposed `supabaseUrl`, table list, user/order counts → **SECURED**: Anonymous gets zero sensitive metadata |
| **GET** | `/api/db/schema-sql` | `none` | Anyone | `requireAdmin` | ADMIN only (Disabled when `NODE_ENV === 'production'`) | PostgreSQL DDL table definitions & RLS policies | **CRITICAL: EXPOSURE**: Full schema dump public → **SECURED**: Non-production ADMIN only, 404 in production |
| **POST** | `/api/auth/login` | `none` | Anyone | `none` + Strict Schema + Rate Limit | Anyone | Returns JWT session token and sanitized user profile | `PUBLIC_SAFE` → `HARDENED` with strict schema validation |
| **POST** | `/api/auth/refresh` | *Not implemented* | N/A | `validateCsrfOrigin` + Rate Limit | Anyone with valid cookie | Rotates refresh token in family, issues fresh 15-min JWT | `NEW (PHASE 4)`: Cryptographic rotation, reuse detection |
| **POST** | `/api/auth/logout` | *Not implemented* | N/A | `validateCsrfOrigin` | Anyone with valid cookie | Revokes token family, clears cookie, returns 204 | `NEW (PHASE 4)`: Server-side family revocation |
| **POST** | `/api/auth/logout-all` | *Not implemented* | N/A | `validateCsrfOrigin` + `requireAuth` | Authenticated user | Revokes all user token families and increments tokenVersion | `NEW (PHASE 4)`: Global session termination |
| **POST** | `/api/auth/change-password` | *Not implemented* | N/A | `validateCsrfOrigin` + `requireAuth` | Authenticated user | Clears mustChangePassword, increments tokenVersion | `NEW (PHASE 3)`: Strict password policy, session rotation |
| **GET** | `/api/auth/me` | `requireAuth` | Any authenticated user | `requireAuth` | Current user only | Authenticated user profile (`User`) | `SECURE` → `SECURE` |
| **GET** | `/api/organizations` | `none` | Anyone | `requireAuth` | ADMIN/DISPATCHER: All orgs. CLINIC/LAB/STAFF: Own org only | Facilities list (name, contact phone, email, address) | **CRITICAL: DATA LEAK**: Anonymous scraper target → **SECURED**: Scoped to user's assigned organization |
| **POST** | `/api/organizations` | `requireAdmin` | ADMIN | `requireAdmin` + `.strict()` | ADMIN | Creates/updates clinic or laboratory facility | `PARTIAL` → `HARDENED`: Strict Zod schema rejects unknown fields |
| **GET** | `/api/users` | `requireAuth` | Any authenticated user | `requireAdmin` | ADMIN, DISPATCHER | User directory list (names, emails, roles, vehicles) | **CRITICAL: PRIVILEGE LEAK**: Drivers/Clinics could list all users → **SECURED**: Admin & Dispatcher only |
| **GET** | `/api/users/:id` | *Not implemented* | N/A | `requireAuth` | ADMIN, DISPATCHER, or User fetching Self (`req.user.id === id`) | Single user record | **NEW ENDPOINT**: Self-lookup or admin lookup; returns 404 for unauthorized IDs |
| **POST** | `/api/users` | `requireAdmin` | ADMIN | `requireAdmin` + `.strict()` | ADMIN | Creates new system user | `SECURE` → `HARDENED`: Strict Zod schema rejects unknown fields |
| **PATCH** | `/api/users/:id` | `requireAdmin` | ADMIN | `requireAdmin` + `.strict()` | ADMIN | Modifies user properties | `PARTIAL` → `HARDENED`: Strict Zod schema rejects unknown fields |
| **PUT** | `/api/users/:id` | `requireAdmin` | ADMIN | `requireAdmin` + `.strict()` | ADMIN | Modifies user properties | `PARTIAL` → `HARDENED`: Strict Zod schema rejects unknown fields |
| **DELETE** | `/api/users/:id` | `requireAdmin` | ADMIN | `requireAdmin` + `.strict()` | ADMIN | Deletes user record | `SECURE` → `SECURE` |
| **GET** | `/api/orders` | `requireAuth` | Any authenticated user | `requireAuth` + Organization Scoping | ADMIN/DISP: All. CLINIC/LAB: Own org orders. DRIVER: Assigned/claimable | List of sample orders sanitized for role | `PARTIAL IDOR` → `SECURED`: Rigorous organizationId and driver filtering |
| **GET** | `/api/orders/track/:trackingNumber` | `none` | Anyone | `none` + In-Memory Rate Limit | Anyone | Sanitized milestones: status, cold chain compliance, transit cities | `PARTIAL` → `HARDENED`: Rate-limited against enumeration; zero patient/sample contents exposed |
| **GET** | `/api/orders/:id` | `requireAuth` | Any authenticated user (Returned 403 on mismatch) | `requireAuth` + `canAccessOrder` | ADMIN/DISP: All. CLINIC/LAB: Own org. DRIVER: Assigned/claimable | Full order details sanitized for role | **IDOR ENUMERATION**: Returned 403 revealing order existence → **SECURED**: Returns 404 on unauthorized access |
| **POST** | `/api/orders` | `requireRole('ADMIN', 'DISPATCHER', 'CLIENT_CLINIC', 'ORG_STAFF')` | Permitted roles | `requireRole(...)` + `.strict()` | Permitted roles | Creates new specimen transport order | `PARTIAL` → `HARDENED`: Strict schema; enforces creator's `organizationId` |
| **POST** | `/api/orders/:id/transition` | `requireAuth` | Any authenticated user (Returned 403) | `requireAuth` + Server Role Matrix | Roles authorized for specific state transition | Executes validated UN 3373 state change | **STATE BYPASS & IDOR**: Returned 403; drivers could tamper with others' orders → **SECURED**: Returns 404, server-enforced role matrix |
| **POST** | `/api/orders/:id/claim` | `requireRole('DRIVER', 'DISPATCHER', 'ADMIN')` | Drivers, Dispatchers, Admins | `requireRole(...)` + `canAccessOrder` | Drivers, Dispatchers, Admins | Claims open order for driver vehicle | `PARTIAL` → `SECURED`: Returns 404 if order not found or not in claimable state |
| **PATCH** | `/api/orders/:id` | `requireRole('ADMIN', 'DISPATCHER')` | Admins, Dispatchers | `requireRole(...)` + `.strict()` | Admins, Dispatchers | Updates order fields | `PARTIAL` → `HARDENED`: Strict Zod schema rejects unknown fields |
| **POST** | `/api/orders/:id/pre-trip-check` | `requireRole('DRIVER', 'DISPATCHER', 'ADMIN')` | Any Driver | `requireRole(...)` + `canAccessOrder` | Assigned Driver, Dispatchers, Admins | Approves vehicle departure inspection | **IDOR**: Driver could inspect other couriers' orders → **SECURED**: Returns 404 on assignment mismatch; `.strict()` |
| **POST** | `/api/orders/:id/chain-of-custody` | `requireAuth` | Any authenticated user (Returned 403) | `requireAuth` + `canAccessOrder` | Authorized handover parties | Appends digital signature log | **IDOR**: Returned 403 → **SECURED**: Returns 404; `.strict()` signature payload schema |
| **POST** | `/api/orders/:id/temperature` | `none` | Anyone | `requireRole('DRIVER', 'DISPATCHER', 'ADMIN')` + `canAccessOrder` | Assigned Courier, Dispatchers, Admins | Appends sensor temperature reading & breach alert | **CRITICAL: UNPROTECTED WRITE**: Anonymous could forge telemetry → **SECURED**: Authenticated & authorized only |
| **GET** | `/api/audit-logs` | `requireRole('ADMIN', 'DISPATCHER')` | Admins, Dispatchers | `requireRole('ADMIN', 'DISPATCHER')` | Admins, Dispatchers | System and compliance audit trails | `SECURE` → `CONFIRMED SECURE` |
| **POST** | `/api/v1/sync` | `optionalAuth` | Anyone | `requireAuth` + `canAccessOrder` | Authenticated Couriers & Dispatchers | Syncs offline queued actions | **CRITICAL: BYPASS**: Anonymous sync accepted → **SECURED**: Mandatory JWT; couriers can only sync assigned orders |
| **POST** | `/api/sync` | `optionalAuth` | Anyone | `requireAuth` + `canAccessOrder` | Authenticated Couriers & Dispatchers | Syncs offline queued actions (alias) | **CRITICAL: BYPASS** → **SECURED** |
| **POST** | `/api/sync-offline` | `optionalAuth` | Anyone | `requireAuth` + `canAccessOrder` | Authenticated Couriers & Dispatchers | Syncs offline queued actions (alias) | **CRITICAL: BYPASS** → **SECURED** |
| **GET** | `/api/ceo/email-forwarding` | `none` | Anyone | `requireAdmin` | ADMIN only | CEO & accounting dispatch forwarding config | **VULN: DATA LEAK**: Exposed executive email addresses → **SECURED**: Admin only |
| **POST** | `/api/ceo/email-forwarding` | `none` | Anyone | `requireAdmin` + `.strict()` | ADMIN only | Modifies dispatch email routing | **CRITICAL: UNPROTECTED WRITE**: Anyone could reroute dispatch emails → **SECURED**: Admin only |
| **POST** | `/api/ceo/email-forwarding/test-send` | `none` | Anyone | `requireAdmin` + `.strict()` | ADMIN only | Triggers test email dispatch | **VULN: SPAM/ABUSE**: Public email trigger → **SECURED**: Admin only |
| **ALL** | `/api/*` | `none` | Anyone | `none` | Anyone | Fallback JSON 404 | `SECURE` → `SECURE` |

---

## Authorization & IDOR Policy Matrix

### 1. `canAccessOrder(user: TokenPayload, order: Order): boolean`
- **ADMIN / DISPATCHER**: Full access across all Hessen logistics hubs.
- **CLIENT_CLINIC / ORG_STAFF**: Restricted strictly to orders where:
  - `order.originOrganizationId === user.organizationId`, OR
  - `order.destinationOrgId === user.organizationId`, OR
  - `order.pickupClinicName` matches `user.organization`, OR
  - `order.createdById === user.id`.
- **LAB_STAFF**: Restricted strictly to orders consigned to the dock of their laboratory:
  - `order.destinationOrgId === user.organizationId`, OR
  - `order.deliveryLabName` matches `user.organization`.
- **DRIVER**: Restricted strictly to orders where:
  - `order.driverId === user.id` (currently assigned), OR
  - `!order.driverId && order.status === 'SCHEDULED'` (open for claiming).
- **All Unauthorized Attempts**: Server responds with **HTTP 404 Not Found** (never HTTP 403) to prevent order existence enumeration.

### 2. State Transition Role Enforcement
| Target State | Allowed Roles | Preconditions Verified Server-Side |
| :--- | :--- | :--- |
| `PRE_TRIP_CHECK` | `DRIVER`, `DISPATCHER`, `ADMIN` | Driver must be assigned (`driverId === user.id` or claiming unassigned scheduled order). |
| `PICKED_UP` | `DRIVER`, `DISPATCHER`, `ADMIN` | Must have verified Pre-Trip inspection approved and pickup signature with barcode scans. |
| `IN_TRANSIT` | `DRIVER`, `DISPATCHER`, `ADMIN` | Pickup Chain of Custody must exist; driver must be assigned. |
| `DELIVERED` | `DRIVER`, `LAB_STAFF`, `DISPATCHER`, `ADMIN` | Delivery Chain of Custody signature recorded at receiving laboratory dock. |
| `QUARANTINED_UNSYNCED` | `SYSTEM`, `DISPATCHER`, `ADMIN` | Automatic collision detection or manual quarantine by operations. |
| `CANCELLED` | `CLIENT_CLINIC`, `ORG_STAFF`, `DISPATCHER`, `ADMIN` | Clinics can ONLY cancel prior to pickup (`SCHEDULED` or `PRE_TRIP_CHECK`). |

---

## Verification Commands
```bash
# 1. Run full Vitest suite (including authorization and IDOR test cases)
npm test

# 2. Run TypeScript check and production build
npm run lint && npm run build
```
