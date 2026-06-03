package com.dupfinder.engine;

import com.dupfinder.model.FileRecord;
import com.dupfinder.model.ProgressTracker;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;

public class JunkSweeperEngine {

    static class JunkTarget {
        Path path;
        String category;
        String filterPattern; // Regex pattern (optional)
        boolean recursive;

        JunkTarget(Path path, String category, String filterPattern, boolean recursive) {
            this.path = path;
            this.category = category;
            this.filterPattern = filterPattern;
            this.recursive = recursive;
        }
    }

    public List<FileRecord> scanForJunk() {
        ProgressTracker.reset();
        ProgressTracker.phase = "SCANNING_JUNK";
        
        List<FileRecord> junkFiles = new ArrayList<>();
        List<JunkTarget> targets = new ArrayList<>();
        
        String userHome = System.getProperty("user.home");
        String localAppData = System.getenv("LOCALAPPDATA");
        String appData = System.getenv("APPDATA");
        String temp = System.getenv("TEMP");

        // 1. User Temp Folders
        if (temp != null) {
            targets.add(new JunkTarget(Paths.get(temp), "User Temp", null, true));
        }
        if (localAppData != null) {
            Path localTemp = Paths.get(localAppData, "Temp");
            if (temp == null || !Paths.get(temp).equals(localTemp)) {
                targets.add(new JunkTarget(localTemp, "User Temp", null, true));
            }
        }

        // 2. Windows System Temp
        targets.add(new JunkTarget(Paths.get("C:\\Windows\\Temp"), "System Temp", null, true));

        // 3. Windows Update Cache
        targets.add(new JunkTarget(Paths.get("C:\\Windows\\SoftwareDistribution\\Download"), "Windows Update Cache", null, true));

        // 4. Installer Package Cache
        targets.add(new JunkTarget(Paths.get("C:\\ProgramData\\Package Cache"), "Package Cache", null, true));

        // 5. Explorer Thumbnail Cache (Non-recursive to match only db files in Explorer folder)
        if (localAppData != null) {
            targets.add(new JunkTarget(Paths.get(localAppData, "Microsoft\\Windows\\Explorer"), "Thumbnail Cache", "^thumbcache_.*\\.db$", false));
        }

        // 6. Gradle Dependency Build Caches
        if (userHome != null) {
            targets.add(new JunkTarget(Paths.get(userHome, ".gradle\\caches"), "Gradle Cache", null, true));
        }

        // 7. npm Global Package Cache
        if (localAppData != null) {
            targets.add(new JunkTarget(Paths.get(localAppData, "npm-cache"), "npm Cache", null, true));
        }
        if (appData != null) {
            targets.add(new JunkTarget(Paths.get(appData, "npm-cache"), "npm Cache", null, true));
        }

        // 8. Playwright Browser Binaries
        if (localAppData != null) {
            targets.add(new JunkTarget(Paths.get(localAppData, "ms-playwright"), "Playwright Cache", null, true));
        }

        // 9. Android SDK Temp & Download intermediates
        if (localAppData != null) {
            targets.add(new JunkTarget(Paths.get(localAppData, "Android\\Sdk\\.temp"), "Android SDK Temp", null, true));
            targets.add(new JunkTarget(Paths.get(localAppData, "Android\\Sdk\\.downloadIntermediates"), "Android SDK Temp", null, true));
        }

        // Execute scanning for each target
        for (JunkTarget target : targets) {
            if (!Files.exists(target.path)) continue;

            try {
                if (target.recursive) {
                    Files.walkFileTree(target.path, new SimpleFileVisitor<Path>() {
                        @Override
                        public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                            if (ProgressTracker.isCanceled()) {
                                return FileVisitResult.TERMINATE;
                            }
                            // Exclude critical OS directories
                            if (isSafetyExcluded(dir)) {
                                return FileVisitResult.SKIP_SUBTREE;
                            }
                            return FileVisitResult.CONTINUE;
                        }

                        @Override
                        public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                            if (ProgressTracker.isCanceled()) {
                                return FileVisitResult.TERMINATE;
                            }
                            ProgressTracker.filesScanned++;
                            ProgressTracker.bytesScanned += attrs.size();
                            ProgressTracker.currentFile = file.toString();

                            if (attrs.isRegularFile()) {
                                long size = attrs.size();
                                if (size > 0) {
                                    if (target.filterPattern == null || file.getFileName().toString().matches(target.filterPattern)) {
                                        junkFiles.add(new FileRecord(file, size, target.category));
                                    }
                                }
                            }
                            return FileVisitResult.CONTINUE;
                        }

                        @Override
                        public FileVisitResult visitFileFailed(Path file, IOException exc) {
                            if (ProgressTracker.isCanceled()) {
                                return FileVisitResult.TERMINATE;
                            }
                            return FileVisitResult.CONTINUE;
                        }
                    });
                } else {
                    // Non-recursive scan
                    try (DirectoryStream<Path> stream = Files.newDirectoryStream(target.path)) {
                        for (Path file : stream) {
                            if (ProgressTracker.isCanceled()) {
                                break;
                            }
                            try {
                                BasicFileAttributes attrs = Files.readAttributes(file, BasicFileAttributes.class);
                                if (attrs.isRegularFile()) {
                                    long size = attrs.size();
                                    if (size > 0) {
                                        if (target.filterPattern == null || file.getFileName().toString().matches(target.filterPattern)) {
                                            junkFiles.add(new FileRecord(file, size, target.category));
                                            ProgressTracker.filesScanned++;
                                            ProgressTracker.bytesScanned += size;
                                            ProgressTracker.currentFile = file.toString();
                                        }
                                    }
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }
            } catch (IOException e) {
                System.err.println("Failed to scan path: " + target.path + " - " + e.getMessage());
            }
        }
        
        ProgressTracker.phase = "COMPLETE";
        return junkFiles;
    }

    /**
     * Safety check to ensure we do not touch critical system folders or user project directories.
     */
    private boolean isSafetyExcluded(Path dir) {
        String pathStr = dir.toString().toLowerCase();
        return pathStr.contains("\\system32") 
            || pathStr.contains("\\winsxs")
            || pathStr.contains("\\program files")
            || pathStr.contains("\\documents")
            || pathStr.contains("\\desktop")
            || pathStr.endsWith("\\windows");
    }
}
