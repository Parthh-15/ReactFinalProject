import React from 'react';
import { useStorageStore } from '../store/storageStore';
import { Terminal, HardDrive, Cpu, Activity, Download } from 'lucide-react';

export const StorageTelemetryHUD = () => {
  const {
    totalCalculatedWeightBytes,
    globalUsageBytes,
    globalQuotaBytes,
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
  const globalUsageKB = (globalUsageBytes / 1024).toFixed(3);
  const globalQuotaMB = (globalQuotaBytes / (1024 * 1024)).toFixed(1);

  // Latest transaction latency
  const latestLog = telemetryLogs[0];
  const latestLatency = latestLog ? `${latestLog.latencyMs} ms` : '0 ms';

  return (
    <div className="bg-[#101014] border-t border-[#2e2e38] text-white flex flex-col h-64">
      {/* HUD Telemetry Strip */}
      <div className="grid grid-cols-4 border-b border-[#2e2e38] divide-x divide-[#2e2e38] bg-[#16161b]">
        {/* Metric 1 */}
        <div className="p-3 flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wider">
              Total Calculated Weight
            </div>
            <div className="times-12 font-bold text-emerald-400 font-mono">
              {totalWeightKB} KB
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-3 flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wider">
              Remaining Quota Margin
            </div>
            <div className="times-12 font-bold text-cyan-400 font-mono">
              {quotaMarginPercentage.toFixed(4)} %
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-3 flex items-center gap-3">
          <Cpu className="w-5 h-5 text-violet-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wider">
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
            <Terminal className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wider">
                Active Index Edges
              </div>
              <div className="times-12 font-bold text-amber-400 font-mono">
                {relationships.edges.length} Links
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadDump}
            className="times-12 flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition"
            title="Download DB Schema Dump"
          >
            <Download className="w-3.5 h-3.5" /> Dump
          </button>
        </div>
      </div>

      {/* Terminal logs panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0e]">
        <div className="p-2 bg-[#121216] border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold uppercase">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Telemetry Transaction Log Terminal</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            SYS_VOLUMETRIC_MONITOR_ON
          </span>
        </div>

        <div className="flex-1 p-3 font-mono text-[11px] text-zinc-300 overflow-y-auto space-y-1 scrollbar-thin">
          {telemetryLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 border-b border-[#18181f]/40 pb-1">
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
