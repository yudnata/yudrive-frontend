export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new ApiError(401, 'UNAUTHORIZED', 'Sesi Anda telah berakhir.');
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const code = data?.error?.code || 'UNKNOWN_ERROR';
      const message = data?.error?.message || `Permintaan gagal (${res.status})`;
      throw new ApiError(res.status, code, message);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors (e.g. cold start sleep or offline)
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server. Backend mungkin sedang bangun dari mode tidur.'
    );
  }
}
