import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Disable hardware acceleration to prevent GPU process crashes (e.g. in VMs/RDP/driver conflicts)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('in-process-gpu');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let javaProcess;
let backendReady = false;
let backendStartError = null;

const isDev = process.env.NODE_ENV === 'development';

function getJavaExecutable() {
  const executableName = process.platform === 'win32' ? 'java.exe' : 'java';
  const candidates = [];

  if (process.env.JAVA_HOME) {
    candidates.push(path.join(process.env.JAVA_HOME, 'bin', executableName));
  }

  if (isDev) {
    candidates.push(path.join(__dirname, '../../DuplicateFileFinderFixed/runtime/bin', executableName));
  } else {
    candidates.push(path.join(process.resourcesPath, 'runtime', 'bin', executableName));
  }

  candidates.push(executableName);

  for (const candidate of candidates) {
    if (candidate === executableName) {
      return candidate;
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return executableName;
}

function getJarPath() {
  if (isDev) {
    return path.join(__dirname, '../../backend/target/duplicate-file-finder-1.0-SNAPSHOT-jar-with-dependencies.jar');
  }

  return path.join(process.resourcesPath, 'duplicate-file-finder-1.0-SNAPSHOT-jar-with-dependencies.jar');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    title: 'AortaCore Engine',
    icon: path.join(__dirname, 'AC-LOGO.png'),
    backgroundColor: '#0f172a',
    autoHideMenuBar: true
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForBackendReady(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (backendStartError) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      const response = await fetch('http://127.0.0.1:8080/api/about', { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && typeof data.projectName === 'string' && typeof data.signature === 'string') {
          return true;
        }
      }
    } catch (error) {
      // Ignore and retry until the backend is up or the timeout expires.
    }

    await delay(500);
  }

  return false;
}

function startJavaBackend() {
  const javaExecutable = getJavaExecutable();
  const jarPath = getJarPath();

  console.log('Starting Java Backend from:', jarPath);
  console.log('Using Java executable:', javaExecutable);

  javaProcess = spawn(javaExecutable, ['-jar', jarPath], { windowsHide: true });

  javaProcess.on('error', (error) => {
    backendStartError = error;
    console.error('[Java Error]', error);
  });

  javaProcess.on('exit', (code, signal) => {
    if (!backendReady && !backendStartError) {
      backendStartError = new Error(`Java backend exited before startup (code ${code ?? 'unknown'}, signal ${signal ?? 'none'})`);
    }
    console.log(`[Java Backend] exited with code ${code ?? 'unknown'} signal ${signal ?? 'none'}`);
  });

  javaProcess.stdout.on('data', (data) => {
    console.log(`[Java Backend] ${data.toString()}`);
  });

  javaProcess.stderr.on('data', (data) => {
    console.error(`[Java Error] ${data.toString()}`);
  });
}

app.whenReady().then(async () => {
  // Start Java Server
  startJavaBackend();
  
  console.log('Waiting for Java backend to be ready on port 8080...');
  // Wait until the backend responds to its own health endpoint.
  const ready = await waitForBackendReady();
  backendReady = ready;

  if (!ready) {
    const message = backendStartError
      ? `The Java backend could not be started.\n\n${backendStartError.message}`
      : 'The Java backend did not respond on port 8080. Make sure the bundled runtime is present and that no other app is already using that port.';
    dialog.showErrorBox('AortaCore Engine', message);
    app.quit();
    return;
  }

  console.log('Java backend is ready!');

  createWindow();

  // IPC handler for folder selection from renderer
  ipcMain.handle('select-folder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    } catch (err) {
      console.error('Error selecting folder:', err);
      return null;
    }
  });

  // IPC handler to reveal a file in Windows Explorer
  ipcMain.handle('reveal-file', async (_event, filePath) => {
    try {
      shell.showItemInFolder(filePath);
    } catch (err) {
      console.error('Failed to reveal file:', err);
    }
  });

  ipcMain.handle('restart-elevated', async () => {
    if (process.platform !== 'win32') {
      return { ok: false, message: 'Admin restart is only supported on Windows.' };
    }
    if (isDev) {
      return { ok: false, message: 'Admin restart is only supported in packaged builds. Please run your terminal as Administrator.' };
    }
    try {
      const exePath = process.execPath;
      const args = process.argv.slice(1).map(arg => `\"${arg}\"`).join(' ');
      spawn('powershell', [
        '-NoProfile',
        '-Command',
        `Start-Process -FilePath \"${exePath}\" -ArgumentList \"${args}\" -Verb RunAs`
      ], { detached: true });
      app.quit();
      return { ok: true };
    } catch (err) {
      console.error('Failed to restart elevated:', err);
      return { ok: false, message: 'Failed to request elevation.' };
    }
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill the Java process gracefully
  if (javaProcess) {
    console.log('Killing Java process...');
    if (process.platform === 'win32') {
      spawn("taskkill", ["/pid", javaProcess.pid, '/f', '/t']);
    } else {
      javaProcess.kill('SIGINT');
    }
  }
});
