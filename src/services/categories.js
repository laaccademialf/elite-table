import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getFirestore } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// COLLECTION: categories
// { id, name, description, createdAt, updatedAt }

export const getCategories = async () => {
  const querySnapshot = await getDocs(collection(db, 'categories'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addCategory = async (category) => {
  const docRef = await addDoc(collection(db, 'categories'), {
    name: category.name,
    description: category.description || '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateCategory = async (id, data) => {
  const docRef = doc(db, 'categories', id);
  await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
};

export const deleteCategory = async (id) => {
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
};
