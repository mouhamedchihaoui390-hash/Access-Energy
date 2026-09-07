/**
 * Thin native IndexedDB wrapper used for offline persistence.
 *
 * Three object stores:
 * - "snapshot": the latest known application data (one row, key "bootstrap")
 * - "queue":    pending mutations waiting to be synced to the server
 * - "meta":     small sync status/metadata (last sync time, etc.)
 */

const DB_NAME = 'access-erp-offline';
const DB_VERSION = 1;

export const STORE_SNAPSHOT = 'snapshot';
export const STORE_QUEUE = 'queue';
export const STORE_META = 'meta';

export type MutationEntity =
  | 'client'
  | 'product'
  | 'devis'
  | 'bl'
  | 'facture'
  | 'payment'
  | 'company';

export type MutationOperation = 'create' | 'update' | 'delete';

export type MutationStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export interface QueuedMutation {
  id: string; // stable UUID for the queue entry itself
  entity: MutationEntity;
  operation: MutationOperation;
  entityId: string; // stable client-generated id of the affected record
  payload: any;
  createdAt: string;
  attempts: number;
  status: MutationStatus;
  lastError?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) {
        db.createObjectStore(STORE_SNAPSHOT);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        tx.oncomplete = () => resolve(req ? (req as IDBRequest<T>).result : (undefined as any));
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

// ---- Snapshot ----
const SNAPSHOT_KEY = 'bootstrap';

export async function getSnapshot<T = any>(): Promise<T | null> {
  try {
    const result = await withStore<T>(STORE_SNAPSHOT, 'readonly', (store) =>
      store.get(SNAPSHOT_KEY)
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setSnapshot<T = any>(data: T): Promise<void> {
  try {
    await withStore(STORE_SNAPSHOT, 'readwrite', (store) => store.put(data, SNAPSHOT_KEY));
  } catch {
    // best-effort; UI still works from in-memory state if this fails
  }
}

// ---- Queue ----
export async function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (store) => store.put(mutation));
}

export async function updateQueuedMutation(mutation: QueuedMutation): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (store) => store.put(mutation));
}

export async function removeQueuedMutation(id: string): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (store) => store.delete(id));
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  try {
    const result = await withStore<QueuedMutation[]>(STORE_QUEUE, 'readonly', (store) =>
      store.getAll() as unknown as IDBRequest<QueuedMutation[]>
    );
    return (result || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

// ---- Meta ----
export async function getMeta<T = any>(key: string): Promise<T | null> {
  try {
    const result = await withStore<T>(STORE_META, 'readonly', (store) => store.get(key));
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setMeta<T = any>(key: string, value: T): Promise<void> {
  try {
    await withStore(STORE_META, 'readwrite', (store) => store.put(value, key));
  } catch {
    // best-effort
  }
}

export function generateStableId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}
