// Utilities for working with the VPS polling server URL (used for MikroTik/OLT API calls)

export function normalizePollingServerUrl(raw?: string | null): string {
  let url = String(raw ?? '').trim();
  if (!url) return '';

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Users sometimes paste a URL that already ends with /api.
  // Our frontend always appends `/api/...`, so strip a trailing `/api` to avoid `/api/api/...`.
  url = url.replace(/\/api$/i, '');

  // Remove trailing slashes again after stripping
  url = url.replace(/\/+$/, '');

  return url;
}

const DEFAULT_RELATIVE_POLLING_PATH = '/olt-polling-server';

function maybeAppendDefaultPollingPath(base: string): string {
  if (!base) return '';
  try {
    const u = new URL(base);
    // If user provided only origin (no path), assume the standard polling path.
    if (u.pathname === '/' || u.pathname === '') {
      u.pathname = DEFAULT_RELATIVE_POLLING_PATH;
    }
    // Remove trailing slash for consistency
    return u.toString().replace(/\/+$/, '');
  } catch {
    // If it's not a full URL, keep as-is (normalizePollingServerUrl already trimmed)
    return base;
  }
}

/**
 * Resolve polling server base URL.
 * Priority: Settings value -> env -> same-origin default.
 *
 * NOTE: We do NOT auto-append a path for user-provided URLs.
 * Different deployments may expose the polling server at the origin (/) or under a sub-path.
 * If your polling server is proxied under "/olt-polling-server", include that in Settings.
 */
export function resolvePollingServerUrl(raw?: string | null): string {
  // 1) User-configured value (Settings)
  const fromSettings = normalizePollingServerUrl(raw);
  if (fromSettings) return fromSettings;

  // 2) Env fallback
  const envFallback = import.meta.env.VITE_VPS_URL || import.meta.env.VITE_POLLING_SERVER_URL || '';
  const fromEnv = normalizePollingServerUrl(envFallback);
  if (fromEnv) return fromEnv;

  // 3) Same-origin default (most common VPS reverse-proxy setup)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizePollingServerUrl(
      `${window.location.origin}${DEFAULT_RELATIVE_POLLING_PATH}`
    );
  }

  return '';
}

export function summarizeHttpError(status: number, text: string): string {
  const t = String(text || '').trim();
  
  // Handle special cases
  if (status === 0 && t === 'Request timeout') {
    return 'Request timed out. Check if the polling server is running.';
  }
  if (status === 0 && t === 'Network error') {
    return 'Network error. Check your connection and polling server URL.';
  }
  if (status === 0) {
    return t || 'Failed to connect to polling server.';
  }
  
  if (!t) return `Request failed (HTTP ${status})`;

  const looksHtml = /<!doctype\s+html|<html|<title>/i.test(t);
  if (looksHtml) {
    return `Polling server error (HTTP ${status}). Check backend service & Nginx proxy.`;
  }

  // Keep it short for toast UI
  return t.length > 180 ? `${t.slice(0, 180)}…` : t;
}

export async function fetchJsonSafe<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 30000
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text().catch(() => '');
    let data: T | null = null;

    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      data = null;
    }

    return { ok: res.ok, status: res.status, data, text };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return { ok: false, status: 0, data: null, text: 'Request timeout' };
    }
    return { ok: false, status: 0, data: null, text: err?.message || 'Network error' };
  }
}

