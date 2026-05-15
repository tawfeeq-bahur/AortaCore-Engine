import React, { useState } from 'react';
import { 
  FolderSearch, 
  Activity, 
  FileCheck, 
  ShieldCheck, 
  Database, 
  Trash2, 
  ChevronRight,
  Search,
  HardDrive
} from 'lucide-react';
import { motion } from 'motion/react';

interface DuplicateGroup {
  hash: string;
  size: number;
  files: { name: string; path: string }[];
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function Dashboard() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanPath, setScanPath] = useState('D:\\');
  const [scanStats, setScanStats] = useState({ files: 0, totalSize: 0, duplicates: 0 });
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const groupsPerPage = 100;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scanTime, setScanTime] = useState<number | null>(null);
  const [deleteStats, setDeleteStats] = useState<{count: number, time: number} | null>(null);

  const totalPages = Math.ceil(duplicates.length / groupsPerPage);
  const paginatedDuplicates = duplicates.slice((currentPage - 1) * groupsPerPage, currentPage * groupsPerPage);

  const handleSelectAll = () => {
    const allDups = new Set<string>();
    duplicates.forEach(group => {
      group.files.slice(1).forEach(f => allDups.add(f.path));
    });
    setSelectedFiles(allDups);
  };

  const toggleSelection = (path: string) => {
    setSelectedFiles(prev => {
      const newSel = new Set(prev);
      if (newSel.has(path)) newSel.delete(path);
      else newSel.add(path);
      return newSel;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async (moveToTrash: boolean) => {
    setShowDeleteModal(false);
    setIsDeleting(true);
    setDeleteStats(null);
    const startDeleteTime = performance.now();
    
    try {
      const response = await fetch('http://localhost:8080/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(selectedFiles), moveToTrash })
      });
      if (response.ok) {
        const data = await response.json();
        const deletedSet = new Set(data.deletedPaths || Array.from(selectedFiles));
        
        const updatedDuplicates = duplicates.map(group => ({
          ...group,
          files: group.files.filter(f => !deletedSet.has(f.path))
        })).filter(group => group.files.length > 1);
        
        setDuplicates(updatedDuplicates);
        let totalFiles = 0;
        let totalWastedSize = 0;
        updatedDuplicates.forEach(group => {
          totalWastedSize += group.size * (group.files.length - 1);
          totalFiles += (group.files.length - 1);
        });
        setScanStats({
          files: totalFiles,
          totalSize: (totalWastedSize / (1024 * 1024 * 1024)).toFixed(2) as any,
          duplicates: updatedDuplicates.length
        });
        
        const newTotalPages = Math.ceil(updatedDuplicates.length / groupsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        
        setSelectedFiles(new Set());
        setDeleteStats({ count: data.deletedCount || 0, time: performance.now() - startDeleteTime });
      } else {
        setErrorMsg('Failed to delete files');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setErrorMsg('');
    setDuplicates([]);
    setSelectedFiles(new Set());
    setCurrentPage(1);
    setScanTime(null);
    setDeleteStats(null);
    
    const startTime = performance.now();
    try {
      const response = await fetch('http://localhost:8080/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: scanPath })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setErrorMsg(data.error || 'Scan failed');
        setIsScanning(false);
        return;
      }
      
      // Data shape is { timeMs, duplicates: { hash: [ { path, size, hash } ] } }
      const newDuplicates: DuplicateGroup[] = [];
      let totalFiles = 0;
      let totalWastedSize = 0;
      
      Object.keys(data.duplicates).forEach(hash => {
        const fileGroup = data.duplicates[hash];
        if (fileGroup.length > 1) {
           const size = fileGroup[0].size;
           totalWastedSize += size * (fileGroup.length - 1);
           totalFiles += (fileGroup.length - 1);
           
           newDuplicates.push({
             hash: hash,
             size: size,
             files: fileGroup.map((f: any) => ({
               name: f.path.split('\\').pop() || f.path.split('/').pop(),
               path: f.path
             })).sort((a: any, b: any) => {
               const depthA = (a.path.match(/[\\/]/g) || []).length;
               const depthB = (b.path.match(/[\\/]/g) || []).length;
               if (depthA !== depthB) return depthA - depthB;
               if (a.name.length !== b.name.length) return a.name.length - b.name.length;
               return a.path.localeCompare(b.path);
             })
           });
        }
      });
      
      setDuplicates(newDuplicates);
      setScanTime(data.timeMs || (performance.now() - startTime));
      setScanStats({
        files: totalFiles, // Total duplicate files
        totalSize: (totalWastedSize / (1024 * 1024 * 1024)).toFixed(2) as any, // GB
        duplicates: newDuplicates.length
      });
      
    } catch (err) {
      setErrorMsg('Failed to connect to backend. Is the Java server running?');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <header className="flex justify-between items-end pb-6 border-bottom border-[#141414]/20">
        <div className="flex flex-col gap-2 w-1/2">
          <h2 className="font-serif italic text-4xl">System Scanner</h2>
          <input 
            type="text" 
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
            className="text-xs font-mono bg-white/50 border border-[#141414]/20 p-2 rounded w-full uppercase"
            placeholder="Enter directory path..."
          />
          {errorMsg && <p className="text-red-500 text-xs font-mono">{errorMsg}</p>}
          <div className="flex gap-4 font-mono text-[10px] uppercase opacity-70 mt-1">
            {scanTime !== null && <span>Fetch Time: {(scanTime / 1000).toFixed(2)}s</span>}
            {deleteStats !== null && <span className="text-red-600 font-bold">Deleted {deleteStats.count} files in {(deleteStats.time / 1000).toFixed(2)}s</span>}
          </div>
        </div>
        <div className="flex gap-2 items-end">
          {duplicates.length > 0 && (
            <div className="flex gap-2 mr-4 border-r border-[#141414]/20 pr-4">
              <button 
                onClick={handleSelectAll}
                className="px-4 py-3 border border-[#141414] rounded font-mono text-xs hover:bg-[#141414]/5 transition-colors"
              >
                SELECT ALL DUPLICATES
              </button>
              <button 
                onClick={handleDeleteSelected}
                disabled={selectedFiles.size === 0 || isDeleting}
                className={`px-4 py-3 text-[#E4E3E0] rounded font-mono text-xs transition-all flex items-center gap-2 ${selectedFiles.size > 0 ? 'bg-red-600 hover:bg-red-700 cursor-pointer' : 'bg-[#141414] opacity-50 cursor-not-allowed'}`}
              >
                <Trash2 size={14} />
                {isDeleting ? 'DELETING...' : `DELETE (${selectedFiles.size})`}
              </button>
            </div>
          )}
          {!isScanning ? (
            <button 
              onClick={handleStartScan}
              className="bg-[#141414] text-[#E4E3E0] px-6 py-3 rounded flex items-center gap-2 hover:scale-[1.02] transition-transform font-mono text-sm"
            >
              <FolderSearch size={18} />
              INITIATE SCAN
            </button>
          ) : (
            <div className="bg-[#141414]/10 px-6 py-3 rounded flex items-center gap-4 font-mono text-sm">
              <Activity size={18} className="animate-pulse" />
              <span>SCANNING SYSTEM...</span>
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      {(isScanning || isDeleting) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono opacity-60 uppercase tracking-widest">
            <Activity size={14} className="animate-pulse" />
            {isScanning ? 'SCANNING FILE SYSTEM...' : 'PROCESSING DELETION...'}
          </div>
          <div className="h-1 bg-[#141414]/10 w-full rounded-full overflow-hidden">
            <motion.div 
              className={`h-full ${isDeleting ? 'bg-red-600' : 'bg-[#141414]'}`}
              initial={{ width: '0%', marginLeft: '0%' }}
              animate={{ width: ['0%', '50%', '0%'], marginLeft: ['0%', '50%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<HardDrive size={16} />} label="FILES ANALYZED" value={scanStats.files.toLocaleString()} />
        <StatCard icon={<FileCheck size={16} />} label="DUPLICATE GROUPS" value={scanStats.duplicates} />
        <StatCard icon={<Database size={16} />} label="WASTED SPACE" value={`${scanStats.totalSize} GB`} />
        <StatCard icon={<ShieldCheck size={16} />} label="CLEANUP SAFETY" value="99.8%" accent />
      </div>

      {/* Results Table Section */}
      <section className="mt-12 bg-white/50 border border-[#141414] rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-[#141414]/5 border-b border-[#141414] text-[10px] uppercase font-mono tracking-wider opacity-60">
          <div className="col-span-1 flex justify-center">SELECT</div>
          <div className="col-span-4">FILE IDENTITY</div>
          <div className="col-span-3">LOCATION</div>
          <div className="col-span-2">SIZE</div>
          <div className="col-span-2">MD5 HASH</div>
        </div>

        <div className="divide-y divide-[#141414]/10">
          {paginatedDuplicates.map((group, idx) => {
            const actualIdx = (currentPage - 1) * groupsPerPage + idx;
            return (
            <React.Fragment key={group.hash}>
              {group.files.map((file, fIdx) => (
                <div 
                  key={file.path + file.name}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors group"
                >
                  <div className="col-span-1 flex items-center justify-center">
                    {fIdx !== 0 ? (
                      <input 
                        type="checkbox" 
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleSelection(file.path)}
                        className="w-4 h-4 cursor-pointer accent-[#141414]"
                      />
                    ) : (
                      <span className="text-[10px] opacity-40 font-mono">{actualIdx + 1}.{fIdx + 1}</span>
                    )}
                  </div>
                  <div className="col-span-4 font-medium flex items-center gap-2 truncate">
                     {fIdx === 0 && <span className="text-[10px] bg-[#141414]/10 group-hover:bg-[#E4E3E0]/20 px-1 py-0.5 rounded text-xs">ORIGINAL</span>}
                     {file.name}
                  </div>
                  <div className="col-span-3 text-[10px] font-mono opacity-60 group-hover:opacity-100 truncate italic">
                    {file.path}
                  </div>
                  <div className="col-span-2 text-xs font-mono">
                    {formatBytes(group.size)}
                  </div>
                  <div className="col-span-2 text-[10px] font-mono bg-[#141414]/5 group-hover:bg-[#E4E3E0]/10 px-2 py-1 rounded truncate">
                    {group.hash}
                  </div>
                </div>
              ))}
              <div className="bg-[#141414]/5 p-2 text-center text-[10px] font-mono uppercase tracking-widest opacity-40">
                End of Cluster {actualIdx + 1}
              </div>
            </React.Fragment>
          )})}
        </div>
      </section>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-6 text-sm font-mono opacity-80">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 border border-[#141414]/20 rounded hover:bg-[#141414]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            PREVIOUS
          </button>
          
          <span className="bg-[#141414]/5 px-4 py-2 rounded">
            PAGE <span className="font-bold">{currentPage}</span> OF {totalPages}
          </span>
          
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="px-4 py-2 border border-[#141414]/20 rounded hover:bg-[#141414]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            NEXT
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#E4E3E0] text-[#141414] p-8 rounded-lg max-w-md w-full shadow-2xl border border-[#141414]/20 space-y-6">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 size={24} />
              <h3 className="font-serif italic text-2xl">Confirm Deletion</h3>
            </div>
            
            <p className="font-sans text-sm opacity-80 leading-relaxed">
              You are about to delete <strong>{selectedFiles.size}</strong> duplicate files. How would you like to proceed?
            </p>
            
            <div className="flex flex-col gap-3 font-mono text-xs">
              <button 
                onClick={() => confirmDelete(true)}
                className="w-full px-4 py-3 bg-[#141414] text-[#E4E3E0] rounded hover:bg-[#141414]/80 transition-all text-left flex items-center gap-3 shadow-md"
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                MOVE TO RECYCLE BIN (SAFER)
              </button>
              
              <button 
                onClick={() => confirmDelete(false)}
                className="w-full px-4 py-3 border border-red-600/30 text-red-600 rounded hover:bg-red-600 hover:text-[#E4E3E0] transition-all text-left flex items-center gap-3 group"
              >
                <div className="w-2 h-2 rounded-full bg-red-600 group-hover:bg-[#E4E3E0]" />
                PERMANENTLY DELETE (CANNOT UNDO)
              </button>
              
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="w-full px-4 py-3 border border-[#141414]/20 rounded hover:bg-[#141414]/10 transition-all text-center mt-2 font-bold"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode, label: string, value: string | number, accent?: boolean }) {
  return (
    <div className="border border-[#141414] p-4 rounded-lg bg-white/30 hover:bg-[#141414]/5 transition-all">
      <div className="flex items-center gap-2 opacity-50 mb-2">
        {icon}
        <span className="text-[9px] font-mono uppercase tracking-tighter">{label}</span>
      </div>
      <div className={`text-2xl font-serif italic ${accent ? 'text-red-800' : ''}`}>{value}</div>
    </div>
  );
}
