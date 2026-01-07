import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDzxRAk3IQ79KPzSYZyumBL5IM2lW-t4iY',
  authDomain: 'renttable-6b5cd.firebaseapp.com',
  projectId: 'renttable-6b5cd',
  storageBucket: 'renttable-6b5cd.firebasestorage.app',
  messagingSenderId: '278338080140',
  appId: '1:278338080140:web:042db768677bb0c1551aa9',
  measurementId: 'G-1HJ07DLLJR',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==================== AUTHENTICATION ====================

export const registerUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Create user document in Firestore
    await addDoc(collection(db, 'users'), {
      uid,
      email,
      role: userData.role || 'customer', // 'customer' or 'manager'
      name: userData.name || '',
      phone: userData.phone || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return { uid, email };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        // Get user profile from Firestore
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const userProfile = querySnapshot.docs[0]?.data() || {};
        console.log('[getCurrentUser] Firebase Auth user:', user);
        console.log('[getCurrentUser] Firestore userProfile:', userProfile);
        if (!querySnapshot.docs.length) {
          console.warn('[getCurrentUser] No Firestore user profile found for uid:', user.uid);
        }
        resolve({ ...user, ...userProfile });
      } else {
        console.log('[getCurrentUser] No user logged in');
        resolve(null);
      }
    }, reject);
  });
};

// Auto-register user with phone number (used in checkout)
export const registerUserWithPhone = async (phoneNumber, name = '') => {
  try {
    const email = `${phoneNumber.replace(/\D/g, '')}@renttable.local`;
    const password = Math.random().toString(36).slice(-8);

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await addDoc(collection(db, 'users'), {
      uid,
      email,
      phone: phoneNumber,
      name: name || 'Клієнт',
      role: 'customer',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return { uid, email, password };
  } catch (error) {
    console.error('Error auto-registering user:', error);
    throw error;
  }
};

// ==================== PRODUCTS (ПОСУД) ====================

export const addProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      quantity: productData.quantity,
      category: productData.category, // 'plates', 'glasses', 'cutlery', 'textiles', etc.
      image: productData.image || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const getProducts = async (filters = {}) => {
  try {
    let q = collection(db, 'products');
    const constraints = [];

    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProductById = async (productId) => {
  try {
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const updateProduct = async (productId, updates) => {
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// ==================== ORDERS (ЗАМОВЛЕННЯ) ====================

export const createOrder = async (orderData) => {
  try {
    const resolvedUserId = orderData.userId || auth.currentUser?.uid || null;
    const docRef = await addDoc(collection(db, 'orders'), {
      userId: resolvedUserId,
      items: orderData.items, // Array of { productId, quantity, price }
      totalPrice: orderData.totalPrice,
      status: 'pending', // 'pending', 'confirmed', 'delivered', 'cancelled'
      eventDate: orderData.eventDate, // Date of event
        eventEndDate: orderData.eventEndDate, // End date of event
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      address: orderData.address,
      notes: orderData.notes || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Get available quantity for product on specific date range
export const getAvailableQuantity = async (productId, startDate, endDate) => {
  try {
    console.log('[getAvailableQuantity] Called with:', { productId, startDate, endDate });
    
    // Helper: parse DD.MM.YYYY string to Date at local midnight
    const parseDMY = (str) => {
      if (!str) return null;
      const [d, m, y] = str.split('.').map((v) => parseInt(v, 10));
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };

    // Convert input to Date: if it's already a Date or object with day/month/year, convert it
    const toDate = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return parseDMY(val);
      if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate());
      if (val.year !== undefined && val.month !== undefined && val.day !== undefined) {
        return new Date(val.year, val.month, val.day);
      }
      return null;
    };

    const reqStart = toDate(startDate);
    const reqEnd = toDate(endDate) || reqStart;
    
    console.log('[getAvailableQuantity] Parsed dates:', { reqStart, reqEnd });
    
    if (!productId || !reqStart) {
      console.log('[getAvailableQuantity] Missing productId or reqStart, returning 0');
      return 0;
    }

    // Normalize so end >= start
    const startTs = reqStart.getTime();
    const endTs = (reqEnd || reqStart).getTime();
    const rangeStart = Math.min(startTs, endTs);
    const rangeEnd = Math.max(startTs, endTs);

    console.log(`[getAvailableQuantity] Date range: ${reqStart.toLocaleDateString()} to ${reqEnd.toLocaleDateString()}`);

    // Get product total quantity
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) {
      console.log('[getAvailableQuantity] Product not found');
      return 0;
    }
    const product = productDoc.data();
    const totalQuantity = Number(product.quantity || 0);

    console.log(`[getAvailableQuantity] Total quantity: ${totalQuantity}`);

    // Get all orders that overlap with the requested date range
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const ordersSnapshot = await getDocs(ordersQuery);
    let bookedQuantity = 0;

    console.log(`[getAvailableQuantity] Found ${ordersSnapshot.docs.length} orders with pending/confirmed status`);

    ordersSnapshot.docs.forEach((orderDoc) => {
      const order = orderDoc.data();
      const orderStartStr = order.eventDate;
      const orderEndStr = order.eventEndDate || order.eventDate;
      
      // Convert to Date using toDate which handles both strings and objects
      const orderStart = toDate(orderStartStr);
      const orderEnd = toDate(orderEndStr) || orderStart;
      if (!orderStart) return;

      const oStart = orderStart.getTime();
      const oEnd = orderEnd.getTime();
      const oRangeStart = Math.min(oStart, oEnd);
      const oRangeEnd = Math.max(oStart, oEnd);

      // Overlap if ranges intersect inclusively
      const overlaps = rangeStart <= oRangeEnd && rangeEnd >= oRangeStart;
      if (overlaps) {
        const orderItem = order.items?.find((item) => item.productId === productId);
        if (orderItem) {
          bookedQuantity += Number(orderItem.quantity || 0);
          console.log(`[getAvailableQuantity] Overlap found: order on ${orderStartStr}, booked ${orderItem.quantity} of product ${productId}`);
        }
      }
    });

    const available = Math.max(0, totalQuantity - bookedQuantity);
    console.log(`[getAvailableQuantity] Result: total=${totalQuantity}, booked=${bookedQuantity}, available=${available}`);
    return available;
  } catch (error) {
    console.error('[getAvailableQuantity] Error:', error);
    return 0;
  }
};

export const getOrders = async (filters = {}) => {
  try {
    let q = collection(db, 'orders');
    const constraints = [];

    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters.customerEmail) {
      constraints.push(where('customerEmail', '==', filters.customerEmail));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    constraints.push(orderBy('createdAt', 'desc'));
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }
    q = query(q, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const getOrderById = async (orderId) => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

export const cancelOrder = async (orderId) => {
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

// ==================== ANALYTICS (АНАЛІТИКА) ====================

export const getOrderStats = async (dateRange = {}) => {
  try {
    let q = collection(db, 'orders');
    const constraints = [];

    if (dateRange.startDate && dateRange.endDate) {
      constraints.push(where('createdAt', '>=', dateRange.startDate));
      constraints.push(where('createdAt', '<=', dateRange.endDate));
    }

    q = query(q, ...constraints);

    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map((doc) => doc.data());

    // Calculate stats
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'delivered').length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

// ==================== FILE UPLOAD ====================

export const uploadImage = async (file, path) => {
  try {
    const storageRef = ref(storage, `${path}/${file.name}-${Date.now()}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const fetchUserProfileByUid = async (uid) => {
  const q = query(collection(db, 'users'), where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
};

export { auth, db, storage };
