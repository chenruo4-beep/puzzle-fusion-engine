const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
}

/** 带 JWT 认证的 fetch — 自动加 Authorization 头、拼接 base URL */
export function authFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(apiUrl(path), { ...options, headers });
}

/** 解码 JWT payload（仅读取，不验证签名 — 服务端负责验证） */
export function parseJWT(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface UsageInfo {
  tier: 'free' | 'pro';
  is_trial: boolean;
  trial_days_left: number;
  fragments: { used: number; limit: number | null };
  fusions: { used: number; limit: number | null };
}

export async function getUsage(): Promise<UsageInfo> {
  const res = await authFetch('/api/billing/usage');
  if (!res.ok) throw new Error('Failed to fetch usage');
  return res.json();
}
