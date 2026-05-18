import { getAdminAuth, getAdminDb } from '../_lib/firebaseAdmin.js';
import { isMariaDbProvider } from '../_lib/dataProvider.js';
import { withMariaDbConnection } from '../_lib/mariadb.js';
import { getPaymentSettings, savePaymentSettings } from '../_lib/paymentSettingsStore.js';

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

const maskSecret = (secret = '') => {
  if (!secret) return '';
  if (secret.length <= 8) return '•'.repeat(secret.length);
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
};

const toIsoString = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const requireManager = async (req) => {
  const token = getBearerToken(req);

  if (!token) {
    const error = new Error('Потрібна авторизація адміністратора.');
    error.statusCode = 401;
    throw error;
  }

  const decodedToken = await getAdminAuth().verifyIdToken(token);
  let role = '';

  if (isMariaDbProvider()) {
    role = await withMariaDbConnection(async (conn) => {
      const [rows] = await conn.query(
        `SELECT r.code AS role_code
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.firebase_uid = ? OR u.email = ?
         LIMIT 1`,
        [decodedToken.uid || '', decodedToken.email || '']
      );
      return rows[0]?.role_code || '';
    });
  } else {
    const db = getAdminDb();
    const userSnapshot = await db.collection('users').where('uid', '==', decodedToken.uid).limit(1).get();
    const userData = userSnapshot.docs[0]?.data() || {};
    role = userData.role || '';
  }

  if (role !== 'manager') {
    const error = new Error('Лише адміністратор може змінювати платіжні ключі.');
    error.statusCode = 403;
    throw error;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email || '',
  };
};

const formatResponse = (data = {}) => ({
  publicKey: data.liqpayPublicKey || '',
  hasPublicKey: Boolean(data.liqpayPublicKey),
  hasPrivateKey: Boolean(data.liqpayPrivateKey),
  privateKeyPreview: maskSecret(data.liqpayPrivateKey || ''),
  sandbox: data.liqpaySandbox === true,
  appBaseUrl: data.appBaseUrl || '',
  updatedAt: toIsoString(data.updatedAt),
  updatedBy: data.updatedBy || '',
});

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUser = await requireManager(req);

    if (req.method === 'GET') {
      const settings = await getPaymentSettings();
      return res.status(200).json(formatResponse(settings));
    }

    const body = parseRequestBody(req);
    await savePaymentSettings({
      publicKey: body.publicKey,
      privateKey: body.privateKey,
      appBaseUrl: body.appBaseUrl,
      sandbox: body.sandbox,
      updatedBy: adminUser.email || adminUser.uid,
    });

    const settings = await getPaymentSettings();
    return res.status(200).json({
      success: true,
      ...formatResponse(settings),
    });
  } catch (error) {
    console.error('[admin/payment-settings] Error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Не вдалося зберегти налаштування LiqPay.',
    });
  }
}
