# ScanDupe Pro: Duplicate File Finder & Storage Optimizer

![Java Version](https://img.shields.io/badge/Java-17%2B-blue)
![License](https://img.shields.io/badge/License-Apache--2.0-orange)

ScanDupe is a high-performance utility designed to reclaim disk space by identifying and managing duplicate files. It uses a metadata-first approach optimized for speed and uses cryptographic MD5 hashing for precision.

## 🚀 Key Features
- **Intelligent Scanning**: Folders are first indexed by size. Hashing is only performed on files with exact size matches (Size-First Heuristics).
- **Multithreaded Hashing**: Utilizes Java's `ExecutorService` to parallelize MD5 calculations across CPU cores.
- **MD5 Precision**: Accurate byte-for-byte duplicate detection.
- **Safety Zones**: Protects critical system folders from accidental deletion.
- **Scan History**: Stores previous analysis results in a local SQLite database.

## 🛠 Tech Stack
- **Languages**: Java 17+
- **UI Framework**: JavaFX (with FXML)
- **Build System**: Maven
- **Database**: SQLite (JDBC)
- **Concurrency**: Java Concurrency API

## 📋 Architecture
The project follows a **Clean Architecture** pattern:
- `com.scandupe.model`: Data entities (FileIdentity, ScanResult).
- `com.scandupe.service`: Business logic (ScannerService, HashService).
- `com.scandupe.util`: Cross-cutting concerns (FileUtils, Logger).
- `com.scandupe.ui`: Presentation layer (Controllers, ViewModels).

## 📈 Performance Optimization
1. **Metadata Pre-filter**: `O(N)` grouping by file size before any hashing.
2. **Buffer Optimization**: 8KB streaming buffers for hashing large files (prevents `OutOfMemoryError`).
3. **Nio.2**: Using `java.nio.file` for advanced recursive walking and metadata access.

## 🎓 Learning Concepts
- **Hashing**: Understanding collisions vs speed (MD5).
- **Complexity**: Comparing `O(N)` vs `O(N²)` algorithms.
- **I/O Management**: Synchronous vs Asynchronous file streams.

## 📄 License
This project is licensed under the Apache 2.0 License.
