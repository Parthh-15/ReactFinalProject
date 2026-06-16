/**
 * Client-Side Byte-Weight Volumetric Analyzer.
 * Measures the byte weight of keys and values using UTF-16 calculation loop:
 * Weight = (Key String Length + Value String Length) * 2 bytes.
 */

export const calculateStringByteWeight = (str) => {
  if (typeof str !== 'string') {
    try {
      str = JSON.stringify(str) || '';
    } catch {
      str = '';
    }
  }
  return str.length * 2;
};

/**
 * Calculates total byte weight of a key-value record.
 */
export const calculateRecordByteWeight = (key, val) => {
  const keyStr = typeof key === 'string' ? key : String(key);
  let valStr;
  if (typeof val === 'string') {
    valStr = val;
  } else {
    try {
      valStr = JSON.stringify(val) ?? '';
    } catch (_e) {
      valStr = '';
    }
  }
  return (keyStr.length + valStr.length) * 2;
};

/**
 * Calculates weight of all items in an object store or list.
 */
export const calculateCollectionWeight = (records, keyPath = 'id') => {
  let totalBytes = 0;
  if (!Array.isArray(records)) return 0;
  
  records.forEach((record) => {
    // Determine the key
    const key = record[keyPath] !== undefined ? record[keyPath] : '';
    // Exclude special wrapper field `__id` when stringifying value for precise weight
    const { __id: _id, ...pureRecord } = record;
    totalBytes += calculateRecordByteWeight(key, pureRecord);
  });
  
  return totalBytes;
};

/**
 * Retrieves browser's global storage limits and estimate.
 */
export const getBrowserStorageQuota = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,     // bytes
        quota: estimate.quota || 0,     // bytes
        supported: true,
      };
    } catch (e) {
      console.warn("Storage quota estimation failed:", e);
    }
  }
  // Fallbacks if not supported or failed
  return {
    usage: 0,
    quota: 5 * 1024 * 1024, // Fallback to 5MB default LocalStorage quota
    supported: false,
  };
};
