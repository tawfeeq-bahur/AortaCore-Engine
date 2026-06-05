package com.dupfinder.engine;

import java.io.*;
import java.util.*;

/**
 * ProcessMonitor — finds Windows processes that are actively using C: drive
 * by querying open file handles via PowerShell / handle64.exe heuristics.
 */
public class ProcessMonitor {

    /** Snapshot of a single process. */
    public static class ProcessInfo {
        public int    pid;
        public String name;
        public long   memoryBytes;
        public long   cDriveEstimate;
        public boolean isCritical;
        public String status;
        public String category;
        public List<String> accessedFolders = new ArrayList<>();
    }

    private static final Set<String> CRITICAL = new HashSet<>(Arrays.asList(
        "explorer.exe", "dwm.exe", "svchost.exe", "csrss.exe",
        "lsass.exe", "services.exe", "winlogon.exe", "smss.exe",
        "spoolsv.exe", "wininit.exe", "system", "registry",
        "antimalware service executable", "msmpeng.exe",
        "taskhostw.exe", "runtimebroker.exe", "sihost.exe",
        "searchindexer.exe", "searchhost.exe"
    ));

    private static List<ProcessInfo> cachedCDriveProcesses = null;
    private static long lastCDriveProcessesUpdate = 0;

    private static List<ProcessInfo> cachedFolderAccessMap = null;
    private static long lastFolderAccessMapUpdate = 0;

    private static final long CACHE_TTL_MS = 5000;

    public static synchronized List<ProcessInfo> getProcessesUsingCDrive() {
        long now = System.currentTimeMillis();
        if (cachedCDriveProcesses != null && (now - lastCDriveProcessesUpdate < CACHE_TTL_MS)) {
            return cachedCDriveProcesses;
        }
        System.out.println("[ProcessMonitor] Querying C: drive processes (Cache miss/expired)");
        List<ProcessInfo> result = new ArrayList<>();
        try {
            String psScript =
                "Get-Process | " +
                "Select-Object -Property Name,Id," +
                "@{Name='WS';Expression={$_.WorkingSet64}} | " +
                "ConvertTo-Csv -NoTypeInformation";

            ProcessBuilder pb = new ProcessBuilder(
                "powershell.exe", "-NoProfile", "-NonInteractive",
                "-ExecutionPolicy", "Bypass", "-Command", psScript
            );
            pb.redirectErrorStream(false);
            Process ps = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(ps.getInputStream()));
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (firstLine) { firstLine = false; continue; }
                String[] parts = line.replace("\"", "").split(",", -1);
                if (parts.length < 3) continue;
                try {
                    ProcessInfo info = new ProcessInfo();
                    info.name        = parts[0].trim();
                    info.pid         = Integer.parseInt(parts[1].trim());
                    info.memoryBytes = Long.parseLong(parts[2].trim());
                    info.cDriveEstimate = info.memoryBytes;
                    info.isCritical     = isCritical(info.name);
                    info.status         = "RUNNING";
                    if (info.memoryBytes > 10 * 1024 * 1024) {
                        result.add(info);
                    }
                } catch (NumberFormatException ignored) {}
            }
            ps.waitFor();
        } catch (Exception e) {
            System.err.println("[ProcessMonitor] Error: " + e.getMessage());
        }
        result.sort(Comparator.comparingLong((ProcessInfo p) -> p.cDriveEstimate).reversed());
        cachedCDriveProcesses = result;
        lastCDriveProcessesUpdate = now;
        return result;
    }

    public static boolean isCritical(String processName) {
        if (processName == null) return true;
        String lower = processName.toLowerCase().replace(".exe", "");
        if (lower.contains("system") || lower.contains("windows") ||
            lower.contains("lsass")  || lower.contains("csrss")) {
            return true;
        }
        return CRITICAL.contains(processName.toLowerCase());
    }

    /**
     * Queries all running processes, identifies C: drive folders accessed,
     * and groups them by category (Browsers, IDEs, System, General Apps).
     *
     * Fixed bugs:
     *  1. stderr kept separate from stdout — PS warnings no longer corrupt JSON
     *  2. Jackson ACCEPT_SINGLE_VALUE_AS_ARRAY — handles PS single-item arrays
     *  3. PS script uses $ErrorActionPreference=SilentlyContinue and Generic List
     *     to always output proper JSON arrays
     */
    public static synchronized List<ProcessInfo> getFolderAccessMap() {
        long now = System.currentTimeMillis();
        if (cachedFolderAccessMap != null && (now - lastFolderAccessMapUpdate < CACHE_TTL_MS)) {
            return cachedFolderAccessMap;
        }
        System.out.println("[ProcessMonitor] Querying full folder access map (Cache miss/expired)");
        List<ProcessInfo> result = new ArrayList<>();
        try {
            // Build the PowerShell script as a single string written to a temp .ps1 file.
            // Key fixes inside the script:
            //   - $ErrorActionPreference = 'SilentlyContinue' suppresses ALL warnings to stderr
            //   - Generic List instead of $result = @() avoids array flattening issues
            //   - @($uniq) always produces a JSON array even for a single element
            String script =
                "$ErrorActionPreference = 'SilentlyContinue'\n" +
                "$WarningPreference = 'SilentlyContinue'\n" +
                "$VerbosePreference = 'SilentlyContinue'\n" +
                "$ProgressPreference = 'SilentlyContinue'\n" +
                "\n" +
                "$processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |\n" +
                "  Select-Object ProcessId, Name, ExecutablePath, CommandLine,\n" +
                "  @{Name='WS';Expression={$_.WorkingSetSize}}\n" +
                "\n" +
                "$criticalList = @('explorer.exe','dwm.exe','svchost.exe','csrss.exe',\n" +
                "  'lsass.exe','services.exe','winlogon.exe','smss.exe','spoolsv.exe',\n" +
                "  'wininit.exe','taskhostw.exe','runtimebroker.exe','sihost.exe',\n" +
                "  'searchindexer.exe','searchhost.exe','registry','system',\n" +
                "  'msmpeng.exe','antimalware service executable')\n" +
                "\n" +
                "$browserNames  = @('chrome.exe','msedge.exe','firefox.exe','brave.exe','opera.exe','vivaldi.exe','browser.exe')\n" +
                "$ideNames      = @('code.exe','idea64.exe','webstorm64.exe','eclipse.exe','devenv.exe','rider64.exe','clion64.exe','pycharm64.exe','goland64.exe')\n" +
                "\n" +
                "$output = [System.Collections.Generic.List[object]]::new()\n" +
                "\n" +
                "foreach ($proc in $processes) {\n" +
                "  if (!$proc.ProcessId) { continue }\n" +
                "  $procPid   = [int]$proc.ProcessId\n" +
                "  $procName  = if ($proc.Name) { [string]$proc.Name } else { 'unknown' }\n" +
                "  $exePath   = $proc.ExecutablePath\n" +
                "  $cmdLine   = $proc.CommandLine\n" +
                "  $ws        = if ($proc.WS) { [long]$proc.WS } else { 0L }\n" +
                "  $lowerName = $procName.ToLower()\n" +
                "\n" +
                "  # ── Determine category ────────────────────────────────────────\n" +
                "  $category = 'General Apps'\n" +
                "  if ($lowerName -in $browserNames) {\n" +
                "    $category = 'Browsers'\n" +
                "  } elseif ($lowerName -in $ideNames) {\n" +
                "    $category = 'IDEs'\n" +
                "  } elseif ($lowerName -in $criticalList -or\n" +
                "            ($exePath -and $exePath -like '*\\Windows\\System32\\*')) {\n" +
                "    $category = 'System'\n" +
                "  }\n" +
                "\n" +
                "  # ── Skip tiny general apps ────────────────────────────────────\n" +
                "  if ($category -eq 'General Apps' -and $ws -lt 10MB) { continue }\n" +
                "  # ── Skip system processes with no C: path ─────────────────────\n" +
                "  if ($category -eq 'System' -and (!$exePath -or $exePath -notlike 'C:\\*')) { continue }\n" +
                "\n" +
                "  # ── Collect accessed folders ──────────────────────────────────\n" +
                "  $folderSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)\n" +
                "\n" +
                "  if ($exePath -and $exePath -like 'C:\\*') {\n" +
                "    $d = [System.IO.Path]::GetDirectoryName($exePath)\n" +
                "    if ($d) { [void]$folderSet.Add($d) }\n" +
                "  }\n" +
                "\n" +
                "  if ($cmdLine) {\n" +
                "    $rx = [regex]::Matches($cmdLine, '(?i)C:\\\\(?:[a-zA-Z0-9_\\-. ]+\\\\)*[a-zA-Z0-9_.\\- ]*')\n" +
                "    foreach ($m in $rx) {\n" +
                "      $p2 = $m.Value.Trim()\n" +
                "      if (!$p2) { continue }\n" +
                "      try {\n" +
                "        if     ([System.IO.Directory]::Exists($p2)) { [void]$folderSet.Add($p2) }\n" +
                "        elseif ([System.IO.File]::Exists($p2))      { [void]$folderSet.Add([System.IO.Path]::GetDirectoryName($p2)) }\n" +
                "      } catch {}\n" +
                "    }\n" +
                "  }\n" +
                "\n" +
                "  # ── Browser fallback hints ────────────────────────────────────\n" +
                "  if ($folderSet.Count -eq 0 -and $category -eq 'Browsers') {\n" +
                "    $lad = [System.Environment]::GetFolderPath('LocalApplicationData')\n" +
                "    if     ($lowerName -like '*chrome*')  { [void]$folderSet.Add((Join-Path $lad 'Google\\Chrome\\User Data')) }\n" +
                "    elseif ($lowerName -like '*edge*')    { [void]$folderSet.Add((Join-Path $lad 'Microsoft\\Edge\\User Data')) }\n" +
                "    elseif ($lowerName -like '*firefox*') { [void]$folderSet.Add((Join-Path $lad 'Mozilla\\Firefox\\Profiles')) }\n" +
                "    elseif ($lowerName -like '*brave*')   { [void]$folderSet.Add((Join-Path $lad 'BraveSoftware\\Brave-Browser\\User Data')) }\n" +
                "  }\n" +
                "\n" +
                "  # @() cast forces PowerShell to ALWAYS serialize as JSON array\n" +
                "  $folders = @($folderSet)\n" +
                "\n" +
                "  $output.Add([PSCustomObject]@{\n" +
                "    pid             = $procPid\n" +
                "    name            = $procName\n" +
                "    memoryBytes     = $ws\n" +
                "    cDriveEstimate  = $ws\n" +
                "    isCritical      = ($category -eq 'System')\n" +
                "    category        = $category\n" +
                "    status          = 'RUNNING'\n" +
                "    accessedFolders = $folders\n" +
                "  })\n" +
                "}\n" +
                "\n" +
                "if ($output.Count -eq 0) {\n" +
                "  Write-Output '[]'\n" +
                "} else {\n" +
                "  $output | ConvertTo-Json -Depth 3 -Compress\n" +
                "}\n";

            String jsonOutput = runPsScript(script);
            String trimmed = (jsonOutput == null) ? "" : jsonOutput.trim();

            if (!trimmed.isEmpty() && (trimmed.startsWith("[") || trimmed.startsWith("{"))) {
                // ACCEPT_SINGLE_VALUE_AS_ARRAY: handles PS serializing single-item list as plain object
                // FAIL_ON_UNKNOWN_PROPERTIES false: tolerates any extra fields PS might emit
                com.fasterxml.jackson.databind.ObjectMapper mapper =
                    new com.fasterxml.jackson.databind.ObjectMapper()
                        .configure(com.fasterxml.jackson.databind.DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true)
                        .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

                if (trimmed.startsWith("{")) {
                    ProcessInfo single = mapper.readValue(trimmed, ProcessInfo.class);
                    result.add(single);
                } else {
                    result = mapper.readValue(trimmed,
                        new com.fasterxml.jackson.core.type.TypeReference<List<ProcessInfo>>() {});
                }
                System.out.println("[ProcessMonitor] Loaded " + result.size() + " processes from PowerShell query.");
            } else if (!trimmed.isEmpty()) {
                System.err.println("[ProcessMonitor] Unexpected output (not JSON): "
                    + trimmed.substring(0, Math.min(300, trimmed.length())));
            }

            cachedFolderAccessMap = result;
            lastFolderAccessMapUpdate = now;
        } catch (Exception e) {
            System.err.println("[ProcessMonitor] getFolderAccessMap error: " + e.getMessage());
            e.printStackTrace();
        }
        return result;
    }

    /**
     * Runs a .ps1 temp file and returns ONLY stdout.
     * stderr is drained in a background thread and printed separately —
     * this prevents PS warning messages from corrupting the JSON output.
     */
    private static String runPsScript(String script) throws Exception {
        File tmp = File.createTempFile("pm_", ".ps1");
        try {
            java.nio.file.Files.writeString(tmp.toPath(), script, java.nio.charset.StandardCharsets.UTF_8);

            ProcessBuilder pb = new ProcessBuilder(
                "powershell.exe", "-NoProfile", "-NonInteractive",
                "-ExecutionPolicy", "Bypass", "-File", tmp.getAbsolutePath()
            );
            // CRITICAL: Do NOT merge stderr into stdout — PS warnings would break JSON parsing
            pb.redirectErrorStream(false);
            Process p = pb.start();

            // Drain stderr in a daemon thread so the process never blocks
            Thread stderrDrain = new Thread(() -> {
                try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getErrorStream()))) {
                    String line;
                    while ((line = r.readLine()) != null) {
                        System.err.println("[PS stderr] " + line);
                    }
                } catch (Exception ignored) {}
            });
            stderrDrain.setDaemon(true);
            stderrDrain.start();

            // Only read stdout for JSON
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) {
                    sb.append(line).append('\n');
                }
            }
            p.waitFor();
            return sb.toString();
        } finally {
            tmp.delete();
        }
    }
}
