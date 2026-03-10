import type { ApiEnvelope, ApiErrorEnvelope } from './types';

async function parseError(resp: Response): Promise<never> {
  let payload: ApiErrorEnvelope | undefined;
  try {
    payload = (await resp.json()) as ApiErrorEnvelope;
  } catch {
    throw new Error(`Request failed: ${resp.status}`);
  }
  throw new Error(payload.error?.message || `Request failed: ${resp.status}`);
}

export async function apiGet<T>(url: string): Promise<T> {
  const resp = await fetch(url, { credentials: 'same-origin' });
  if (!resp.ok) return parseError(resp);
  const payload = (await resp.json()) as ApiEnvelope<T>;
  return payload.data;
}

export async function apiPost<T, B = unknown>(url: string, body: B): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return parseError(resp);
  const payload = (await resp.json()) as ApiEnvelope<T>;
  return payload.data;
}

export async function apiPatch<T, B = unknown>(url: string, body: B): Promise<T> {
  const resp = await fetch(url, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return parseError(resp);
  const payload = (await resp.json()) as ApiEnvelope<T>;
  return payload.data;
}

export async function apiDelete(url: string): Promise<void> {
  const resp = await fetch(url, { method: 'DELETE', credentials: 'same-origin' });
  if (!resp.ok) return parseError(resp);
}

export async function apiPostForm<T>(url: string, formData: FormData): Promise<T> {
  const resp = await fetch(url, { method: 'POST', body: formData, credentials: 'same-origin' });
  if (!resp.ok) return parseError(resp);
  const payload = (await resp.json()) as ApiEnvelope<T>;
  return payload.data;
}

