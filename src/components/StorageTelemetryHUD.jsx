import { useStorageStore } from '../store/storageStore';
import { Terminal, HardDrive, Cpu, Activity, Download } from 'lucide-react';

export const StorageTelemetryHUD = () => {
  const {
    totalCalculatedWeightBytes,
    quotaMarginPercentage,
    telemetryLogs,
    relationships,
    activeDbType,
    activeDbName,
    exportSchemaStructure,
  } = useStorageStore();

  const handleDownloadDump = async () => {
    const dump = await exportSchemaStructure();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `db_dump_${activeDbType}_${activeDbName || 'all'}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Convert bytes to KB
  const totalWeightKB = (totalCalculatedWeightBytes / 1024).toFixed(3);

  // Latest transaction latency
  const latestLog = telemetryLogs[0];
  const latestLatency = latestLog ? `${latestLog.latencyMs} ms` : '0 ms';

  return (
    <div className="bg-app-header border-t text-white flex flex-col h-64">
      {/* HUD Telemetry Strip */}
      <div className="grid grid-cols-4 divide-x bg-app-bar" style={{ borderBottom: '1px solid #2e2e38' }}>
        {/* Metric 1 */}
        <div className="p-3 flex items-center gap-3">
          <HardDrive style={{ width: '1.25rem', height: '1.25rem', color: '#34d399', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600, letterSpacing: '0.05em' }}>
              Total Calculated Weight
            </div>
            <div className="times-12 font-bold text-emerald-400 font-mono">
              {totalWeightKB} KB
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-3 flex items-center gap-3">
          <Activity style={{ width: '1.25rem', height: '1.25rem', color: '#22d3ee', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600, letterSpacing: '0.05em' }}>
              Remaining Quota Margin
            </div>
            <div className="times-12 font-bold text-cyan-400 font-mono">
              {quotaMarginPercentage.toFixed(4)} %
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-3 flex items-center gap-3">
          <Cpu style={{ width: '1.25rem', height: '1.25rem', color: '#a78bfa', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600, letterSpacing: '0.05em' }}>
              Execution Latency
            </div>
            <div className="times-12 font-bold text-violet-400 font-mono">
              {latestLatency}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Terminal style={{ width: '1.25rem', height: '1.25rem', color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600, letterSpacing: '0.05em' }}>
                Active Index Edges
              </div>
              <div className="times-12 font-bold text-amber-400 font-mono">
                {relationships.edges.length} Links
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadDump}
            className="times-12 flex items-center gap-1 px-2-5 py-1 bg-zinc-800 text-zinc-300 rounded text-xs transition"
            style={{ cursor: 'pointer' }}
            title="Download DB Schema Dump"
          >
            <Download style={{ width: '0.875rem', height: '0.875rem' }} /> Dump
          </button>
        </div>
      </div>

      {/* Terminal logs panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-app-dark">
        <div className="p-2 bg-app-terminal flex items-center justify-between" style={{ borderBottom: '1px solid #18181f' }}>
          <div className="flex items-center gap-1-5 text-xs text-zinc-400 font-semibold uppercase">
            <Terminal style={{ width: '0.875rem', height: '0.875rem', color: '#fbbf24' }} />
            <span>Telemetry Transaction Log Terminal</span>
          </div>
          <span style={{ fontSize: '10px', color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
            SYS_VOLUMETRIC_MONITOR_ON
          </span>
        </div>

        <div className="flex-1 p-3 font-mono overflow-y-auto space-y-1" style={{ fontSize: '11px', color: '#d4d4d8' }}>
          {telemetryLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 pb-1" style={{ borderBottom: '1px solid rgba(24,24,31,0.4)' }}>
              <span className="text-zinc-500 select-none">[{log.timestamp}]</span>
              <span className="font-bold text-emerald-400">{log.action}</span>
              <span className="text-zinc-400">target:</span>
              <span className="text-cyan-400 font-semibold">{log.target}</span>
              <span className="text-zinc-400">status:</span>
              <span className={log.status === 'SUCCESS' ? 'text-green-500 font-bold' : 'text-rose-500 font-bold'}>
                {log.status}
              </span>
              <span className="text-zinc-500">({log.latencyMs}ms)</span>
              {log.details && <span className="text-zinc-500 italic ml-2">- {log.details}</span>}
            </div>
          ))}

          {telemetryLogs.length === 0 && (
            <div className="text-zinc-500 italic p-2">
              No transactions compiled yet. Interact with the schema explorer or workspace spreadsheet to trigger actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
