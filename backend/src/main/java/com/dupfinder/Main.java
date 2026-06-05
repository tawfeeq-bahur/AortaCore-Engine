package com.dupfinder;

import com.aortacore.identity.ProjectIdentity;
import com.dupfinder.engine.DuplicateDetectionEngine;
import com.dupfinder.engine.SystemFolderFilter;
import com.dupfinder.model.FileRecord;
import io.javalin.Javalin;
import io.javalin.http.Context;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        System.out.println("Starting " + ProjectIdentity.PROJECT_NAME + " API Server...");
        System.out.println("Identity signature: " + ProjectIdentity.ENGINE_SIGNATURE);
        com.dupfinder.service.DatabaseService.init();
        
        Javalin app = Javalin.create(config -> {
            config.http.maxRequestSize = 50_000_000L; // 50MB for large bulk deletes
            config.bundledPlugins.enableCors(cors -> {
                cors.addRule(it -> {
                    it.anyHost();
                });
            });
        }).start(8080);

        DuplicateDetectionEngine engine = new DuplicateDetectionEngine();

        app.get("/api/scan/progress", ctx -> {
            ctx.json(Map.of(
                "filesScanned", com.dupfinder.model.ProgressTracker.filesScanned,
                "bytesScanned", com.dupfinder.model.ProgressTracker.bytesScanned,
                "currentFile", com.dupfinder.model.ProgressTracker.currentFile,
                "phase", com.dupfinder.model.ProgressTracker.phase,
                "cancelRequested", com.dupfinder.model.ProgressTracker.cancelRequested
            ));
        });

        app.post("/api/scan/stop", ctx -> {
            com.dupfinder.model.ProgressTracker.requestCancel();
            ctx.json(Map.of("status", "cancel_requested"));
        });

        app.post("/api/scan", ctx -> {
            com.dupfinder.model.ProgressTracker.reset();
            ScanRequest req = ctx.bodyAsClass(ScanRequest.class);
            Path startPath = Paths.get(req.path);
            
            // Set default if not specified
            if (req.excludeSystemFolders == null) {
                req.excludeSystemFolders = true;
            }
            
            // C: Drive detection and warning
            if (SystemFolderFilter.isCDriveRoot(req.path)) {
                System.out.println("⚠️ WARNING: User scanning C: drive (system drive)!");
                System.out.println("   Smart Filter: " + (req.excludeSystemFolders ? "ENABLED ✓" : "DISABLED ❌"));
            }
            
            if (!java.nio.file.Files.exists(startPath)) {
                ctx.status(400).json(Map.of("error", "Directory does not exist: " + startPath));
                return;
            }
            
            long startTime = System.currentTimeMillis();
            Map<String, List<FileRecord>> duplicates = engine.findDuplicates(startPath, req.excludeSystemFolders);
            long endTime = System.currentTimeMillis();

            if (com.dupfinder.model.ProgressTracker.isCanceled()) {
                ctx.status(409).json(Map.of("error", "Scan canceled"));
                return;
            }
            
            java.util.Map<String, List<Map<String, Object>>> serializedDuplicates = new java.util.HashMap<>();
            java.util.concurrent.atomic.AtomicLong totalWastedSize = new java.util.concurrent.atomic.AtomicLong(0);
            
            duplicates.forEach((hash, list) -> {
                if (list.size() > 1) {
                    totalWastedSize.addAndGet((list.size() - 1) * list.get(0).getSize());
                }
                List<Map<String, Object>> mappedList = list.stream().map(record -> Map.<String, Object>of(
                        "path", record.getPath().toString(),
                        "size", record.getSize(),
                        "hash", record.getHash() != null ? record.getHash() : "",
                        "category", record.getCategory()
                )).toList();
                serializedDuplicates.put(hash, mappedList);
            });
            
            com.dupfinder.service.DatabaseService.saveScanRecord(
                startPath.toString(), 
                com.dupfinder.model.ProgressTracker.filesScanned, 
                serializedDuplicates.size(), 
                totalWastedSize.get()
            );
            
            // Cache scan results for PDF report generation
            com.dupfinder.service.ScanResultCache.cacheScanResult(
                startPath.toString(),
                duplicates,
                endTime - startTime,
                com.dupfinder.model.ProgressTracker.filesScanned,
                totalWastedSize.get()
            );
            
            ctx.json(Map.of(
                "timeMs", endTime - startTime,
                "duplicates", serializedDuplicates
            ));
        });

        app.post("/api/delete", ctx -> {
            DeleteRequest req = ctx.bodyAsClass(DeleteRequest.class);
            int successCount = 0;
            List<String> deletedPaths = new java.util.ArrayList<>();
            List<String> failedPaths = new java.util.ArrayList<>();
            
            for (String filePath : req.paths) {
                try {
                    Path fileToDelete = Paths.get(filePath);
                    boolean deleted = false;
                    if (req.moveToTrash && java.awt.Desktop.isDesktopSupported() && java.awt.Desktop.getDesktop().isSupported(java.awt.Desktop.Action.MOVE_TO_TRASH)) {
                        deleted = java.awt.Desktop.getDesktop().moveToTrash(fileToDelete.toFile());
                    }
                    if (!deleted && req.forceDelete) {
                        java.nio.file.Files.delete(fileToDelete);
                        deleted = true;
                    }
                    if (deleted) {
                        successCount++;
                        deletedPaths.add(filePath);
                    } else {
                        failedPaths.add(filePath);
                    }
                } catch (Exception e) {
                    System.err.println("Failed to delete " + filePath + ": " + e.getMessage());
                    failedPaths.add(filePath);
                }
            }
            
            if (successCount > 0) {
                com.dupfinder.service.DatabaseService.saveCleanupRecord(successCount, req.bytesRecovered);
            }
            
            ctx.json(Map.of(
                "deletedCount", successCount,
                "totalRequested", req.paths.size(),
                "deletedPaths", deletedPaths,
                "failedCount", failedPaths.size(),
                "failedPaths", failedPaths
            ));
        });

        app.get("/api/history/scans", ctx -> {
            ctx.json(com.dupfinder.service.DatabaseService.getScanHistory());
        });

        app.get("/api/history/cleanups", ctx -> {
            ctx.json(com.dupfinder.service.DatabaseService.getCleanupHistory());
        });
        
        com.dupfinder.service.SystemMonitorService monitorService = new com.dupfinder.service.SystemMonitorService();
        app.get("/api/system/metrics", ctx -> {
            ctx.json(monitorService.getSystemMetrics());
        });
        
        app.post("/api/schedule", ctx -> {
            ScheduleRequest req = ctx.bodyAsClass(ScheduleRequest.class);
            com.dupfinder.service.BackgroundScheduler.configureSchedule(req.mode, req.path);
            ctx.json(Map.of("status", "success", "mode", req.mode, "path", req.path));
        });

        app.get("/api/about", ctx -> {
            ctx.json(Map.of(
                "projectName", ProjectIdentity.PROJECT_NAME,
                "owner", ProjectIdentity.OWNER,
                "signature", ProjectIdentity.ENGINE_SIGNATURE,
                "groupId", ProjectIdentity.MAVEN_GROUP_ID,
                "namespace", ProjectIdentity.class.getPackageName(),
                "buildLine", ProjectIdentity.BUILD_LINE
            ));
        });
        
        com.dupfinder.engine.StorageRadarEngine radarEngine = new com.dupfinder.engine.StorageRadarEngine();
        app.post("/api/radar", ctx -> {
            ScanRequest req = ctx.bodyAsClass(ScanRequest.class);
            Path startPath = Paths.get(req.path);
            if (!java.nio.file.Files.exists(startPath)) {
                ctx.status(400).json(Map.of("error", "Directory does not exist"));
                return;
            }
            List<FileRecord> largestFiles = radarEngine.findLargestFiles(startPath, 50);

            if (com.dupfinder.model.ProgressTracker.isCanceled()) {
                ctx.status(409).json(Map.of("error", "Scan canceled"));
                return;
            }
            
            List<Map<String, Object>> mappedFiles = largestFiles.stream().map(record -> Map.<String, Object>of(
                    "path", record.getPath().toString(),
                    "size", record.getSize(),
                    "category", record.getCategory() != null ? record.getCategory() : "Other"
            )).toList();
            
            ctx.json(Map.of("largestFiles", mappedFiles));
        });
        
        com.dupfinder.engine.JunkSweeperEngine junkEngine = new com.dupfinder.engine.JunkSweeperEngine();
        app.get("/api/junk/scan", ctx -> {
            List<FileRecord> junkFiles = junkEngine.scanForJunk();
            if (com.dupfinder.model.ProgressTracker.isCanceled()) {
                ctx.status(409).json(Map.of("error", "Scan canceled"));
                return;
            }
            List<Map<String, Object>> mappedJunk = junkFiles.stream().map(record -> Map.<String, Object>of(
                "path", record.getPath().toString(),
                "size", record.getSize(),
                "category", record.getCategory()
            )).toList();
            
            ctx.json(Map.of("junkFiles", mappedJunk));
        });
        
        com.dupfinder.engine.SmartOrganizerEngine organizerEngine = new com.dupfinder.engine.SmartOrganizerEngine();
        app.post("/api/organizer/analyze", ctx -> {
            ScanRequest req = ctx.bodyAsClass(ScanRequest.class);
            Path startPath = Paths.get(req.path);
            if (!java.nio.file.Files.exists(startPath)) {
                ctx.status(400).json(Map.of("error", "Directory does not exist"));
                return;
            }
            List<com.dupfinder.engine.SmartOrganizerEngine.MoveOperation> ops = organizerEngine.analyzeDirectory(startPath);
            if (com.dupfinder.model.ProgressTracker.isCanceled()) {
                ctx.status(409).json(Map.of("error", "Scan canceled"));
                return;
            }
            ctx.json(Map.of("operations", ops));
        });

        app.post("/api/organizer/execute", ctx -> {
            ExecuteOrganizerRequest req = ctx.bodyAsClass(ExecuteOrganizerRequest.class);
            int moved = organizerEngine.executeMoves(req.operations);
            if (com.dupfinder.model.ProgressTracker.isCanceled()) {
                ctx.status(409).json(Map.of("error", "Execution canceled", "movedCount", moved));
                return;
            }
            ctx.json(Map.of("movedCount", moved));
        });

        // PDF Report Generation Endpoint
        app.get("/api/report/download", ctx -> {
            try {
                if (!com.dupfinder.service.ScanResultCache.hasCachedResults()) {
                    System.err.println("No cached scan results available for PDF generation");
                    ctx.status(400).json(Map.of("error", "No scan results available. Please run a scan first."));
                    return;
                }

                System.out.println("Generating PDF report...");
                String pdfPath = com.dupfinder.service.ReportGeneratorService.generateScanReport();
                System.out.println("PDF generated at: " + pdfPath);
                
                java.nio.file.Path filePath = java.nio.file.Paths.get(pdfPath);
                
                if (!java.nio.file.Files.exists(filePath)) {
                    System.err.println("Generated PDF file does not exist: " + pdfPath);
                    ctx.status(500).json(Map.of("error", "PDF file was not created"));
                    return;
                }

                byte[] fileBytes = java.nio.file.Files.readAllBytes(filePath);
                System.out.println("PDF file size: " + fileBytes.length + " bytes");
                
                ctx.contentType("application/pdf");
                ctx.header("Content-Disposition", "attachment; filename=\"" + filePath.getFileName() + "\"");
                ctx.result(fileBytes);
                System.out.println("PDF successfully sent to client");
            } catch (Exception e) {
                System.err.println("Error generating PDF report: " + e.getMessage());
                e.printStackTrace();
                ctx.status(500).json(Map.of("error", "Failed to generate PDF report: " + e.getMessage()));
            }
        });

        // ── Emergency Killswitch Endpoints ────────────────────────────────────

        // GET /api/system/cdrive-status — real-time C: drive health
        app.get("/api/system/cdrive-status", ctx -> {
            com.dupfinder.engine.DriveSpaceMonitor.DriveStatus s =
                com.dupfinder.engine.DriveSpaceMonitor.getCDriveStatus();
            ctx.json(Map.of(
                "totalSpace",      s.totalSpace,
                "usedSpace",       s.usedSpace,
                "freeSpace",       s.freeSpace,
                "percentUsed",     s.percentUsed,
                "percentFree",     s.percentFree,
                "alertLevel",      s.alertLevel.toString(),
                "isEmergency",     s.isEmergency,
                "formattedFree",   s.formattedFree,
                "formattedUsed",   s.formattedUsed,
                "formattedTotal",  s.formattedTotal
            ));
        });

        // GET /api/system/processes-using-cdrive — top processes by C: footprint
        app.get("/api/system/processes-using-cdrive", ctx -> {
            var processes = com.dupfinder.engine.ProcessMonitor.getProcessesUsingCDrive();
            var mapped = processes.stream().map(p -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("pid",            p.pid);
                m.put("name",           p.name);
                m.put("memoryBytes",    p.memoryBytes);
                m.put("cDriveEstimate", p.cDriveEstimate);
                m.put("isCritical",     p.isCritical);
                m.put("status",         p.status);
                return m;
            }).toList();
            ctx.json(Map.of(
                "processes",       mapped,
                "totalCount",      mapped.size()
            ));
        });

        // GET /api/system/folder-access — get running applications and C: drive folders they access
        app.get("/api/system/folder-access", ctx -> {
            try {
                var processes = com.dupfinder.engine.ProcessMonitor.getFolderAccessMap();
                var mapped = processes.stream().map(p -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("pid",             p.pid);
                    m.put("name",            p.name);
                    m.put("memoryBytes",     p.memoryBytes);
                    m.put("cDriveEstimate",  p.cDriveEstimate);
                    m.put("isCritical",      p.isCritical);
                    m.put("status",          p.status);
                    m.put("category",        p.category != null ? p.category : "General Apps");
                    m.put("accessedFolders", p.accessedFolders != null ? p.accessedFolders : List.of());
                    return m;
                }).toList();
                ctx.json(Map.of(
                    "processes",  mapped,
                    "totalCount", mapped.size()
                ));
            } catch (Exception e) {
                System.err.println("[API] /api/system/folder-access error: " + e.getMessage());
                ctx.json(Map.of("processes", List.of(), "totalCount", 0));
            }
        });

        // GET /api/system/sentinel-stats — get historical C and D drive sentinel storage statistics
        app.get("/api/system/sentinel-stats", ctx -> {
            try {
                ctx.json(com.dupfinder.service.DatabaseService.getDriveSentinelStats());
            } catch (Exception e) {
                System.err.println("[API] /api/system/sentinel-stats error: " + e.getMessage());
                ctx.json(Map.of());
            }
        });

        // POST /api/emergency/killswitch — ACTIVATE emergency mode or terminate specific processes
        app.post("/api/emergency/killswitch", ctx -> {
            try {
                String body = ctx.body();
                if (body != null && !body.trim().isEmpty() && body.contains("\"processes\"")) {
                    KillswitchRequest req = ctx.bodyAsClass(KillswitchRequest.class);
                    if (req.processes != null && !req.processes.isEmpty()) {
                        System.out.println("🚨 Custom Process Kill requested via Drive Sentinel!");
                        var result = com.dupfinder.engine.EmergencyKillswitch.killSpecificPids(req.processes);
                        ctx.json(result);
                        return;
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to parse custom killswitch request body: " + e.getMessage());
            }

            System.out.println("🚨 Emergency Killswitch ACTIVATION requested!");
            var result = com.dupfinder.engine.EmergencyKillswitch.activate();
            ctx.json(result);
        });

        // POST /api/emergency/killswitch/deactivate — DEACTIVATE & resume processes
        app.post("/api/emergency/killswitch/deactivate", ctx -> {
            System.out.println("🟢 Emergency Killswitch DEACTIVATION requested!");
            var result = com.dupfinder.engine.EmergencyKillswitch.deactivate();
            ctx.json(result);
        });

        // GET /api/emergency/status — check if killswitch is currently active
        app.get("/api/emergency/status", ctx -> {
            ctx.json(com.dupfinder.engine.EmergencyKillswitch.getStatus());
        });

        // ── Performance Booster Endpoints ────────────────────────────────────

        // GET /api/performance/startup — list all startup items
        app.get("/api/performance/startup", ctx -> {
            ctx.json(Map.of("items", com.dupfinder.service.PerformanceService.getStartupItems()));
        });

        // POST /api/performance/startup/toggle — enable/disable startup item
        app.post("/api/performance/startup/toggle", ctx -> {
            PerformanceToggleRequest req = ctx.bodyAsClass(PerformanceToggleRequest.class);
            var result = com.dupfinder.service.PerformanceService.toggleStartupItem(
                req.name, req.command, req.location, req.user, req.enable
            );
            ctx.json(result);
        });

        // POST /api/performance/ram/clean — run RAM cleaner
        app.post("/api/performance/ram/clean", ctx -> {
            var result = com.dupfinder.service.PerformanceService.cleanMemory();
            ctx.json(result);
        });

        System.out.println("Server running on http://localhost:8080");
    }

    public static class PerformanceToggleRequest {
        public String name;
        public String command;
        public String location;
        public String user;
        public boolean enable;
    }

    public static class KillswitchRequest {
        public String action;
        public List<Integer> processes;
        public String reason;
    }

    public static class ExecuteOrganizerRequest {
        public List<com.dupfinder.engine.SmartOrganizerEngine.MoveOperation> operations;
    }

    public static class ScheduleRequest {
        public String mode;
        public String path;
    }

    public static class ScanRequest {
        public String path;
        public Boolean excludeSystemFolders;
        
        public ScanRequest() {
            this.excludeSystemFolders = true;  // Default: enabled
        }
    }

    public static class DeleteRequest {
        public List<String> paths;
        public boolean moveToTrash;
        public boolean forceDelete;
        public long bytesRecovered;
    }
}
