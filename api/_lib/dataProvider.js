const SUPPORTED_PROVIDERS = new Set(['firebase', 'mariadb']);

export const getDataProvider = () => {
  const value = (process.env.DATA_PROVIDER || 'firebase').trim().toLowerCase();
  return SUPPORTED_PROVIDERS.has(value) ? value : 'firebase';
};

export const isMariaDbProvider = () => getDataProvider() === 'mariadb';
