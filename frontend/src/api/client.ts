import { auth } from '../config/firebase';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

function resolveBaseUrl(): string {
  if (RAW_BASE_URL.startsWith('http://') || RAW_BASE_URL.startsWith('https://')) {
    return RAW_BASE_URL.replace(/\/+$/, '');
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const normalizedPath = RAW_BASE_URL.startsWith('/') ? RAW_BASE_URL : `/${RAW_BASE_URL}`;
  return `${origin}${normalizedPath}`.replace(/\/+$/, '');
}

const BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Retrieves the fresh Firebase ID token from the authenticated user.
 * Sends token in the Authorization: Bearer <token> header and attaches business context.
 */
export async function getAuthHeaders(
  isMultipart = false,
  businessId?: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('[ApiClient] Failed to retrieve fresh Firebase ID token:', err);
    }
  } else if (import.meta.env.DEV) {
    headers['Authorization'] = 'Bearer dev_token';
  }

  const storedBusinessId = localStorage.getItem('shopledger_active_business_id');
  const effectiveBusinessId =
    businessId ||
    (currentUser
      ? storedBusinessId && storedBusinessId !== 'biz_sharma_kirana'
        ? storedBusinessId
        : `biz_${currentUser.uid}`
      : storedBusinessId || '');

  if (effectiveBusinessId) {
    headers['x-business-id'] = effectiveBusinessId;
  }

  return headers;
}

export const apiClient = {
  async get<T>(endpoint: string, params?: Record<string, string>, businessId?: string): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, val);
        }
      });
    }

    const headers = await getAuthHeaders(false, businessId);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new ApiError(errBody.message || `Request failed with status ${res.status}`, res.status, errBody);
    }

    return res.json();
  },

  async post<T>(endpoint: string, body?: any, isMultipart = false, businessId?: string): Promise<T> {
    const headers = await getAuthHeaders(isMultipart, businessId);
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isMultipart ? body : JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new ApiError(errBody.message || `Request failed with status ${res.status}`, res.status, errBody);
    }

    return res.json();
  },

  async patch<T>(endpoint: string, body?: any, businessId?: string): Promise<T> {
    const headers = await getAuthHeaders(false, businessId);
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new ApiError(errBody.message || `Request failed with status ${res.status}`, res.status, errBody);
    }

    return res.json();
  },

  async put<T>(endpoint: string, body?: any, businessId?: string): Promise<T> {
    const headers = await getAuthHeaders(false, businessId);
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new ApiError(errBody.message || `Request failed with status ${res.status}`, res.status, errBody);
    }

    return res.json();
  },

  async delete<T>(endpoint: string, businessId?: string): Promise<T> {
    const headers = await getAuthHeaders(false, businessId);
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new ApiError(errBody.message || `Request failed with status ${res.status}`, res.status, errBody);
    }

    return res.json();
  },

  /**
   * Dedicated helper for multipart receipt voucher intake.
   */
  async uploadReceipt<T>(file: File, businessId?: string): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.post<T>('/receipts/upload', formData, true, businessId);
  },
};
