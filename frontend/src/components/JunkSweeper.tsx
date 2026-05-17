import React, { useState, useEffect } from 'react';
import { Trash2, ShieldAlert, Cpu, Eraser, FileWarning } from 'lucide-react';
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
  const [files, setFiles] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [hasScanned, setHasScanned] = useState(false);

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
    setIsScanning(true);
    setHasScanned(true);
    setFiles([]);
    try {
      const res = await fetch('http://localhost:8080/api/junk/scan');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.junkFiles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const executeClean = async () => {
    if (files.length === 0) return;
    setIsCleaning(true);
    try {
      const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
      const res = await fetch('http://localhost:8080/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paths: files.map(f => f.path),
          moveToTrash: true, // Safety first, move to recycle bin
          bytesRecovered: totalBytes
        }),
      });
      if (res.ok) {
        setFiles([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCleaning(false);
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
      <header className="flex justify-between items-end pb-6 border-b border-[#141414]/20">
        <div>
          <h2 className="font-serif italic text-4xl">System Sweeper</h2>
          <p className="font-mono text-xs opacity-60 uppercase tracking-widest mt-2">
            OS Cache & Temporary File Cleanup
          </p>
        </div>
        <div className="text-right">
          <div className="font-serif italic text-3xl text-purple-700 flex items-center gap-2 justify-end">
            <Trash2 className={isScanning ? "animate-bounce" : ""} /> {files.length} JUNK FILES
          </div>
        </div>
      </header>

      {/* Hero Control Panel */}
      <div className="bg-[#141414] rounded-xl p-8 text-[#E4E3E0] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center">
        
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" />
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
            className="bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-widest px-8 py-4 rounded transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isScanning ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}><Search size={16} /></motion.div> SCANNING...</>
            ) : (
              <><Search size={16} /> ANALYZE KERNEL</>
            )}
          </button>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={executeClean}
                disabled={isCleaning}
                className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-mono text-xs uppercase tracking-widest px-12 py-4 rounded transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2"
              >
                {isCleaning ? "ERASING..." : <><Eraser size={16} /> DEEP CLEAN SYSTEM</>}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Monitor */}
      <AnimatePresence>
        {(isScanning || isCleaning) && progress && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-purple-900/10 border border-purple-500/30 rounded-lg p-6 font-mono text-xs overflow-hidden"
          >
            <div className="flex justify-between uppercase text-purple-700 font-bold mb-3">
              <span className="flex items-center gap-2"><ShieldAlert size={14} className="animate-pulse" /> {isCleaning ? "ERASING JUNK" : "SCANNING DIRECTORIES"}</span>
              <span>{formatBytes(progress.bytesScanned)} PROCESSED</span>
            </div>
            <div className="w-full h-2 bg-[#141414]/10 rounded-full overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500" 
                animate={{ width: '100%' }} 
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
            </div>
            <div className="truncate opacity-50 text-[10px]">Target: {progress.currentFile}</div>
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
                className="bg-white/50 border border-[#141414]/20 rounded-xl p-6 relative overflow-hidden group hover:border-purple-500 transition-colors"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-4">
                  <div className="font-mono text-xs uppercase tracking-widest opacity-60">{cat}</div>
                  <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-mono font-bold">{data.count} Files</div>
                </div>
                <div className="font-serif italic text-4xl text-[#141414]">{formatBytes(data.size)}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
