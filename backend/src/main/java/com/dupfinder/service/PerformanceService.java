package com.dupfinder.service;

import java.io.*;
import java.nio.file.*;
import java.util.*;

public class PerformanceService {

    public static class StartupItem {
        public String name;
        public String command;
        public String location;
        public String user;
        public boolean enabled;

        public StartupItem(String name, String command, String location, String user, boolean enabled) {
            this.name = name;
            this.command = command;
            this.location = location;
            this.user = user;
            this.enabled = enabled;
        }
    }

    public static List<StartupItem> getStartupItems() {
        List<StartupItem> items = new ArrayList<>();
        // 1. Get enabled startup items via WMI PowerShell query
        try {
            String script = "Get-CimInstance Win32_StartupCommand | " +
                            "Select-Object Name, Command, Location, User | " +
                            "ConvertTo-Json -Compress";
            String jsonOutput = runPsScript(script);
            String trimmed = (jsonOutput == null) ? "" : jsonOutput.trim();

            if (!trimmed.isEmpty() && (trimmed.startsWith("[") || trimmed.startsWith("{"))) {
                com.fasterxml.jackson.databind.ObjectMapper mapper =
                    new com.fasterxml.jackson.databind.ObjectMapper()
                        .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

                if (trimmed.startsWith("{")) {
                    Map<String, Object> single = mapper.readValue(trimmed, Map.class);
                    addWmiItem(single, items);
                } else {
                    List<Map<String, Object>> list = mapper.readValue(trimmed,
                        new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
                    for (Map<String, Object> rawItem : list) {
                        addWmiItem(rawItem, items);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[PerformanceService] Error querying startup commands: " + e.getMessage());
        }

        // 2. Query disabled startup items from SQLite database
        try {
            List<Map<String, String>> disabled = DatabaseService.getDisabledStartups();
            for (Map<String, String> dItem : disabled) {
                items.add(new StartupItem(
                    dItem.get("name"),
                    dItem.get("command"),
                    dItem.get("location"),
                    dItem.get("user"),
                    false
                ));
            }
        } catch (Exception e) {
            System.err.println("[PerformanceService] Error loading disabled startup items: " + e.getMessage());
        }

        return items;
    }

    private static void addWmiItem(Map<String, Object> rawItem, List<StartupItem> items) {
        String name = Objects.toString(rawItem.get("Name"), "").trim();
        String command = Objects.toString(rawItem.get("Command"), "").trim();
        String location = Objects.toString(rawItem.get("Location"), "").trim();
        String user = Objects.toString(rawItem.get("User"), "").trim();

        if (!name.isEmpty()) {
            items.add(new StartupItem(name, command, location, user, true));
        }
    }

    public static Map<String, Object> toggleStartupItem(String name, String command, String location, String user, boolean enable) {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            if (enable) {
                // Toggling from Disabled -> Enabled
                if (location.equalsIgnoreCase("Startup") || location.equalsIgnoreCase("Common Startup")) {
                    // It's a folder shortcut
                    String startupDir = getStartupFolderPath(location);
                    Path disabledFile = Paths.get(startupDir, name + ".lnk.disabled");
                    Path enabledFile = Paths.get(startupDir, name + ".lnk");

                    if (Files.exists(disabledFile)) {
                        Files.move(disabledFile, enabledFile, StandardCopyOption.REPLACE_EXISTING);
                        System.out.println("[PerformanceService] Renamed startup LNK file back: " + enabledFile);
                    } else {
                        // Fallback: Create LNK file if missing
                        createShortcut(enabledFile.toString(), command);
                    }
                } else {
                    // It's a Registry Run item
                    String script = String.format(
                        "New-ItemProperty -Path 'Registry::%s' -Name '%s' -Value '%s' -PropertyType String -Force -ErrorAction Stop",
                        escapeSingleQuotes(location), escapeSingleQuotes(name), escapeSingleQuotes(command)
                    );
                    runPsScript(script);
                    System.out.println("[PerformanceService] Restored registry startup item: " + name);
                }
                // Delete from SQLite
                DatabaseService.removeDisabledStartup(name);
                res.put("status", "success");
                res.put("enabled", true);
            } else {
                // Toggling from Enabled -> Disabled
                if (location.equalsIgnoreCase("Startup") || location.equalsIgnoreCase("Common Startup")) {
                    // It's a folder shortcut
                    String startupDir = getStartupFolderPath(location);
                    Path enabledFile = Paths.get(startupDir, name + ".lnk");
                    Path disabledFile = Paths.get(startupDir, name + ".lnk.disabled");

                    if (Files.exists(enabledFile)) {
                        Files.move(enabledFile, disabledFile, StandardCopyOption.REPLACE_EXISTING);
                        System.out.println("[PerformanceService] Renamed startup LNK file to disabled: " + disabledFile);
                    }
                } else {
                    // It's a Registry Run item
                    String script = String.format(
                        "Remove-ItemProperty -Path 'Registry::%s' -Name '%s' -ErrorAction Stop",
                        escapeSingleQuotes(location), escapeSingleQuotes(name)
                    );
                    runPsScript(script);
                    System.out.println("[PerformanceService] Removed registry startup item: " + name);
                }
                // Save to SQLite
                DatabaseService.addDisabledStartup(name, command, location, user);
                res.put("status", "success");
                res.put("enabled", false);
            }
        } catch (Exception e) {
            System.err.println("[PerformanceService] Toggle failed: " + e.getMessage());
            res.put("status", "failed");
            res.put("error", e.getMessage());
        }
        return res;
    }

    public static Map<String, Object> cleanMemory() {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            long ramBefore = getFreeMemoryBytes();

            String cleanerScript =
                "$code = @'\n" +
                "using System;\n" +
                "using System.Runtime.InteropServices;\n" +
                "public class MemoryCleaner {\n" +
                "    [DllImport(\"psapi.dll\")]\n" +
                "    public static extern int EmptyWorkingSet(IntPtr hwProc);\n" +
                "    public static void CleanAll() {\n" +
                "        foreach (System.Diagnostics.Process p in System.Diagnostics.Process.GetProcesses()) {\n" +
                "            try { EmptyWorkingSet(p.Handle); } catch {}\n" +
                "        }\n" +
                "    }\n" +
                "}\n" +
                "'@\n" +
                "Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue\n" +
                "[MemoryCleaner]::CleanAll()";

            runPsScript(cleanerScript);
            
            // Give system 500ms to update working sets
            Thread.sleep(500);

            long ramAfter = getFreeMemoryBytes();
            long reclaimedBytes = Math.max(0L, ramAfter - ramBefore);

            res.put("status", "success");
            res.put("ramFreedBytes", reclaimedBytes);
            res.put("formattedFreed", formatBytes(reclaimedBytes));
        } catch (Exception e) {
            System.err.println("[PerformanceService] Clean RAM failed: " + e.getMessage());
            res.put("status", "failed");
            res.put("error", e.getMessage());
        }
        return res;
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private static String getStartupFolderPath(String location) throws Exception {
        String script = location.equalsIgnoreCase("Common Startup")
            ? "[Environment]::GetFolderPath('CommonStartup')"
            : "[Environment]::GetFolderPath('Startup')";
        return runPsScript(script).trim();
    }

    private static void createShortcut(String lnkPath, String targetPath) throws Exception {
        String script = String.format(
            "$wsh = New-Object -ComObject WScript.Shell; " +
            "$lnk = $wsh.CreateShortcut('%s'); " +
            "$lnk.TargetPath = '%s'; " +
            "$lnk.Save();",
            escapeSingleQuotes(lnkPath), escapeSingleQuotes(targetPath)
        );
        runPsScript(script);
    }

    private static long getFreeMemoryBytes() {
        try {
            // WMI Memory query
            String out = runPsScript("(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory").trim();
            // FreePhysicalMemory is in Kilobytes
            return Long.parseLong(out) * 1024L;
        } catch (Exception e) {
            // JVM fallback (not system-wide, but safe)
            return Runtime.getRuntime().freeMemory();
        }
    }

    private static String escapeSingleQuotes(String str) {
        if (str == null) return "";
        return str.replace("'", "''");
    }

    private static String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        final String[] units = new String[] { "B", "KB", "MB", "GB", "TB" };
        int digitGroups = (int) (Math.log10(bytes) / Math.log10(1024));
        return new java.text.DecimalFormat("#,##0.##").format(bytes / Math.pow(1024, digitGroups)) + " " + units[digitGroups];
    }

    private static String runPsScript(String script) throws Exception {
        File tmp = File.createTempFile("ps_", ".ps1");
        try {
            Files.writeString(tmp.toPath(), script, java.nio.charset.StandardCharsets.UTF_8);

            ProcessBuilder pb = new ProcessBuilder(
                "powershell.exe", "-NoProfile", "-NonInteractive",
                "-ExecutionPolicy", "Bypass", "-File", tmp.getAbsolutePath()
            );
            pb.redirectErrorStream(false);
            Process p = pb.start();

            // Read output
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
