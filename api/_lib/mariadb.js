import mysql from 'mysql2/promise';
import { getAdminDb } from './firebaseAdmin.js';

let pool;
let poolSignature = '';

const parsePort = (value, fallback = 3306) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const configSignature = (config) => {
  return JSON.stringify({
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    ssl: Boolean(config.ssl),
    connectionLimit: config.connectionLimit,
  });
};

const buildConfig = ({ host, port, user, password, database, ssl, poolSize }) => {
  if (!host || !user || !database) return null;

  return {
    host,
    port: parsePort(port, 3306),
    user,
    password: password || '',
    database,
    waitForConnections: true,
    connectionLimit: parsePort(poolSize, 10),
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
  };
};

const getConfigFromEnv = () => {
  return buildConfig({
    host: process.env.MARIADB_HOST,
    port: process.env.MARIADB_PORT,
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,
    ssl: parseBoolean(process.env.MARIADB_SSL),
    poolSize: process.env.MARIADB_POOL_SIZE,
  });
};

const getConfigFromStoredSettings = async () => {
  try {
    const snapshot = await getAdminDb().collection('app_settings').doc('database_connection').get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};

    if ((data.provider || 'firebase') !== 'mariadb') {
      return null;
    }

    return buildConfig({
      host: data.host,
      port: data.port,
      user: data.user,
      password: data.password,
      database: data.database,
      ssl: parseBoolean(data.ssl),
      poolSize: data.poolSize,
    });
  } catch (error) {
    return null;
  }
};

const getConfig = async () => {
  const envConfig = getConfigFromEnv();
  if (envConfig) return envConfig;

  const storedConfig = await getConfigFromStoredSettings();
  if (storedConfig) return storedConfig;

  throw new Error('MariaDB config missing. Set env vars or configure DB connection in admin settings.');
};

export const getMariaDbPool = async () => {
  const config = await getConfig();
  const signature = configSignature(config);

  if (!pool || poolSignature !== signature) {
    if (pool) {
      try {
        await pool.end();
      } catch {
        // Ignore pool shutdown errors during reconfiguration
      }
    }

    pool = mysql.createPool(config);
    poolSignature = signature;
  }

  return pool;
};

export const withMariaDbConnection = async (fn) => {
  const dbPool = await getMariaDbPool();
  const connection = await dbPool.getConnection();
  try {
    return await fn(connection);
  } finally {
    connection.release();
  }
};
