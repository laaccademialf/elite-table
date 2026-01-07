// Browser-based availability migration - run from console after login as manager
import { collection, getDocs, doc, writeBatch, getFirestore } from 'firebase/firestore';
import { db } from '../services/firebase';

const isBookingStatus = (status) => ['pending', 'confirmed'].includes(status);

const parseDMY = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('.').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toDate = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return parseDMY(val);
  if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  if (val.year !== undefined && val.month !== undefined && val.day !== undefined) {
    return new Date(val.year, val.month, val.day);
  }
  return null;
};

const dateStringsInclusive = (start, end) => {
  const res = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur.getTime() <= last.getTime()) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    res.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return res;
};

export async function migrateAvailability() {
  try {
    console.log('[Migration] Starting availability migration...');
    
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    console.log(`[Migration] Found ${ordersSnapshot.docs.length} orders`);

    const aggregates = {};

    ordersSnapshot.docs.forEach((orderDoc) => {
      const order = orderDoc.data();
      
      if (!isBookingStatus(order.status)) {
        return;
      }

      const start = toDate(order.eventDate);
      const end = toDate(order.eventEndDate) || start;
      
      if (!start) {
        console.warn(`[Migration] Order ${orderDoc.id} has invalid date`);
        return;
      }

      const days = dateStringsInclusive(start, end);
      
      for (const item of order.items || []) {
        const qty = Number(item.quantity || 0);
        for (const day of days) {
          const key = `${item.productId}_${day}`;
          if (!aggregates[key]) {
            aggregates[key] = { productId: item.productId, date: day, booked: 0 };
          }
          aggregates[key].booked += qty;
        }
      }
    });

    console.log(`[Migration] Prepared ${Object.keys(aggregates).length} availability records`);

    const entries = Object.entries(aggregates);
    let completed = 0;
    
    for (let i = 0; i < entries.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + 500);
      
      for (const [key, data] of chunk) {
        const ref = doc(db, 'availability', key);
        batch.set(ref, data);
      }
      
      await batch.commit();
      completed += chunk.length;
      console.log(`[Migration] Progress: ${completed}/${entries.length} records`);
    }

    console.log('[Migration] ✅ Migration complete!');
    return { success: true, recordsCreated: entries.length };
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// Auto-expose to window for console access
if (typeof window !== 'undefined') {
  window.migrateAvailability = migrateAvailability;
}
