import { useEffect } from 'react';
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
    <div className="flex flex-col h-screen overflow-hidden bg-app-dark">
      {/* Admin Console Header */}
      <header className="bg-app-header border-b px-4 py-3 flex items-center justify-between shadow-md select-none shrink-0">
        <div className="flex items-center gap-3">
          <div style={{ padding: '0.375rem', backgroundColor: 'rgba(6,78,59,0.6)', borderRadius: '0.25rem', border: '1px solid rgba(6,78,59,0.4)' }}>
            <Database style={{ width: '1.25rem', height: '1.25rem', color: '#34d399' }} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-emerald-400 uppercase">
              Web Storage Local Database Schema Explorer
            </h1>
            <p style={{ fontSize: '10px', color: '#71717a', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.025em' }}>
              Sandboxed Client-Side Relational Engine &amp; Volumetric Analyzer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1-5 text-zinc-400 bg-app-bar px-2-5 py-1 rounded border border-app-panel">
            <Cpu style={{ width: '0.875rem', height: '0.875rem', color: '#a78bfa', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
            <span>Driver status:</span>
            <span className="text-emerald-400 font-bold">ONLINE (100% Client-Side)</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-500">
            <ShieldAlert style={{ width: '0.875rem', height: '0.875rem', color: '#f59e0b' }} />
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
