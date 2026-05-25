import Taro from '@tarojs/taro';

const TOKEN_KEY = 'auth_token';

// API_BASE 是编译常量，在 config/ 中按环境配置
declare const API_BASE: string;
const BASE = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:8000/api';

export function getToken(): string | null {
  try {
    return Taro.getStorageSync(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token);
}

export function clearToken() {
  try {
    Taro.removeStorageSync(TOKEN_KEY);
  } catch {
    // silencio
  }
}

function authHeader(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// 登录/注册响应
interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await Taro.request({
    url: `${BASE}/auth/login`,
    method: 'POST',
    data: { email, password },
    header: { 'Content-Type': 'application/json' },
  });
  if (res.statusCode === 200) {
    return res.data as AuthResponse;
  }
  throw new Error((res.data as any)?.detail || '登录失败');
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await Taro.request({
    url: `${BASE}/auth/register`,
    method: 'POST',
    data: { email, password },
    header: { 'Content-Type': 'application/json' },
  });
  if (res.statusCode === 201) {
    return res.data as AuthResponse;
  }
  throw new Error((res.data as any)?.detail || '注册失败');
}

// 通用请求
async function request<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  try {
    const res = await Taro.request({
      url: `${BASE}${path}`,
      method: options?.method || 'GET',
      data: options?.body,
      header: {
        'Content-Type': 'application/json',
        ...authHeader(),
      },
    });

    if (res.statusCode === 401) {
      clearToken();
      Taro.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => Taro.navigateTo({ url: '/pages/login/index' }), 500);
      throw new Error('请先登录');
    }

    if (res.statusCode >= 400) {
      const msg = (res.data as any)?.detail || `请求失败 (${res.statusCode})`;
      throw new Error(msg);
    }

    return res.data as T;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('网络请求失败');
  }
}

// 暴露原始请求（用于需要访问响应对象的场景）
export async function authFetch(path: string, options?: { method?: string; body?: string; headers?: Record<string, string> }) {
  const res = await Taro.request({
    url: `${BASE}${path}`,
    method: options?.method || 'GET',
    data: options?.body ? JSON.parse(options.body) : undefined,
    header: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...options?.headers,
    },
  });
  return {
    ok: res.statusCode >= 200 && res.statusCode < 300,
    status: res.statusCode,
    json: async () => res.data,
  } as Response;
}

// ---- 类型定义 ----

export interface Fragment {
  id: number;
  user_id: number;
  fragment_type: string;
  content: string;
  tags: string | null;
  archived: number;
  created_at: string;
}

export interface FusionResult {
  golden_sentence: string;
  profile_tag: string;
  confidence: number;
  directions: Direction[];
  insight: string;
  skill_gaps: string[];
  fragment_connections: string[];
}

export interface Direction {
  title: string;
  why_this_works: string;
  tagline: string;
}

export interface CheckIn {
  id: number;
  user_id: number;
  title: string;
  action: string | null;
  fusion_id: number | null;
  status: string;
  feedback: string | null;
  completed_at: string | null;
  created_at: string;
  streak_days: number;
}

// ---- API 方法 ----

export function getFragments() {
  return request<Fragment[]>('/fragments/?archived_filter=0');
}

export function getFusions() {
  return request<unknown[]>('/fusions/');
}

export function fuseFragments(profession: string, fragments: { type: string; content: string }[], goal?: string) {
  return request<FusionResult>('/fusions/analyze', {
    method: 'POST',
    body: { profession, fragments, goal },
  });
}

export function getCheckins(): Promise<CheckIn[]> {
  return request<CheckIn[]>('/checkins/');
}

export function completeCheckin(id: number) {
  return request<{ success: boolean }>(`/checkins/${id}/complete`, {
    method: 'PATCH',
  });
}
