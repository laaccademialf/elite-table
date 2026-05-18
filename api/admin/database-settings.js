import mysql from 'mysql2/promise';
import { FieldValue, getAdminAuth, getAdminDb } from '../_lib/firebaseAdmin.js';

const SETTINGS_COLLECTION = 'app_settings';
const SETTINGS_DOC = 'database_connection';

const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
};

const parseRequestBody = (req) => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }

  return req.body;
};

const parsePort = (value, fallback = 3306) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const maskSecret = (secret = '') => {
  if (!secret) return '';
  if (secret.length <= 8) return '•'.repeat(secret.length);
  return `${secret.slice(0, 2)}••••${secret.slice(-2)}`;
};

const mapStoredConfig = (data = {}) => ({
  provider: data.provider || 'firebase',
  host: data.host || '',
  port: parsePort(data.port, 3306),
  user: data.user || '',
  database: data.database || '',
  ssl: parseBoolean(data.ssl),
  poolSize: parsePort(data.poolSize, 10),
  hasPassword: Boolean(data.password),
  passwordPreview: maskSecret(data.password || ''),
  updatedBy: data.updatedBy || '',
  updatedAt: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate().toISOString() : null,
});

const buildConnectionConfig = (payload = {}) => {
  const host = String(payload.host || '').trim();
  const user = String(payload.user || '').trim();
  const password = String(payload.password || '');
  const database = String(payload.database || '').trim();

  if (!host || !user || !database) {
    throw new Error('Поля host, user та database є обовʼязковими.');
  }

  return {
    host,
    port: parsePort(payload.port, 3306),
    user,
    password,
    database,
    ssl: parseBoolean(payload.ssl),
    poolSize: parsePort(payload.poolSize, 10),
  };
};

const requireManager = async (req) => {
  const token = getBearerToken(req);

  if (!token) {
    const error = new Error('Потрібна авторизація адміністратора.');
    error.statusCode = 401;
    throw error;
  }

  const decodedToken = await getAdminAuth().verifyIdToken(token);
  const db = getAdminDb();
  const userSnapshot = await db.collection('users').where('uid', '==', decodedToken.uid).limit(1).get();
  const userData = userSnapshot.docs[0]?.data() || {};

  if (userData.role !== 'manager') {
    const error = new Error('Лише адміністратор може змінювати підключення до БД.');
    error.statusCode = 403;
    throw error;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email || userData.email || '',
  };
};

const getStoredSettings = async () => {
  const snapshot = await getAdminDb().collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).get();
  return snapshot.exists ? snapshot.data() : {};
};

const runConnectionTest = async (config) => {
  const startedAt = Date.now();
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: 7000,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const [rows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS db_name, NOW() AS server_time');
    const row = rows[0] || {};

    return {
      latencyMs: Date.now() - startedAt,
      version: row.version || '',
      database: row.db_name || config.database,
      serverTime: row.server_time || null,
    };
  } finally {
    await connection.end();
  }
};

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUser = await requireManager(req);

    if (req.method === 'GET') {
      const stored = await getStoredSettings();
      const envConfigured = Boolean(process.env.MARIADB_HOST && process.env.MARIADB_USER && process.env.MARIADB_DATABASE);
      const payload = mapStoredConfig(stored);

      return res.status(200).json({
        ...payload,
        provider: process.env.DATA_PROVIDER || payload.provider || 'firebase',
        envConfigured,
      });
    }

    const body = parseRequestBody(req);
    const action = String(body.action || 'save').toLowerCase();

    if (action === 'test') {
      const testConfig = buildConnectionConfig(body);
      const diagnostics = await runConnectionTest(testConfig);
      return res.status(200).json({
        success: true,
        message: 'Підключення до MariaDB успішне.',
        diagnostics,
      });
    }

    if (action === 'save') {
      const provider = String(body.provider || 'mariadb').toLowerCase() === 'firebase' ? 'firebase' : 'mariadb';
      const hasMariaConfig = Boolean(body.host || body.user || body.database || body.password);

      let config = null;
      if (provider === 'mariadb') {
        config = buildConnectionConfig(body);
        await runConnectionTest(config);
      }

      const updates = {
        provider,
        updatedBy: adminUser.email || adminUser.uid,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (provider === 'mariadb' && config) {
        updates.host = config.host;
        updates.port = config.port;
        updates.user = config.user;
        updates.database = config.database;
        updates.ssl = config.ssl;
        updates.poolSize = config.poolSize;
        if (config.password) {
          updates.password = config.password;
        }
      } else if (provider === 'firebase' && hasMariaConfig) {
        const configFromPayload = buildConnectionConfig(body);
        updates.host = configFromPayload.host;
        updates.port = configFromPayload.port;
        updates.user = configFromPayload.user;
        updates.database = configFromPayload.database;
        updates.ssl = configFromPayload.ssl;
        updates.poolSize = configFromPayload.poolSize;
        if (configFromPayload.password) {
          updates.password = configFromPayload.password;
        }
      }

      await getAdminDb().collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).set(updates, { merge: true });

      process.env.DATA_PROVIDER = provider;
      if (provider === 'mariadb' && config) {
        process.env.MARIADB_HOST = config.host;
        process.env.MARIADB_PORT = String(config.port);
        process.env.MARIADB_USER = config.user;
        process.env.MARIADB_DATABASE = config.database;
        process.env.MARIADB_SSL = config.ssl ? 'true' : 'false';
        process.env.MARIADB_POOL_SIZE = String(config.poolSize);
        if (config.password) {
          process.env.MARIADB_PASSWORD = config.password;
        }
      }

      const stored = await getStoredSettings();
      return res.status(200).json({
        success: true,
        message: provider === 'mariadb'
          ? 'Підключення до MariaDB збережено і активовано.'
          : 'Режим Firebase активовано.',
        ...mapStoredConfig(stored),
        provider,
      });
    }

    return res.status(400).json({ error: 'Unsupported action. Use action=test or action=save.' });
  } catch (error) {
    console.error('[admin/database-settings] Error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Не вдалося виконати операцію з підключенням БД.',
    });
  }
}
