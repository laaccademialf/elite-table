// Migration script: populate availability collection from existing orders
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, increment } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDzxRAk3IQ79KPzSYZyumBL5IM2lW-t4iY',
  authDomain: 'renttable-6b5cd.firebaseapp.com',
  projectId: 'renttable-6b5cd',
  storageBucket: 'renttable-6b5cd.firebasestorage.app',
  messagingSenderId: '278338080140',
  appId: '1:278338080140:web:042db768677bb0c1551aa9',
  measurementId: 'G-1HJ07DLLJR',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function migrateAvailability() {
  try {
    console.log('Starting availability migration...');
    
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    console.log(`Found ${ordersSnapshot.docs.length} orders`);

    const aggregates = {};

    ordersSnapshot.docs.forEach((orderDoc) => {
      const order = orderDoc.data();
      
      // Only process booking statuses
      if (!isBookingStatus(order.status)) {
        console.log(`Skipping order ${orderDoc.id} with status ${order.status}`);
        return;
      }

      const start = toDate(order.eventDate);
      const end = toDate(order.eventEndDate) || start;
      
      if (!start) {
        console.warn(`Order ${orderDoc.id} has invalid date`);
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

    console.log(`Prepared ${Object.keys(aggregates).length} availability records`);

    // Write in batches (max 500 per batch)
    const entries = Object.entries(aggregates);
    for (let i = 0; i < entries.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + 500);
      
      for (const [key, data] of chunk) {
        const ref = doc(db, 'availability', key);
        batch.set(ref, data);
      }
      
      await batch.commit();
      console.log(`Committed batch ${Math.floor(i / 500) + 1} (${chunk.length} records)`);
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAvailability();
