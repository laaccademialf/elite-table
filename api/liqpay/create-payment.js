import { getAdminDb } from '../_lib/firebaseAdmin.js';
import { buildLiqPayCheckoutPayload, getRequestOrigin, LIQPAY_CHECKOUT_URL } from '../_lib/liqpay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let storedSettings = {};

    try {
      const snapshot = await getAdminDb().collection('app_settings').doc('payments').get();
      storedSettings = snapshot.exists ? snapshot.data() : {};
    } catch (settingsError) {
      console.warn('[liqpay/create-payment] Unable to read stored payment settings:', settingsError?.message || settingsError);
    }

    const publicKey = process.env.LIQPAY_PUBLIC_KEY || storedSettings.liqpayPublicKey;
    const privateKey = process.env.LIQPAY_PRIVATE_KEY || storedSettings.liqpayPrivateKey;

    if (!publicKey || !privateKey) {
      return res.status(500).json({
        error: 'LiqPay is not configured. Add keys in admin settings or set LIQPAY_PUBLIC_KEY and LIQPAY_PRIVATE_KEY in the deployment environment.',
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      orderId,
      amount,
      description,
      customerName,
      customerPhone,
      customerEmail,
      notes,
    } = body;

    if (!orderId || !Number(amount)) {
      return res.status(400).json({ error: 'orderId and a positive amount are required.' });
    }

    const origin = process.env.APP_BASE_URL || storedSettings.appBaseUrl || getRequestOrigin(req);
    const resultUrl = `${origin}/?payment=liqpay&order=${encodeURIComponent(orderId)}`;
    const serverUrl = `${origin}/api/liqpay/callback`;

    const { data, signature, params } = buildLiqPayCheckoutPayload({
      publicKey,
      privateKey,
      orderId,
      amount,
      description: description || `Оплата замовлення LaFamiglia Rentco #${String(orderId).slice(0, 8)}`,
      resultUrl,
      serverUrl,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      sandbox: typeof process.env.LIQPAY_SANDBOX === 'string'
        ? process.env.LIQPAY_SANDBOX === 'true'
        : storedSettings.liqpaySandbox === true,
    });

    return res.status(200).json({
      data,
      signature,
      checkoutUrl: LIQPAY_CHECKOUT_URL,
      mode: params.sandbox ? 'sandbox' : 'live',
    });
  } catch (error) {
    console.error('[liqpay/create-payment] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create LiqPay payment.',
    });
  }
}
