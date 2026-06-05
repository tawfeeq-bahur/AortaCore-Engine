import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Search, RefreshCw, Power, ShieldAlert,
  Cpu, HardDrive, Info, Layers, CheckCircle, Lock
} from 'lucide-react';

interface StartupItem {
  name: string;
  command: string;
  location: string;
  user: string;
  enabled: boolean;
}

interface SystemMetrics {
  cpuLoad: number;
  totalRam: number;
  usedRam: number;
  ramUsagePercent: number;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface StartupRecommendation {
  type: 'recommended' | 'optional' | 'critical';
  label: string;
  badgeClass: string;
  dotColor: string;
  ramSaved: string;
}

const getStartupRecommendation = (item: StartupItem, isHklm: boolean): StartupRecommendation => {
  const name = item.name.toLowerCase();
  const cmd = item.command.toLowerCase();
  
  // Critical / Protected items
  const isCriticalName = name.includes('security') || name.includes('defender') || name.includes('health') ||
                         name.includes('driver') || name.includes('audio') || name.includes('volume') ||
                         name.includes('intel') || name.includes('nvidia') || name.includes('amd') ||
                         name.includes('realtek') || name.includes('synaptics') || name.includes('windows') ||
                         cmd.includes('system32');
  
  if (isHklm || isCriticalName) {
    return {
      type: 'critical',
      label: 'System Critical',
      badgeClass: 'bg-red-500/10 text-red-500 border border-red-500/20',
      dotColor: 'bg-red-500',
      ramSaved: 'Protected'
    };
  }

  // Recommended items
  const isRecommended = name.includes('chrome') || name.includes('edge') || name.includes('brave') ||
                        name.includes('opera') || name.includes('discord') || name.includes('spotify') ||
                        name.includes('steam') || name.includes('cortana') || name.includes('update') ||
                        name.includes('teams') || name.includes('skype') || name.includes('dropbox') ||
                        name.includes('onedrive') || name.includes('perplexity') || name.includes('todesktop') ||
                        name.includes('zoom') || name.includes('slack');

  if (isRecommended) {
    let savings = '40-120 MB';
    if (name.includes('chrome') || name.includes('edge') || name.includes('brave')) {
      savings = '50-150 MB';
    } else if (name.includes('discord') || name.includes('spotify') || name.includes('steam')) {
      savings = '80-200 MB';
    }
    return {
      type: 'recommended',
      label: 'Recommended to Disable',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
      dotColor: 'bg-emerald-500',
      ramSaved: `Est. RAM Saved: ${savings}`
    };
  }

  // Optional items
  let optSavings = '50-150 MB';
  if (name.includes('docker')) {
    optSavings = '300-800 MB';
  } else if (name.includes('idea') || name.includes('code') || name.includes('vscode')) {
    optSavings = '150-400 MB';
  }
  return {
    type: 'optional',
    label: 'Optional',
    badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    dotColor: 'bg-amber-500',
    ramSaved: `Est. RAM Saved: ${optSavings}`
  };
};

export default function PerformanceBooster({ isActive = false }: { isActive?: boolean }) {
  const [startupItems, setStartupItems] = useState<StartupItem[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Enabled' | 'Disabled'>('All');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lastFreedMsg, setLastFreedMsg] = useState<string | null>(null);

  // ── Fetch Startup Items ───────────────────────────────────────────────────
  const fetchStartupItems = useCallback(async (showLoader = false) => {
    if (document.hidden) return;
    if (showLoader) setLoadingItems(true);
    try {
      const res = await fetch('http://localhost:8080/api/performance/startup');
      if (res.ok) {
        const data = await res.json();
        setStartupItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch startup items:', err);
    } finally {
      if (showLoader) setLoadingItems(false);
    }
  }, []);

  // ── Fetch System Metrics ──────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch('http://localhost:8080/api/system/metrics');
      if (res.ok) {
        const data: SystemMetrics = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch system metrics:', err);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    fetchStartupItems(true);
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchStartupItems, fetchMetrics, isActive]);

  // ── Show Success Toast ────────────────────────────────────────────────────
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── RAM Optimization ──────────────────────────────────────────────────────
  const handleOptimizeRAM = async () => {
    setBoosting(true);
    setLastFreedMsg(null);
    try {
      const res = await fetch('http://localhost:8080/api/performance/ram/clean', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          const freedStr = data.formattedFreed || '0 B';
          setLastFreedMsg(`Memory Optimized! Freed ${freedStr}`);
          showToast(`✓ Freed ${freedStr} of physical RAM`, true);
          await fetchMetrics();
        } else {
          showToast('✗ RAM optimization failed', false);
        }
      } else {
        showToast('✗ API Error connecting to RAM cleaner', false);
      }
    } catch (err) {
      showToast('✗ Backend unreachable', false);
    } finally {
      setBoosting(false);
    }
  };

  // ── Toggle Startup Item ───────────────────────────────────────────────────
  const handleToggleStartup = async (item: StartupItem) => {
    try {
      const res = await fetch('http://localhost:8080/api/performance/startup/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          command: item.command,
          location: item.location,
          user: item.user,
          enable: !item.enabled
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          showToast(`✓ '${item.name}' ${!item.enabled ? 'Enabled' : 'Disabled'}`, true);
          await fetchStartupItems();
        } else {
          showToast(`✗ Failed to update startup item: ${data.error || 'Access Denied'}`, false);
        }
      }
    } catch (err) {
      showToast('✗ Error toggling startup item', false);
    }
  };

  // ── Filter and Search ─────────────────────────────────────────────────────
  const filteredItems = startupItems.filter(item => {
    const matchesTab = filterTab === 'All' || 
                       (filterTab === 'Enabled' && item.enabled) ||
                       (filterTab === 'Disabled' && !item.enabled);
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const enabledCount = startupItems.filter(i => i.enabled).length;
  const disabledCount = startupItems.filter(i => !i.enabled).length;

  // ── Circular Gauge Parameters ─────────────────────────────────────────────
  const ramPercent = metrics ? Math.round(metrics.ramUsagePercent) : 0;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (ramPercent / 100) * circumference;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg font-mono text-xs flex items-center gap-2 border ${
              toast.ok 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {toast.ok ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <header className="flex justify-between items-end pb-4 border-b border-[#141414]/10">
        <div>
          <h2 className="font-serif italic text-4xl">Performance Booster</h2>
          <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest mt-1">
            System Resource Optimizers · Memory Flusher & Startup Guard
          </p>
        </div>
        <button
          onClick={() => { fetchStartupItems(true); fetchMetrics(); }}
          className="p-2 rounded-lg bg-[#141414]/5 hover:bg-[#141414]/10 transition"
          title="Refresh All"
        >
          <RefreshCw size={14} className={loadingItems ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* top grid: RAM & CPU Status */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* RAM Booster Panel (8 columns) */}
        <div className="md:col-span-8 bg-white/40 border border-white/40 shadow-xl rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="flex-1 space-y-4">
            <span className="font-mono text-[9px] opacity-40 uppercase tracking-wider block">System Memory Status</span>
            <h3 className="font-serif italic text-2xl">One-Click RAM Booster</h3>
            <p className="font-mono text-xs opacity-60 leading-relaxed max-w-md">
              Flushes inactive process caches and working memory datasets back to disk. Releases locks instantly to reclaim active physical memory.
            </p>
            
            {lastFreedMsg && (
              <div className="text-emerald-600 font-mono text-xs font-semibold flex items-center gap-1">
                <CheckCircle size={12} /> {lastFreedMsg}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleOptimizeRAM}
              disabled={boosting}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#141414] hover:bg-[#141414]/90 text-[#E4E3E0] font-mono text-xs font-bold uppercase tracking-wider transition shadow-md disabled:opacity-50"
            >
              <Zap size={14} className={boosting ? 'animate-bounce' : ''} />
              {boosting ? 'Optimizing RAM...' : 'Optimize Memory'}
            </motion.button>
          </div>

          {/* SVG Circular RAM Gauge */}
          <div className="relative flex items-center justify-center shrink-0 w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80" cy="80" r={radius}
                className="stroke-slate-200"
                strokeWidth="10"
                fill="transparent"
              />
              <motion.circle
                cx="80" cy="80" r={radius}
                className="stroke-amber-500"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="font-mono text-3xl font-extrabold text-[#141414]">{ramPercent}%</span>
              <span className="font-mono text-[9px] opacity-40 uppercase tracking-wider block mt-0.5">RAM Used</span>
            </div>
          </div>
        </div>

        {/* System Footprint Stats Panel (4 columns) */}
        <div className="md:col-span-4 bg-white/40 border border-white/40 shadow-xl rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="font-mono text-[9px] opacity-40 uppercase tracking-wider block">Live CPU Status</span>
            <div className="flex items-center justify-between">
              <h4 className="font-serif italic text-xl">Processor Load</h4>
              <span className="font-mono text-xl font-bold">{metrics ? Math.round(metrics.cpuLoad) : 0}%</span>
            </div>
            <div className="h-2 bg-[#141414]/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-amber-500"
                animate={{ width: `${metrics ? metrics.cpuLoad : 0}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          <div className="border-t border-[#141414]/10 pt-4 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="opacity-50">Total Installed:</span>
              <span className="font-bold">{metrics ? formatBytes(metrics.totalRam) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-50">Currently In-Use:</span>
              <span className="font-bold">{metrics ? formatBytes(metrics.usedRam) : '—'}</span>
            </div>
            <div className="flex justify-between text-amber-600 font-bold">
              <span className="opacity-80">Free System RAM:</span>
              <span>{metrics ? formatBytes(metrics.totalRam - metrics.usedRam) : '—'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Startup Manager Layout */}
      <div className="bg-white/40 border border-white/40 shadow-xl rounded-2xl p-5 flex flex-col gap-4">
        
        {/* Startup Control Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141414]/10 pb-4">
          <div>
            <h3 className="font-serif italic text-xl">Startup Applications</h3>
            <p className="font-mono text-[10px] opacity-50 uppercase tracking-wider mt-0.5">Manage apps running in background when Windows starts</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <span className="absolute left-3 top-2.5 text-[#141414]/30">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search startup apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414]/5 border border-[#141414]/10 rounded-lg pl-9 pr-4 py-2 font-mono text-xs focus:outline-none focus:border-[#141414]/30"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['All', 'Enabled', 'Disabled'] as const).map(tab => {
            const count = tab === 'All' ? startupItems.length : tab === 'Enabled' ? enabledCount : disabledCount;
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                  filterTab === tab
                    ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                    : 'bg-transparent text-[#141414]/60 border-transparent hover:bg-[#141414]/5'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Apps List */}
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {loadingItems ? (
            <div className="text-center py-12 font-mono text-xs opacity-50 flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin" />
              Scanning Windows startup directory...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#141414]/15 rounded-xl font-mono text-xs opacity-40">
              No startup programs found
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isHklm = item.location.toUpperCase().includes('HKLM') || item.location.toUpperCase().includes('COMMON STARTUP');
              const rec = getStartupRecommendation(item, isHklm);
              const isDisabled = rec.type === 'critical';

              return (
                <div
                  key={idx}
                  className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs transition-all ${
                    item.enabled
                      ? 'bg-white/40 border-[#141414]/10 shadow-sm hover:border-[#141414]/20'
                      : 'bg-[#141414]/5 border-dashed border-[#141414]/10 opacity-75'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${rec.dotColor}`} />
                      <span className="font-bold text-[#141414] text-sm">{item.name}</span>
                      
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${rec.badgeClass}`}>
                        {rec.label}
                      </span>

                      {rec.type !== 'critical' && (
                        <span className="text-[9px] font-bold bg-[#141414]/5 text-[#141414]/65 border border-[#141414]/10 px-1.5 py-0.5 rounded">
                          💾 {rec.ramSaved}
                        </span>
                      )}

                      {isHklm && (
                        <span className="text-[8px] font-bold bg-[#141414]/5 border border-[#141414]/10 px-1.5 py-0.5 rounded flex items-center gap-1" title="Requires Administrator privileges to modify">
                          <Info size={8} /> System-Wide
                        </span>
                      )}
                    </div>

                    <div className="opacity-45 text-[10px] select-all truncate max-w-2xl" title={item.command}>
                      Command: {item.command}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[9px] opacity-40">
                      <span>Type: {item.location.toUpperCase().includes('RUN') ? 'Registry Run Key' : 'Startup Shortcut'}</span>
                      <span>•</span>
                      <span className="truncate max-w-xs" title={item.location}>Location: {item.location}</span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="shrink-0 flex items-center">
                    {isDisabled ? (
                      <div className="flex items-center gap-1.5 text-red-500/70 bg-red-500/5 border border-red-500/15 px-2.5 py-1.5 rounded-lg select-none" title="Critical System Process — Cannot Disable">
                        <Lock size={10} />
                        <span className="font-bold uppercase text-[9px] tracking-wider">Protected</span>
                      </div>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => handleToggleStartup(item)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#141414]/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span className="ml-2.5 font-bold uppercase text-[9px] tracking-wider min-w-[48px] select-none text-[#141414]/80">
                          {item.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
