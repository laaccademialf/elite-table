import crypto from 'node:crypto';

export const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';

export const getRequestOrigin = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${protocol}://${host}` : '';
};

export const encodeLiqPayData = (params) => Buffer.from(JSON.stringify(params)).toString('base64');

export const signLiqPayData = (data, privateKey) => {
  return crypto.createHash('sha1').update(`${privateKey}${data}${privateKey}`).digest('base64');
};

export const verifyLiqPaySignature = ({ data, signature, privateKey }) => {
  return signLiqPayData(data, privateKey) === signature;
};

export const buildLiqPayCheckoutPayload = ({
  publicKey,
  privateKey,
  orderId,
  amount,
  description,
  resultUrl,
  serverUrl,
  customerName,
  customerPhone,
  customerEmail,
  notes,
  sandbox = false,
}) => {
  const params = {
    version: '3',
    public_key: publicKey,
    action: 'pay',
    amount: Number(amount).toFixed(2),
    currency: 'UAH',
    description,
    order_id: orderId,
    result_url: resultUrl,
    server_url: serverUrl,
    language: 'uk',
  };

  if (customerName) params.customer = customerName;
  if (customerPhone) params.phone = customerPhone;
  if (customerEmail) params.email = customerEmail;
  if (notes) params.info = String(notes).slice(0, 255);
  if (sandbox) params.sandbox = '1';

  const data = encodeLiqPayData(params);
  const signature = signLiqPayData(data, privateKey);

  return { params, data, signature };
};

export const mapLiqPayStatus = (status = '') => {
  switch (status) {
    case 'success':
    case 'sandbox':
      return 'paid';
    case 'wait_accept':
    case 'wait_secure':
    case 'processing':
    case 'hold_wait':
    case 'subscribed':
      return 'processing';
    case 'failure':
    case 'error':
    case 'reversed':
    case 'unsubscribed':
      return 'failed';
    default:
      return 'pending';
  }
};
