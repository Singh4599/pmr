// firebase-config.js — LV Spices Preventive Maintenance Record (PMR)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAmH-euQKbVWrejH2XIn-TRHGY9uqTpaQM",
  authDomain: "pmr-e5961.firebaseapp.com",
  projectId: "pmr-e5961",
  storageBucket: "pmr-e5961.firebasestorage.app",
  messagingSenderId: "899140901532",
  appId: "1:899140901532:web:b6b771e62dffe6699bab59"
};

export const COLLECTION_NAME = "maintenance_records";
let db = null;

export function updateCloudBadge(connected) {
  const badge = document.getElementById('cloud-status-badge');
  const text  = document.getElementById('cloud-status-text');
  if (!badge) return;
  badge.className = connected ? 'cloud-badge connected' : 'cloud-badge offline';
  if (text) text.textContent = connected ? 'Cloud Synced' : 'Local / Offline';
}

export function initFirebase() {
  if (db) return db;
  try {
    const app = getApps().find(a => a.name === 'pmr') || initializeApp(firebaseConfig, 'pmr');
    db = getFirestore(app);
    updateCloudBadge(true);
    return db;
  } catch (err) { updateCloudBadge(false); return null; }
}

export async function saveRecord(id, data) {
  const database = initFirebase();
  if (!database) return false;
  try {
    await setDoc(doc(database, COLLECTION_NAME, id), { ...data, updatedAt: Date.now() }, { merge: true });
    updateCloudBadge(true); return true;
  } catch (err) { updateCloudBadge(false); return false; }
}

export async function loadAllRecords() {
  const database = initFirebase();
  if (!database) return [];
  try {
    const q = query(collection(database, COLLECTION_NAME), orderBy("date", "desc"), limit(500));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

try { initFirebase(); } catch (e) {}
