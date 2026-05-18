import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, AlertTriangle, CheckCircle, Power, RefreshCw,
  HardDrive, Activity, ShieldAlert, ShieldCheck, XCircle,
  ChevronDown, ChevronUp, Cpu, Clock
} from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────

type AlertLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

interface DriveStatus {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  percentUsed: number;
  percentFree: number;
  alertLevel: AlertLevel;
  isEmergency: boolean;
  formattedFree: string;
  formattedUsed: string;
  formattedTotal: string;
}

interface ProcessInfo {
  pid: number;
  name: string;
  memoryBytes: number;
  cDriveEstimate: number;
  isCritical: boolean;
  status: string;
}

interface KillswitchStatus {
  active: boolean;
  suspendedCount: number;
  suspendedNames: string[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const LEVEL_CONFIG: Record<AlertLevel, {
  border: string; bg: string; text: string; badge: string;
  barColor: string; glow: string; icon: React.ReactNode; label: string;
}> = {
  GREEN: {
    border: 'border-emerald-400/40', bg: 'bg-emerald-500/5',
    text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300',
    barColor: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    glow: '0 0 20px rgba(52,211,153,0.3)',
    icon: <ShieldCheck size={16} />, label: 'HEALTHY',
  },
  YELLOW: {
    border: 'border-yellow-400/40', bg: 'bg-yellow-500/5',
    text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300',
    barColor: 'bg-gradient-to-r from-yellow-600 to-yellow-400',
    glow: '0 0 20px rgba(250,204,21,0.3)',
    icon: <AlertTriangle size={16} />, label: 'MONITOR',
  },
  ORANGE: {
    border: 'border-orange-400/40', bg: 'bg-orange-500/5',
    text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300',
    barColor: 'bg-gradient-to-r from-orange-600 to-orange-400',
    glow: '0 0 20px rgba(251,146,60,0.4)',
    icon: <AlertTriangle size={16} />, label: 'WARNING',
  },
  RED: {
    border: 'border-red-500/60', bg: 'bg-red-500/8',
    text: 'text-red-400', badge: 'bg-red-500/20 text-red-300',
    barColor: 'bg-gradient-to-r from-red-700 to-red-500',
    glow: '0 0 30px rgba(239,68,68,0.5)',
    icon: <Zap size={16} />, label: 'CRITICAL',
  },
};

// ── main component ────────────────────────────────────────────────────────────

export default function EmergencyKillswitchView() {
  const [driveStatus, setDriveStatus]       = useState<DriveStatus | null>(null);
  const [processes, setProcesses]           = useState<ProcessInfo[]>([]);
  const [ksStatus, setKsStatus]             = useState<KillswitchStatus>({ active: false, suspendedCount: 0, suspendedNames: [] });
  const [loading, setLoading]               = useState(false);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [result, setResult]                 = useState<any>(null);
  const [showProcesses, setShowProcesses]   = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [error, setError]                   = useState<string | null>(null);

  // ── polling ─────────────────────────────────────────────────────────────────

  const fetchDriveStatus = useCallback(async () => {
    try {
      const [driveRes, ksRes] = await Promise.all([
        fetch('http://localhost:8080/api/system/cdrive-status'),
        fetch('http://localhost:8080/api/emergency/status'),
      ]);
      if (driveRes.ok) { setDriveStatus(await driveRes.json()); setLastUpdated(new Date()); }
      if (ksRes.ok)    { setKsStatus(await ksRes.json()); }
      setError(null);
    } catch {
      setError('Backend offline — start the Java server');
    }
  }, []);

  useEffect(() => {
    fetchDriveStatus();
    const id = setInterval(fetchDriveStatus, 5000);
    return () => clearInterval(id);
  }, [fetchDriveStatus]);

  const fetchProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const res = await fetch('http://localhost:8080/api/system/processes-using-cdrive');
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes || []);
        setShowProcesses(true);
      }
    } catch { /* ignore */ }
    setLoadingProcesses(false);
  };

  // ── killswitch actions ───────────────────────────────────────────────────────

  const activate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:8080/api/emergency/killswitch', { method: 'POST' });
      const data = await res.json();
      setResult({ ...data, type: 'ACTIVATED' });
      await fetchDriveStatus();
    } catch {
      setResult({ type: 'ERROR', message: 'Failed to contact backend' });
    }
    setLoading(false);
  };

  const deactivate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:8080/api/emergency/killswitch/deactivate', { method: 'POST' });
      const data = await res.json();
      setResult({ ...data, type: 'DEACTIVATED' });
      await fetchDriveStatus();
    } catch {
      setResult({ type: 'ERROR', message: 'Failed to contact backend' });
    }
    setLoading(false);
  };

  // ── derived ──────────────────────────────────────────────────────────────────

  const level  = driveStatus?.alertLevel ?? 'GREEN';
  const cfg    = LEVEL_CONFIG[level];
  const pct    = driveStatus?.percentUsed ?? 0;
  const isRed  = level === 'RED';

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      {/* ── page header ─────────────────────────────────────────────────── */}
      <header className="flex justify-between items-end pb-4 border-b border-[#141414]/10">
        <div>
          <h2 className="font-serif italic text-4xl">Emergency Killswitch</h2>
          <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest mt-1">
            C: Drive Guardian · Real-time Process Control
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="font-mono text-[10px] opacity-40 flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchDriveStatus}
            className="p-2 rounded-lg bg-[#141414]/5 hover:bg-[#141414]/10 transition"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </motion.button>
        </div>
      </header>

      {/* ── offline error ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 font-mono text-xs text-red-400"
          >
            <XCircle size={14} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── C: drive status card ─────────────────────────────────────────── */}
      <motion.div
        animate={{ boxShadow: cfg.glow }}
        transition={{ duration: 1, repeat: isRed ? Infinity : 0, repeatType: 'reverse' }}
        className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} backdrop-blur-md p-6 relative overflow-hidden`}
      >
        {/* Background pulse for RED state */}
        {isRed && (
          <motion.div
            className="absolute inset-0 bg-red-500/5 rounded-2xl"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <div className="relative flex items-start gap-6">
          {/* Drive icon */}
          <div className={`p-4 rounded-xl ${cfg.bg} border ${cfg.border} shrink-0`}>
            <motion.div
              animate={isRed ? { rotate: [0, -5, 5, 0] } : {}}
              transition={{ duration: 0.4, repeat: isRed ? Infinity : 0, repeatDelay: 2 }}
            >
              <HardDrive size={32} className={cfg.text} />
            </motion.div>
          </div>

          <div className="flex-1">
            {/* Title row */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-mono font-bold text-lg tracking-widest uppercase">C: Drive Status</h3>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.badge}`}>
                {cfg.icon} {cfg.label}
              </span>
              {isRed && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="font-mono text-[10px] text-red-400 font-bold"
                >
                  ● EMERGENCY
                </motion.span>
              )}
            </div>

            {/* Usage bar */}
            <div className="mb-3">
              <div className="flex justify-between font-mono text-xs mb-1">
                <span className="opacity-60">{driveStatus?.formattedUsed ?? '—'} used</span>
                <span className={`font-bold ${cfg.text}`}>{pct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-4 bg-[#141414]/10 rounded-sm overflow-hidden border border-white/30">
                <motion.div
                  className={`h-full ${cfg.barColor} ${isRed ? 'shadow-[0_0_10px_rgba(239,68,68,0.8)]' : ''}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 60 }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 font-mono text-[10px] uppercase">
              <div>
                <div className="opacity-50">Free</div>
                <div className={`font-bold text-sm ${cfg.text}`}>{driveStatus?.formattedFree ?? '—'}</div>
              </div>
              <div>
                <div className="opacity-50">Used</div>
                <div className="font-bold text-sm">{driveStatus?.formattedUsed ?? '—'}</div>
              </div>
              <div>
                <div className="opacity-50">Total</div>
                <div className="font-bold text-sm">{driveStatus?.formattedTotal ?? '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── killswitch panel ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left: Activate / Deactivate */}
        <div className="bg-white/40 backdrop-blur-md border border-white/40 shadow-xl rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 font-mono text-xs opacity-50 uppercase">
            <Power size={12} /> Control Panel
          </div>

          {/* Status indicator */}
          <div className={`rounded-lg p-4 border ${
            ksStatus.active
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-emerald-500/10 border-emerald-400/30'
          }`}>
            <div className="flex items-center gap-2 font-mono text-sm font-bold">
              <motion.div
                animate={{ scale: ksStatus.active ? [1, 1.3, 1] : 1 }}
                transition={{ duration: 1, repeat: ksStatus.active ? Infinity : 0 }}
                className={`w-2 h-2 rounded-full ${ksStatus.active ? 'bg-red-400' : 'bg-emerald-400'}`}
              />
              {ksStatus.active
                ? `🚨 EMERGENCY MODE ACTIVE — ${ksStatus.suspendedCount} processes suspended`
                : '✅ Normal operation — all processes running'}
            </div>
          </div>

          {/* Action button */}
          {!ksStatus.active ? (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={activate}
              disabled={loading}
              className={`w-full py-4 px-6 rounded-xl font-mono font-bold text-sm uppercase tracking-widest
                flex items-center justify-center gap-3 transition-all
                ${isRed
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  : 'bg-[#141414] hover:bg-[#141414]/80 text-[#E4E3E0]'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading
                ? <><RefreshCw size={16} className="animate-spin" /> Processing...</>
                : <><Zap size={16} /> Activate Emergency Killswitch</>
              }
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={deactivate}
              disabled={loading}
              className={`w-full py-4 px-6 rounded-xl font-mono font-bold text-sm uppercase tracking-widest
                flex items-center justify-center gap-3 transition-all
                bg-emerald-600 hover:bg-emerald-500 text-white
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading
                ? <><RefreshCw size={16} className="animate-spin" /> Resuming...</>
                : <><CheckCircle size={16} /> Deactivate — Resume All Processes</>
              }
            </motion.button>
          )}

          <p className="font-mono text-[10px] opacity-40 text-center leading-relaxed">
            {ksStatus.active
              ? 'Click above to resume all suspended processes. They will return to normal operation.'
              : 'Activating will suspend all non-critical processes with significant C: drive footprint.'
            }
          </p>

          {/* Suspended names list */}
          <AnimatePresence>
            {ksStatus.active && ksStatus.suspendedNames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-[#141414]/10 pt-3 space-y-1"
              >
                <div className="font-mono text-[10px] opacity-50 uppercase mb-2">Suspended Processes</div>
                {ksStatus.suspendedNames.slice(0, 8).map((name, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {name}
                  </div>
                ))}
                {ksStatus.suspendedNames.length > 8 && (
                  <div className="font-mono text-[10px] opacity-40">
                    +{ksStatus.suspendedNames.length - 8} more...
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Alert level guide */}
        <div className="bg-white/40 backdrop-blur-md border border-white/40 shadow-xl rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 font-mono text-xs opacity-50 uppercase">
            <Activity size={12} /> Alert Guide
          </div>

          <div className="space-y-3">
            {(Object.entries(LEVEL_CONFIG) as [AlertLevel, typeof LEVEL_CONFIG[AlertLevel]][]).map(([lvl, c]) => (
              <div
                key={lvl}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${level === lvl ? `${c.bg} ${c.border} ring-1 ring-current` : 'border-transparent opacity-50'}`}
              >
                <span className={c.text}>{c.icon}</span>
                <div className="flex-1">
                  <div className={`font-mono text-xs font-bold ${c.text}`}>{c.label}</div>
                  <div className="font-mono text-[10px] opacity-60">
                    {lvl === 'GREEN'  && '> 20% free — All clear'}
                    {lvl === 'YELLOW' && '10–20% free — Watch closely'}
                    {lvl === 'ORANGE' && '5–10% free — Take action soon'}
                    {lvl === 'RED'    && '< 5% free — Activate Killswitch NOW'}
                  </div>
                </div>
                {level === lvl && <div className={`w-2 h-2 rounded-full ${c.text.replace('text', 'bg')} animate-pulse`} />}
              </div>
            ))}
          </div>

          <div className="border-t border-[#141414]/10 pt-3 font-mono text-[10px] opacity-40 leading-relaxed">
            🔒 Critical system processes (svchost, lsass, csrss, explorer etc.) are ALWAYS
            protected and will never be suspended regardless of alert level.
          </div>
        </div>
      </div>

      {/* ── result card ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-xl border p-5 font-mono text-sm
              ${result.type === 'ACTIVATED'   ? 'bg-red-500/10 border-red-500/40 text-red-300'   : ''}
              ${result.type === 'DEACTIVATED' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : ''}
              ${result.type === 'ERROR'       ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300' : ''}`}
          >
            <div className="font-bold mb-3 flex items-center gap-2">
              {result.type === 'ACTIVATED'   && <><Zap size={14} /> EMERGENCY MODE ACTIVATED</>}
              {result.type === 'DEACTIVATED' && <><CheckCircle size={14} /> EMERGENCY MODE DEACTIVATED</>}
              {result.type === 'ERROR'       && <><XCircle size={14} /> ERROR</>}
            </div>
            {result.type !== 'ERROR' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                <div>
                  <div className="opacity-50">Acted On</div>
                  <div className="font-bold text-lg">{result.processesActedOn ?? result.processesResumed ?? 0}</div>
                </div>
                {result.estimatedFreed && (
                  <div>
                    <div className="opacity-50">Est. Freed</div>
                    <div className="font-bold text-lg">{result.estimatedFreed}</div>
                  </div>
                )}
                <div>
                  <div className="opacity-50">Skipped</div>
                  <div className="font-bold text-lg">{result.processesSkipped ?? 0}</div>
                </div>
                <div>
                  <div className="opacity-50">Failed</div>
                  <div className="font-bold text-lg">{result.processesFailed ?? result.failedList?.length ?? 0}</div>
                </div>
              </div>
            )}
            {result.type === 'ERROR' && <div>{result.message}</div>}

            {/* Details */}
            {result.suspendedList?.length > 0 && (
              <div className="mt-3 border-t border-current/20 pt-3">
                <div className="opacity-50 mb-1 text-[10px] uppercase">Suspended</div>
                {result.suspendedList.slice(0, 6).map((n: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <div className="w-1 h-1 rounded-full bg-current opacity-60" /> {n}
                  </div>
                ))}
                {result.suspendedList.length > 6 && (
                  <div className="opacity-40 text-[10px]">+{result.suspendedList.length - 6} more</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── process inspector ────────────────────────────────────────────── */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 shadow-xl rounded-xl overflow-hidden">
        <button
          onClick={() => showProcesses ? setShowProcesses(false) : fetchProcesses()}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#141414]/5 transition"
        >
          <div className="flex items-center gap-2 font-mono text-xs uppercase opacity-60">
            <Cpu size={12} /> Process Inspector
            {processes.length > 0 && (
              <span className="bg-[#141414]/10 px-2 py-0.5 rounded-full">
                {processes.length} processes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loadingProcesses && <RefreshCw size={12} className="animate-spin opacity-40" />}
            {showProcesses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        <AnimatePresence>
          {showProcesses && processes.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-[#141414]/10">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-6 py-2 font-mono text-[10px] uppercase opacity-40 bg-[#141414]/5">
                  <div className="col-span-4">Process</div>
                  <div className="col-span-2">PID</div>
                  <div className="col-span-3">Memory</div>
                  <div className="col-span-2">C: Footprint</div>
                  <div className="col-span-1">Type</div>
                </div>
                {processes.slice(0, 20).map((proc, i) => (
                  <motion.div
                    key={proc.pid}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`grid grid-cols-12 gap-2 px-6 py-3 border-t border-[#141414]/5
                      font-mono text-xs items-center hover:bg-[#141414]/5 transition
                      ${proc.isCritical ? 'opacity-40' : ''}`}
                  >
                    <div className="col-span-4 font-medium truncate" title={proc.name}>
                      {proc.name}
                    </div>
                    <div className="col-span-2 opacity-50">{proc.pid}</div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-[#141414]/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500/60 rounded-full"
                            style={{ width: `${Math.min((proc.memoryBytes / (2 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="opacity-60 whitespace-nowrap">{formatBytes(proc.memoryBytes)}</span>
                      </div>
                    </div>
                    <div className="col-span-2 opacity-70">{formatBytes(proc.cDriveEstimate)}</div>
                    <div className="col-span-1">
                      {proc.isCritical
                        ? <ShieldAlert size={12} className="text-amber-400" title="Critical — protected" />
                        : <ShieldCheck size={12} className="text-slate-400" title="Safe to suspend" />
                      }
                    </div>
                  </motion.div>
                ))}
                <div className="px-6 py-3 font-mono text-[10px] opacity-30 border-t border-[#141414]/5">
                  Showing top {Math.min(processes.length, 20)} processes · 
                  Dimmed = critical (protected) · 
                  Memory used as C: activity proxy
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
