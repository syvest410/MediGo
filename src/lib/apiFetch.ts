/**
 * Unified API Fetch wrapper with:
 * - In-memory access token attachment (Authorization: Bearer <token>)
 * - HTTP-only refresh cookie inclusion (credentials: 'include')
 * - Automatic 401 token refresh deduplication (single shared refresh promise)
 * - Single retry on successful token rotation
 * - Graceful session termination on refresh failure
 */

/**
 * Safely parses the response body as JSON.
 * - Reads res.text() to prevent SyntaxError on empty or non-JSON payloads.
 * - Returns null when the body is empty or whitespace-only.
 * - Parses valid JSON in a try/catch block.
 * - If parsing fails (e.g. HTML error page or empty response), returns null.
 */
export async function parseJsonSafe<T = any>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Returns a human-readable error message from a response and optional parsed body.
 * Never throws SyntaxError on HTML, 502 Bad Gateway, or empty bodies.
 */
export function getErrorMessage(res: Response, data: any, defaultMsg = 'Please try again.'): string {
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  return `Server error (${res.status}). ${defaultMsg}`;
}

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

let onTokenUpdatedHandler: ((token: string | null, user?: any) => void) | null = null;
let onAuthExpiredHandler: (() => void) | null = null;

export function setMemoryToken(token: string | null) {
  memoryAccessToken = token;
}

export function getMemoryToken(): string | null {
  return memoryAccessToken;
}

export function registerAuthHandlers(
  onTokenUpdated: (token: string | null, user?: any) => void,
  onAuthExpired: () => void
) {
  onTokenUpdatedHandler = onTokenUpdated;
  onAuthExpiredHandler = onAuthExpired;
}

/**
 * Deduplicated session refresh. Concurrent requests await the same in-flight promise.
 */
export async function refreshSession(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await parseJsonSafe(response);
        const newToken = data?.accessToken || data?.token || null;
        setMemoryToken(newToken);
        if (onTokenUpdatedHandler && data?.user) {
          onTokenUpdatedHandler(newToken, data.user);
        }
        return newToken;
      } else {
        setMemoryToken(null);
        if (onAuthExpiredHandler) {
          onAuthExpiredHandler();
        }
        return null;
      }
    } catch (err) {
      console.warn('[apiFetch] Session refresh network error:', err);
      setMemoryToken(null);
      if (onAuthExpiredHandler) {
        onAuthExpiredHandler();
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Unified authenticated fetch wrapper.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const urlString =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;

  const isAuthEndpoint =
    urlString.includes('/api/auth/login') ||
    urlString.includes('/api/auth/refresh') ||
    urlString.includes('/api/auth/logout');

  const headers = new Headers(init.headers || {});
  if (!headers.has('Authorization') && memoryAccessToken && !isAuthEndpoint) {
    headers.set('Authorization', `Bearer ${memoryAccessToken}`);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
  };

  let response = await fetch(input, mergedInit);

  // If 401 on non-auth endpoint, refresh session once and retry
  if (response.status === 401 && !isAuthEndpoint) {
    const newToken = await refreshSession();
    if (newToken) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      const retryInit: RequestInit = {
        ...init,
        headers: retryHeaders,
        credentials: 'include',
      };
      response = await fetch(input, retryInit);
    }
  }

  return response;
}
