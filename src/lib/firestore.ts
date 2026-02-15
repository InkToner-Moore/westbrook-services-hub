import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

// Generic helpers for Firestore CRUD

export async function getCollection<T>(collectionName: string, orderField?: string): Promise<T[]> {
  const ref = collection(db, collectionName);
  const q = orderField ? query(ref, orderBy(orderField, 'desc')) : query(ref);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as T));
}

export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  const ref = doc(db, collectionName, docId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id } as T;
}

export async function setDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  const ref = doc(db, collectionName, docId);
  await setDoc(ref, data);
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  const ref = doc(db, collectionName, docId);
  await updateDoc(ref, data);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const ref = doc(db, collectionName, docId);
  await deleteDoc(ref);
}

// Generate random order ID like "ORD-A7K3M9"
export function generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORD-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate random note ID like "NOTE-X4F8B2"
export function generateNoteId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'NOTE-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
