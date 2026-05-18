import { mapLiqPayStatus, verifyLiqPaySignature } from '../_lib/liqpay.js';
import { getPaymentSettings } from '../_lib/paymentSettingsStore.js';
import { updateOrderPaymentStatus } from '../_lib/ordersStore.js';

const readRequestBody = async (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
};

const parseBody = async (req) => {
  const raw = await readRequestBody(req);

  if (!raw) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;

  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);

  try {
    return JSON.parse(text);
  } catch {
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  try {
    let storedSettings = {};

    try {
      storedSettings = await getPaymentSettings();
    } catch (settingsError) {
      console.warn('[liqpay/callback] Unable to read stored payment settings:', settingsError?.message || settingsError);
    }

    const privateKey = process.env.LIQPAY_PRIVATE_KEY || storedSettings.liqpayPrivateKey;
    if (!privateKey) {
      throw new Error('LiqPay private key is missing. Add it in admin settings or the deployment environment.');
    }

    const body = await parseBody(req);
    const data = body.data;
    const signature = body.signature;

    if (!data || !signature) {
      return res.status(400).send('Missing LiqPay payload');
    }

    const isValid = verifyLiqPaySignature({ data, signature, privateKey });
    if (!isValid) {
      return res.status(403).send('Invalid signature');
    }

    const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    const orderId = payload.order_id;
    if (!orderId) {
      return res.status(400).send('Missing order id');
    }

    const paymentStatus = mapLiqPayStatus(payload.status);
    await updateOrderPaymentStatus(orderId, {
      paymentStatus,
      liqpayStatus: payload.status || 'unknown',
      liqpayTransactionId: payload.transaction_id || '',
      paymentAmount: Number(payload.amount || 0),
      paymentCurrency: payload.currency || 'UAH',
    });

    return res.status(200).send('ok');
  } catch (error) {
    console.error('[liqpay/callback] Error:', error);
    return res.status(500).send('callback_error');
  }
}
