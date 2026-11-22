// Backend'e istek atan küçük fetch sarmalayıcısı.
// Frontend aşamasında JWT ekleme ve token yenileme buraya eklenecek.
import { API_URL } from '../constants/config';

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message ?? 'Beklenmeyen bir hata oluştu';
    throw new Error(message);
  }

  return data;
}
