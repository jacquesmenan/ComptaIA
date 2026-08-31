import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  writeBatch,
  Firestore,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  CompanyProfile,
  JournalTransaction,
  BankTransaction,
  ClientInvoice,
} from "../types";
import { AlertNotificationSettings } from "../types/alertSettings";

// Initialize Firebase App
let db: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (db) return db;
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";

    try {
      db = initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          experimentalAutoDetectLongPolling: true,
        },
        dbId
      );
    } catch {
      // If already initialized, retrieve existing instance
      db = getFirestore(app, dbId);
    }
    return db;
  } catch (error) {
    console.warn("Firebase initialization skipped or error:", error);
    return null;
  }
}

// -------------------------------------------------------------
// Company Profile Sync
// -------------------------------------------------------------
export async function saveCompanyToFirestore(company: CompanyProfile): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;
  try {
    const docRef = doc(database, "companies", "default");
    await setDoc(docRef, { ...company, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error("Error saving company to Firestore:", e);
  }
}

export function subscribeToCompany(
  onData: (company: CompanyProfile) => void
): () => void {
  const database = getFirestoreDb();
  if (!database) return () => {};

  const docRef = doc(database, "companies", "default");
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as CompanyProfile);
      }
    },
    (err) => {
      console.warn("Error subscribing to company in Firestore:", err);
    }
  );
}

// -------------------------------------------------------------
// Transactions Sync
// -------------------------------------------------------------
export async function saveTransactionToFirestore(tx: JournalTransaction): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;
  try {
    const docRef = doc(database, "transactions", tx.id);
    await setDoc(docRef, tx, { merge: true });
  } catch (e) {
    console.error("Error saving transaction to Firestore:", e);
  }
}

export async function deleteTransactionFromFirestore(id: string): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;
  try {
    await deleteDoc(doc(database, "transactions", id));
  } catch (e) {
    console.error("Error deleting transaction from Firestore:", e);
  }
}

export function subscribeToTransactions(
  onData: (transactions: JournalTransaction[]) => void
): () => void {
  const database = getFirestoreDb();
  if (!database) return () => {};

  const colRef = collection(database, "transactions");
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: JournalTransaction[] = [];
        snapshot.forEach((d) => list.push(d.data() as JournalTransaction));
        // Sort newest first
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onData(list);
      }
    },
    (err) => {
      console.warn("Error subscribing to transactions in Firestore:", err);
    }
  );
}

// -------------------------------------------------------------
// Invoices Sync
// -------------------------------------------------------------
export async function saveInvoiceToFirestore(invoice: ClientInvoice): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;
  try {
    const docRef = doc(database, "invoices", invoice.id);
    await setDoc(docRef, invoice, { merge: true });
  } catch (e) {
    console.error("Error saving invoice to Firestore:", e);
  }
}

export async function deleteInvoiceFromFirestore(id: string): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;
  try {
    await deleteDoc(doc(database, "invoices", id));
  } catch (e) {
    console.error("Error deleting invoice from Firestore:", e);
  }
}

export function subscribeToInvoices(
  onData: (invoices: ClientInvoice[]) => void
): () => void {
  const database = getFirestoreDb();
  if (!database) return () => {};

  const colRef = collection(database, "invoices");
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: ClientInvoice[] = [];
        snapshot.forEach((d) => list.push(d.data() as ClientInvoice));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onData(list);
      }
    },
    (err) => {
      console.warn("Error subscribing to invoices in Firestore:", err);
    }
  );
}

// -------------------------------------------------------------
// Bank Feed Sync
// -------------------------------------------------------------
export async function saveBankFeedToFirestore(items: BankTransaction[]): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;
  try {
    const batch = writeBatch(database);
    items.forEach((item) => {
      const docRef = doc(database, "bankFeed", item.id);
      batch.set(docRef, item, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.error("Error saving bank feed batch to Firestore:", e);
  }
}

export function subscribeToBankFeed(
  onData: (items: BankTransaction[]) => void
): () => void {
  const database = getFirestoreDb();
  if (!database) return () => {};

  const colRef = collection(database, "bankFeed");
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: BankTransaction[] = [];
        snapshot.forEach((d) => list.push(d.data() as BankTransaction));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onData(list);
      }
    },
    (err) => {
      console.warn("Error subscribing to bankFeed in Firestore:", err);
    }
  );
}

// -------------------------------------------------------------
// Alert Settings Sync
// -------------------------------------------------------------
export async function saveAlertSettingsToFirestore(settings: AlertNotificationSettings): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;
  try {
    const docRef = doc(database, "alertSettings", "default");
    await setDoc(docRef, settings, { merge: true });
  } catch (e) {
    console.error("Error saving alert settings to Firestore:", e);
  }
}

export function subscribeToAlertSettings(
  onData: (settings: AlertNotificationSettings) => void
): () => void {
  const database = getFirestoreDb();
  if (!database) return () => {};

  const docRef = doc(database, "alertSettings", "default");
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as AlertNotificationSettings);
      }
    },
    (err) => {
      console.warn("Error subscribing to alert settings in Firestore:", err);
    }
  );
}

// -------------------------------------------------------------
// Initial Database Seeding if empty
// -------------------------------------------------------------
export async function seedFirestoreIfEmpty(
  initialCompany: CompanyProfile,
  initialTransactions: JournalTransaction[],
  initialInvoices: ClientInvoice[],
  initialBankFeed: BankTransaction[],
  initialAlertSettings: AlertNotificationSettings
): Promise<void> {
  const database = getFirestoreDb();
  if (!database) return;

  try {
    const compDoc = await getDoc(doc(database, "companies", "default"));
    if (!compDoc.exists()) {
      await saveCompanyToFirestore(initialCompany);
    }

    const txsSnap = await getDocs(collection(database, "transactions"));
    if (txsSnap.empty && initialTransactions.length > 0) {
      const batch = writeBatch(database);
      initialTransactions.forEach((tx) => {
        batch.set(doc(database, "transactions", tx.id), tx);
      });
      await batch.commit();
    }

    const invSnap = await getDocs(collection(database, "invoices"));
    if (invSnap.empty && initialInvoices.length > 0) {
      const batch = writeBatch(database);
      initialInvoices.forEach((inv) => {
        batch.set(doc(database, "invoices", inv.id), inv);
      });
      await batch.commit();
    }

    const bankSnap = await getDocs(collection(database, "bankFeed"));
    if (bankSnap.empty && initialBankFeed.length > 0) {
      const batch = writeBatch(database);
      initialBankFeed.forEach((item) => {
        batch.set(doc(database, "bankFeed", item.id), item);
      });
      await batch.commit();
    }

    const alertDoc = await getDoc(doc(database, "alertSettings", "default"));
    if (!alertDoc.exists()) {
      await saveAlertSettingsToFirestore(initialAlertSettings);
    }
  } catch (err) {
    console.error("Error during initial Firestore seeding:", err);
  }
}
