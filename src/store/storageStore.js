import { create } from 'zustand';
import { openDatabase, executeTransaction, getAllRecordsWithCursor } from '../utils/indexedDBWrapper';
import { calculateCollectionWeight, getBrowserStorageQuota, calculateRecordByteWeight } from '../utils/volumetricAnalyzer';
import { inspectRelationships } from '../utils/relationshipInspector';

// Raw mutable buffer for fast high-frequency filtering to bypass React rerender overhead.
export const FastFilterBuffer = {
  activeSearchQuery: '',
  cachedRecords: [],
  onFilterChange: null,
};

export const useStorageStore = create((set, get) => {
  // Helpers to initialize LocalStorage configurations
  const loadWorkspaceConfig = () => {
    try {
      const config = localStorage.getItem('__db_explorer_workspace_config');
      if (config) {
        return JSON.parse(config);
      }
    } catch (e) {
      console.error('Failed to load workspace config:', e);
    }
    return {
      customQueryScript: 'SELECT * FROM users WHERE age > 20',
      frequentlyInspectedDB: 'RetailDB',
      layoutProfile: 'dual-pane',
    };
  };

  const saveWorkspaceConfig = (configUpdates) => {
    try {
      const current = get()?.workspaceConfig || {};
      const updated = { ...current, ...configUpdates };
      localStorage.setItem('__db_explorer_workspace_config', JSON.stringify(updated));
      set({ workspaceConfig: updated });
    } catch (e) {
      console.error('Failed to save workspace config:', e);
    }
  };

  return {
    // Connection and database registries
    databases: [], // List of DB schema models
    activeDbType: 'indexedDB', // 'indexedDB' | 'localStorage' | 'sessionStorage'
    activeDbName: '',
    activeStoreName: '',
    
    // Loaded records for currently selected store
    records: [],
    filteredRecords: [], // React-sync list (filtered)
    
    // Schema mapping and relationships
    relationships: { nodes: [], edges: [] },
    
    // Quotas and Volumetrics
    totalCalculatedWeightBytes: 0,
    globalUsageBytes: 0,
    globalQuotaBytes: 0,
    quotaMarginPercentage: 100,

    // Telemetry Logs
    telemetryLogs: [],

    // Workspace settings synced to localStorage
    workspaceConfig: loadWorkspaceConfig(),

    setWorkspaceConfig: (updates) => saveWorkspaceConfig(updates),

    setActiveDbType: async (type) => {
      set({ activeDbType: type });
      await get().refreshSchemaStructure();
    },

    setActiveDbName: (name) => {
      set({ activeDbName: name, activeStoreName: '' });
      get().refreshRecords();
      get().setWorkspaceConfig({ frequentlyInspectedDB: name });
    },

    setActiveStoreName: (storeName) => {
      set({ activeStoreName: storeName });
      get().refreshRecords();
    },

    // Add execution logs helper
    addTelemetryLog: (action, target, status, latencyMs, details = '') => {
      const log = {
        timestamp: new Date().toLocaleTimeString(),
        action,
        target,
        status,
        latencyMs: Math.round(latencyMs * 100) / 100,
        details,
      };
      set((state) => ({
        telemetryLogs: [log, ...state.telemetryLogs].slice(0, 100), // Limit to 100 logs
      }));
    },

    // High frequency search filter for smooth typing
    setSearchQuery: (query) => {
      FastFilterBuffer.activeSearchQuery = query;
      const lower = query.toLowerCase();
      const filtered = FastFilterBuffer.cachedRecords.filter((rec) => {
        return Object.values(rec).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(lower);
        });
      });
      set({ filteredRecords: filtered });
      if (FastFilterBuffer.onFilterChange) {
        FastFilterBuffer.onFilterChange(filtered);
      }
    },

    // Refresh database schema structures for all storage engines
    refreshSchemaStructure: async () => {
      const startTime = performance.now();
      const dbs = [];

      // 1. Scan LocalStorage & SessionStorage and group into virtual tables using prefix naming e.g., "table::id"
      const scanStorageEngine = (storageInstance, type) => {
        const dbName = type === 'localStorage' ? 'LocalStorageDB' : 'SessionStorageDB';
        const storeMap = {}; // storeName -> list of fields

        for (let i = 0; i < storageInstance.length; i++) {
          const key = storageInstance.key(i);
          if (key.startsWith('__db_explorer')) continue; // skip config keys
          
          let tableName = 'default_store';
          if (key.includes('::')) {
            tableName = key.split('::')[0];
          }

          if (!storeMap[tableName]) {
            storeMap[tableName] = new Set();
          }

          // Inspect properties if JSON value to extract schema fields
          const val = storageInstance.getItem(key);
          storeMap[tableName].add('key');
          storeMap[tableName].add('value');
          try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
              Object.keys(parsed).forEach((k) => storeMap[tableName].add(k));
            }
          } catch {}
        }

        const stores = Object.keys(storeMap).map((storeName) => ({
          name: storeName,
          keyPath: 'key',
          fields: Array.from(storeMap[storeName]),
        }));

        return {
          name: dbName,
          type,
          stores,
        };
      };

      // Scan local/session storages
      dbs.push(scanStorageEngine(localStorage, 'localStorage'));
      dbs.push(scanStorageEngine(sessionStorage, 'sessionStorage'));

      // 2. Scan IndexedDB databases (we query standard databases)
      // Since window.indexedDB.databases() might not be supported everywhere, we maintain a registry list
      let indexedDBList = ['RetailDB', 'AnalyticsDB'];
      try {
        if (window.indexedDB.databases) {
          const list = await window.indexedDB.databases();
          const names = list.map((d) => d.name);
          indexedDBList = Array.from(new Set([...indexedDBList, ...names]));
        }
      } catch (e) {
        console.warn('databases() API not supported:', e);
      }

      // Read IndexedDB schemas
      for (const name of indexedDBList) {
        try {
          const db = await openDatabase(name);
          const storeNames = Array.from(db.objectStoreNames);
          const stores = [];

          for (const sName of storeNames) {
            // Retrieve keyPath/fields
            const tx = db.transaction(sName, 'readonly');
            const storeObj = tx.objectStore(sName);
            const keyPath = storeObj.keyPath || 'id';
            
            // To find fields, let's fetch first few records using cursor
            const sampleRecords = await getAllRecordsWithCursor(storeObj);
            const fieldsSet = new Set();
            fieldsSet.add(typeof keyPath === 'string' ? keyPath : 'id');

            sampleRecords.slice(0, 10).forEach(rec => {
              Object.keys(rec).forEach(k => {
                if (k !== '__id') fieldsSet.add(k);
              });
            });

            stores.push({
              name: sName,
              keyPath,
              fields: Array.from(fieldsSet),
            });
            db.close();
          }

          dbs.push({
            name,
            type: 'indexedDB',
            stores,
          });
        } catch (err) {
          // Database might be empty or upgrade required, we still list it if possible
          dbs.push({
            name,
            type: 'indexedDB',
            stores: [],
            error: err.message,
          });
        }
      }

      // Calculate state relationships
      const relationships = inspectRelationships(dbs);

      // Set active db and store defaults if not set
      let activeDb = get().activeDbName;
      let activeStore = get().activeStoreName;
      const type = get().activeDbType;

      const currentDbMatch = dbs.find((d) => d.type === type && d.name === activeDb);
      if (!currentDbMatch) {
        const firstOfStyle = dbs.find((d) => d.type === type);
        activeDb = firstOfStyle ? firstOfStyle.name : '';
        activeStore = firstOfStyle && firstOfStyle.stores.length > 0 ? firstOfStyle.stores[0].name : '';
      } else if (activeStore && !currentDbMatch.stores.some((s) => s.name === activeStore)) {
        activeStore = currentDbMatch.stores.length > 0 ? currentDbMatch.stores[0].name : '';
      }

      set({
        databases: dbs,
        activeDbName: activeDb,
        activeStoreName: activeStore,
        relationships,
      });

      // Recalculate weights & quotas
      await get().calculateQuotas();

      const totalLatency = performance.now() - startTime;
      get().addTelemetryLog('SCHEMA_SCAN', `${type.toUpperCase()} / ${activeDb}`, 'SUCCESS', totalLatency, `Discovered ${dbs.length} databases.`);
    },

    // Refresh records for the selected store
    refreshRecords: async () => {
      const startTime = performance.now();
      const type = get().activeDbType;
      const dbName = get().activeDbName;
      const storeName = get().activeStoreName;

      if (!dbName || !storeName) {
        set({ records: [], filteredRecords: [] });
        FastFilterBuffer.cachedRecords = [];
        return;
      }

      try {
        let loaded = [];

        if (type === 'localStorage' || type === 'sessionStorage') {
          const storageInstance = type === 'localStorage' ? localStorage : sessionStorage;
          for (let i = 0; i < storageInstance.length; i++) {
            const key = storageInstance.key(i);
            if (key.startsWith('__db_explorer')) continue;

            let tableName = 'default_store';
            if (key.includes('::')) {
              tableName = key.split('::')[0];
            }

            if (tableName === storeName) {
              const val = storageInstance.getItem(key);
              let parsedVal = val;
              try {
                parsedVal = JSON.parse(val);
              } catch {}

              loaded.push({
                key: key.includes('::') ? key.split('::').slice(1).join('::') : key,
                value: typeof parsedVal === 'object' ? parsedVal : { val: parsedVal },
                __id: key, // Keep original storage key
              });
            }
          }
        } else if (type === 'indexedDB') {
          const db = await openDatabase(dbName);
          const { result, latency } = await executeTransaction(db, storeName, 'readonly', async (stores) => {
            return await getAllRecordsWithCursor(stores[storeName]);
          });
          loaded = result;
          db.close();
        }

        // Populate raw buffers
        FastFilterBuffer.cachedRecords = loaded;
        
        // Apply current filter query
        const query = FastFilterBuffer.activeSearchQuery;
        const lower = query.toLowerCase();
        const filtered = loaded.filter((rec) => {
          return Object.values(rec).some((val) => {
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(lower);
          });
        });

        set({
          records: loaded,
          filteredRecords: filtered,
        });

        await get().calculateQuotas();

        const latencyVal = performance.now() - startTime;
        get().addTelemetryLog('FETCH_ROWS', `${dbName}.${storeName}`, 'SUCCESS', latencyVal, `Loaded ${loaded.length} records.`);
      } catch (err) {
        console.error('Error fetching records:', err);
        get().addTelemetryLog('FETCH_ROWS', `${dbName}.${storeName}`, 'ERROR', 0, err.message);
      }
    },

    // Write operation: Add, update or edit a row
    upsertRecord: async (recordData) => {
      const startTime = performance.now();
      const type = get().activeDbType;
      const dbName = get().activeDbName;
      const storeName = get().activeStoreName;

      if (!dbName || !storeName) return;

      try {
        if (type === 'localStorage' || type === 'sessionStorage') {
          const storageInstance = type === 'localStorage' ? localStorage : sessionStorage;
          const { key, value } = recordData;
          const rawKey = storeName + '::' + key;
          const rawVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
          
          storageInstance.setItem(rawKey, rawVal);
        } else if (type === 'indexedDB') {
          const db = await openDatabase(dbName);
          await executeTransaction(db, storeName, 'readwrite', (stores) => {
            // Strip client-side ID key if it exists
            const { __id, ...pureRecord } = recordData;
            stores[storeName].put(pureRecord);
          });
          db.close();
        }

        await get().refreshRecords();
        await get().refreshSchemaStructure();

        const latency = performance.now() - startTime;
        get().addTelemetryLog('UPSERT_ROW', `${dbName}.${storeName}`, 'SUCCESS', latency);
      } catch (err) {
        console.error(err);
        get().addTelemetryLog('UPSERT_ROW', `${dbName}.${storeName}`, 'ERROR', 0, err.message);
        throw err;
      }
    },

    // Delete record operation
    deleteRecord: async (idToDelete) => {
      const startTime = performance.now();
      const type = get().activeDbType;
      const dbName = get().activeDbName;
      const storeName = get().activeStoreName;

      try {
        if (type === 'localStorage' || type === 'sessionStorage') {
          const storageInstance = type === 'localStorage' ? localStorage : sessionStorage;
          storageInstance.removeItem(idToDelete); // idToDelete matches rawKey (__id)
        } else if (type === 'indexedDB') {
          const db = await openDatabase(dbName);
          await executeTransaction(db, storeName, 'readwrite', (stores) => {
            stores[storeName].delete(idToDelete);
          });
          db.close();
        }

        await get().refreshRecords();
        await get().refreshSchemaStructure();

        const latency = performance.now() - startTime;
        get().addTelemetryLog('DELETE_ROW', `${dbName}.${storeName}`, 'SUCCESS', latency);
      } catch (err) {
        console.error(err);
        get().addTelemetryLog('DELETE_ROW', `${dbName}.${storeName}`, 'ERROR', 0, err.message);
      }
    },

    // Purge database instance
    purgeDatabase: async () => {
      const startTime = performance.now();
      const type = get().activeDbType;
      const dbName = get().activeDbName;

      try {
        if (type === 'localStorage' || type === 'sessionStorage') {
          const storageInstance = type === 'localStorage' ? localStorage : sessionStorage;
          const keysToRemove = [];
          for (let i = 0; i < storageInstance.length; i++) {
            const key = storageInstance.key(i);
            if (!key.startsWith('__db_explorer')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => storageInstance.removeItem(k));
        } else if (type === 'indexedDB') {
          // Delete database
          await new Promise((resolve, reject) => {
            const req = window.indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => {
              console.warn('IndexedDB delete blocked, retrying...');
              resolve(); // Don't block forever
            };
          });
        }

        await get().refreshSchemaStructure();
        set({ activeStoreName: '', records: [], filteredRecords: [] });

        const latency = performance.now() - startTime;
        get().addTelemetryLog('PURGE_DB', dbName, 'SUCCESS', latency);
      } catch (err) {
        console.error(err);
        get().addTelemetryLog('PURGE_DB', dbName, 'ERROR', 0, err.message);
      }
    },

    // Create a new store/table structure
    createObjectStore: async (storeName, keyPath = 'id') => {
      const startTime = performance.now();
      const type = get().activeDbType;
      const dbName = get().activeDbName;

      try {
        if (!storeName) throw new Error('Object Store name is required');

        if (type === 'localStorage' || type === 'sessionStorage') {
          // For storage, we insert a placeholder key to initialize the table
          const storageInstance = type === 'localStorage' ? localStorage : sessionStorage;
          const dummyKey = `${storeName}::placeholder`;
          storageInstance.setItem(dummyKey, JSON.stringify({ [keyPath]: 'placeholder', description: 'Table initialized' }));
        } else if (type === 'indexedDB') {
          if (!dbName) throw new Error('No active database connected');
          
          // In IndexedDB, adding a store requires upgrading version
          const dbBefore = await openDatabase(dbName);
          const currentVersion = dbBefore.version;
          dbBefore.close();

          await openDatabase(dbName, currentVersion + 1, (db) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath });
            }
          });
        }

        await get().refreshSchemaStructure();
        set({ activeStoreName: storeName });
        await get().refreshRecords();

        const latency = performance.now() - startTime;
        get().addTelemetryLog('CREATE_STORE', `${dbName}.${storeName}`, 'SUCCESS', latency);
      } catch (err) {
        console.error(err);
        get().addTelemetryLog('CREATE_STORE', dbName, 'ERROR', 0, err.message);
        throw err;
      }
    },

    // Create a new database target
    createNewDatabase: async (dbName, storeName = 'users', keyPath = 'id') => {
      const startTime = performance.now();
      const type = get().activeDbType;

      try {
        if (type === 'indexedDB') {
          const db = await openDatabase(dbName, 1, (dbInstance) => {
            dbInstance.createObjectStore(storeName, { keyPath });
          });
          db.close();
        } else {
          // local/session storage database name is virtual (they only have LocalStorageDB / SessionStorageDB)
          // We can just create a new table
          const storageInstance = type === 'localStorage' ? localStorage : sessionStorage;
          const dummyKey = `${storeName}::1`;
          storageInstance.setItem(dummyKey, JSON.stringify({ [keyPath]: '1', name: 'Sample Entry' }));
        }

        set({ activeDbName: type === 'indexedDB' ? dbName : (type === 'localStorage' ? 'LocalStorageDB' : 'SessionStorageDB') });
        await get().refreshSchemaStructure();
        set({ activeStoreName: storeName });
        await get().refreshRecords();

        const latency = performance.now() - startTime;
        get().addTelemetryLog('CREATE_DB', dbName, 'SUCCESS', latency);
      } catch (err) {
        console.error(err);
        get().addTelemetryLog('CREATE_DB', dbName, 'ERROR', 0, err.message);
        throw err;
      }
    },

    // Calculate Volumetric weights
    calculateQuotas: async () => {
      let totalWeightBytes = 0;

      // 1. Calculate active table bytes from list
      const type = get().activeDbType;
      const dbName = get().activeDbName;
      const storeName = get().activeStoreName;

      // Calculate weight of all records in currently connected stores for active db type
      if (type === 'localStorage' || type === 'sessionStorage') {
        const storageInstance = type === 'localStorage' ? localStorage : sessionStorage;
        for (let i = 0; i < storageInstance.length; i++) {
          const key = storageInstance.key(i);
          if (key.startsWith('__db_explorer')) continue;
          
          const val = storageInstance.getItem(key);
          totalWeightBytes += calculateRecordByteWeight(key, val);
        }
      } else if (type === 'indexedDB') {
        // Run summation over all databases currently known in IndexedDB
        const dbs = get().databases.filter((d) => d.type === 'indexedDB');
        for (const dbMeta of dbs) {
          try {
            const db = await openDatabase(dbMeta.name);
            for (const sName of db.objectStoreNames) {
              const tx = db.transaction(sName, 'readonly');
              const records = await getAllRecordsWithCursor(tx.objectStore(sName));
              const keyPath = tx.objectStore(sName).keyPath || 'id';
              totalWeightBytes += calculateCollectionWeight(records, keyPath);
            }
            db.close();
          } catch (e) {
            console.warn(`Weight calculation failed for IndexedDB: ${dbMeta.name}`, e);
          }
        }
      }

      // 2. Fetch browser estimates
      const estimate = await getBrowserStorageQuota();
      let remainingPercent = 100;
      if (estimate.quota > 0) {
        // Use estimate usage or fall back to our calculated weight
        const currentUsage = estimate.usage || totalWeightBytes;
        remainingPercent = Math.max(0, 100 - (currentUsage / estimate.quota) * 100);
      }

      set({
        totalCalculatedWeightBytes: totalWeightBytes,
        globalUsageBytes: estimate.usage || totalWeightBytes,
        globalQuotaBytes: estimate.quota,
        quotaMarginPercentage: remainingPercent,
      });
    },

    // Export current DB structure to JSON template backup
    exportSchemaStructure: async () => {
      const dump = {
        exportedAt: new Date().toISOString(),
        databases: [],
      };

      const dbs = get().databases;
      for (const dbMeta of dbs) {
        const dbDump = {
          name: dbMeta.name,
          type: dbMeta.type,
          stores: [],
        };

        if (dbMeta.type === 'indexedDB') {
          try {
            const db = await openDatabase(dbMeta.name);
            for (const sName of dbMeta.stores.map((s) => s.name)) {
              const tx = db.transaction(sName, 'readonly');
              const records = await getAllRecordsWithCursor(tx.objectStore(sName));
              dbDump.stores.push({
                name: sName,
                keyPath: tx.objectStore(sName).keyPath || 'id',
                records,
              });
            }
            db.close();
          } catch (e) {
            console.error(e);
          }
        } else {
          // LocalStorage / SessionStorage dumps
          const storageInstance = dbMeta.type === 'localStorage' ? localStorage : sessionStorage;
          const storeMap = {};
          
          for (let i = 0; i < storageInstance.length; i++) {
            const key = storageInstance.key(i);
            if (key.startsWith('__db_explorer')) continue;
            
            let tableName = 'default_store';
            if (key.includes('::')) {
              tableName = key.split('::')[0];
            }

            if (!storeMap[tableName]) storeMap[tableName] = [];
            
            const val = storageInstance.getItem(key);
            let parsed = val;
            try { parsed = JSON.parse(val); } catch {}
            
            storeMap[tableName].push({
              key: key.includes('::') ? key.split('::').slice(1).join('::') : key,
              value: parsed,
            });
          }

          Object.keys(storeMap).forEach((sName) => {
            dbDump.stores.push({
              name: sName,
              keyPath: 'key',
              records: storeMap[sName],
            });
          });
        }
        
        dump.databases.push(dbDump);
      }

      return dump;
    },
  };
});
