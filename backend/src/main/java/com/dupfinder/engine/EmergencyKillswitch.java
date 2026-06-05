package com.dupfinder.engine;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * EmergencyKillswitch — reliable, no-P/Invoke implementation.
 *
 * Strategy:
 *   1. Write all PowerShell to a temp .ps1 FILE and execute with -File flag.
 *      This avoids all command-line string escaping / quoting issues.
 *   2. Use Stop-Process (built-in PS cmdlet) — no C# compilation, no DllImport.
 *   3. Also sweep temp folders for immediate disk relief.
 *
 * Safety:
 *   • Hard-blocked list of critical OS processes (never touched)
 *   • Our own JVM PID is always excluded
 */
public class EmergencyKillswitch {

    // ── state ─────────────────────────────────────────────────────────────────
    private static volatile boolean active = false;

    /** Tracks what we killed so the status endpoint can report back */
    private static final List<String> killedNames = Collections.synchronizedList(new ArrayList<>());
    private static volatile int killedCount = 0;
    private static volatile long freedBytes  = 0;

    private static final long OWN_PID = ProcessHandle.current().pid();

    // ── critical process safelist ─────────────────────────────────────────────
    private static final Set<String> CRITICAL = new HashSet<>(Arrays.asList(
        "explorer", "dwm", "svchost", "csrss", "lsass", "services",
        "winlogon", "smss", "spoolsv", "wininit", "taskhostw",
        "runtimebroker", "sihost", "searchindexer", "searchhost",
        "registry", "system", "msmpeng", "mrt", "antimalware service executable",
        "conhost", "fontdrvhost", "audiodg", "dllhost", "ctfmon",
        "shellexperiencehost", "startmenuexperiencehost", "textinputhost",
        "securityhealthservice", "securityhealthsystray", "sgrmbroker",
        "wuauclt", "trustedinstaller", "tiworker", "vssvc",
        // our own app stack
        "java", "node", "electron", "npm", "mvn"
    ));

    // ── public API ────────────────────────────────────────────────────────────

    public static boolean isActive() { return active; }

    public static Map<String, Object> getStatus() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("active",          active);
        m.put("suspendedCount",  killedCount);   // keeping key name for UI compatibility
        m.put("suspendedNames",  new ArrayList<>(killedNames));
        return m;
    }

    /**
     * ACTIVATE: kill top non-critical processes + clear temp folders.
     */
    public static Map<String, Object> activate() {
        System.out.println("🚨 [Killswitch] ACTIVATING...");

        killedNames.clear();
        killedCount = 0;
        freedBytes  = 0;

        List<String> killed   = new ArrayList<>();
        List<String> skipped  = new ArrayList<>();
        List<String> failed   = new ArrayList<>();

        // ── 1. Get top processes via PowerShell (no compilation needed) ───────
        List<int[]> targets = getTargetPids();   // [pid, memoryMB]

        for (int[] entry : targets) {
            int pid  = entry[0];
            int memMB = entry[1];
            String name = getProcName(pid);

            if (isCritical(name) || pid == (int) OWN_PID) {
                skipped.add(name);
                continue;
            }

            try {
                killProcess(pid);
                killed.add(name + " (PID " + pid + ")");
                killedNames.add(name);
                freedBytes += (long) memMB * 1024 * 1024;
                killedCount++;
                System.out.printf("  ✓ KILLED %-30s  PID=%d  mem=%dMB%n", name, pid, memMB);
            } catch (Exception e) {
                failed.add(name + " — " + e.getMessage());
            }
        }

        // ── 2. Sweep common temp folders ──────────────────────────────────────
        long tempFreed = sweepTempFolders();
        freedBytes += tempFreed;

        active = true;

        System.out.printf("[Killswitch] Done — killed=%d  tempFreed=%s%n",
                          killedCount, DriveSpaceMonitor.formatBytes(tempFreed));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status",              "ACTIVATED");
        result.put("active",              true);
        result.put("processesActedOn",    killed.size());
        result.put("processesSkipped",    skipped.size());
        result.put("processesFailed",     failed.size());
        result.put("totalSuspended",      killedCount);
        result.put("estimatedFreedBytes", freedBytes);
        result.put("estimatedFreed",      DriveSpaceMonitor.formatBytes(freedBytes));
        result.put("tempFilesFreed",      DriveSpaceMonitor.formatBytes(tempFreed));
        result.put("suspendedList",       killed);
        result.put("failedList",          failed);
        result.put("skippedList",         skipped);
        return result;
    }

    /**
     * DEACTIVATE: processes are killed (can't un-kill), just reset state.
     * Also re-check drive status so UI refreshes.
     */
    public static Map<String, Object> deactivate() {
        System.out.println("🟢 [Killswitch] DEACTIVATING state...");

        List<String> was = new ArrayList<>(killedNames);
        int wasCount     = killedCount;

        active      = false;
        killedCount = 0;
        freedBytes  = 0;
        killedNames.clear();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status",           "DEACTIVATED");
        result.put("active",           false);
        result.put("processesResumed", wasCount);   // UI compat
        result.put("resumedList",      was);
        result.put("failedList",       Collections.emptyList());
        return result;
    }

    /**
     * Terminate specific PIDs safely, filtering out critical system processes and our own JVM.
     */
    public static Map<String, Object> killSpecificPids(List<Integer> pids) {
        System.out.println("🚨 [Killswitch] Targeted custom termination requested for PIDs: " + pids);

        List<String> killed = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<String> failed = new ArrayList<>();

        for (int pid : pids) {
            String name = getProcName(pid);
            if (isCritical(name) || pid == (int) OWN_PID) {
                skipped.add(name + " (PID " + pid + ")");
                System.out.println("  ⚠ Skipped protected process: " + name + " (PID " + pid + ")");
                continue;
            }

            try {
                killProcess(pid);
                killed.add(name + " (PID " + pid + ")");
                System.out.printf("  ✓ KILLED TARGETED %-30s  PID=%d%n", name, pid);
            } catch (Exception e) {
                failed.add(name + " (PID " + pid + ") — " + e.getMessage());
                System.err.println("  ❌ Failed to kill process PID=" + pid + ": " + e.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "COMPLETED");
        result.put("killedCount", killed.size());
        result.put("killed", killed);
        result.put("skipped", skipped);
        result.put("failed", failed);
        return result;
    }

    // ── internals ─────────────────────────────────────────────────────────────

    /** Get PIDs of top memory-using processes via PowerShell, sorted desc. */
    private static List<int[]> getTargetPids() {
        List<int[]> list = new ArrayList<>();
        try {
            String script =
                "Get-Process | " +
                "Where-Object { $_.WorkingSet64 -gt 50MB } | " +
                "Sort-Object WorkingSet64 -Descending | " +
                "Select-Object -First 30 | " +
                "ForEach-Object { \"$($_.Id),$([math]::Round($_.WorkingSet64/1MB))\" }";

            String output = runPsScript(script, false);
            for (String line : output.split("[\r\n]+")) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] parts = line.split(",");
                if (parts.length >= 2) {
                    try {
                        list.add(new int[]{ Integer.parseInt(parts[0].trim()),
                                            Integer.parseInt(parts[1].trim()) });
                    } catch (NumberFormatException ignored) {}
                }
            }
        } catch (Exception e) {
            System.err.println("[Killswitch] getTargetPids error: " + e.getMessage());
        }
        return list;
    }

    private static String getProcName(int pid) {
        try {
            String out = runPsScript(
                "(Get-Process -Id " + pid + " -ErrorAction SilentlyContinue).Name", false);
            return out.trim().isEmpty() ? "pid_" + pid : out.trim().toLowerCase();
        } catch (Exception e) {
            return "pid_" + pid;
        }
    }

    /** Kill a process by PID via Stop-Process — simple, reliable, no P/Invoke. */
    private static void killProcess(int pid) throws Exception {
        String script = "Stop-Process -Id " + pid + " -Force -ErrorAction Stop";
        runPsScript(script, true);
    }

    /**
     * Delete files in common temp directories, return bytes freed.
     * Errors are silently ignored (locked files stay).
     */
    private static long sweepTempFolders() {
        String[] tempPaths = {
            System.getenv("TEMP"),
            System.getenv("TMP"),
            "C:\\Windows\\Temp",
        };

        long freed = 0;
        for (String dir : tempPaths) {
            if (dir == null || dir.isEmpty()) continue;
            Path p = Path.of(dir);
            if (!Files.exists(p)) continue;
            freed += deleteContents(p, 0);
        }
        return freed;
    }

    /** Recursively delete contents of a directory, return bytes freed. */
    private static long deleteContents(Path dir, int depth) {
        if (depth > 2) return 0;  // don't go too deep in temp
        long freed = 0;
        try {
            try (DirectoryStream<Path> ds = Files.newDirectoryStream(dir)) {
                for (Path entry : ds) {
                    try {
                        BasicFileAttributes attrs = Files.readAttributes(
                            entry, BasicFileAttributes.class,
                            java.nio.file.LinkOption.NOFOLLOW_LINKS);

                        if (attrs.isRegularFile()) {
                            long size = attrs.size();
                            Files.deleteIfExists(entry);
                            freed += size;
                        } else if (attrs.isDirectory() && depth < 2) {
                            freed += deleteContents(entry, depth + 1);
                            try { Files.deleteIfExists(entry); } catch (Exception ignored) {}
                        }
                    } catch (Exception ignored) { /* locked / access denied — skip */ }
                }
            }
        } catch (Exception ignored) {}
        return freed;
    }

    /** Check whether a process name is critical (must not be killed). */
    private static boolean isCritical(String name) {
        if (name == null || name.isEmpty()) return true;
        String lower = name.toLowerCase().replace(".exe", "");
        return CRITICAL.contains(lower)
            || lower.contains("system")
            || lower.contains("windows")
            || lower.contains("antimalware")
            || lower.contains("defender")
            || lower.contains("security");
    }

    // ── PowerShell helper ─────────────────────────────────────────────────────

    /**
     * Write 'script' to a temp .ps1 file and execute with powershell -File.
     * Using -File completely bypasses all command-line quoting / escaping issues.
     *
     * @param captureOutput if true, return stdout; if false, just run and return ""
     */
    private static String runPsScript(String script, boolean throwOnError) throws Exception {
        // Write to temp file
        File tmp = File.createTempFile("ks_", ".ps1");
        try {
            Files.writeString(tmp.toPath(), script, java.nio.charset.StandardCharsets.UTF_8);

            ProcessBuilder pb = new ProcessBuilder(
                "powershell.exe",
                "-NoProfile", "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-File", tmp.getAbsolutePath()
            );
            pb.redirectErrorStream(true);
            Process p = pb.start();

            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) {
                    sb.append(line).append('\n');
                }
            }

            int exit = p.waitFor();
            if (throwOnError && exit != 0) {
                throw new RuntimeException("PS exited " + exit + ": " + sb.toString().trim());
            }
            return sb.toString();
        } finally {
            tmp.delete();
        }
    }
}
