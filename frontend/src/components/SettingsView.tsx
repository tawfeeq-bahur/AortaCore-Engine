import React from 'react';
import { Settings as SettingsIcon, Shield, Moon, Bell, Database } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="space-y-8">
      <header className="pb-6 border-bottom border-[#141414]/20">
        <h2 className="font-serif italic text-4xl">System Configuration</h2>
        <p className="text-xs font-mono opacity-50 mt-2 uppercase">Advanced Scan Tuning & Core Parameters</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <SettingSection title="Scan Engine Tuning">
            <ToggleItem label="Multithreaded Hashing" description="Parallelize MD5 calculation for multiple files." defaultOn />
            <ToggleItem label="Skip System Folders" description="Ignore /System, /Windows, /Library repositories." defaultOn />
            <ToggleItem label="Follow Symbolic Links" description="Scan linked folders (may cause infinite loops)." />
            
            <div className="p-4 bg-white/40 border border-[#141414]/10 rounded-lg space-y-3 mt-4">
               <h4 className="font-mono text-xs font-bold uppercase">File Extension Filters</h4>
               <p className="text-[10px] opacity-60 font-sans">Separate extensions with commas (e.g. .jpg, .png)</p>
               <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[9px] font-mono opacity-40 uppercase">Include Only</label>
                   <input 
                    type="text" 
                    placeholder=".exe, .dll, .pdf"
                    className="w-full bg-[#141414]/5 border border-[#141414]/20 rounded p-2 text-xs font-mono focus:outline-none focus:border-[#141414]" 
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-mono opacity-40 uppercase">Exclude Patterns</label>
                   <input 
                    type="text" 
                    placeholder=".tmp, .log, .bak"
                    className="w-full bg-[#141414]/5 border border-[#141414]/20 rounded p-2 text-xs font-mono focus:outline-none focus:border-[#141414]" 
                   />
                 </div>
               </div>
            </div>
          </SettingSection>

          <SettingSection title="Persistence & Database">
            <ToggleItem label="Store Scan History" description="Keep logs in local SQLite db for 30 days." defaultOn />
            <ToggleItem label="Auto-Cleanup Logs" description="Remove scan results after 7 days." />
          </SettingSection>
        </div>

        <div className="space-y-6">
          <SettingSection title="Appearance">
            <ToggleItem label="High Contrast Mode" description="Optimized for technical accessibility." />
            <ToggleItem label="Monospace UI" description="Force terminal aesthetic globally." defaultOn />
          </SettingSection>

          <div className="bg-[#141414] text-[#E4E3E0] p-6 rounded-xl flex items-center justify-between">
            <div>
              <h4 className="font-serif italic text-xl">Cloud Sync</h4>
              <p className="text-[10px] opacity-60">Backup reports to AI Studio Drive</p>
            </div>
            <button className="px-4 py-2 border border-[#E4E3E0]/30 rounded text-[10px] hover:bg-[#E4E3E0]/10 transition-colors">CONNECT</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToggleItem({ label, description, defaultOn }: { label: string, description: string, defaultOn?: boolean }) {
  const [on, setOn] = React.useState(defaultOn || false);
  return (
    <div className="flex items-center justify-between p-4 bg-white/40 border border-[#141414]/10 rounded-lg hover:border-[#141414]/30 transition-all cursor-pointer group" onClick={() => setOn(!on)}>
      <div className="space-y-1">
        <h4 className="font-mono text-xs font-bold uppercase">{label}</h4>
        <p className="text-[10px] opacity-60 font-sans">{description}</p>
      </div>
      <div className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${on ? 'bg-green-800' : 'bg-[#141414]/20'}`}>
        <div className={`w-3 h-3 rounded-full bg-white transition-all ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
