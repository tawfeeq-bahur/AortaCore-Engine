import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderTree, Search, Cpu, Layers, HardDrive, 
  Copy, Check, ShieldAlert, ShieldCheck, Zap, 
  Clock, RefreshCw, ChevronRight, AlertTriangle,
  Calendar, CalendarDays, TrendingUp, Sparkles,
  Download
} from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────

interface ProcessInfo {
  pid: number;
  name: string;
  memoryBytes: number;
  cDriveEstimate: number;
  isCritical: boolean;
  status: string;
  category: 'Browsers' | 'IDEs' | 'System' | 'General Apps';
  accessedFolders: string[];
}

interface DriveMilestone {
  total: number;
  free: number;
  used: number;
}

interface SentinelStats {
  C: {
    today: DriveMilestone;
    yesterday: DriveMilestone;
    lastWeek: DriveMilestone;
    startOfMonth: DriveMilestone;
  };
  D: {
    today: DriveMilestone;
    yesterday: DriveMilestone;
    lastWeek: DriveMilestone;
    startOfMonth: DriveMilestone;
  };
}

const CATEGORY_ICONS = {
  'Browsers': <Cpu size={14} />,
  'IDEs': <Layers size={14} />,
  'System': <ShieldAlert size={14} />,
  'General Apps': <FolderTree size={14} />
};

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface ProcessRiskInfo {
  tier: 1 | 2 | 3 | 'critical';
  badge: string;
  badgeClass: string;
  advice: string;
  spaceEstimate?: string;
  indicatorColor: string;
}

const getProcessRiskInfo = (proc: ProcessInfo): ProcessRiskInfo => {
  const name = proc.name.toLowerCase();
  
  if (proc.isCritical || name === 'explorer' || name === 'explorer.exe' || name === 'svchost' || name === 'svchost.exe' || name === 'powershell' || name === 'powershell.exe' || name === 'cmd' || name === 'cmd.exe') {
    return {
      tier: 'critical',
      badge: 'SYSTEM PROTECTED',
      badgeClass: 'bg-red-500/10 text-red-500 border border-red-500/30',
      advice: 'Essential operating system module. Execution is locked to maintain Windows stability.',
      spaceEstimate: 'SYSTEM LOCKED',
      indicatorColor: 'bg-red-500',
    };
  }
  
  const isBrowser = name.includes('chrome') || name.includes('edge') || name.includes('firefox') || name.includes('brave') || name.includes('opera') || proc.category === 'Browsers';
  if (isBrowser) {
    return {
      tier: 1,
      badge: 'TIER 1: HIGH RECLAIM IMPACT',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-bold',
      advice: 'Frees web browser caches and local data stores which safely rebuild upon relaunch.',
      spaceEstimate: '2-5 GB Cache',
      indicatorColor: 'bg-emerald-500',
    };
  }
  
  const isDevOrHeavyApp = name.includes('java') || name.includes('node') || name.includes('antigravity') || name.includes('code') || name.includes('idea') || name.includes('chatgpt') || name.includes('claude') || name.includes('eclipse') || name.includes('pycharm') || proc.category === 'IDEs';
  if (isDevOrHeavyApp) {
    return {
      tier: 2,
      badge: 'TIER 2: ACTIVE SESSION (STATE LOSS)',
      badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/30 font-bold',
      advice: 'Frees process space and developer caches, but you may lose unsaved work in current windows.',
      spaceEstimate: '1-3 GB Temp',
      indicatorColor: 'bg-amber-500',
    };
  }
  
  return {
    tier: 3,
    badge: 'TIER 3: LOW IMPACT',
    badgeClass: 'bg-[#141414]/5 text-[#141414]/60 border border-[#141414]/15',
    advice: 'Standard background service or utility. Safe to terminate, but will reclaim minimal space.',
    spaceEstimate: '<100 MB',
    indicatorColor: 'bg-slate-400',
  };
};

export default function DriveSentinel({ isActive = false }: { isActive?: boolean }) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [sentinelStats, setSentinelStats] = useState<SentinelStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'Browsers' | 'IDEs' | 'System' | 'General Apps'>('Browsers');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── fetch data ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (showLoader = false) => {
    if (document.hidden) return;
    if (showLoader) setLoading(true);
    try {
      const [procRes, statsRes] = await Promise.all([
        fetch('http://localhost:8080/api/system/folder-access'),
        fetch('http://localhost:8080/api/system/sentinel-stats')
      ]);

      let procOk = false;
      let statsOk = false;

      if (procRes.ok) {
        const procData = await procRes.json();
        const procList: ProcessInfo[] = procData.processes || [];
        setProcesses(procList);
        
        // Retain selection if process still runs
        if (selectedPid !== null) {
          const stillRunning = procList.some(p => p.pid === selectedPid);
          if (!stillRunning) setSelectedPid(null);
        }
        procOk = true;
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        // Only set stats if the response has the expected structure
        if (statsData && statsData.C && statsData.D) {
          setSentinelStats(statsData);
          statsOk = true;
        } else if (statsData && Object.keys(statsData).length === 0) {
          // Empty object fallback — don't show error, just keep null stats
          statsOk = true;
        }
      }

      if (procOk || statsOk) {
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError('Failed to query system handle logs or sentinel statistics');
      }
    } catch (err) {
      setError('Backend offline — please verify that the Java server is active');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedPid]);

  useEffect(() => {
    if (!isActive) return;

    fetchData(true);
    // Real-time polling: Check every 15 seconds (PS script is expensive)
    const id = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(id);
  }, [fetchData, isActive]);

  // ── actions ─────────────────────────────────────────────────────────────────

  const copyToClipboard = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleProcessKill = async (pid: number) => {
    if (confirm('Are you sure you want to terminate this process? Unsaved changes might be lost.')) {
      try {
        const res = await fetch('http://localhost:8080/api/emergency/killswitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'suspend',
            processes: [pid],
            reason: 'MANUAL_SENTINEL_KILL'
          })
        });
        if (res.ok) {
          setSelectedPid(null);
          fetchData(true);
        } else {
          alert('Failed to suspend process.');
        }
      } catch {
        alert('Unreachable backend.');
      }
    }
  };

  const generatePDF = async () => {
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const autoTable = autoTableModule.default;
      const doc = new jsPDF();
      
      const margin = 14;
      let currentY = 20;

      // Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(20, 20, 20);
      doc.text("AortaCore Engine", margin, currentY);
      
      currentY += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("DRIVE SENTINEL - ACTIVE DIRECTORY LOCK REPORT", margin, currentY);
      
      currentY += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, 196, currentY);
      
      // Metadata
      currentY += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Report Details", margin, currentY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      currentY += 5;
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, currentY);
      currentY += 4;
      doc.text(`Total Monitored Applications: ${processes.length}`, margin, currentY);
      currentY += 4;
      const criticalCount = processes.filter(p => p.isCritical).length;
      doc.text(`System Protected Processes: ${criticalCount}  |  User Terminable: ${processes.length - criticalCount}`, margin, currentY);

      // Drive metrics if they exist
      if (sentinelStats) {
        currentY += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text("Drive Space Milestones", margin, currentY);
        
        const driveHeaders = [['Drive', 'Current Free', 'Yesterday Free', 'Last Week Free', 'Start of Month Free']];
        const driveRows = [
          [
            'C: Drive',
            formatBytes(sentinelStats.C.today.free),
            formatBytes(sentinelStats.C.yesterday.free),
            formatBytes(sentinelStats.C.lastWeek.free),
            formatBytes(sentinelStats.C.startOfMonth.free)
          ],
          [
            'D: Drive',
            formatBytes(sentinelStats.D.today.free),
            formatBytes(sentinelStats.D.yesterday.free),
            formatBytes(sentinelStats.D.lastWeek.free),
            formatBytes(sentinelStats.D.startOfMonth.free)
          ]
        ];

        autoTable(doc, {
          startY: currentY + 4,
          head: driveHeaders,
          body: driveRows,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [50, 50, 50] }
        });
        
        currentY = (doc as any).lastAutoTable.finalY || (currentY + 20);
      }
      
      // Process Directory list
      currentY += 12;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Monitored Application Footprints", margin, currentY);
      
      const processHeaders = [['PID', 'Process Name', 'Category', 'RAM', 'Accessed Folders']];
      const sortedProcesses = [...processes].sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
      
      const processRows = sortedProcesses.map(proc => [
        proc.pid.toString(),
        proc.name,
        proc.category,
        formatBytes(proc.memoryBytes),
        proc.accessedFolders.join('\n') || 'No direct folders lock'
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: processHeaders,
        body: processRows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [20, 20, 20] },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 'auto' }
        }
      });
      
      doc.save('AortaCore-DriveSentinel-Report.pdf');
    } catch (error) {
      console.error('Failed to generate Drive Sentinel PDF report', error);
      alert('Failed to generate report.');
    }
  };

  // ── helpers ─────────────────────────────────────────────────────────────────

  const renderDiff = (current: number, milestone: number) => {
    if (!milestone || milestone === 0 || current === 0) return null;
    const diff = current - milestone; // positive = we freed up space
    if (diff === 0) return <span className="text-[9px] opacity-40 ml-1.5 font-sans font-medium">No change</span>;

    const isPositive = diff > 0;
    const formatted = formatBytes(Math.abs(diff));

    return (
      <span className={`text-[9px] font-bold font-mono ml-1.5 px-1 py-0.5 rounded ${
        isPositive 
          ? 'bg-emerald-500/10 text-emerald-600' 
          : 'bg-red-500/10 text-red-500'
      }`}>
        {isPositive ? `+${formatted} free` : `-${formatted} used`}
      </span>
    );
  };

  // ── filtering ───────────────────────────────────────────────────────────────

  const filteredProcesses = processes.filter(p => {
    const matchesCategory = p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.pid.toString().includes(searchQuery) ||
                          p.accessedFolders.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const selectedProcess = processes.find(p => p.pid === selectedPid) || null;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <header className="flex justify-between items-end pb-4 border-b border-[#141414]/10">
        <div>
          <h2 className="font-serif italic text-4xl">Drive Sentinel</h2>
          <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest mt-1">
            Storage Sentries · Real-time Directory Lock Diagnostics
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="font-mono text-[10px] opacity-40 flex items-center gap-1">
              <Clock size={10} />
              Live Syncing · {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={generatePDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#141414]/90 text-[#E4E3E0] font-mono text-[10px] font-bold uppercase tracking-wider transition shadow-sm"
            title="Export PDF Report"
          >
            <Download size={12} />
            Export PDF
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => fetchData(true)}
            className="p-2 rounded-lg bg-[#141414]/5 hover:bg-[#141414]/10 transition"
            title="Force Sync"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </motion.button>
        </div>
      </header>

      {/* Offline Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 font-mono text-xs text-red-400"
          >
            <ShieldAlert size={14} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HISTORICAL MILESTONE CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Milestone 1: Starting of Month */}
        <div className="bg-white/40 border border-white/40 shadow-sm hover:shadow-md hover:border-[#141414]/20 transition-all rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[9px] opacity-50 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={10} /> Starting of Month
            </span>
            <span className="text-[9px] bg-sky-500/10 text-sky-600 font-mono font-bold px-1.5 py-0.5 rounded">
              Monthly
            </span>
          </div>
          {sentinelStats ? (
            <div className="space-y-1.5 font-mono text-xs text-[#141414]">
              <div className="flex justify-between">
                <span>C: Drive:</span>
                <div className="flex items-center">
                  <span className="font-bold">{formatBytes(sentinelStats.C.startOfMonth.free)}</span>
                  {renderDiff(sentinelStats.C.today.free, sentinelStats.C.startOfMonth.free)}
                </div>
              </div>
              <div className="flex justify-between">
                <span>D: Drive:</span>
                <div className="flex items-center">
                  <span className="font-bold">{formatBytes(sentinelStats.D.startOfMonth.free)}</span>
                  {renderDiff(sentinelStats.D.today.free, sentinelStats.D.startOfMonth.free)}
                </div>
              </div>
            </div>
          ) : (
            <div className="font-mono text-[10px] opacity-30 py-1">Evaluating month metrics...</div>
          )}
        </div>

        {/* Milestone 2: Previous Week */}
        <div className="bg-white/40 border border-white/40 shadow-sm hover:shadow-md hover:border-[#141414]/20 transition-all rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[9px] opacity-50 uppercase tracking-wider flex items-center gap-1">
              <CalendarDays size={10} /> Previous Week
            </span>
            <span className="text-[9px] bg-amber-500/10 text-amber-600 font-mono font-bold px-1.5 py-0.5 rounded">
              7d Ago
            </span>
          </div>
          {sentinelStats ? (
            <div className="space-y-1.5 font-mono text-xs text-[#141414]">
              <div className="flex justify-between">
                <span>C: Drive:</span>
                <div className="flex items-center">
                  <span className="font-bold">{formatBytes(sentinelStats.C.lastWeek.free)}</span>
                  {renderDiff(sentinelStats.C.today.free, sentinelStats.C.lastWeek.free)}
                </div>
              </div>
              <div className="flex justify-between">
                <span>D: Drive:</span>
                <div className="flex items-center">
                  <span className="font-bold">{formatBytes(sentinelStats.D.lastWeek.free)}</span>
                  {renderDiff(sentinelStats.D.today.free, sentinelStats.D.lastWeek.free)}
                </div>
              </div>
            </div>
          ) : (
            <div className="font-mono text-[10px] opacity-30 py-1">Evaluating week metrics...</div>
          )}
        </div>

        {/* Milestone 3: Previous Day */}
        <div className="bg-white/40 border border-white/40 shadow-sm hover:shadow-md hover:border-[#141414]/20 transition-all rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[9px] opacity-50 uppercase tracking-wider flex items-center gap-1">
              <Clock size={10} /> Previous Day
            </span>
            <span className="text-[9px] bg-purple-500/10 text-purple-600 font-mono font-bold px-1.5 py-0.5 rounded">
              Yesterday
            </span>
          </div>
          {sentinelStats ? (
            <div className="space-y-1.5 font-mono text-xs text-[#141414]">
              <div className="flex justify-between">
                <span>C: Drive:</span>
                <div className="flex items-center">
                  <span className="font-bold">{formatBytes(sentinelStats.C.yesterday.free)}</span>
                  {renderDiff(sentinelStats.C.today.free, sentinelStats.C.yesterday.free)}
                </div>
              </div>
              <div className="flex justify-between">
                <span>D: Drive:</span>
                <div className="flex items-center">
                  <span className="font-bold">{formatBytes(sentinelStats.D.yesterday.free)}</span>
                  {renderDiff(sentinelStats.D.today.free, sentinelStats.D.yesterday.free)}
                </div>
              </div>
            </div>
          ) : (
            <div className="font-mono text-[10px] opacity-30 py-1">Evaluating yesterday...</div>
          )}
        </div>

        {/* Milestone 4: Current Day Status (Today) */}
        <div className="bg-[#141414] border border-[#141414] text-[#E4E3E0] shadow-md hover:shadow-lg transition-all rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
            <Sparkles size={100} />
          </div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="font-mono text-[9px] text-[#E4E3E0]/60 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={10} /> Current Status
            </span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded animate-pulse">
              Live
            </span>
          </div>
          {sentinelStats ? (
            <div className="space-y-1.5 font-mono text-xs relative z-10">
              <div className="flex justify-between">
                <span className="opacity-70">C: Drive:</span>
                <span className="font-bold text-emerald-400">{formatBytes(sentinelStats.C.today.free)} free</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">D: Drive:</span>
                <span className="font-bold text-emerald-400">{formatBytes(sentinelStats.D.today.free)} free</span>
              </div>
            </div>
          ) : (
            <div className="font-mono text-[10px] text-[#E4E3E0]/30 py-1">Fetching live space...</div>
          )}
        </div>

      </div>

      {/* Main Feature Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Master Process Directory (5 cols) */}
        <div className="lg:col-span-5 bg-white/40 border border-white/40 shadow-xl rounded-xl p-5 flex flex-col gap-4">
          
          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-[#141414]/30">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search apps, PIDs, or folder paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141414]/5 border border-[#141414]/10 rounded-lg pl-9 pr-4 py-2 font-mono text-xs focus:outline-none focus:border-[#141414]/30"
            />
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-4 gap-1 border-b border-[#141414]/10 pb-2">
            {(['Browsers', 'IDEs', 'System', 'General Apps'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSearchQuery('');
                  setSelectedPid(null);
                }}
                className={`py-2 px-1 text-[9px] font-mono uppercase tracking-wider rounded flex flex-col items-center gap-1 transition-all
                  ${activeCategory === cat 
                    ? 'bg-[#141414] text-[#E4E3E0] font-bold' 
                    : 'text-[#141414]/60 hover:bg-[#141414]/5'}`}
              >
                {CATEGORY_ICONS[cat]}
                <span className="truncate w-full text-center">{cat}</span>
              </button>
            ))}
          </div>

          {/* Process Directory List */}
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {loading && processes.length === 0 ? (
              <div className="text-center py-12 font-mono text-xs opacity-50">
                Evaluating system handles...
              </div>
            ) : filteredProcesses.length === 0 ? (
              <div className="text-center py-12 font-mono text-xs opacity-40">
                No active processes found
              </div>
            ) : (
              filteredProcesses.map(proc => {
                const procRisk = getProcessRiskInfo(proc);
                return (
                  <button
                    key={proc.pid}
                    onClick={() => setSelectedPid(proc.pid)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border font-mono text-xs flex items-center justify-between transition-all group
                      ${selectedPid === proc.pid
                        ? 'bg-[#141414]/5 border-[#141414]/30'
                        : 'border-transparent hover:bg-[#141414]/5'}`}
                  >
                    <div className="min-w-0 flex-1 pr-3 flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${procRisk.indicatorColor}`} title={procRisk.badge} />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate text-[#141414] group-hover:text-amber-600 transition-colors">
                          {proc.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] opacity-40 mt-0.5">
                          <span>PID {proc.pid}</span>
                          <span>•</span>
                          <span>{proc.accessedFolders.length} path{proc.accessedFolders.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] bg-[#141414]/5 px-2 py-0.5 rounded opacity-60">
                        {formatBytes(proc.memoryBytes)}
                      </span>
                      <ChevronRight size={12} className="opacity-30 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Process Detail & Accessed Folders (7 cols) */}
        <div className="lg:col-span-7 bg-white/40 border border-white/40 shadow-xl rounded-xl p-5 min-h-[570px] flex flex-col">
          
          <AnimatePresence mode="wait">
            {!selectedProcess ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40"
              >
                <FolderTree size={48} className="mb-4" />
                <div className="font-serif italic text-lg mb-1">Select an Application</div>
                <div className="font-mono text-[10px] max-w-xs leading-relaxed">
                  Click on any running application in the directory list to analyze the folders it is reading or writing on your C: drive.
                </div>
              </motion.div>
            ) : (() => {
              const risk = getProcessRiskInfo(selectedProcess);
              return (
                <motion.div
                  key={selectedProcess.pid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col gap-5"
                >
                  {/* Detail Header */}
                  <div className="border-b border-[#141414]/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-mono font-bold text-lg text-[#141414] truncate max-w-sm">
                        {selectedProcess.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 font-mono text-[10px]">
                        <span className="opacity-50">PID {selectedProcess.pid}</span>
                        <span className="opacity-30">|</span>
                        <span className="opacity-50">RAM: {formatBytes(selectedProcess.memoryBytes)}</span>
                        <span className="opacity-30">|</span>
                        <span className="font-semibold text-amber-600 uppercase">{selectedProcess.category}</span>
                      </div>
                    </div>

                    {/* Killswitch action button */}
                    {!selectedProcess.isCritical && (
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => handleProcessKill(selectedProcess.pid)}
                        className="bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-[0_0_12px_rgba(220,38,38,0.2)] transition"
                      >
                        <Zap size={10} /> Terminate App
                      </motion.button>
                    )}
                  </div>

                  {/* Substats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#141414]/5 rounded-xl p-4 border border-[#141414]/5 flex flex-col justify-between gap-1.5">
                      <span className="font-mono text-[9px] opacity-40 uppercase">Safety Classification</span>
                      <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded inline-block w-fit ${risk.badgeClass}`}>
                        {risk.badge}
                      </span>
                    </div>
                    <div className="bg-[#141414]/5 rounded-xl p-4 border border-[#141414]/5 flex flex-col justify-between">
                      <span className="font-mono text-[9px] opacity-40 uppercase">Potential Reclaim</span>
                      <span className="font-serif italic text-lg text-[#141414] mt-1 font-bold">
                        {risk.spaceEstimate || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Safety / Advice Message */}
                  <div className="bg-[#141414]/5 border border-[#141414]/5 rounded-xl p-4 font-mono text-[11px] text-[#141414]/75 leading-relaxed">
                    <strong>Recovery Intelligence:</strong> {risk.advice}
                  </div>

                {/* Directory List Container */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="font-mono text-[10px] opacity-50 uppercase tracking-widest">
                    Accessed Folders
                  </div>

                  {selectedProcess.accessedFolders.length === 0 ? (
                    <div className="flex-1 border border-dashed border-[#141414]/15 rounded-xl flex flex-col items-center justify-center text-center p-8 opacity-40 font-mono text-xs">
                      <HardDrive size={32} className="mb-2" />
                      No direct C: drive folders detected.<br />
                      <span className="text-[10px] opacity-70">App files may reside on other system drives.</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selectedProcess.accessedFolders.map((path, idx) => (
                        <div
                          key={idx}
                          className="group bg-[#141414]/5 border border-[#141414]/5 hover:border-[#141414]/15 rounded-lg px-3 py-2.5 flex items-center justify-between gap-4 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <span
                              className="font-mono text-[11px] select-all truncate block text-[#141414]"
                              title={path}
                            >
                              {path}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => copyToClipboard(path)}
                            className="shrink-0 p-1.5 rounded bg-white hover:bg-[#141414]/5 border border-[#141414]/10 transition relative"
                            title="Copy Path"
                          >
                            {copiedPath === path ? (
                              <Check size={12} className="text-green-600" />
                            ) : (
                              <Copy size={12} className="opacity-50 hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer notes */}
                <div className="border-t border-[#141414]/10 pt-3 font-mono text-[9px] opacity-40 leading-relaxed">
                  💡 Folders are detected dynamically using command line params, loaded DLL file regions, and user cache lookups. 
                  Protected system modules are automatically filtered out.
                </div>
              </motion.div>
            );
          })()}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
