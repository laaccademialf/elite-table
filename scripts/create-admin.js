#!/usr/bin/env node

/**
 * Script to create an admin account in Firebase
 * Run: node scripts/create-admin.js
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    console.log('Creating admin account...');

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'admin@admin.com',
      'admin123'
    );

    const uid = userCredential.user.uid;
    console.log('✓ Firebase Auth user created:', uid);

    // Create user document in Firestore
    const userRef = await addDoc(collection(db, 'users'), {
      uid,
      email: 'admin@admin.com',
      name: 'Admin',
      phone: '+380000000000',
      role: 'manager',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('✓ Admin user document created:', userRef.id);
    console.log('\n✅ Admin account created successfully!');
    console.log('\nCredentials:');
    console.log('  Email: admin@admin.com');
    console.log('  Password: admin123');
    console.log('\nYou can now login to the admin panel.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
