package com.dupfinder.service;

import com.aortacore.identity.ProjectIdentity;
import com.dupfinder.model.FileRecord;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Service for generating PDF scan reports.
 * Creates detailed reports of duplicate files found during scans.
 */
public class ReportGeneratorService {
    private static final int PAGE_WIDTH = 612; // Letter size width
    private static final int PAGE_HEIGHT = 792; // Letter size height
    private static final int MARGIN = 40;
    private static final int LINE_HEIGHT = 12;

    private static PDFont getBoldFont() throws IOException {
        return new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    }

    private static PDFont getRegularFont() throws IOException {
        return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    }

    /**
     * Generates a PDF report from the last scan results.
     *
     * @return PDF file path
     */
    public static String generateScanReport() throws IOException {
        if (!ScanResultCache.hasCachedResults()) {
            throw new IllegalStateException("No cached scan results available");
        }

        PDDocument document = new PDDocument();
        PDPage page = new PDPage();
        document.addPage(page);
        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        try {
            float yPosition = PAGE_HEIGHT - MARGIN;

            // Title and header
            yPosition = addTitle(contentStream, yPosition);
            yPosition -= 20;

            // Scan summary
            yPosition = addScanSummary(contentStream, yPosition);
            yPosition -= 20;

            // Duplicate clusters
            Map<String, List<FileRecord>> results = ScanResultCache.getLastScanResults();
            int clusterIndex = 1;

            for (Map.Entry<String, List<FileRecord>> entry : results.entrySet()) {
                List<FileRecord> duplicateGroup = entry.getValue();
                if (duplicateGroup.size() > 1) {
                    // Check if we need a new page
                    if (yPosition < MARGIN + 100) {
                        contentStream.close();
                        page = new PDPage();
                        document.addPage(page);
                        contentStream = new PDPageContentStream(document, page);
                        yPosition = PAGE_HEIGHT - MARGIN;
                    }

                    yPosition = addDuplicateCluster(contentStream, yPosition, clusterIndex, entry.getKey(), duplicateGroup);
                    yPosition -= 10;
                    clusterIndex++;
                }
            }

            contentStream.close();

            // Save PDF to Downloads folder
            String downloadsPath = System.getProperty("user.home") + File.separator + "Downloads";
            File downloadsDir = new File(downloadsPath);
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs();
            }

            String fileName = "ScanReport_" + System.currentTimeMillis() + ".pdf";
            String filePath = downloadsDir.getAbsolutePath() + File.separator + fileName;
            document.save(filePath);
            document.close();

            System.out.println("PDF Report saved to: " + filePath);
            return filePath;
        } catch (IOException e) {
            contentStream.close();
            document.close();
            System.err.println("Error generating PDF: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    private static float addTitle(PDPageContentStream contentStream, float yPosition) throws IOException {
        PDFont titleFont = getBoldFont();
        PDFont dateFont = getRegularFont();

        contentStream.setFont(titleFont, 24);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(ProjectIdentity.PROJECT_NAME + " - Scan Report");
        contentStream.endText();

        yPosition -= 30;

        contentStream.setFont(dateFont, 10);
        String dateStr = new SimpleDateFormat("MMM dd, yyyy HH:mm:ss").format(new Date(ScanResultCache.getLastScanTime()));
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText("Generated: " + dateStr);
        contentStream.endText();

        return yPosition - 20;
    }

    private static float addScanSummary(PDPageContentStream contentStream, float yPosition) throws IOException {
        PDFont headerFont = getBoldFont();
        PDFont textFont = getRegularFont();

        contentStream.setFont(headerFont, 14);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText("Scan Summary");
        contentStream.endText();

        yPosition -= LINE_HEIGHT * 2;

        contentStream.setFont(textFont, 10);
        
        String[] summaryLines = {
            "Scan Path: " + ScanResultCache.getLastScanPath(),
            "Total Files Analyzed: " + formatNumber(ScanResultCache.getLastScanTotalFiles()),
            "Duplicate Groups Found: " + formatNumber(ScanResultCache.getDuplicateGroupCount()),
            "Recoverable Space: " + formatBytes(ScanResultCache.getLastScanTotalWastedSize()),
            "Scan Duration: " + formatDuration(ScanResultCache.getLastScanDuration())
        };

        for (String line : summaryLines) {
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText(line);
            contentStream.endText();
            yPosition -= LINE_HEIGHT * 1.5;
        }

        return yPosition;
    }

    private static float addDuplicateCluster(PDPageContentStream contentStream, float yPosition, 
                                             int clusterIndex, String hash, List<FileRecord> files) throws IOException {
        PDFont clusterFont = getBoldFont();
        PDFont textFont = getRegularFont();

        // Cluster header
        contentStream.setFont(clusterFont, 11);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText("Duplicate Cluster #" + clusterIndex);
        contentStream.endText();
        yPosition -= LINE_HEIGHT * 1.5;

        // Cluster info
        contentStream.setFont(textFont, 9);
        long fileSize = files.isEmpty() ? 0 : files.get(0).getSize();
        long totalWasted = (files.size() - 1) * fileSize;
        
        String[] infoLines = {
            "Hash (MD5): " + hash.substring(0, Math.min(16, hash.length())) + "...",
            "File Size: " + formatBytes(fileSize),
            "Copies Found: " + files.size(),
            "Duplicate Size: " + formatBytes(totalWasted)
        };

        for (String line : infoLines) {
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN + 15, yPosition);
            contentStream.showText(line);
            contentStream.endText();
            yPosition -= LINE_HEIGHT;
        }

        yPosition -= 5;

        // File list
        contentStream.setFont(textFont, 8);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 15, yPosition);
        contentStream.showText("Files:");
        contentStream.endText();
        yPosition -= LINE_HEIGHT;

        for (int i = 0; i < files.size(); i++) {
            FileRecord file = files.get(i);
            String fileLabel = (i == 0) ? "[ORIGINAL] " : "[COPY #" + i + "] ";
            String filePath = truncatePath(file.getPath().toString(), 70);
            
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN + 30, yPosition);
            contentStream.showText(fileLabel + filePath);
            contentStream.endText();
            yPosition -= LINE_HEIGHT;
        }

        return yPosition;
    }

    private static String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        final String[] units = new String[]{"B", "KB", "MB", "GB", "TB"};
        int digitGroups = (int) (Math.log10(bytes) / Math.log10(1024));
        return String.format("%.2f %s", bytes / Math.pow(1024, digitGroups), units[digitGroups]);
    }

    private static String formatNumber(int number) {
        return String.format("%,d", number);
    }

    private static String formatDuration(int milliseconds) {
        int seconds = milliseconds / 1000;
        int minutes = seconds / 60;
        int secs = seconds % 60;
        return String.format("%d min %d sec", minutes, secs);
    }

    private static String truncatePath(String path, int maxLength) {
        if (path.length() <= maxLength) {
            return path;
        }
        return "..." + path.substring(path.length() - maxLength + 3);
    }
}
