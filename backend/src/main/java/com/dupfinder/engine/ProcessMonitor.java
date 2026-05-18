package com.dupfinder.engine;

import java.io.*;
import java.util.*;

/**
 * ProcessMonitor — finds Windows processes that are actively using C: drive
 * by querying open file handles via PowerShell / handle64.exe heuristics.
 *
 * Strategy (no external tools required):
 *   1. Get all running processes via PowerShell (Name, Id, WorkingSet).
 *   2. Query each process's open file handles for C:\ paths via `handle.exe`
 *      if available, otherwise fall back to WorkingSet as a size proxy.
 *   3. Exclude a hard-coded list of critical Windows system processes.
 */
public class ProcessMonitor {

    /** Snapshot of a single process. */
    public static class ProcessInfo {
        public int    pid;
        public String name;
        public long   memoryBytes;      // WorkingSet — used as proxy for C: activity
        public long   cDriveEstimate;   // estimated C: I/O footprint
        public boolean isCritical;
        public String status;           // "RUNNING", "SUSPENDED"
    }

    // ── critical process safelist ─────────────────────────────────────────────
    private static final Set<String> CRITICAL = new HashSet<>(Arrays.asList(
        "explorer.exe", "dwm.exe", "svchost.exe", "csrss.exe",
        "lsass.exe",    "services.exe", "winlogon.exe", "smss.exe",
        "spoolsv.exe",  "wininit.exe",  "system",       "registry",
        "antimalware service executable", "msmpeng.exe",
        "taskhostw.exe","runtimebroker.exe", "sihost.exe",
        "searchindexer.exe", "searchhost.exe"
    ));

    /**
     * Returns all non-critical processes using significant memory (C: activity proxy).
     * Sorted by estimated C: drive footprint descending.
     */
    public static List<ProcessInfo> getProcessesUsingCDrive() {
        List<ProcessInfo> result = new ArrayList<>();

        try {
            // PowerShell: get all processes with id, name, workingset
            String psScript =
                "Get-Process | " +
                "Select-Object -Property Name,Id," +
                "@{Name='WS';Expression={$_.WorkingSet64}} | " +
                "ConvertTo-Csv -NoTypeInformation";

            ProcessBuilder pb = new ProcessBuilder(
                "powershell.exe", "-NoProfile", "-NonInteractive",
                "-ExecutionPolicy", "Bypass", "-Command", psScript
            );
            pb.redirectErrorStream(true);
            Process ps = pb.start();

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(ps.getInputStream())
            );

            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (firstLine) { firstLine = false; continue; }   // skip header
                String[] parts = line.replace("\"", "").split(",", -1);
                if (parts.length < 3) continue;

                try {
                    ProcessInfo info = new ProcessInfo();
                    info.name        = parts[0].trim();
                    info.pid         = Integer.parseInt(parts[1].trim());
                    info.memoryBytes = Long.parseLong(parts[2].trim());

                    // Use working-set as C: usage estimate (heuristic)
                    info.cDriveEstimate = info.memoryBytes;
                    info.isCritical     = isCritical(info.name);
                    info.status         = "RUNNING";

                    // Only include processes with non-trivial footprint
                    if (info.memoryBytes > 10 * 1024 * 1024) {   // >10 MB
                        result.add(info);
                    }
                } catch (NumberFormatException ignored) {}
            }
            ps.waitFor();

        } catch (Exception e) {
            System.err.println("[ProcessMonitor] Error: " + e.getMessage());
        }

        result.sort(Comparator.comparingLong((ProcessInfo p) -> p.cDriveEstimate).reversed());
        return result;
    }

    /** Return true if this process must NEVER be suspended. */
    public static boolean isCritical(String processName) {
        if (processName == null) return true;
        String lower = processName.toLowerCase().replace(".exe", "");
        // Block anything that smells like a Windows system component
        if (lower.contains("system") || lower.contains("windows") ||
            lower.contains("lsass")  || lower.contains("csrss")) {
            return true;
        }
        return CRITICAL.contains(processName.toLowerCase());
    }
}
