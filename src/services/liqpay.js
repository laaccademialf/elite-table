import { getAuthIdToken } from './firebase';

const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';

const submitLiqPayForm = ({ data, signature, actionUrl = LIQPAY_CHECKOUT_URL }) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.acceptCharset = 'utf-8';
  form.style.display = 'none';

  const dataInput = document.createElement('input');
  dataInput.type = 'hidden';
  dataInput.name = 'data';
  dataInput.value = data;

  const signatureInput = document.createElement('input');
  signatureInput.type = 'hidden';
  signatureInput.name = 'signature';
  signatureInput.value = signature;

  form.appendChild(dataInput);
  form.appendChild(signatureInput);
  document.body.appendChild(form);
  form.submit();
  form.remove();
};

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

export const getLiqPaySettings = async () => {
  const response = await authorizedJsonRequest('/api/admin/payment-settings', {
    method: 'GET',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Не вдалося завантажити налаштування LiqPay.');
  }

  return result;
};

export const saveLiqPaySettings = async (payload) => {
  const response = await authorizedJsonRequest('/api/admin/payment-settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Не вдалося зберегти налаштування LiqPay.');
  }

  return result;
};

export const startLiqPayCheckout = async (payload) => {
  const response = await fetch('/api/liqpay/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Не вдалося підготувати оплату через LiqPay.');
  }

  if (!result.data || !result.signature) {
    throw new Error('LiqPay returned an invalid checkout payload.');
  }

  submitLiqPayForm({
    data: result.data,
    signature: result.signature,
    actionUrl: result.checkoutUrl || LIQPAY_CHECKOUT_URL,
  });

  return result;
};
