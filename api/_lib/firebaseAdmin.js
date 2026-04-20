import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const getFirebaseAdminConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin env vars are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

const getAdminApp = () => {
  if (!getApps().length) {
    initializeApp({
      credential: cert(getFirebaseAdminConfig()),
    });
  }

  return getApps()[0];
};

export const getAdminDb = () => {
  return getFirestore(getAdminApp());
};

export const getAdminAuth = () => {
  return getFirebaseAdminAuth(getAdminApp());
};

export { FieldValue };
