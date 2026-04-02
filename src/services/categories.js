import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getFirestore, query, orderBy, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// COLLECTION: categories
// { id, name, description, icon, order, parentId, createdAt, updatedAt }

export const getCategories = async () => {
  // НЕ використовуємо orderBy, бо старі категорії без order не повернуться
  const querySnapshot = await getDocs(collection(db, 'categories'));
  const categories = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  // Сортуємо на клієнті: категорії з order за порядком, без order - в кінець
  return categories.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
};

export const addCategory = async (category) => {
  // Визначаємо наступний order (максимальний + 1)
  const q = query(collection(db, 'categories'), orderBy('order', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  const maxOrder = snapshot.docs.length > 0 ? (snapshot.docs[0].data().order ?? 0) : 0;
  const nextOrder = maxOrder + 1;

  const docRef = await addDoc(collection(db, 'categories'), {
    name: category.name,
    description: category.description || '',
    icon: category.icon || '',
    parentId: category.parentId || null,
    order: category.order ?? nextOrder,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateCategory = async (id, data) => {
  const docRef = doc(db, 'categories', id);
  await updateDoc(docRef, {
    name: data.name,
    description: data.description || '',
    icon: data.icon || '',
    parentId: data.parentId || null,
    ...(data.order !== undefined ? { order: data.order } : {}),
    updatedAt: Timestamp.now(),
  });
};

export const deleteCategory = async (id) => {
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
};
