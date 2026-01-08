
import { CatalogFile, CatalogIndex } from '../types';

const DB_NAME = 'ProQuoteDB';
const STORE_NAME = 'catalogs';
const INDEX_STORE_NAME = 'catalog_index';
const DB_VERSION = 2;

// Initialize DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(INDEX_STORE_NAME)) {
        db.createObjectStore(INDEX_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveCatalogsToDB = async (files: CatalogFile[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear existing (simple sync strategy)
    store.clear();

    files.forEach(f => {
      const serialized = {
        id: f.id,
        name: f.file.name,
        type: f.file.type,
        size: f.file.size,
        base64: f.base64
      };
      store.add(serialized);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadCatalogsFromDB = async (): Promise<CatalogFile[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result;
      const files: CatalogFile[] = records.map((rec: any) => {
        const byteCharacters = atob(rec.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: rec.type });
        const file = new File([blob], rec.name, { type: rec.type });

        return {
          id: rec.id,
          file: file,
          base64: rec.base64
        };
      });
      resolve(files);
    };
    request.onerror = () => reject(request.error);
  });
};

// --- Index / Cache Operations ---

export const saveCatalogIndexToDB = async (index: CatalogIndex): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(INDEX_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(INDEX_STORE_NAME);
        store.clear(); // Only keep one active index set for now
        store.add(index);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const loadCatalogIndexFromDB = async (): Promise<CatalogIndex | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(INDEX_STORE_NAME, 'readonly');
        const store = transaction.objectStore(INDEX_STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            if (request.result && request.result.length > 0) {
                resolve(request.result[0]);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearCatalogIndexFromDB = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(INDEX_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(INDEX_STORE_NAME);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};