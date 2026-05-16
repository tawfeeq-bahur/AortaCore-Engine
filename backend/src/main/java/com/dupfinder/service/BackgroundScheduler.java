package com.dupfinder.service;

import com.dupfinder.engine.DuplicateDetectionEngine;
import com.dupfinder.model.FileRecord;
import com.dupfinder.model.ProgressTracker;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

public class BackgroundScheduler {

    private static ScheduledExecutorService scheduler;
    private static final DuplicateDetectionEngine engine = new DuplicateDetectionEngine();

    public static synchronized void configureSchedule(String mode, String targetPath) {
        // Stop any existing schedule
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }

        if (mode == null || mode.equals("disabled") || targetPath == null || targetPath.isEmpty()) {
            System.out.println("Background scheduler disabled.");
            return;
        }

        scheduler = Executors.newSingleThreadScheduledExecutor();

        Runnable scanTask = () -> {
            System.out.println("--- Executing Background Scheduled Scan on: " + targetPath + " ---");
            try {
                Path startPath = Paths.get(targetPath);
                if (!java.nio.file.Files.exists(startPath)) {
                    System.err.println("Scheduled scan failed: Path does not exist.");
                    return;
                }

                ProgressTracker.reset(); // Reset global tracker
                Map<String, List<FileRecord>> duplicates = engine.findDuplicates(startPath);
                
                AtomicLong totalWastedSize = new AtomicLong(0);
                int groups = 0;
                
                for (Map.Entry<String, List<FileRecord>> entry : duplicates.entrySet()) {
                    List<FileRecord> list = entry.getValue();
                    if (list.size() > 1) {
                        groups++;
                        totalWastedSize.addAndGet((list.size() - 1) * list.get(0).getSize());
                    }
                }
                
                if (groups > 0) {
                    DatabaseService.saveScanRecord(
                        "[AUTO] " + startPath.toString(),
                        ProgressTracker.filesScanned,
                        groups,
                        totalWastedSize.get()
                    );
                    System.out.println("Background scan complete. Found " + groups + " groups.");
                } else {
                    System.out.println("Background scan complete. No duplicates found.");
                }

            } catch (Exception e) {
                System.err.println("Background scan error: " + e.getMessage());
            }
        };

        long period = 0;
        TimeUnit unit = TimeUnit.HOURS;

        switch (mode.toLowerCase()) {
            case "startup":
                // Run once immediately, no repeat
                scheduler.schedule(scanTask, 1, TimeUnit.MINUTES);
                System.out.println("Scheduler set to Startup mode. Will run once in 1 minute.");
                return;
            case "daily":
                period = 24;
                break;
            case "weekly":
                period = 168; // 24 * 7
                break;
            default:
                System.out.println("Unknown schedule mode: " + mode);
                return;
        }

        // Schedule to run immediately, then repeat based on period
        scheduler.scheduleAtFixedRate(scanTask, 0, period, unit);
        System.out.println("Scheduler configured for mode: " + mode + " on path: " + targetPath);
    }
}
