/**
 * Promisified Transactional Compiler for IndexedDB.
 * Abstracts low-level event-driven API into Promise-based async functions.
 */

export const openDatabase = (dbName, version = 1, onUpgradeNeeded = null) => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (onUpgradeNeeded) {
        onUpgradeNeeded(db, event);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

export const executeTransaction = async (db, storeNames, mode = 'readonly', callback) => {
  const startTime = performance.now();
  const tx = db.transaction(storeNames, mode);
  const stores = {};

  const targetStores = Array.isArray(storeNames) ? storeNames : [storeNames];
  targetStores.forEach((name) => {
    stores[name] = tx.objectStore(name);
  });

  return new Promise((resolve, reject) => {
    let result = null;

    // Run the user operations on stores
    try {
      result = callback(stores, tx);
    } catch (err) {
      tx.abort();
      reject(err);
      return;
    }

    tx.oncomplete = () => {
      const latency = performance.now() - startTime;
      resolve({ result, latency });
    };

    tx.onerror = (event) => {
      reject(event.target.error);
    };

    tx.onabort = (event) => {
      reject(new Error('Transaction aborted'));
    };
  });
};

/**
 * Iterates through a store via cursor to extract JSON records cleanly into memory.
 */
export const getAllRecordsWithCursor = (objectStore, query = null) => {
  return new Promise((resolve, reject) => {
    const records = [];
    const request = objectStore.openCursor(query);

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        // Build JSON record representing value and primary key
        records.push({
          __id: cursor.primaryKey, // Store key separately to preserve original keys
          ...cursor.value,
        });
        cursor.continue();
      } else {
        resolve(records);
      }
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};
