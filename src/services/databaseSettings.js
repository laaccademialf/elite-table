import { getAuthIdToken } from './firebase';

const authorizedJsonRequest = async (url, options = {}) => {
  const token = await getAuthIdToken();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
};

export const getDatabaseSettings = async () => {
  const response = await authorizedJsonRequest('/api/admin/database-settings', {
    method: 'GET',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Не вдалося завантажити налаштування підключення БД.');
  }

  return result;
};

export const testDatabaseConnection = async (payload) => {
  const response = await authorizedJsonRequest('/api/admin/database-settings', {
    method: 'POST',
    body: JSON.stringify({ action: 'test', ...payload }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Не вдалося перевірити підключення до БД.');
  }

  return result;
};

export const saveDatabaseSettings = async (payload) => {
  const response = await authorizedJsonRequest('/api/admin/database-settings', {
    method: 'POST',
    body: JSON.stringify({ action: 'save', ...payload }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Не вдалося зберегти налаштування БД.');
  }

  return result;
};
