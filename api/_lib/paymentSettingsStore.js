import { FieldValue, getAdminDb } from './firebaseAdmin.js';
import { isMariaDbProvider } from './dataProvider.js';
import { withMariaDbConnection } from './mariadb.js';

const PAYMENT_SETTINGS_ROW_ID = 1;

const mapMariaDbSettings = (row = {}) => ({
  liqpayPublicKey: row.liqpay_public_key || '',
  liqpayPrivateKey: row.liqpay_private_key || '',
  liqpaySandbox: Number(row.liqpay_sandbox) === 1,
  appBaseUrl: row.app_base_url || '',
  updatedAt: row.updated_at || null,
  updatedBy: row.updated_by || '',
});

export const getPaymentSettings = async () => {
  if (!isMariaDbProvider()) {
    const snapshot = await getAdminDb().collection('app_settings').doc('payments').get();
    return snapshot.exists ? snapshot.data() : {};
  }

  return withMariaDbConnection(async (conn) => {
    const [rows] = await conn.query(
      `SELECT liqpay_public_key, liqpay_private_key, liqpay_sandbox, app_base_url, updated_at, updated_by
       FROM app_settings_payment
       WHERE id = ?
       LIMIT 1`,
      [PAYMENT_SETTINGS_ROW_ID]
    );

    if (!rows.length) return {};
    return mapMariaDbSettings(rows[0]);
  });
};

export const savePaymentSettings = async ({ publicKey, privateKey, appBaseUrl, sandbox, updatedBy }) => {
  if (!isMariaDbProvider()) {
    const updates = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
    };

    if (typeof publicKey === 'string' && publicKey.trim()) {
      updates.liqpayPublicKey = publicKey.trim();
    }

    if (typeof privateKey === 'string' && privateKey.trim()) {
      updates.liqpayPrivateKey = privateKey.trim();
    }

    if (typeof appBaseUrl === 'string') {
      updates.appBaseUrl = appBaseUrl.trim();
    }

    if (typeof sandbox !== 'undefined') {
      updates.liqpaySandbox = sandbox === true || sandbox === 'true';
    }

    await getAdminDb().collection('app_settings').doc('payments').set(updates, { merge: true });
    return;
  }

  await withMariaDbConnection(async (conn) => {
    const normalizedSandbox = sandbox === true || sandbox === 'true' ? 1 : 0;

    await conn.query(
      `INSERT INTO app_settings_payment (
         id,
         liqpay_public_key,
         liqpay_private_key,
         liqpay_sandbox,
         app_base_url,
         updated_by
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         liqpay_public_key = COALESCE(NULLIF(VALUES(liqpay_public_key), ''), liqpay_public_key),
         liqpay_private_key = COALESCE(NULLIF(VALUES(liqpay_private_key), ''), liqpay_private_key),
         liqpay_sandbox = VALUES(liqpay_sandbox),
         app_base_url = VALUES(app_base_url),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`,
      [
        PAYMENT_SETTINGS_ROW_ID,
        typeof publicKey === 'string' ? publicKey.trim() : '',
        typeof privateKey === 'string' ? privateKey.trim() : '',
        normalizedSandbox,
        typeof appBaseUrl === 'string' ? appBaseUrl.trim() : '',
        updatedBy || '',
      ]
    );
  });
};
