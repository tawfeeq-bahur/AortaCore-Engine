import React, { useState } from 'react';
import { 
  Code2, 
  ExternalLink, 
  Layers, 
  Terminal, 
  Box, 
  Workflow, 
  CheckCircle2,
  Copy,
  ChevronRight,
  GitBranch,
  Cpu,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';

export default function JavaLab() {
  const [activeTab, setActiveTab] = useState<'roadmap' | 'architecture' | 'code' | 'interview'>('roadmap');

  return (
    <div className="space-y-8">
      <header className="pb-6 border-bottom border-[#141414]/20">
        <h2 className="font-serif italic text-4xl">Java Engineering Lab</h2>
        <p className="text-xs font-mono opacity-50 mt-2 uppercase">Advanced System Design & Implementation Guide</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[#141414]">
        <TabItem active={activeTab === 'roadmap'} onClick={() => setActiveTab('roadmap')}>Roadmap</TabItem>
        <TabItem active={activeTab === 'architecture'} onClick={() => setActiveTab('architecture')}>Architecture</TabItem>
        <TabItem active={activeTab === 'code'} onClick={() => setActiveTab('code')}>Source Code</TabItem>
        <TabItem active={activeTab === 'interview'} onClick={() => setActiveTab('interview')}>Interview Prep</TabItem>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'roadmap' && <RoadmapContent />}
        {activeTab === 'architecture' && <ArchitectureContent />}
        {activeTab === 'code' && <CodeContent />}
        {activeTab === 'interview' && <InterviewContent />}
      </div>
    </div>
  );
}

function TabItem({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-8 py-4 text-xs font-mono uppercase tracking-widest transition-all relative
        ${active ? 'text-[#141414] font-bold' : 'text-[#141414]/40 hover:text-[#141414]'}`}
    >
      {children}
      {active && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#141414]" />}
    </button>
  );
}

function RoadmapContent() {
  const steps = [
    { title: "Core Logic", desc: "MD5 Hashing, Group by Size, Recursive Walk.", icon: <Terminal size={20} /> },
    { title: "Concurrency", desc: "ExecutorService & Thread Pools for fast I/O.", icon: <Cpu size={20} /> },
    { title: "UI System", desc: "JavaFX, Data Binding, UI Threads.", icon: <Workflow size={20} /> },
    { title: "Persistence", desc: "SQLite storage for scan history.", icon: <Database size={20} /> },
    { title: "Production", desc: "Maven, Native Packaging (jpackage).", icon: <Box size={20} /> }
  ];

  return (
    <div className="py-8 grid grid-cols-1 md:grid-cols-5 gap-8">
      {steps.map((step, idx) => (
        <div key={idx} className="space-y-4 relative">
          <div className="w-12 h-12 bg-[#141414] text-[#E4E3E0] flex items-center justify-center rounded-lg">
            {step.icon}
          </div>
          <div className="space-y-1">
            <h4 className="font-serif italic text-xl">{step.title}</h4>
            <p className="text-xs opacity-60 leading-relaxed font-sans">{step.desc}</p>
          </div>
          {idx < steps.length - 1 && (
            <div className="hidden md:block absolute top-6 -right-6 text-[#141414]/20">
              <ChevronRight size={24} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ArchitectureContent() {
  return (
    <div className="py-8 space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="font-serif italic text-2xl flex items-center gap-2">
            <Layers size={20} />
            Layered System Design
          </h3>
          <ul className="space-y-4">
            <LayerItem title="UI Layer (JavaFX)" desc="Controls, FXML, Animation controllers." />
            <LayerItem title="Service Layer" desc="Scan Coordination, Thread Management." />
            <LayerItem title="Engine Layer" desc="MD5 Hashing, File System Walking." />
            <LayerItem title="Data Layer" desc="SQLite Database, File Report PDF." />
          </ul>
        </div>
        <div className="bg-[#141414]/5 p-8 rounded-xl border border-[#141414]/10 space-y-4">
          <h4 className="font-mono text-[10px] uppercase opacity-50">Component Diagram</h4>
          <div className="aspect-video border border-[#141414]/20 rounded flex items-center justify-center font-mono text-xs text-center p-4">
            [Main App] -{'>'} [ScanService] -{'>'} [HashEngine] <br />
            | <br />
            [Database] {'<'}--- [ReportGen]
          </div>
        </div>
      </div>
    </div>
  );
}

function LayerItem({ title, desc }: { title: string, desc: string }) {
  return (
    <li className="flex gap-4 group">
      <div className="mt-1"><CheckCircle2 size={16} className="text-green-800" /></div>
      <div>
        <h5 className="font-mono text-xs font-bold uppercase tracking-wider">{title}</h5>
        <p className="text-[11px] opacity-60 font-sans">{desc}</p>
      </div>
    </li>
  );
}

function CodeContent() {
  const [activeFile, setActiveFile] = useState('ScannerService.java');
  const files = ['ScannerService.java', 'HashService.java', 'Main.java', 'pom.xml'];

  const codeSnippets: Record<string, string> = {
    'HashService.java': `package com.scandupe.service;

import java.io.*;
import java.nio.file.*;
import java.security.*;

public class HashService {
    /**
     * Calculates MD5 hash using a buffered input stream
     * for memory efficiency with large files.
     */
    public String calculateHash(Path path) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        try (InputStream is = Files.newInputStream(path);
             BufferedInputStream bis = new BufferedInputStream(is)) {
            byte[] buffer = new byte[8192];
            int nread;
            while ((nread = bis.read(buffer)) != -1) {
                md.update(buffer, 0, nread);
            }
        }
        return bytesToHex(md.digest());
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}`,
    'ScannerService.java': `package com.scandupe.service;

import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

public class ScannerService {
    private final Map<Long, List<Path>> sizeGroups = new HashMap<>();
    private final Set<String> includeExt = new HashSet<>(Arrays.asList(".jpg", ".png"));
    private final Set<String> excludeExt = new HashSet<>(Arrays.asList(".tmp", ".log"));

    public void scan(Path root) throws Exception {
        try (Stream<Path> stream = Files.walk(root)) {
            stream.filter(Files::isRegularFile)
                  .filter(this::isAllowedExtension)
                  .forEach(path -> {
                      long size = path.toFile().length();
                      sizeGroups.computeIfAbsent(size, k -> new ArrayList<>()).add(path);
                  });
        }
            
        // Filter out unique files - only hash potential duplicates
        sizeGroups.entrySet().removeIf(e -> e.getValue().size() < 2);
    }

    private boolean isAllowedExtension(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        int lastDot = name.lastIndexOf('.');
        if (lastDot == -1) return true;
        
        String ext = name.substring(lastDot);
        if (!excludeExt.isEmpty() && excludeExt.contains(ext)) return false;
        if (!includeExt.isEmpty()) return includeExt.contains(ext);
        
        return true;
    }
}`
  };

  return (
    <div className="py-8 grid grid-cols-12 gap-8">
      <div className="col-span-3 space-y-1">
        {files.map(f => (
          <button 
            key={f}
            onClick={() => setActiveFile(f)}
            className={`w-full text-left px-4 py-2 text-[10px] font-mono rounded transition-colors
              ${activeFile === f ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10 opacity-70'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="col-span-9 bg-[#141414] rounded-lg p-6 relative group">
        <button className="absolute top-4 right-4 text-[#E4E3E0]/20 hover:text-[#E4E3E0] transition-colors">
          <Copy size={16} />
        </button>
        <pre className="font-mono text-[11px] leading-relaxed text-[#E4E3E0]/90 overflow-x-auto whitespace-pre">
          {codeSnippets[activeFile] || '// Code snippet not loaded for this file yet...'}
        </pre>
      </div>
    </div>
  );
}

function InterviewContent() {
  const questions = [
    { q: "Why MD5 instead of SHA-256 for this tool?", a: "MD5 is faster for non-cryptographic use cases like file deduplication where speed is prioritized over security against collisions." },
    { q: "How do you handle memory when processing 10GB files?", a: "Using BufferedInputStream and small update buffers (8KB) ensures the whole file isn't loaded into RAM." },
    { q: "What is the Big O complexity of the scan phase?", a: "O(N) for walking N files, plus O(D * S) where D is potential duplicate count and S is average file size for hashing." }
  ];

  return (
    <div className="py-8 space-y-6">
      {questions.map((item, idx) => (
        <div key={idx} className="border border-[#141414]/20 p-6 rounded-lg bg-white/50">
          <h5 className="font-serif italic text-lg mb-2">Q: {item.q}</h5>
          <p className="text-xs font-sans opacity-70 leading-relaxed indent-4">A: {item.a}</p>
        </div>
      ))}
    </div>
  );
}
