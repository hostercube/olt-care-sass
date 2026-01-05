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

export async function fetchJsonSafe<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; text: string }>
{
  const res = await fetch(input, init);
  const text = await res.text().catch(() => '');
  let data: T | null = null;

  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data, text };
}
