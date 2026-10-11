/**
 * Moteur de persistance locale IndexedDB pour Remind Me avec fallback localStorage.
 * Permet la conservation des données hors-ligne et la gestion d'une file d'attente de synchronisation.
 */

const DB_NAME = "remindme_offline_db";
const DB_VERSION = 1;
const QUEUE_STORE = "sync_queue";
const CACHE_STORE = "cache_store";

export interface OfflineAction {
  id: string;
  entityType: "activity" | "task" | "expense" | "income" | "scheduled_expense";
  action: "create" | "update" | "delete" | "resolve";
  payload: Record<string, any>;
  createdAt: number;
  status: "pending" | "syncing" | "synced" | "failed";
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Ajoute une action dans la file d'attente hors-ligne
 */
export async function enqueueOfflineAction(
  action: Omit<OfflineAction, "id" | "createdAt" | "status">
): Promise<string> {
  const item: OfflineAction = {
    ...action,
    id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    status: "pending",
  };

  const db = await openDB();
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      const store = tx.objectStore(QUEUE_STORE);
      store.put(item);
      tx.oncomplete = () => resolve(item.id);
      tx.onerror = () => {
        fallbackSaveToLocalStorage(item);
        resolve(item.id);
      };
    });
  } else {
    fallbackSaveToLocalStorage(item);
    return item.id;
  }
}

/**
 * Récupère toutes les actions en attente de synchronisation
 */
export async function getPendingOfflineActions(): Promise<OfflineAction[]> {
  const db = await openDB();
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).filter((it: OfflineAction) => it.status === "pending"));
      req.onerror = () => resolve(fallbackGetFromLocalStorage());
    });
  }

  return fallbackGetFromLocalStorage();
}

/**
 * Supprime une action synchronisée avec succès
 */
export async function removeOfflineAction(id: string): Promise<void> {
  const db = await openDB();
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  fallbackRemoveFromLocalStorage(id);
}

// ----------------------------------------------------------------------------
// Fallbacks localStorage pour navigateurs restreints ou navigation privée
// ----------------------------------------------------------------------------
const LS_QUEUE_KEY = "remindme_ls_sync_queue";

function fallbackSaveToLocalStorage(item: OfflineAction) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_QUEUE_KEY);
    const arr: OfflineAction[] = raw ? JSON.parse(raw) : [];
    arr.push(item);
    localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(arr));
  } catch {}
}

function fallbackGetFromLocalStorage(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fallbackRemoveFromLocalStorage(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_QUEUE_KEY);
    if (!raw) return;
    const arr: OfflineAction[] = JSON.parse(raw);
    const filtered = arr.filter((x) => x.id !== id);
    localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(filtered));
  } catch {}
}
