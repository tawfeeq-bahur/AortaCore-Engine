package com.dupfinder.engine;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Smart filter to identify system folders that are dangerous to delete from.
 * Helps prevent accidental deletion of critical OS and system files.
 */
public class SystemFolderFilter {
    
    private static final Set<String> SYSTEM_FOLDERS = new HashSet<>(Arrays.asList(
        "Windows", "System32", "SysWOW64", "ProgramData", 
        "Program Files", "Program Files (x86)", "AppData",
        "System Volume Information", "$RECYCLE.BIN", "Recovery",
        "Drivers", "Config", "Boot", "Dell", "Intel", "NVIDIA", "AMD",
        "msocache", "installer"
    ));
    
    /**
     * Check if path contains any system folders
     */
    public static boolean containsSystemFolder(String pathStr) {
        String upper = pathStr.toUpperCase();
        return SYSTEM_FOLDERS.stream()
            .anyMatch(sys -> upper.contains("\\" + sys.toUpperCase() + "\\") 
                          || upper.contains("/" + sys.toUpperCase() + "/"));
    }
    
    /**
     * Check if it's C: drive root
     */
    public static boolean isCDriveRoot(String pathStr) {
        String clean = pathStr.trim().toUpperCase();
        return clean.equals("C:\\") || clean.equals("C:") || clean.equals("C");
    }
    
    /**
     * Get risk score for a file (0-100, higher = more dangerous)
     */
    public static int getRiskScore(String pathStr) {
        String upper = pathStr.toUpperCase();
        
        if (upper.contains("WINDOWS")) return 100;
        if (upper.contains("SYSTEM32")) return 100;
        if (upper.contains("PROGRAM FILES")) return 95;
        if (upper.contains("PROGRAMDATA")) return 90;
        if (upper.contains("APPDATA\\") && upper.contains("LOCAL\\")) return 75;
        if (upper.contains("CACHE")) return 20;
        if (upper.contains("TEMP")) return 25;
        
        return 50; // Default medium risk
    }
}
