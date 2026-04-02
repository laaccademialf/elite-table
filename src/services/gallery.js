import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore';
import { db, uploadImage } from './firebase';

const sortGalleryItems = (items) => {
  return items.sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return Number(b.featured) - Number(a.featured);
    }
    return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
  });
};

export const getGalleryItems = async () => {
  const snapshot = await getDocs(collection(db, 'gallery'));
  const items = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
  return sortGalleryItems(items);
};

export const addGalleryItem = async (item) => {
  let nextOrder = 1;

  try {
    const q = query(collection(db, 'gallery'), orderBy('order', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    nextOrder = snapshot.docs.length > 0 ? (snapshot.docs[0].data().order ?? 0) + 1 : 1;
  } catch {
    // Fallback when some old records do not have order
  }

  const docRef = await addDoc(collection(db, 'gallery'), {
    title: item.title || '',
    description: item.description || '',
    imageUrl: item.imageUrl,
    featured: Boolean(item.featured),
    order: item.order ?? nextOrder,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
};

export const updateGalleryItem = async (id, data) => {
  const docRef = doc(db, 'gallery', id);
  await updateDoc(docRef, {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    ...(data.featured !== undefined ? { featured: Boolean(data.featured) } : {}),
    ...(data.order !== undefined ? { order: data.order } : {}),
    updatedAt: Timestamp.now(),
  });
};

export const deleteGalleryItem = async (id) => {
  await deleteDoc(doc(db, 'gallery', id));
};

export const uploadGalleryImage = async (file) => {
  return uploadImage(file, 'gallery');
};
