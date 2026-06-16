import React, { useEffect } from 'react';
import { useStorageStore } from './store/storageStore';
import { seedMockData } from './utils/dbInitializer';
import { StorageConsole } from './components/StorageConsole';
import { ExplorerStage } from './components/ExplorerStage';
import { StorageTelemetryHUD } from './components/StorageTelemetryHUD';
import { Database, ShieldAlert, Cpu } from 'lucide-react';

function App() {
  const { refreshSchemaStructure } = useStorageStore();

  useEffect(() => {
    const initApp = async () => {
      // Seed initial databases with rich relational data
      await seedMockData();
      // Scan and build initial schema tree and telemetry details
      await refreshSchemaStructure();
    };

    initApp();
  }, [refreshSchemaStructure]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0c0c0e]">
      {/* Admin Console Header */}
      <header className="bg-[#101014] border-b border-[#2e2e38] px-4 py-3 flex items-center justify-between shadow-md select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-950/60 rounded border border-emerald-800/40">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-emerald-400 uppercase">
              Web Storage Local Database Schema Explorer
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-tight">
              Sandboxed Client-Side Relational Engine & Volumetric Analyzer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400 bg-[#16161b] px-2.5 py-1 rounded border border-[#23232a]">
            <Cpu className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>Driver status:</span>
            <span className="text-emerald-400 font-bold">ONLINE (100% Client-Side)</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-500">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Zero Server Overhead / Secure Sandbox</span>
          </div>
        </div>
      </header>

      {/* Main Console Grid */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* StorageTargetActionStrip & QueryConfigurationForm */}
        <StorageConsole />

        {/* Dual-Pane Database Staging Workspace */}
        <ExplorerStage />

        {/* Telemetry HUD */}
        <StorageTelemetryHUD />
      </main>
    </div>
  );
}

export default App;
