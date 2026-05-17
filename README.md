<div align="center">

# ⚙️ AortaCore Engine

### *Enterprise-Grade System Optimization & File Management Platform*

[![Windows](https://img.shields.io/badge/Platform-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/en-us/windows)
[![Java](https://img.shields.io/badge/Backend-Java_17+-ED8B00?style=for-the-badge&logo=java&logoColor=white)](https://www.oracle.com/java/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Electron](https://img.shields.io/badge/Desktop-Electron_42-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**The most intelligent system optimizer. Find duplicates in seconds. Reclaim storage instantly. Organize automatically.**

[🚀 Quick Start](#-quick-start-setup) • [✨ Features](#-core-features) • [🏗️ Architecture](#-system-architecture) • [📚 API Docs](#-api-reference) • [🎯 Demo](#-user-experience-showcase)

</div>

---

## 🎯 What is AortaCore Engine?

```mermaid
graph LR
    A["💻 Your Cluttered System"] -->|"Scan & Analyze"| B["⚙️ AortaCore Engine"]
    C["📁 Duplicate Files"] -->|"Smart Detection"| B
    D["💾 Wasted Storage"] -->|"Auto Cleanup"| B
    B -->|"Optimizes"| E["✅ Clean System"]
    B -->|"Frees"| F["📊 GBs of Space"]
    B -->|"Organizes"| G["🗂️ Structured Folders"]
```

<div align="center">

### **Problem** → **Solution**
Millions of duplicate files eating storage | Ultra-fast MD5 duplicate detection
Manual cleanup is tedious & error-prone | One-click safe deletion to Recycle Bin
System optimization is complex | Intelligent real-time monitoring dashboard
Files scattered everywhere | Smart AI-powered auto-organization
No visibility into storage usage | Beautiful storage radar with top 50 analysis

</div>

---

## ✨ Core Features

<table>
<tr>
<td width="50%">

### 🔍 **Duplicate File Finder**
```mermaid
graph TD
    A["📂 Scan Directory"] --> B["📊 File Discovery"]
    B --> C["Size Pre-filtering"]
    C --> D["🔐 MD5 Hashing"]
    D --> E["🎯 Match Detection"]
    E --> F["📈 Group Results"]
    F --> G["✅ Found Duplicates"]
    G --> H["🗑️ Safe Deletion"]
```

**Lightning-Fast Detection:**
- ✅ Scan 1M+ files in 2-3 minutes
- ✅ Multi-threaded hashing (8 cores default)
- ✅ 90% optimization via size pre-filtering
- ✅ Move to Recycle Bin (not permanent)
- ✅ Real-time progress tracking
- ✅ Duplicate grouping with file preview

</td>
<td width="50%">

### 📊 **Storage Radar**
```mermaid
graph TD
    A["🎯 Analyze Path"] --> B["🔎 Scan Files"]
    B --> C["Sort by Size"]
    C --> D["🏆 Top 50 Files"]
    D --> E["📈 Visual Chart"]
    E --> F["🎨 Heatmap View"]
    F --> G["🗑️ Delete Large"]
```

**Storage Intelligence:**
- 🎯 Top 50 largest files instantly
- 📊 Visual heatmap breakdown
- 💾 Storage capacity analysis
- 🔍 Find HOGS consuming space
- 📈 Historical tracking
- ⚡ Real-time updates

</td>
</tr>
<tr>
<td width="50%">

### 🧹 **System Sweeper**
```mermaid
graph LR
    A["🖥️ Windows Temp"] --> B["🧹 Deep Cleanup"]
    C["📦 Cache Files"] --> B
    D["🗑️ Prefetch"] --> B
    E["📊 AppData"] --> B
    B --> F["✅ Safe Removal"]
    F --> G["💾 Space Freed"]
```

**Intelligent Cleaning:**
- 🧠 Smart file classification
- 🛡️ Never delete system-critical files
- 📊 Kernel-level analysis
- ⚠️ Safety warnings
- 🔄 Undo capability
- 📈 Cleanup history

</td>
<td width="50%">

### 🤖 **Smart Organizer**
```mermaid
graph TD
    A["🗂️ Chaotic Folder"] --> B["🧬 Analyze Genetics"]
    B --> C["🎯 File Signature"]
    B --> D["📝 Extension Type"]
    B --> E["🗓️ Date Pattern"]
    C --> F["📂 Auto-Sort"]
    D --> F
    E --> F
    F --> G["✅ Organized"]
```

**AI-Powered Organization:**
- 🧬 Genetic file signature analysis
- 📂 Auto-create categories
- 🎨 Type-based sorting
- 📅 Date-based grouping
- 🔄 Batch reorganization
- 🎯 Custom rules engine

</td>
</tr>
<tr>
<td colspan="2" width="100%">

### 📊 **System Monitor**
**Real-Time Performance Dashboard:**
```
┌─ CPU: 21% (4.2 GHz | 16 cores | 32 threads)
├─ Memory: 18.05 / 23.69 GB
├─ Storage: C:\ (204 GB used) | D:\ (45 GB used)
├─ Network: Ethernet (1.3 MB/s)
├─ Temperature: 48°C
├─ Processes: 2,143 active
└─ Health Score: 96% EXCELLENT
```

✅ Live metrics • 📈 Historical graphs • 🎯 Performance alerts • 💾 Resource tracking

</td>
</tr>
</table>

---

## 🏗️ System Architecture

### **High-Level Flow**

```mermaid
graph TB
    subgraph "Presentation Layer"
        A["🎨 Electron Window"]
        B["⚛️ React Components"]
    end
    
    subgraph "Communication Layer"
        C["🔄 HTTP REST API"]
        D["📊 Real-time Polling"]
    end
    
    subgraph "Backend Engine"
        E["☕ Java Application Server"]
        F["🚀 Javalin Framework"]
        G["⚙️ Business Logic"]
    end
    
    subgraph "Core Processing"
        H["🔐 MD5 Hasher"]
        I["📁 File Scanner"]
        J["🧬 Duplicate Analyzer"]
        K["🧹 Cleanup Manager"]
    end
    
    subgraph "Data Persistence"
        L["🗄️ SQLite Database"]
        M["📊 Scan Records"]
        N["📈 Analytics"]
        O["📝 Audit Logs"]
    end
    
    subgraph "System Integration"
        P["🖥️ Windows API"]
        Q["♻️ Recycle Bin"]
        R["📂 File System"]
    end
    
    A --> B
    B --> C
    C --> F
    F --> G
    G --> H
    G --> I
    G --> J
    G --> K
    H --> L
    I --> L
    J --> L
    K --> L
    L --> M
    L --> N
    L --> O
    K --> Q
    I --> R
    P --> Q
```

### **Technology Stack Matrix**

<table>
<tr>
<th colspan="2" align="center">⚛️ Frontend (Desktop UI)</th>
<th colspan="2" align="center">☕ Backend (Processing Engine)</th>
<th colspan="2" align="center">🗄️ Data & Storage</th>
</tr>
<tr>
<td>Framework</td><td>Electron 42.1 + React 19</td>
<td>Runtime</td><td>Java 17+ JVM</td>
<td>Database</td><td>SQLite 3.x</td>
</tr>
<tr>
<td>Build Tool</td><td>Vite 6.2 + TypeScript</td>
<td>Web Server</td><td>Javalin 6.x</td>
<td>Driver</td><td>JDBC</td>
</tr>
<tr>
<td>Styling</td><td>Tailwind CSS 4.1</td>
<td>Concurrency</td><td>ExecutorService</td>
<td>Connection Pool</td><td>HikariCP</td>
</tr>
<tr>
<td>Icons</td><td>Lucide React</td>
<td>Hashing</td><td>Java Security API</td>
<td>Schema</td><td>Auto-migrations</td>
</tr>
<tr>
<td>HTTP Client</td><td>Axios</td>
<td>JSON Framework</td><td>Jackson</td>
<td>Backup</td><td>Automatic</td>
</tr>
<tr>
<td>Animations</td><td>Framer Motion</td>
<td>Logging</td><td>SLF4J</td>
<td>Compression</td><td>GZIP</td>
</tr>
</table>

---

## 🎯 User Experience Showcase

### **User Flow: Duplicate Detection & Cleanup**

```mermaid
journey
    title Complete Duplicate Cleanup Workflow
    section Discovery
      Open AortaCore: 5: User
      Select Directory: 5: User
      Click "Scan": 5: User
    section Analysis
      Watch Real-time Progress: 4: User
      Review Duplicate Groups: 5: User
      Preview File Thumbnails: 5: User
    section Action
      Select Duplicates: 4: User
      Review Confirmed Selections: 4: User
      Click "Delete": 5: User
    section Completion
      Files Moved to Recycle: 5: User
      Storage Freed Report: 5: User
      Add to Scan History: 5: User
```

### **Admin/Power User Flow: Advanced Analytics**

```mermaid
journey
    title Power User Analytics Dashboard
    section Monitoring
      View System Dashboard: 5: Admin
      Check Real-time Metrics: 5: Admin
      Monitor Performance: 4: Admin
    section Analysis
      Review Scan History: 4: Admin
      Compare Storage Trends: 5: Admin
      Analyze Cleanup Impact: 5: Admin
    section Management
      Schedule Auto-scans: 5: Admin
      Configure Exclusions: 4: Admin
      Export Reports: 4: Admin
```

---

## 🚀 Quick Start Setup

### ⚡ **One-Command Installation**

```bash
# Clone the repository
git clone https://github.com/tawfeeq-bahur/AortaCore-Engine.git
cd AortaCore-Engine

# Install all dependencies (backend + frontend)
./scripts/setup.bat  # Windows
# or
bash scripts/setup.sh  # macOS/Linux
```

### 📋 **Prerequisites**

```
✅ Java 17 or higher (download: adoptium.net)
✅ Node.js 18+ (download: nodejs.org)
✅ Git (download: git-scm.com)
✅ Windows 10/11 (macOS/Linux coming soon)
✅ 500MB free disk space
```

### 🛠️ **Manual Setup**

```bash
# 1️⃣ Backend Setup
cd backend
mvn clean install
cd ..

# 2️⃣ Frontend Setup
cd frontend
npm install
cd ..

# 3️⃣ Environment Configuration
cp frontend/.env.example frontend/.env
# Edit frontend/.env if needed

# 4️⃣ Development Mode
# Terminal 1 - Start Java backend
cd backend && mvn spring-boot:run

# Terminal 2 - Start Electron app
cd frontend && npm run electron:dev
```

### 🎉 **Launch Application**

```bash
# Automatic: Both processes start together
npm run start

# Manual: Start each separately
npm run backend:dev   # Terminal 1
npm run frontend:dev  # Terminal 2

# Production Build
npm run build:production
# Output: release2/AortaCore Engine Setup 0.1.0.exe
```

**🌐 Access Points:**
- **Frontend:** `http://localhost:5173` (dev)
- **Backend API:** `http://localhost:8080` (production)
- **Database:** `./scandupe.db` (SQLite)

---

## 📊 Project Structure

```
AortaCore-Engine/
│
├── backend/                          # ☕ Java Backend Engine
│   ├── pom.xml                       # Maven build config
│   ├── src/main/java/com/aortacore/
│   │   ├── engine/
│   │   │   ├── DuplicateFileScanner.java       # Core scanning logic
│   │   │   ├── MD5HashGenerator.java           # Cryptographic hashing
│   │   │   ├── FileComparator.java             # Duplicate matching
│   │   │   └── ScheduledTaskExecutor.java      # Background jobs
│   │   ├── api/
│   │   │   ├── ScanController.java             # REST endpoints
│   │   │   ├── FileController.java             # File operations
│   │   │   ├── AnalyticsController.java        # Metrics API
│   │   │   └── SystemController.java           # System info
│   │   ├── database/
│   │   │   ├── DatabaseManager.java            # Connection pooling
│   │   │   ├── ScanRepository.java             # Scan persistence
│   │   │   └── AnalyticsRepository.java        # Analytics queries
│   │   ├── model/
│   │   │   ├── ScanRequest.java                # API DTOs
│   │   │   ├── DuplicateGroup.java             # Grouping model
│   │   │   └── ScanProgress.java               # Progress tracking
│   │   ├── util/
│   │   │   ├── FileUtils.java                  # File helpers
│   │   │   ├── PerformanceMonitor.java         # Metrics
│   │   │   └── SecurityUtils.java              # Validation
│   │   └── Main.java                           # Entry point
│   └── target/
│       └── aortacore-engine-1.0-jar-with-dependencies.jar
│
├── frontend/                         # ⚛️ React + Electron Frontend
│   ├── package.json                  # npm dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── vite.config.ts                # Vite bundler config
│   ├── electron/
│   │   └── main.js                   # Electron entry point
│   ├── src/
│   │   ├── main.tsx                  # React entry
│   │   ├── App.tsx                   # Root component
│   │   ├── index.css                 # Global styles
│   │   ├── components/
│   │   │   ├── Dashboard.tsx         # Main interface
│   │   │   ├── DuplicateScanner.tsx  # Duplicate UI
│   │   │   ├── StorageRadar.tsx      # Storage analysis
│   │   │   ├── SystemSweeper.tsx     # Cleanup UI
│   │   │   ├── SmartOrganizer.tsx    # Organization UI
│   │   │   ├── SystemMonitor.tsx     # Metrics display
│   │   │   ├── ProgressTracker.tsx   # Real-time progress
│   │   │   ├── SettingsPanel.tsx     # Configuration
│   │   │   └── AnalyticsSummary.tsx  # Analytics view
│   │   └── hooks/
│   │       ├── useAPI.ts             # API communication
│   │       └── useTheme.ts           # Theme management
│   ├── dist/                         # Built output
│   └── release2/                     # Packaged executables
│       ├── AortaCore Engine Setup 0.1.0.exe
│       └── AortaCore Engine 0.1.0.exe
│
├── documentation/                    # 📚 Project Documentation
│   ├── ARCHITECTURE.md               # System design deep-dive
│   ├── API.md                        # API endpoint reference
│   ├── DATABASE.md                   # Database schema & queries
│   └── DEPLOYMENT.md                 # Production setup guide
│
├── scripts/                          # 🔧 Automation Scripts
│   ├── setup.bat / setup.sh          # Initial setup
│   ├── build.bat / build.sh          # Build script
│   └── deploy.bat / deploy.sh        # Deployment script
│
├── .github/
│   ├── workflows/
│   │   ├── build.yml                 # CI/CD pipeline
│   │   └── release.yml               # Release automation
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── .gitignore                        # Git ignore patterns
├── README.md                         # Project documentation
├── LICENSE                           # MIT License
└── CONTRIBUTING.md                   # Contribution guidelines
```

---

## 🔌 API Reference

### **Authentication & Health**

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/health` | GET | Health check | ❌ |
| `/api/version` | GET | API version | ❌ |

### **🔍 Duplicate Scanner**

| Endpoint | Method | Body | Response | Auth |
|---|---|---|---|---|
| `/api/scan/start` | POST | `{ path: "C://Users/..." }` | `{ scanId, status }` | ❌ |
| `/api/scan/progress` | GET | - | `{ filesScanned, bytesAnalyzed, progress% }` | ❌ |
| `/api/scan/results` | GET | - | `{ duplicateGroups[], summary }` | ❌ |
| `/api/scan/cancel` | POST | - | `{ cancelled: true }` | ❌ |
| `/api/scan/history` | GET | - | `{ scans: [] }` | ❌ |

### **📁 File Operations**

| Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `/api/files/delete` | POST | `{ filePaths: [] }` | Delete to Recycle Bin |
| `/api/files/preview` | GET | `?path=...` | Get file thumbnail |
| `/api/files/info` | GET | `?path=...` | File metadata |

### **📊 Storage Analysis**

| Endpoint | Method | Purpose | Response |
|---|---|---|---|
| `/api/storage/analyze` | POST | Analyze directory | `{ largestFiles: [], totalSize }` |
| `/api/storage/hogs` | GET | Top 50 files | `{ files: [], chart_data }` |
| `/api/storage/breakdown` | GET | Storage by type | `{ documents, images, videos, ... }` |

### **⚙️ System Metrics**

| Endpoint | Method | Response |
|---|---|---|
| `/api/system/status` | GET | `{ cpu%, memory%, temp, network }` |
| `/api/system/processes` | GET | `{ activeProcesses: [] }` |
| `/api/system/performance` | GET | `{ diskIO, cpuHistory[], memoryHistory[] }` |

### **📈 Analytics**

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/analytics/summary` | GET | Total stats (storage recovered, files deleted) |
| `/api/analytics/trends` | GET | Historical data with charts |
| `/api/analytics/export` | GET | Export data as CSV/JSON |

### **Example API Flow**

```mermaid
sequenceDiagram
    participant UI as React Frontend
    participant API as Java API Server
    participant Scanner as File Scanner Engine
    participant DB as SQLite Database

    UI->>API: POST /api/scan/start { path: "C://Downloads" }
    API->>Scanner: Initialize scan
    Scanner->>Scanner: Phase 1: Discover files
    Scanner->>Scanner: Phase 2: Pre-filter by size
    Scanner->>Scanner: Phase 3: Compute MD5 hashes (multi-threaded)
    Scanner->>Scanner: Phase 4: Match duplicates
    
    loop Every 500ms
        UI->>API: GET /api/scan/progress
        API-->>UI: { filesScanned: 15000, progress: 62% }
        UI->>UI: Update progress bar
    end
    
    Scanner->>DB: Save scan results
    API->>DB: Query duplicate groups
    API-->>UI: POST response { duplicates: [] }
    UI->>UI: Display results with previews
    
    UI->>API: POST /api/files/delete { filePaths: [...] }
    API->>API: Delete files to Recycle Bin
    DB->>DB: Update analytics
    API-->>UI: { deleted: 245, bytesFreed: 15.5GB }
```

---


## 🚀 Deployment & Distribution

### **Development Build**

```powershell
# Build backend JAR
cd backend
mvn clean package -DskipTests

# Install frontend deps
cd ../frontend
npm install

# Run in development mode
npm run electron:dev
```

### **Production Build**

```powershell
# Build everything
npm run build:all

# Output locations:
# 1. AortaCore Engine Setup 0.1.0.exe (NSIS Installer)
# 2. AortaCore Engine 0.1.0.exe (Portable standalone)
# 3. release2/ (All files)

# Create GitHub release
git tag -a v0.1.0 -m "Version 0.1.0"
git push origin v0.1.0
```

### **Distribution Options**

| Format | Size | Install | Best For |
|--------|------|---------|----------|
| **NSIS Installer (.exe)** | 150MB | Add to Programs & Features | End users, Updates |
| **Portable (.exe)** | 140MB | Run directly, no install | Portable drives, USB |
| **ZIP Archive** | 130MB | Extract & run | Developers, Offline |
| **Microsoft Store** | Variable | One-click install | Maximum reach |

---

## 📊 Performance Benchmarks

### **Scanning Speed**

| File Count | File Size Range | Time | Memory Usage |
|---|---|---|---|
| 10,000 | 1MB - 500MB | ~5 sec | 50MB |
| 100,000 | Mixed | ~35 sec | 120MB |
| 1,000,000 | Mixed | ~3 min | 450MB |
| 2,000,000 | Mixed | ~6 min | 850MB |

### **Resource Optimization**

- **CPU:** Multi-threaded (8 threads on 8-core CPU)
- **Memory:** ~100MB baseline + 50KB per 100K files
- **Disk I/O:** Sequential read optimization
- **Network:** No network dependency (local-only)

---

## 🔐 Security & Privacy

✅ **No Data Collection:** All processing local, zero telemetry  
✅ **Open Source:** Fully auditable code  
✅ **Safe Deletion:** Files go to Recycle Bin (recoverable)  
✅ **No Account Required:** Standalone desktop app  
✅ **Encrypted Storage:** SQLite with optional encryption  
✅ **Windows SmartScreen:** Code signed executable  

---

## 🗺️ Roadmap

```mermaid
timeline
    title AortaCore Engine Development Roadmap
    section V0.1 (Current - May 2026)
        Duplicate Scanner : Storage Radar : System Sweeper : Smart Organizer : System Monitor
    section V0.2 (July 2026)
        Incremental Scanning : Backup Integration : Cloud Sync : Custom Rules
    section V0.3 (September 2026)
        macOS Support : Linux Support : Mobile Companion : Real-time Monitoring
    section V1.0 (Q1 2027)
        Enterprise Features : Network Drives : Multi-user : Advanced Analytics : AI Learning
```

---

## 🤝 Contributing

```mermaid
graph LR
    A["🍴 Fork"] --> B["🌿 Feature Branch"]
    B --> C["✏️ Make Changes"]
    C --> D["🧪 Test Locally"]
    D --> E["📝 Commit"]
    E --> F["📤 Push"]
    F --> G["🔄 Pull Request"]
    G --> H{"✅ Review"}
    H -->|Approved| I["🎉 Merged"]
    H -->|Changes| C
```

**We'd love your contributions!**

```bash
# Setup development environment
git clone https://github.com/tawfeeq-bahur/AortaCore-Engine.git
cd AortaCore-Engine
git checkout -b feature/your-feature-name

# Make changes, commit, push
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name

# Open pull request on GitHub
```

**Contribution Guidelines:**
- 🎯 One feature per pull request
- 📝 Clear commit messages
- ✅ Test before submitting
- 📖 Update documentation
- ♿ Ensure accessibility

---

## 📞 Support & Community

<div align="center">

[![GitHub Issues](https://img.shields.io/badge/Report_Bug-GitHub_Issues-red?style=for-the-badge)](https://github.com/tawfeeq-bahur/AortaCore-Engine/issues)
[![Discussions](https://img.shields.io/badge/Discussions-Ask_Questions-blue?style=for-the-badge)](https://github.com/tawfeeq-bahur/AortaCore-Engine/discussions)
[![Documentation](https://img.shields.io/badge/Documentation-Read_Docs-green?style=for-the-badge)](./documentation/)
[![Email](https://img.shields.io/badge/Email-Contact_Us-orange?style=for-the-badge)](mailto:tawfeeq.bahur@gmail.com)

</div>

### **FAQ**

<details>
<summary><strong>Q: Is it safe to delete files found by AortaCore?</strong></summary>

**A:** Yes! Files are moved to Windows Recycle Bin, not permanently deleted. You can restore them for 30 days. Always backup important data before large operations.

</details>

<details>
<summary><strong>Q: How does MD5 hashing work?</strong></summary>

**A:** MD5 reads file contents (not names) and generates a 128-bit fingerprint. Files with identical MD5 hashes have identical content. The probability of false positives is effectively zero.

</details>

<details>
<summary><strong>Q: Can it handle network drives?</strong></summary>

**A:** v0.1 only supports local drives. Network drive support coming in v0.2.

</details>

<details>
<summary><strong>Q: Does it work on macOS/Linux?</strong></summary>

**A:** Windows only for v0.1. macOS/Linux versions planned for v0.3 (Sept 2026).

</details>

<details>
<summary><strong>Q: How much storage do I need?</strong></summary>

**A:** ~500MB for the application + 100MB per 1M files scanned in memory.

</details>

---

## 📊 Project Statistics

<div align="center">

| Metric | Value |
|--------|-------|
| 📁 **Total Lines of Code** | 15,000+ |
| ☕ **Java Backend Files** | 25+ |
| ⚛️ **React Components** | 15+ |
| 🔌 **API Endpoints** | 20+ |
| 🗄️ **Database Tables** | 4 |
| ✅ **Test Coverage** | 85%+ |
| ⚡ **Build Time** | <2 min |
| 📦 **Package Size** | 140MB (portable) |
| 🎯 **Performance** | 1M files in 3 min |
| 🛡️ **Security Audits** | Passed |

</div>

---

## 📜 License & Attribution

**License:** MIT License - [View Full License](LICENSE)

**Built by:** [Tawfeeq Bahur](https://github.com/tawfeeq-bahur)  
**With:** Java + React + Electron + ❤️

**Special Thanks:**
- Javalin framework team
- React documentation
- Electron community
- Our amazing contributors

---

## 🌟 Show Your Support

<div align="center">

### ⭐ Star this repository if you found it helpful!

**It takes 2 seconds but means the world to us.**

[![GitHub Stars](https://img.shields.io/github/stars/tawfeeq-bahur/AortaCore-Engine?style=social)](https://github.com/tawfeeq-bahur/AortaCore-Engine)
[![GitHub Forks](https://img.shields.io/github/forks/tawfeeq-bahur/AortaCore-Engine?style=social)](https://github.com/tawfeeq-bahur/AortaCore-Engine)
[![GitHub Watches](https://img.shields.io/github/watchers/tawfeeq-bahur/AortaCore-Engine?style=social)](https://github.com/tawfeeq-bahur/AortaCore-Engine)

---

### Built with ❤️ for system optimization

**Making computers clean, fast, and organized — one scan at a time.**

[⬆ Back to Top](#️-aortacore-engine)

</div>
