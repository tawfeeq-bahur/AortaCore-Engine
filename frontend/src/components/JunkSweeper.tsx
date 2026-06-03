import React, { useState, useEffect } from 'react';
import { Trash2, ShieldAlert, Cpu, Eraser, FileWarning, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function JunkSweeper() {
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(100);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedPaths, setFailedPaths] = useState<string[]>([]);
  const [forceDelete, setForceDelete] = useState(false);
  const scanRunRef = React.useRef(0);
  const cancelRequestedRef = React.useRef(false);

  // Live deletion feed state
  const [deletionFeed, setDeletionFeed] = useState<{path: string; size: number; status: 'deleting' | 'deleted' | 'failed'}[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [deletedBytes, setDeletedBytes] = useState(0);
  const [totalToDelete, setTotalToDelete] = useState(0);
  const [currentBatchFile, setCurrentBatchFile] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning || isCleaning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:8080/api/scan/progress');
          if (res.ok) {
            setProgress(await res.json());
          }
        } catch (err) { }
      }, 100);
    } else {
      setProgress(null);
    }
    return () => clearInterval(interval);
  }, [isScanning, isCleaning]);

  const startScan = async () => {
    const runId = ++scanRunRef.current;
    cancelRequestedRef.current = false;
    setCancelRequested(false);
    setIsScanning(true);
    setHasScanned(true);
    setFiles([]);
    setDisplayLimit(100);
    setErrorMsg('');
    setFailedPaths([]);
    try {
      const res = await fetch('http://localhost:8080/api/junk/scan');
      const data = await res.json();
      if (runId !== scanRunRef.current || cancelRequestedRef.current) return;
      if (res.status === 409) {
        setErrorMsg(data.error || 'Scan canceled.');
        return;
      }
      if (res.ok) {
        setFiles(data.junkFiles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
      setCancelRequested(false);
    }
  };

  const requestStop = async () => {
    if (!isScanning) return;
    cancelRequestedRef.current = true;
    setCancelRequested(true);
    try {
      await fetch('http://localhost:8080/api/scan/stop', { method: 'POST' });
    } catch (err) {
      setErrorMsg('Failed to request stop.');
    }
  };

  const executeClean = async () => {
    if (files.length === 0) return;
    setIsCleaning(true);
    setErrorMsg('');
    setFailedPaths([]);
    setDeletionFeed([]);
    setDeletedCount(0);
    setDeletedBytes(0);
    setTotalToDelete(files.length);
    setCurrentBatchFile('');

    const BATCH_SIZE = 25;
    const allFiles = [...files];
    let totalDeleted = 0;
    let totalBytesFreed = 0;
    const allFailed: string[] = [];
    const allDeletedPaths = new Set<string>();

    try {
      for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batch = allFiles.slice(i, i + BATCH_SIZE);
        const batchBytes = batch.reduce((acc, f) => acc + f.size, 0);

        // Show files entering the deletion feed as "deleting"
        setCurrentBatchFile(batch[0]?.path || '');
        setDeletionFeed(prev => [
          ...batch.map(f => ({ path: f.path, size: f.size, status: 'deleting' as const })),
          ...prev,
        ].slice(0, 50));

        try {
          const res = await fetch('http://localhost:8080/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paths: batch.map(f => f.path),
              moveToTrash: !forceDelete,
              forceDelete,
              bytesRecovered: batchBytes
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const deletedSet = new Set(data.deletedPaths || []);
            const failedSet = new Set(data.failedPaths || []);

            totalDeleted += data.deletedCount || 0;
            totalBytesFreed += batch.filter(f => deletedSet.has(f.path)).reduce((a, f) => a + f.size, 0);
            data.deletedPaths?.forEach((p: string) => allDeletedPaths.add(p));
            if (data.failedPaths) allFailed.push(...data.failedPaths);

            // Update feed items to show deleted/failed status
            setDeletionFeed(prev => prev.map(item => {
              if (deletedSet.has(item.path)) return { ...item, status: 'deleted' as const };
              if (failedSet.has(item.path)) return { ...item, status: 'failed' as const };
              return item;
            }));

            setDeletedCount(totalDeleted);
            setDeletedBytes(totalBytesFreed);
          }
        } catch (err) {
          console.error('Batch delete error:', err);
        }

        // Small delay between batches for visual effect
        await new Promise(r => setTimeout(r, 80));
      }

      // Final state update
      const remaining = allFiles.filter(f => !allDeletedPaths.has(f.path));
      setFiles(remaining);

      if (totalDeleted === 0) {
        setErrorMsg('No files were deleted. Some items may be locked or require admin access.');
      }
      if (allFailed.length > 0) {
        setFailedPaths(allFailed);
        setErrorMsg(`Cleaned ${totalDeleted} files (${formatBytes(totalBytesFreed)}). ${allFailed.length} files could not be deleted.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to communicate with the cleanup engine.');
    } finally {
      setIsCleaning(false);
    }
  };

  const requestAdminRestart = async () => {
    try {
      const electron = (window as any).require ? (window as any).require('electron') : null;
      const ipc = electron?.ipcRenderer;
      if (!ipc || !ipc.invoke) {
        setErrorMsg('Admin restart is not available in this environment.');
        return;
      }
      const result = await ipc.invoke('restart-elevated');
      if (!result?.ok) {
        setErrorMsg(result?.message || 'Failed to request elevation.');
      }
    } catch (err) {
      setErrorMsg('Failed to request elevation.');
    }
  };

  const categories = files.reduce((acc: any, file: any) => {
    const cat = file.category || 'Other';
    if (!acc[cat]) acc[cat] = { count: 0, size: 0 };
    acc[cat].count++;
    acc[cat].size += file.size;
    return acc;
  }, {});

  const totalJunkSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex justify-between items-end pb-6 border-b border-[#141414]/10">
        <div>
          <h2 className="font-serif italic text-4xl">System Sweeper</h2>
          <p className="font-mono text-xs opacity-60 uppercase tracking-widest mt-2">
            OS Cache & Temporary File Cleanup
          </p>
        </div>
        <div className="text-right">
          <div className="font-serif italic text-3xl text-[#141414] flex items-center gap-2 justify-end">
            <Trash2 className={isScanning ? "animate-bounce" : ""} /> {files.length} JUNK FILES
          </div>
        </div>
      </header>

      {/* Hero Control Panel */}
      <div className={`rounded-xl p-8 text-[#E4E3E0] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center transition-all bg-[#141414]`}>
        
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E4E3E0]/20 to-transparent" />
        <div className="absolute -right-20 -top-20 opacity-5">
          <Cpu size={200} />
        </div>

        <h3 className="font-serif italic text-5xl mb-4">
          {isScanning ? "Analyzing System Core..." : 
           isCleaning ? "Erasing Digital Footprint..." :
           hasScanned && files.length === 0 ? "System is Pristine." :
           hasScanned ? `${formatBytes(totalJunkSize)} of Junk Found.` :
           "Ready for Deep Clean."}
        </h3>
        
        <p className="font-mono text-xs opacity-60 uppercase tracking-widest max-w-md mb-8">
          {hasScanned && files.length > 0 
            ? "WARNING: Massive amounts of unused cache files are degrading your disk read speeds. Execute cleanup immediately." 
            : "Scan your Windows Temp, Prefetch, and AppData cache directories for hidden performance-killing files."}
        </p>

        <div className="flex gap-4">
          <button
            onClick={startScan}
            disabled={isScanning || isCleaning}
            className="bg-white/10 hover:bg-white/20 text-[#E4E3E0] font-mono text-xs uppercase tracking-widest px-8 py-4 rounded transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isScanning ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}><Search size={16} /></motion.div> SCANNING...</>
            ) : (
              <><Search size={16} /> ANALYZE KERNEL</>
            )}
          </button>
          {isScanning && (
            <button
              onClick={requestStop}
              disabled={cancelRequested}
              className="bg-red-600 hover:bg-red-700 text-[#E4E3E0] font-mono text-xs uppercase tracking-widest px-8 py-4 rounded transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center gap-2 disabled:opacity-60"
            >
              {cancelRequested ? 'STOPPING...' : 'STOP'}
            </button>
          )}

          <AnimatePresence>
            {files.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={executeClean}
                disabled={isCleaning}
                className="bg-red-600 hover:bg-red-700 text-[#E4E3E0] font-mono text-xs uppercase tracking-widest px-12 py-4 rounded transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center gap-2"
              >
                {isCleaning ? "ERASING..." : <><Eraser size={16} /> DEEP CLEAN SYSTEM</>}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono uppercase tracking-widest text-[#E4E3E0]/70">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
              className="accent-red-500"
            />
            Force Delete (skip Recycle Bin)
          </label>
          {failedPaths.length > 0 && (
            <button
              onClick={requestAdminRestart}
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              Retry as Administrator
            </button>
          )}
        </div>
        {errorMsg && (
          <div className="mt-4 text-xs font-mono uppercase tracking-widest text-red-400">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Progress Monitor */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#141414]/5 border border-[#141414]/10 rounded-lg p-6 font-mono text-xs overflow-hidden"
          >
            <div className="flex justify-between uppercase text-[#141414] font-bold mb-3">
              <span className="flex items-center gap-2"><ShieldAlert size={14} className="animate-pulse" /> {cancelRequested ? "CANCELING SCAN" : "SCANNING DIRECTORIES"}</span>
              <span>{progress ? `${formatBytes(progress.bytesScanned)} PROCESSED` : 'WORKING...'}</span>
            </div>
            <div className="w-full h-2 bg-[#141414]/10 rounded-full overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-[#141414]" 
                animate={{ width: '100%' }} 
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
            </div>
            <div className="truncate opacity-50 text-[10px] text-[#141414]">Target: {progress?.currentFile || 'Preparing scan...'}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Deletion Feed */}
      <AnimatePresence>
        {isCleaning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border-2 border-red-500/30 bg-[#141414] text-[#E4E3E0] p-6 overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.15)]"
          >
            {/* Header Stats */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, ease: 'linear', duration: 1.5 }}
                >
                  <Eraser size={18} className="text-red-400" />
                </motion.div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-red-400 font-bold">Live Cleanup Feed</div>
                  <div className="font-mono text-[10px] opacity-40 mt-0.5">Erasing files in real-time</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif italic text-2xl text-red-400">{deletedCount}<span className="text-sm opacity-60">/{totalToDelete}</span></div>
                <div className="font-mono text-[10px] opacity-40 uppercase">{formatBytes(deletedBytes)} freed</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                animate={{ width: `${totalToDelete > 0 ? (deletedCount / totalToDelete) * 100 : 0}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              />
            </div>

            {/* Current file being processed */}
            {currentBatchFile && (
              <div className="flex items-center gap-2 mb-4 bg-white/5 rounded-lg px-3 py-2">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
                />
                <span className="font-mono text-[10px] opacity-60 truncate">Erasing: {currentBatchFile}</span>
              </div>
            )}

            {/* Rolling feed */}
            <div className="space-y-1 max-h-[200px] overflow-hidden">
              <AnimatePresence initial={false}>
                {deletionFeed.slice(0, 12).map((item, idx) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -30, height: 0 }}
                    animate={{ 
                      opacity: item.status === 'deleted' ? 0.35 : item.status === 'failed' ? 0.7 : 1, 
                      x: 0, 
                      height: 'auto'
                    }}
                    exit={{ opacity: 0, x: 30, height: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.02 }}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded font-mono text-[10px] ${
                      item.status === 'deleted' ? 'line-through bg-green-500/5' :
                      item.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-white/5'
                    }`}
                  >
                    {item.status === 'deleting' && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.8)] shrink-0"
                      />
                    )}
                    {item.status === 'deleted' && (
                      <span className="text-green-400 shrink-0">✓</span>
                    )}
                    {item.status === 'failed' && (
                      <span className="text-red-400 shrink-0">✗</span>
                    )}
                    <span className="truncate flex-1 opacity-70">{item.path.split('\\').slice(-2).join('\\')}</span>
                    <span className="opacity-40 shrink-0">{formatBytes(item.size)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Grid */}
      <AnimatePresence>
        {!isScanning && files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {Object.entries(categories).map(([cat, data]: [string, any], index) => (
              <motion.div 
                key={cat} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/40 border border-[#141414]/10 rounded-xl p-6 relative overflow-hidden group hover:border-[#c2a477] transition-colors"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#141414] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-4">
                  <div className="font-mono text-xs uppercase tracking-widest opacity-60 text-[#141414]">{cat}</div>
                  <div className="bg-[#141414]/10 text-[#141414] px-2 py-1 rounded text-[10px] font-mono font-bold">{data.count} Files</div>
                </div>
                <div className="font-serif italic text-4xl text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">{formatBytes(data.size)}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failed Deletions */}
      {failedPaths.length > 0 && (
        <div className="bg-white/40 border border-red-500/30 rounded-lg p-4 font-mono text-xs text-red-700">
          <div className="uppercase tracking-widest text-[10px] mb-2">Failed to delete ({failedPaths.length})</div>
          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {failedPaths.slice(0, 100).map((path, idx) => (
              <div key={`${path}-${idx}`} className="truncate" title={path}>{path}</div>
            ))}
          </div>
          {failedPaths.length > 100 && (
            <div className="mt-2 text-[10px] opacity-60">Showing first 100 paths.</div>
          )}
        </div>
      )}

      {/* File List Preview */}
      <AnimatePresence>
        {!isScanning && files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-8"
          >
            <div className="font-mono text-xs opacity-50 uppercase tracking-widest px-2">
              Previewing {Math.min(displayLimit, files.length)} of {files.length} Files
            </div>
            
            {files.slice(0, displayLimit).map((file, index) => (
              <div
                key={file.path + index}
                className="group bg-white/40 border border-[#141414]/10 p-3 rounded-lg flex items-center justify-between hover:bg-white/40 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded bg-[#141414]/5 text-[#141414]/50 flex items-center justify-center font-mono text-[9px] shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] opacity-70 truncate" title={file.path}>
                      {file.path}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-4">
                  <div className="bg-[#141414]/5 px-2 py-1 rounded font-mono text-[9px] uppercase opacity-60">
                    {file.category}
                  </div>
                  <div className="font-serif italic text-lg text-[#141414] min-w-[80px] text-right">
                    {formatBytes(file.size)}
                  </div>
                </div>
              </div>
            ))}

            {displayLimit < files.length && (
              <button 
                onClick={() => setDisplayLimit(prev => prev + 100)}
                className="w-full py-4 mt-4 border border-dashed border-[#141414]/10 rounded-lg text-[#141414]/50 hover:bg-[#141414]/5 hover:text-[#141414] transition-all font-mono text-xs uppercase tracking-widest"
              >
                Load 100 More
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
