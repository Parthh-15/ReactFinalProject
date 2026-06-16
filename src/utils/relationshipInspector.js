/**
 * Client-Side Schema Relationship Inspector.
 * Scans object store structures and record keys to detect relationship linkages (e.g., userId -> users table).
 */

export const inspectRelationships = (databases) => {
  const nodes = [];
  const edges = [];
  const edgeSet = new Set();

  // Create list of all tables/stores across all connected databases
  const allStores = [];
  databases.forEach((db) => {
    const stores = db.stores || [];
    stores.forEach((store) => {
      allStores.push({
        dbName: db.name,
        dbType: db.type, // 'indexedDB', 'localStorage', 'sessionStorage'
        storeName: store.name,
        keyPath: store.keyPath || 'id',
        fields: store.fields || [], // Custom tracked columns/fields
      });
    });
  });

  // Create nodes
  allStores.forEach((store) => {
    nodes.push({
      id: `${store.dbName}::${store.storeName}`,
      dbName: store.dbName,
      dbType: store.dbType,
      storeName: store.storeName,
      keyPath: store.keyPath,
    });
  });

  // Regex patterns to detect foreign keys
  // Matches suffixes like 'Id', '_id', 'ID', '_ID', 'id'
  const fkRegex = /^(.*)(?:Id|_id|ID)$/;

  // Check relationship rules
  allStores.forEach((sourceStore) => {
    const sourceId = `${sourceStore.dbName}::${sourceStore.storeName}`;

    sourceStore.fields.forEach((field) => {
      const match = field.match(fkRegex);
      if (match) {
        const prefix = match[1].toLowerCase();

        // Find if another store in the same database or same storage type matches the prefix
        // E.g., if field is userId, prefix is 'user', looking for store 'users' or 'user'
        const target = allStores.find((targetStore) => {
          if (targetStore.dbName !== sourceStore.dbName || targetStore.dbType !== sourceStore.dbType) {
            return false;
          }
          // Do not link to self
          if (targetStore.storeName === sourceStore.storeName) {
            return false;
          }

          const targetLower = targetStore.storeName.toLowerCase();
          // Matches 'user', 'users', 'user_table', etc.
          return (
            targetLower === prefix ||
            targetLower === `${prefix}s` ||
            targetLower === `${prefix}es` ||
            prefix === targetLower
          );
        });

        if (target) {
          const targetId = `${target.dbName}::${target.storeName}`;
          const edgeId = `${sourceId}->${targetId}::${field}`;

          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              sourceField: field,
              targetField: target.keyPath,
            });
          }
        }
      }
    });
  });

  return { nodes, edges };
};
