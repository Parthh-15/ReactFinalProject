import React, { useState } from 'react';
import { useStorageStore } from '../store/storageStore';
import { ChevronRight, ChevronDown, Table, Key, Link as LinkIcon, Edit3, Trash2, Plus, RefreshCw, Layers } from 'lucide-react';

export const ExplorerStage = () => {
  const {
    databases,
    activeDbType,
    activeDbName,
    activeStoreName,
    setActiveDbName,
    setActiveStoreName,
    filteredRecords,
    upsertRecord,
    deleteRecord,
    relationships,
    refreshRecords,
  } = useStorageStore();

  const [activeTab, setActiveTab] = useState('spreadsheet'); // 'spreadsheet' | 'schema-graph'

  // Selected database object
  const currentDb = databases.find((d) => d.type === activeDbType && d.name === activeDbName);

  return (
    <div className="flex-1 flex overflow-hidden bg-app-base text-white">
      {/* SchemaObjectTreeNavigator (Left Pane) */}
      <div className="w-80 flex flex-col bg-app-sidebar" style={{ borderRight: '1px solid #2e2e38' }}>
        <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid #2e2e38' }}>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Schema Navigator
          </span>
          <button 
            onClick={refreshRecords}
            className="p-1 rounded text-zinc-400 transition"
            style={{ cursor: 'pointer' }}
            title="Refresh active store records"
          >
            <RefreshCw style={{ width: '0.875rem', height: '0.875rem' }} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {databases
            .filter((db) => db.type === activeDbType)
            .map((db) => (
              <DatabaseNode
                key={db.name}
                db={db}
                activeDbName={activeDbName}
                activeStoreName={activeStoreName}
                setActiveDbName={setActiveDbName}
                setActiveStoreName={setActiveStoreName}
              />
            ))}

          {databases.filter((db) => db.type === activeDbType).length === 0 && (
            <div className="text-zinc-500 text-xs p-4 text-center">
              No active databases/stores found for this target engine. Use the strip above to connect a target.
            </div>
          )}
        </div>
      </div>

      {/* Database Staging workspace / right canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toggle Workspace View */}
        <div className="bg-app-sidebar px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #2e2e38' }}>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold text-xs tracking-widest uppercase">
              {activeDbName ? `${activeDbName} > ${activeStoreName || 'Select Store'}` : 'Select Database'}
            </span>
          </div>

          <div className="flex rounded bg-app-panel p-1-5" style={{ border: '1px solid #2e2e38' }}>
            <button
              onClick={() => setActiveTab('spreadsheet')}
              className={`times-12 px-3 py-1 rounded transition text-xs ${
                activeTab === 'spreadsheet'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400'
              }`}
              style={{ cursor: 'pointer' }}
            >
              Spreadsheet Data Grid
            </button>
            <button
              onClick={() => setActiveTab('schema-graph')}
              className={`times-12 px-3 py-1 rounded transition text-xs flex items-center gap-1 ${
                activeTab === 'schema-graph'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <Layers style={{ width: '0.75rem', height: '0.75rem' }} /> Relationship Graph
            </button>
          </div>
        </div>

        {/* Dynamic Inner Panel */}
        <div className="flex-1 overflow-auto bg-app-base">
          {activeTab === 'spreadsheet' ? (
            <DatabaseDataMatrixSpreadsheet
              records={filteredRecords}
              dbName={activeDbName}
              storeName={activeStoreName}
              dbType={activeDbType}
              currentDb={currentDb}
              upsertRecord={upsertRecord}
              deleteRecord={deleteRecord}
            />
          ) : (
            <SchemaRelationshipGraph relationships={relationships} activeDbName={activeDbName} />
          )}
        </div>
      </div>
    </div>
  );
};

/* Database Tree Node Component */
const DatabaseNode = ({ db, activeDbName, activeStoreName, setActiveDbName, setActiveStoreName }) => {
  const [expanded, setExpanded] = useState(true);
  const isSelected = activeDbName === db.name;

  return (
    <div className="mb-2">
      <div
        onClick={() => {
          setActiveDbName(db.name);
          setExpanded(!expanded);
        }}
        className={`flex items-center gap-1-5 p-1-5 rounded cursor-pointer transition ${
          isSelected ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300 bg-zinc-850'
        }`}
      >
        {expanded ? <ChevronDown style={{ width: '1rem', height: '1rem', color: '#71717a' }} /> : <ChevronRight style={{ width: '1rem', height: '1rem', color: '#71717a' }} />}
        <span className="times-12 font-bold select-none">{db.name}</span>
        {db.error && <span style={{ fontSize: '10px', color: '#f43f5e', fontFamily: 'serif' }}>(! error)</span>}
      </div>

      {expanded && (
        <div className="pl-6 space-y-1 mt-1 ml-3-5" style={{ borderLeft: '1px solid #3f3f46' }}>
          {db.stores?.map((store) => {
            const isStoreSelected = activeStoreName === store.name && isSelected;
            return (
              <div key={store.name} className="group">
                <div
                  onClick={() => {
                    setActiveDbName(db.name);
                    setActiveStoreName(store.name);
                  }}
                  className={`flex items-center justify-between p-1-5 rounded cursor-pointer transition ${
                    isStoreSelected ? 'bg-emerald-selected text-emerald-300 border-emerald-faint' : 'text-zinc-400'
                  }`}
                  style={isStoreSelected ? { border: '1px solid rgba(6,78,59,0.4)' } : {}}
                >
                  <div className="flex items-center gap-1-5">
                    <Table style={{ width: '0.875rem', height: '0.875rem', color: '#71717a' }} />
                    <span className="times-12">{store.name}</span>
                  </div>
                </div>

                {isStoreSelected && (
                  <div className="pl-5 pr-1 py-1 space-y-1 text-zinc-500 ml-2" style={{ borderLeft: '1px solid rgba(63,63,70,0.6)' }}>
                    <div className="flex items-center gap-1-5 text-xs font-mono">
                      <Key style={{ width: '0.75rem', height: '0.75rem', color: '#f59e0b' }} />
                      <span className="times-12 text-zinc-400">PK: {String(store.keyPath)}</span>
                    </div>
                    {store.fields?.map((field) => (
                      <div key={field} className="flex items-center justify-between text-xs font-mono pl-1" style={{ transition: 'color 0.15s' }}>
                        <span className="times-12 text-zinc-500">{field}</span>
                        {/* FK indicator if field name matches id pattern */}
                        {/^(.*)(?:Id|_id|ID)$/.test(field) && (
                          <LinkIcon style={{ width: '0.625rem', height: '0.625rem', color: '#3b82f6' }} title="Relationship Candidate" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* Database spreadsheet view */
const DatabaseDataMatrixSpreadsheet = ({
  records,
  dbName,
  storeName,
  dbType,
  currentDb,
  upsertRecord,
  deleteRecord,
}) => {
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, key }
  const [editingValue, setEditingValue] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRowPayload, setNewRowPayload] = useState('{\n  "id": "1",\n  "name": "New Record"\n}');

  if (!dbName || !storeName) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-sm">
        <Table style={{ width: '3rem', height: '3rem', color: '#52525b', marginBottom: '0.5rem' }} />
        Please select a table/store from the Schema Navigator to explore records.
      </div>
    );
  }

  // Get active keyPath configurations
  const storeMeta = currentDb?.stores?.find((s) => s.name === storeName);
  const keyPath = storeMeta?.keyPath || 'id';

  // Extract all columns
  const allColumns = new Set();
  // Always ensure keyPath is listed first
  if (typeof keyPath === 'string') {
    allColumns.add(keyPath);
  } else {
    allColumns.add('id');
  }

  records.forEach((rec) => {
    Object.keys(rec).forEach((key) => {
      if (key !== '__id') allColumns.add(key);
    });
  });

  const columnsList = Array.from(allColumns);

  // Handle saving of edited cells
  const handleCellSave = async (rowIndex, colKey) => {
    const originalRecord = records[rowIndex];
    let parsedVal = editingValue;
    try {
      // Try to parse as JSON if it looks like JSON structure
      if (editingValue.startsWith('{') || editingValue.startsWith('[')) {
        parsedVal = JSON.parse(editingValue);
      }
    } catch {}

    const updatedRecord = { ...originalRecord, [colKey]: parsedVal };
    
    // In LocalStorage, virtual tables use 'key' and 'value' structure
    if (dbType === 'localStorage' || dbType === 'sessionStorage') {
      const storageKey = originalRecord.key;
      // Reassemble the object if columns are properties
      if (colKey === 'key') {
        // Renaming the key requires deleting old item and creating new one
        await deleteRecord(originalRecord.__id);
        await upsertRecord({ key: parsedVal, value: originalRecord.value });
      } else if (colKey === 'value') {
        await upsertRecord({ key: storageKey, value: parsedVal });
      } else {
        const newValue = { ...originalRecord.value, [colKey]: parsedVal };
        await upsertRecord({ key: storageKey, value: newValue });
      }
    } else {
      // IndexedDB
      await upsertRecord(updatedRecord);
    }
    
    setEditingCell(null);
  };

  const handleAddRowSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = JSON.parse(newRowPayload);
      if (dbType === 'localStorage' || dbType === 'sessionStorage') {
        const key = payload[keyPath] || Math.random().toString(36).substring(7);
        await upsertRecord({ key, value: payload });
      } else {
        await upsertRecord(payload);
      }
      setShowAddRow(false);
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-xs">
          Displaying {records.length} items
        </span>
        <button
          onClick={() => setShowAddRow(true)}
          className="times-12 flex items-center gap-1-5 px-3 py-1 bg-emerald-600 text-white rounded text-xs transition"
          style={{ cursor: 'pointer' }}
        >
          <Plus style={{ width: '0.875rem', height: '0.875rem' }} /> Add Record
        </button>
      </div>

      {/* Add Row Section */}
      {showAddRow && (
        <div className="bg-app-surface rounded p-4 mb-4" style={{ border: '1px solid #2e2e38' }}>
          <h4 className="text-emerald-400 font-bold text-xs uppercase mb-2">Insert New Row (JSON schema format)</h4>
          <form onSubmit={handleAddRowSubmit} className="space-y-3">
            <textarea
              value={newRowPayload}
              onChange={(e) => setNewRowPayload(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                backgroundColor: '#141417',
                border: '1px solid #2e2e38',
                borderRadius: '0.25rem',
                padding: '0.5rem',
                color: '#6ee7b7',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddRow(false)}
                className="times-12 px-3 py-1-5 bg-zinc-800 text-zinc-300 text-xs rounded"
                style={{ cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="times-12 px-3 py-1-5 bg-emerald-600 text-white text-xs rounded"
                style={{ cursor: 'pointer' }}
              >
                Insert Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spreadsheet grid table */}
      <div className="overflow-x-auto rounded" style={{ border: '1px solid #2e2e38' }}>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-app-sidebar" style={{ borderBottom: '1px solid #2e2e38' }}>
              <th className="times-12 p-2 text-zinc-500 font-semibold w-12 text-center" style={{ borderRight: '1px solid #2e2e38' }}>#</th>
              {columnsList.map((col) => (
                <th key={col} className="times-12 p-2 text-zinc-300 font-bold select-none" style={{ borderRight: '1px solid #2e2e38' }}>
                  {col}
                </th>
              ))}
              <th className="times-12 p-2 text-zinc-500 font-semibold text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, rowIndex) => {
              const recordId = record.__id;
              
              return (
                <tr key={recordId || rowIndex} className="transition" style={{ borderBottom: '1px solid #2e2e38' }}>
                  <td className="times-12 p-2 text-zinc-500 text-center font-mono select-none" style={{ borderRight: '1px solid #2e2e38' }}>
                    {rowIndex + 1}
                  </td>
                  
                  {columnsList.map((col) => {
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.key === col;
                    let cellVal = record[col];

                    // For LocalStorage virtual columns if nested value structure
                    if (dbType === 'localStorage' || dbType === 'sessionStorage') {
                      if (col !== 'key' && col !== 'value') {
                        cellVal = record.value ? record.value[col] : undefined;
                      }
                    }

                    const displayVal = cellVal !== undefined 
                      ? (typeof cellVal === 'object' ? JSON.stringify(cellVal) : String(cellVal))
                      : '';

                    return (
                      <td
                        key={col}
                        onDoubleClick={() => {
                          setEditingCell({ rowIndex, key: col });
                          setEditingValue(displayVal);
                        }}
                        className="times-12 p-2 max-w-xs truncate relative cursor-pointer"
                        style={{ borderRight: '1px solid #2e2e38', minHeight: '36px' }}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1-5">
                            <textarea
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(rowIndex, col)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleCellSave(rowIndex, col);
                                }
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '0.25rem',
                                backgroundColor: '#141417',
                                border: '1px solid #10b981',
                                color: '#6ee7b7',
                                fontSize: '0.75rem',
                                fontFamily: "'JetBrains Mono', monospace",
                                borderRadius: '0.25rem',
                                resize: 'none',
                                outline: 'none',
                              }}
                              rows={2}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="font-mono">{displayVal}</span>
                            <Edit3 style={{ width: '0.75rem', height: '0.75rem', color: '#52525b', position: 'absolute', right: '0.5rem' }} />
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="p-2 text-center">
                    <button
                      onClick={() => deleteRecord(recordId)}
                      className="times-12 p-1 text-rose-500 rounded transition"
                      style={{ cursor: 'pointer' }}
                      title="Delete this row"
                    >
                      <Trash2 style={{ width: '0.875rem', height: '0.875rem', display: 'inline' }} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {records.length === 0 && (
              <tr>
                <td colSpan={columnsList.length + 2} className="times-12 p-8 text-center text-zinc-500 italic">
                  No records loaded. Double-click or click &ldquo;Add Record&rdquo; to populate records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* SVG Relationship Graph */
const SchemaRelationshipGraph = ({ relationships, activeDbName }) => {
  const { nodes, edges } = relationships;
  const filteredNodes = nodes.filter((n) => n.dbName === activeDbName);
  const filteredEdges = edges.filter((e) => {
    const srcNode = nodes.find((n) => n.id === e.source);
    return srcNode && srcNode.dbName === activeDbName;
  });

  if (filteredNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-sm">
        <LinkIcon style={{ width: '3rem', height: '3rem', color: '#52525b', marginBottom: '0.5rem' }} />
        No nodes found to visualize. Connect databases or create stores to map schema keys.
      </div>
    );
  }

  // Pre-arrange nodes in a circular or grid layout for the SVG container
  const width = 600;
  const height = 400;
  const positions = {};

  filteredNodes.forEach((node, idx) => {
    const angle = (idx / filteredNodes.length) * 2 * Math.PI;
    positions[node.id] = {
      x: width / 2 + 160 * Math.cos(angle),
      y: height / 2 + 120 * Math.sin(angle),
    };
  });

  return (
    <div className="p-6 flex flex-col items-center justify-center bg-app-base">
      <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">
        Interactive Relational Mapping Canvas ({filteredEdges.length} connections detected)
      </h3>

      <div className="w-full max-w-2xl bg-app-sidebar rounded-lg p-4 relative overflow-hidden" style={{ border: '1px solid #2e2e38' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          {/* Arrow markers for edges */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
          </defs>

          {/* Render Link Edges */}
          {filteredEdges.map((edge) => {
            const p1 = positions[edge.source];
            const p2 = positions[edge.target];
            if (!p1 || !p2) return null;

            return (
              <g key={edge.id}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4"
                  markerEnd="url(#arrow)"
                  style={{ opacity: 0.7 }}
                />
                {/* Edge Label */}
                <text
                  x={(p1.x + p2.x) / 2}
                  y={(p1.y + p2.y) / 2 - 8}
                  fill="#60a5fa"
                  fontSize="10"
                  fontFamily="Times New Roman"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {edge.sourceField} → {edge.targetField}
                </text>
              </g>
            );
          })}

          {/* Render Table Nodes */}
          {filteredNodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            return (
              <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`} style={{ cursor: 'pointer' }}>
                <rect
                  x="-75"
                  y="-25"
                  width="150"
                  height="50"
                  rx="6"
                  fill="#1e1e24"
                  stroke="#3e3e4a"
                  strokeWidth="2"
                />
                {/* Table Header text */}
                <text
                  x="0"
                  y="-5"
                  fill="#10b981"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="Times New Roman"
                  textAnchor="middle"
                >
                  {node.storeName}
                </text>
                {/* KeyPath description text */}
                <text
                  x="0"
                  y="12"
                  fill="#a1a1aa"
                  fontSize="10"
                  fontFamily="Times New Roman"
                  textAnchor="middle"
                >
                  PK: {node.keyPath}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
