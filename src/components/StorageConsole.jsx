import React, { useState } from 'react';
import { useStorageStore } from '../store/storageStore';
import { Database, Plus, Trash2, Download, Search, Settings } from 'lucide-react';

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

  return (
    <div className="bg-[#1e1e24] border-b border-[#2e2e38] p-4 text-white">
      {/* StorageTargetActionStrip */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm tracking-wider uppercase text-emerald-400">
            Storage Target Action Strip
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDbModalOpen(true)}
            className="times-12 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition"
          >
            <Plus className="w-4 h-4" /> Connect Storage Target
          </button>
          
          <button
            onClick={() => setStoreModalOpen(true)}
            className="times-12 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition"
          >
            <Plus className="w-4 h-4" /> Create Object Store
          </button>

          <button
            onClick={purgeDatabase}
            className="times-12 flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded transition"
          >
            <Trash2 className="w-4 h-4" /> Purge Database Instance
          </button>

          <button
            onClick={handleExport}
            className="times-12 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
          >
            <Download className="w-4 h-4" /> Export Schema JSON
          </button>
        </div>
      </div>

      {/* QueryConfigurationForm */}
      <div className="flex flex-wrap items-center gap-4 bg-[#141417] p-3 rounded border border-[#23232a]">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-zinc-400 font-semibold">Engine:</span>
          <div className="flex bg-[#23232a] rounded p-0.5 border border-[#2e2e38]">
            {['indexedDB', 'localStorage', 'sessionStorage'].map((type) => (
              <button
                key={type}
                onClick={() => setActiveDbType(type)}
                className={`times-12 px-3 py-1 rounded transition capitalize ${
                  activeDbType === type
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {type === 'indexedDB' ? 'IndexedDB' : type === 'localStorage' ? 'Local Storage' : 'Session Storage'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 bg-[#23232a] border border-[#2e2e38] rounded px-3 py-1">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              setSearchQuery(e.target.value);
            }}
            placeholder="Custom index filter search / run key query instantly..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-zinc-500"
          />
        </div>
      </div>

      {/* Database Connect Target Modal */}
      {dbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e24] border border-[#3e3e4a] rounded-lg w-full max-w-md p-6 shadow-2xl">
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
                  className="w-full bg-[#141417] border border-[#2e2e38] rounded p-2 text-white text-sm focus:outline-emerald-500"
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
                  className="w-full bg-[#141417] border border-[#2e2e38] rounded p-2 text-white text-sm focus:outline-emerald-500"
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
                  className="w-full bg-[#141417] border border-[#2e2e38] rounded p-2 text-white text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDbModalOpen(false)}
                  className="times-12 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="times-12 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e24] border border-[#3e3e4a] rounded-lg w-full max-w-md p-6 shadow-2xl">
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
                  className="w-full bg-[#141417] border border-[#2e2e38] rounded p-2 text-white text-sm focus:outline-emerald-500"
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
                  className="w-full bg-[#141417] border border-[#2e2e38] rounded p-2 text-white text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(false)}
                  className="times-12 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="times-12 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
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
