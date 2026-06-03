package com.dupfinder.model;

import java.nio.file.Path;

/**
 * Represents a file in the system with its essential metadata.
 */
public class FileRecord {
    private final Path path;
    private final long size;
    private String hash; // Computed only when needed
    private final String category;

    public FileRecord(Path path, long size) {
        this.path = path;
        this.size = size;
        this.category = determineCategory(path);
    }

    public FileRecord(Path path, long size, String category) {
        this.path = path;
        this.size = size;
        this.category = category;
    }

    private String determineCategory(Path file) {
        String pathStr = file.toString().toLowerCase();
        String name = file.getFileName().toString().toLowerCase();
        
        // Modules and Packages
        if (pathStr.contains("\\node_modules\\") || pathStr.contains("\\.git\\") || pathStr.contains("\\venv\\") || 
            pathStr.contains("\\.idea\\") || pathStr.contains("\\target\\") || pathStr.contains("\\build\\")) {
            return "Modules & Packages";
        }
        
        if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp") || name.endsWith(".svg")) {
            return "Images";
        }
        if (name.endsWith(".mp4") || name.endsWith(".mkv") || name.endsWith(".avi") || name.endsWith(".mov") || name.endsWith(".webm")) {
            return "Videos";
        }
        if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt") || name.endsWith(".xlsx") || name.endsWith(".pptx")) {
            return "Documents";
        }
        if (name.endsWith(".js") || name.endsWith(".java") || name.endsWith(".py") || name.endsWith(".ts") || 
            name.endsWith(".html") || name.endsWith(".css") || name.endsWith(".class") || name.endsWith(".jar") || 
            name.endsWith(".json") || name.endsWith(".xml") || name.endsWith(".md")) {
            return "Code Files";
        }
        return "Others";
    }

    public Path getPath() {
        return path;
    }

    public long getSize() {
        return size;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }
    
    public String getCategory() {
        return category;
    }

    @Override
    public String toString() {
        return "FileRecord{" +
                "path=" + path +
                ", size=" + size +
                ", hash='" + hash + '\'' +
                ", category='" + category + '\'' +
                '}';
    }
}
