package com.dupfinder.service;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

public class DatabaseService {

    private static final String DB_URL;

    static {
        // Use a fixed absolute path so the DB is always found regardless of CWD
        String appData = System.getenv("APPDATA");
        if (appData == null || appData.isBlank()) {
            appData = System.getProperty("user.home");
        }
        File dbDir = new File(appData, "AortaCore");
        dbDir.mkdirs();
        DB_URL = "jdbc:sqlite:" + new File(dbDir, "scandupe.db").getAbsolutePath();
        System.out.println("[DB] Using database at: " + DB_URL);
    }

    public static void init() {
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement()) {
            
            // Create scan_history table
            String createScanHistory = "CREATE TABLE IF NOT EXISTS scan_history (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "scan_date DATETIME DEFAULT CURRENT_TIMESTAMP, " +
                    "path_scanned TEXT, " +
                    "files_analyzed INTEGER, " +
                    "duplicate_groups INTEGER, " +
                    "wasted_bytes BIGINT" +
                    ")";
            stmt.execute(createScanHistory);

            // Create cleanup_history table
            String createCleanupHistory = "CREATE TABLE IF NOT EXISTS cleanup_history (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "cleanup_date DATETIME DEFAULT CURRENT_TIMESTAMP, " +
                    "files_deleted INTEGER, " +
                    "bytes_recovered BIGINT" +
                    ")";
            stmt.execute(createCleanupHistory);

            // Create drive_history table
            String createDriveHistory = "CREATE TABLE IF NOT EXISTS drive_history (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "record_date TEXT, " +
                    "drive_letter TEXT, " +
                    "total_space BIGINT, " +
                    "free_space BIGINT, " +
                    "used_space BIGINT, " +
                    "UNIQUE(record_date, drive_letter)" +
                    ")";
            stmt.execute(createDriveHistory);

            // Create disabled_startup table
            String createDisabledStartup = "CREATE TABLE IF NOT EXISTS disabled_startup (" +
                    "name TEXT PRIMARY KEY, " +
                    "command TEXT, " +
                    "location TEXT, " +
                    "user TEXT" +
                    ")";
            stmt.execute(createDisabledStartup);

            // Check if drive_history is empty
            String countSql = "SELECT COUNT(*) FROM drive_history";
            try (ResultSet rs = stmt.executeQuery(countSql)) {
                if (rs.next() && rs.getInt(1) == 0) {
                    System.out.println("Seeding drive_history table with mock historical data...");
                    seedDriveHistory(conn);
                }
            }
            
            System.out.println("Database initialized successfully.");

        } catch (Exception e) {
            System.err.println("Database initialization failed: " + e.getMessage());
        }
    }

    public static void saveScanRecord(String path, int filesAnalyzed, int duplicateGroups, long wastedBytes) {
        String sql = "INSERT INTO scan_history (path_scanned, files_analyzed, duplicate_groups, wasted_bytes) VALUES (?, ?, ?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, path);
            pstmt.setInt(2, filesAnalyzed);
            pstmt.setInt(3, duplicateGroups);
            pstmt.setLong(4, wastedBytes);
            pstmt.executeUpdate();
        } catch (Exception e) {
            System.err.println("Failed to save scan record: " + e.getMessage());
        }
    }

    public static void saveCleanupRecord(int filesDeleted, long bytesRecovered) {
        String sql = "INSERT INTO cleanup_history (files_deleted, bytes_recovered) VALUES (?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, filesDeleted);
            pstmt.setLong(2, bytesRecovered);
            pstmt.executeUpdate();
        } catch (Exception e) {
            System.err.println("Failed to save cleanup record: " + e.getMessage());
        }
    }

    public static List<Map<String, Object>> getScanHistory() {
        List<Map<String, Object>> history = new ArrayList<>();
        String sql = "SELECT * FROM scan_history ORDER BY scan_date DESC";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                Map<String, Object> record = new HashMap<>();
                record.put("id", rs.getInt("id"));
                record.put("date", rs.getString("scan_date"));
                record.put("path", rs.getString("path_scanned"));
                record.put("filesAnalyzed", rs.getInt("files_analyzed"));
                record.put("duplicateGroups", rs.getInt("duplicate_groups"));
                record.put("wastedBytes", rs.getLong("wasted_bytes"));
                history.add(record);
            }
        } catch (Exception e) {
            System.err.println("Failed to get scan history: " + e.getMessage());
        }
        return history;
    }

    public static List<Map<String, Object>> getCleanupHistory() {
        List<Map<String, Object>> history = new ArrayList<>();
        String sql = "SELECT * FROM cleanup_history ORDER BY cleanup_date DESC";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                Map<String, Object> record = new HashMap<>();
                record.put("id", rs.getInt("id"));
                record.put("date", rs.getString("cleanup_date"));
                record.put("filesDeleted", rs.getInt("files_deleted"));
                record.put("bytesRecovered", rs.getLong("bytes_recovered"));
                history.add(record);
            }
        } catch (Exception e) {
            System.err.println("Failed to get cleanup history: " + e.getMessage());
        }
        return history;
    }

    public static void recordDriveSpace(String driveLetter, long total, long free, long used) {
        String sql = "INSERT OR REPLACE INTO drive_history (record_date, drive_letter, total_space, free_space, used_space) " +
                     "VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, LocalDate.now().toString());
            pstmt.setString(2, driveLetter);
            pstmt.setLong(3, total);
            pstmt.setLong(4, free);
            pstmt.setLong(5, used);
            pstmt.executeUpdate();
        } catch (Exception e) {
            System.err.println("Failed to record drive space: " + e.getMessage());
        }
    }

    public static Map<String, Object> getDriveSentinelStats() {
        Map<String, Object> stats = new HashMap<>();

        // ── Capture live drive snapshots right now ────────────────────────────
        File cDrive = new File("C:\\");
        long cTotal = 0, cFree = 0, cUsed = 0;
        if (cDrive.exists()) {
            cTotal = cDrive.getTotalSpace();
            cFree  = cDrive.getUsableSpace();
            cUsed  = cTotal - cDrive.getFreeSpace();
            recordDriveSpace("C", cTotal, cFree, cUsed);
        }

        File dDrive = new File("D:\\");
        long dTotal = 500L * 1024 * 1024 * 1024;
        long dFree  = 200L * 1024 * 1024 * 1024;
        long dUsed  = 300L * 1024 * 1024 * 1024;
        if (dDrive.exists()) {
            dTotal = dDrive.getTotalSpace();
            dFree  = dDrive.getUsableSpace();
            dUsed  = dTotal - dDrive.getFreeSpace();
            recordDriveSpace("D", dTotal, dFree, dUsed);
        } else {
            recordDriveSpace("D", dTotal, dFree, dUsed);
        }

        LocalDate todayVal = LocalDate.now();
        String todayStr        = todayVal.toString();
        String yesterdayStr    = todayVal.minusDays(1).toString();
        String lastWeekStr     = todayVal.minusDays(7).toString();
        String startOfMonthStr = todayVal.withDayOfMonth(1).toString();

        // ── Build live "today" maps directly (no DB required) ─────────────────
        Map<String, Object> cToday = new HashMap<>();
        cToday.put("total", cTotal); cToday.put("free", cFree); cToday.put("used", cUsed);

        Map<String, Object> dToday = new HashMap<>();
        dToday.put("total", dTotal); dToday.put("free", dFree); dToday.put("used", dUsed);

        // ── Query historical milestones from DB (with live fallback) ───────────
        Map<String, Object> cStats = new HashMap<>();
        cStats.put("today",        cToday);
        cStats.put("yesterday",    getSpaceForDateOrFallback("C", yesterdayStr,    cToday));
        cStats.put("lastWeek",     getSpaceForDateOrFallback("C", lastWeekStr,     cToday));
        cStats.put("startOfMonth", getSpaceForDateOrFallback("C", startOfMonthStr, cToday));

        Map<String, Object> dStats = new HashMap<>();
        dStats.put("today",        dToday);
        dStats.put("yesterday",    getSpaceForDateOrFallback("D", yesterdayStr,    dToday));
        dStats.put("lastWeek",     getSpaceForDateOrFallback("D", lastWeekStr,     dToday));
        dStats.put("startOfMonth", getSpaceForDateOrFallback("D", startOfMonthStr, dToday));

        stats.put("C", cStats);
        stats.put("D", dStats);
        return stats;
    }

    /** Returns DB data for the given date, or the provided fallback map if none found. */
    private static Map<String, Object> getSpaceForDateOrFallback(String drive, String dateStr, Map<String, Object> fallback) {
        Map<String, Object> result = getSpaceForDate(drive, dateStr);
        // getSpaceForDate returns {total:0, free:0, used:0} when nothing found
        if (result.getOrDefault("total", 0L).equals(0L)) {
            return fallback;
        }
        return result;
    }

    private static Map<String, Object> getSpaceForDate(String driveLetter, String dateStr) {
        Map<String, Object> data = new HashMap<>();
        String sql = "SELECT total_space, free_space, used_space FROM drive_history " +
                     "WHERE drive_letter = ? AND record_date = ? " +
                     "LIMIT 1";
        
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, driveLetter);
            pstmt.setString(2, dateStr);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    data.put("total", rs.getLong("total_space"));
                    data.put("free", rs.getLong("free_space"));
                    data.put("used", rs.getLong("used_space"));
                    return data;
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to get space for date: " + e.getMessage());
        }
        
        // Fallback
        String fallbackSql = "SELECT total_space, free_space, used_space FROM drive_history " +
                             "WHERE drive_letter = ? AND record_date <= ? " +
                             "ORDER BY record_date DESC LIMIT 1";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(fallbackSql)) {
            pstmt.setString(1, driveLetter);
            pstmt.setString(2, dateStr);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    data.put("total", rs.getLong("total_space"));
                    data.put("free", rs.getLong("free_space"));
                    data.put("used", rs.getLong("used_space"));
                    return data;
                }
            }
        } catch (Exception ignored) {}
        
        data.put("total", 0L);
        data.put("free", 0L);
        data.put("used", 0L);
        return data;
    }

    private static void seedDriveHistory(Connection conn) {
        File cDrive = new File("C:\\");
        long cTotal = cDrive.exists() ? cDrive.getTotalSpace() : 250L * 1024 * 1024 * 1024;
        long cFree = cDrive.exists() ? cDrive.getUsableSpace() : 50L * 1024 * 1024 * 1024;
        
        File dDrive = new File("D:\\");
        long dTotal = dDrive.exists() ? dDrive.getTotalSpace() : 500L * 1024 * 1024 * 1024;
        long dFree = dDrive.exists() ? dDrive.getUsableSpace() : 200L * 1024 * 1024 * 1024;

        String sql = "INSERT INTO drive_history (record_date, drive_letter, total_space, free_space, used_space) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            Random rand = new Random();
            LocalDate todayVal = LocalDate.now();
            for (int i = 35; i >= 0; i--) {
                String dateStr = todayVal.minusDays(i).toString();
                
                double cNoise = 0.95 + (rand.nextDouble() * 0.1) - (i * 0.001);
                long tempCFree = (long) (cFree * cNoise);
                if (tempCFree > cTotal) tempCFree = cFree;
                long tempCUsed = cTotal - tempCFree;
                
                pstmt.setString(1, dateStr);
                pstmt.setString(2, "C");
                pstmt.setLong(3, cTotal);
                pstmt.setLong(4, tempCFree);
                pstmt.setLong(5, tempCUsed);
                pstmt.addBatch();

                double dNoise = 0.98 + (rand.nextDouble() * 0.04) - (i * 0.0005);
                long tempDFree = (long) (dFree * dNoise);
                if (tempDFree > dTotal) tempDFree = dFree;
                long tempDUsed = dTotal - tempDFree;

                pstmt.setString(1, dateStr);
                pstmt.setString(2, "D");
                pstmt.setLong(3, dTotal);
                pstmt.setLong(4, tempDFree);
                pstmt.setLong(5, tempDUsed);
                pstmt.addBatch();
            }
            pstmt.executeBatch();
            System.out.println("Mock historical data seeded successfully.");
        } catch (Exception e) {
            System.err.println("Failed to seed drive history: " + e.getMessage());
        }
    }

    public static void addDisabledStartup(String name, String command, String location, String user) {
        String sql = "INSERT OR REPLACE INTO disabled_startup (name, command, location, user) VALUES (?, ?, ?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, name);
            pstmt.setString(2, command);
            pstmt.setString(3, location);
            pstmt.setString(4, user);
            pstmt.executeUpdate();
        } catch (Exception e) {
            System.err.println("Failed to save disabled startup: " + e.getMessage());
        }
    }

    public static void removeDisabledStartup(String name) {
        String sql = "DELETE FROM disabled_startup WHERE name = ?";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, name);
            pstmt.executeUpdate();
        } catch (Exception e) {
            System.err.println("Failed to delete disabled startup: " + e.getMessage());
        }
    }

    public static List<Map<String, String>> getDisabledStartups() {
        List<Map<String, String>> list = new ArrayList<>();
        String sql = "SELECT * FROM disabled_startup";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, String> m = new HashMap<>();
                m.put("name", rs.getString("name"));
                m.put("command", rs.getString("command"));
                m.put("location", rs.getString("location"));
                m.put("user", rs.getString("user"));
                list.add(m);
            }
        } catch (Exception e) {
            System.err.println("Failed to query disabled startups: " + e.getMessage());
        }
        return list;
    }
}
