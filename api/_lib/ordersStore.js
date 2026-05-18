import { FieldValue, getAdminDb } from './firebaseAdmin.js';
import { isMariaDbProvider } from './dataProvider.js';
import { withMariaDbConnection } from './mariadb.js';

export const updateOrderPaymentStatus = async (orderId, updates) => {
  if (!orderId) {
    throw new Error('Order id is required to update payment status.');
  }

  if (!isMariaDbProvider()) {
    const firestoreUpdates = {
      paymentMethod: 'liqpay',
      paymentStatus: updates.paymentStatus,
      liqpayStatus: updates.liqpayStatus || 'unknown',
      liqpayTransactionId: updates.liqpayTransactionId || '',
      paymentAmount: Number(updates.paymentAmount || 0),
      paymentCurrency: updates.paymentCurrency || 'UAH',
      paymentUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (updates.paymentStatus === 'paid') {
      firestoreUpdates.paidAt = FieldValue.serverTimestamp();
    }

    await getAdminDb().collection('orders').doc(orderId).set(firestoreUpdates, { merge: true });
    return;
  }

  await withMariaDbConnection(async (conn) => {
    const [result] = await conn.query(
      `UPDATE orders
       SET payment_method = ?,
           payment_status = ?,
           liqpay_status = ?,
           liqpay_transaction_id = ?,
           payment_amount = ?,
           payment_currency = ?,
           paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE public_id = ?`,
      [
        'liqpay',
        updates.paymentStatus,
        updates.liqpayStatus || 'unknown',
        updates.liqpayTransactionId || '',
        Number(updates.paymentAmount || 0),
        updates.paymentCurrency || 'UAH',
        updates.paymentStatus,
        String(orderId),
      ]
    );

    if (!result.affectedRows) {
      throw new Error(`Order not found in MariaDB by public_id: ${orderId}`);
    }
  });
};
