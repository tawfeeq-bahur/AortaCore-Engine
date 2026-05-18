package com.dupfinder.service;

import com.dupfinder.model.FileRecord;
import java.util.*;

/**
 * Cache for the most recent scan results.
 * Used to generate PDF reports and for quick access to the last scan data.
 */
public class ScanResultCache {
    private static String lastScanPath = "";
    private static long lastScanTime = 0;
    private static int lastScanDuration = 0;
    private static Map<String, List<FileRecord>> lastScanResults = new HashMap<>();
    private static long lastScanTotalWastedSize = 0;
    private static int lastScanTotalFiles = 0;

    public static synchronized void cacheScanResult(
            String scanPath,
            Map<String, List<FileRecord>> duplicates,
            long scanDuration,
            int totalFiles,
            long totalWastedSize) {
        lastScanPath = scanPath;
        lastScanTime = System.currentTimeMillis();
        lastScanDuration = (int) scanDuration;
        lastScanResults = new HashMap<>(duplicates);
        lastScanTotalWastedSize = totalWastedSize;
        lastScanTotalFiles = totalFiles;
    }

    public static synchronized String getLastScanPath() {
        return lastScanPath;
    }

    public static synchronized long getLastScanTime() {
        return lastScanTime;
    }

    public static synchronized int getLastScanDuration() {
        return lastScanDuration;
    }

    public static synchronized Map<String, List<FileRecord>> getLastScanResults() {
        return new HashMap<>(lastScanResults);
    }

    public static synchronized long getLastScanTotalWastedSize() {
        return lastScanTotalWastedSize;
    }

    public static synchronized int getLastScanTotalFiles() {
        return lastScanTotalFiles;
    }

    public static synchronized int getDuplicateGroupCount() {
        return lastScanResults.size();
    }

    public static synchronized void clearCache() {
        lastScanPath = "";
        lastScanTime = 0;
        lastScanDuration = 0;
        lastScanResults.clear();
        lastScanTotalWastedSize = 0;
        lastScanTotalFiles = 0;
    }

    public static synchronized boolean hasCachedResults() {
        return !lastScanResults.isEmpty();
    }
}
