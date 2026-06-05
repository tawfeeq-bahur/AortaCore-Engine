package com.dupfinder.engine;

import java.io.File;
import java.util.*;

/**
 * DriveSpaceMonitor — real-time C: drive space sentinel.
 *
 * Alert levels:
 *   GREEN  → >20% free   (all good)
 *   YELLOW → 10-20% free (keep an eye on it)
 *   ORANGE → 5-10% free  (act soon)
 *   RED    → <5% free    (EMERGENCY — activate killswitch)
 */
public class DriveSpaceMonitor {

    public enum AlertLevel { GREEN, YELLOW, ORANGE, RED }

    public static class DriveStatus {
        public long   totalSpace;
        public long   usedSpace;
        public long   freeSpace;
        public double percentUsed;
        public double percentFree;
        public AlertLevel alertLevel;
        public boolean isEmergency;
        public String formattedFree;
        public String formattedTotal;
        public String formattedUsed;
    }

    /** Return current C: drive status snapshot. */
    public static DriveStatus getCDriveStatus() {
        return getDriveStatus("C:\\");
    }

    /** Return current drive status snapshot for the specified drive path (e.g. "C:\\" or "D:\\"). */
    public static DriveStatus getDriveStatus(String drivePath) {
        File drive = new File(drivePath);
        if (!drive.exists()) {
            return null;
        }

        DriveStatus s = new DriveStatus();
        s.totalSpace   = drive.getTotalSpace();
        s.freeSpace    = drive.getUsableSpace();          // usable (not just free)
        s.usedSpace    = s.totalSpace - drive.getFreeSpace();
        s.percentUsed  = (s.totalSpace > 0)
                         ? (double) s.usedSpace / s.totalSpace * 100
                         : 0;
        s.percentFree  = 100 - s.percentUsed;

        if      (s.percentFree > 20) s.alertLevel = AlertLevel.GREEN;
        else if (s.percentFree > 10) s.alertLevel = AlertLevel.YELLOW;
        else if (s.percentFree > 5)  s.alertLevel = AlertLevel.ORANGE;
        else                         s.alertLevel = AlertLevel.RED;

        s.isEmergency    = (s.alertLevel == AlertLevel.RED);
        s.formattedFree  = formatBytes(s.freeSpace);
        s.formattedTotal = formatBytes(s.totalSpace);
        s.formattedUsed  = formatBytes(s.usedSpace);

        return s;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    public static String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char unit = "KMGTPE".charAt(exp - 1);
        return String.format("%.2f %sB", bytes / Math.pow(1024, exp), unit);
    }
}
