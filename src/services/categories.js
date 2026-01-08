import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getFirestore, query, orderBy, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// COLLECTION: categories
// { id, name, description, createdAt, updatedAt }

export const getCategories = async () => {
  // Сортуємо за полем order (зростання). Для старих записів без order фолбек працює в AppProvider/клієнті.
  const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  const categories = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  // Додатково захищаємося від undefined order: відсортуємо на клієнті, якщо треба
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
    ...(data.order !== undefined ? { order: data.order } : {}),
    updatedAt: Timestamp.now(),
  });
};

export const deleteCategory = async (id) => {
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
};
