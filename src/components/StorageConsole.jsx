import React, { useState } from 'react';
import { useStorageStore } from '../store/storageStore';
import { Database, Plus, Trash2, Download, Search } from 'lucide-react';

export const StorageConsole = () => {
  const {
    activeDbType,
    activeDbName,
    activeStoreName,
    setActiveDbType,
    setActiveDbName,
    createNewDatabase,
    createObjectStore,
    purgeDatabase,
    exportSchemaStructure,
    setSearchQuery,
  } = useStorageStore();

  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  
  const [newDbName, setNewDbName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [keyPath, setKeyPath] = useState('id');

  const [searchVal, setSearchVal] = useState('');

  const handleExport = async () => {
    const dump = await exportSchemaStructure();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `schema_backup_${activeDbType}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCreateDb = async (e) => {
    e.preventDefault();
    if (!newDbName.trim()) return;
    try {
      await createNewDatabase(newDbName.trim(), newStoreName.trim() || 'users', keyPath.trim() || 'id');
      setDbModalOpen(false);
      setNewDbName('');
      setNewStoreName('');
    } catch (err) {
      alert('Failed to create database: ' + err.message);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    try {
      await createObjectStore(newStoreName.trim(), keyPath.trim() || 'id');
      setStoreModalOpen(false);
      setNewStoreName('');
    } catch (err) {
      alert('Failed to create object store: ' + err.message);
    }
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#141417',
    border: '1px solid #2e2e38',
    borderRadius: '0.25rem',
    padding: '0.5rem',
    color: '#ffffff',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const modalStyle = {
    backgroundColor: '#1e1e24',
    border: '1px solid #3e3e4a',
    borderRadius: '0.5rem',
    width: '100%',
    maxWidth: '28rem',
    padding: '1.5rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  };

  return (
    <div style={{ backgroundColor: '#1e1e24', borderBottom: '1px solid #2e2e38', padding: '1rem', color: '#fff' }}>
      {/* StorageTargetActionStrip */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Database style={{ width: '1.25rem', height: '1.25rem', color: '#34d399' }} />
          <span className="font-semibold text-sm tracking-wider uppercase text-emerald-400">
            Storage Target Action Strip
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDbModalOpen(true)}
            className="times-12 flex items-center gap-1-5 px-3 py-1-5 bg-emerald-600 text-white rounded transition"
            style={{ cursor: 'pointer' }}
          >
            <Plus style={{ width: '1rem', height: '1rem' }} /> Connect Storage Target
          </button>
          
          <button
            onClick={() => setStoreModalOpen(true)}
            className="times-12 flex items-center gap-1-5 px-3 py-1-5 bg-blue-600 text-white rounded transition"
            style={{ cursor: 'pointer' }}
          >
            <Plus style={{ width: '1rem', height: '1rem' }} /> Create Object Store
          </button>

          <button
            onClick={purgeDatabase}
            className="times-12 flex items-center gap-1-5 px-3 py-1-5 bg-rose-700 text-white rounded transition"
            style={{ cursor: 'pointer' }}
          >
            <Trash2 style={{ width: '1rem', height: '1rem' }} /> Purge Database Instance
          </button>

          <button
            onClick={handleExport}
            className="times-12 flex items-center gap-1-5 px-3 py-1-5 bg-zinc-700 text-white rounded transition"
            style={{ cursor: 'pointer' }}
          >
            <Download style={{ width: '1rem', height: '1rem' }} /> Export Schema JSON
          </button>
        </div>
      </div>

      {/* QueryConfigurationForm */}
      <div className="flex flex-wrap items-center gap-4 bg-app-base p-3 rounded" style={{ border: '1px solid #23232a' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-zinc-400 font-semibold">Engine:</span>
          <div className="flex bg-app-panel rounded p-1-5" style={{ border: '1px solid #2e2e38' }}>
            {['indexedDB', 'localStorage', 'sessionStorage'].map((type) => (
              <button
                key={type}
                onClick={() => setActiveDbType(type)}
                className={`times-12 px-3 py-1 rounded transition capitalize ${
                  activeDbType === type
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400'
                }`}
                style={{ cursor: 'pointer' }}
              >
                {type === 'indexedDB' ? 'IndexedDB' : type === 'localStorage' ? 'Local Storage' : 'Session Storage'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 bg-app-panel rounded px-3 py-1" style={{ border: '1px solid #2e2e38' }}>
          <Search style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              setSearchQuery(e.target.value);
            }}
            placeholder="Custom index filter search / run key query instantly..."
            style={{ width: '100%', background: 'transparent', fontSize: '0.875rem', color: '#fff', outline: 'none', border: 'none' }}
          />
        </div>
      </div>

      {/* Database Connect Target Modal */}
      {dbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal backdrop-blur-sm">
          <div style={modalStyle}>
            <h3 className="text-lg font-medium text-emerald-400 mb-4">Connect New Storage Target / Database</h3>
            <form onSubmit={handleCreateDb} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1">Database/Target Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RetailDB"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1">Initial Object Store Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. users"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1">Primary Key (keyPath)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. id"
                  value={keyPath}
                  onChange={(e) => setKeyPath(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDbModalOpen(false)}
                  className="times-12 px-4 py-2 bg-zinc-800 text-white rounded"
                  style={{ cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="times-12 px-4 py-2 bg-emerald-600 text-white rounded font-medium"
                  style={{ cursor: 'pointer' }}
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Store Modal */}
      {storeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal backdrop-blur-sm">
          <div style={modalStyle}>
            <h3 className="text-lg font-medium text-emerald-400 mb-4">Create New Object Store / Virtual Table</h3>
            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1">Object Store / Table Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. orders"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1">Primary Key (keyPath)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. id"
                  value={keyPath}
                  onChange={(e) => setKeyPath(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(false)}
                  className="times-12 px-4 py-2 bg-zinc-800 text-white rounded"
                  style={{ cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="times-12 px-4 py-2 bg-blue-600 text-white rounded font-medium"
                  style={{ cursor: 'pointer' }}
                >
                  Create Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
