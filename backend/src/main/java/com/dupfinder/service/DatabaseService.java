package com.dupfinder.service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DatabaseService {

    private static final String DB_URL = "jdbc:sqlite:scandupe.db";

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
}
