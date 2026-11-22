const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const {autoUpdater} = require("electron-updater");
const url = require('url')
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const settings = require('./views/js/settings.js');
const fireline = require('./views/js/fireline.js');

let protoUrl = null

let mainWindow, updateWindow;
let appPath = app.getAppPath();

// ipc handlers
ipcMain.handle("showDialog", (e, message) => {
    dialog.showMessageBox(mainWindow, { 
        title: " ",
        type: "info",
        message: message
     });
});

ipcMain.handle("showMessageBox", async (e, options) => {
    return await dialog.showMessageBox(mainWindow, options);
});

// Handled entirely in the main process so the "Open link" action still works when the
// renderer reloads (e.g. after a patch install) while the dialog is open.
ipcMain.handle("promptDirectXRedist", async () => {
    const link = 'https://www.microsoft.com/download/details.aspx?id=8109';
    const response = await dialog.showMessageBox(mainWindow, {
        title: " ",
        type: "warning",
        message: "DirectX End-User Runtimes not installed",
        detail: "Please download and install from " + link,
        buttons: ['Ignore', 'Open link'],
    });
    if (response.response === 1) shell.openExternal(link);
});

ipcMain.handle("showOpenDialog", async (e, options) => {
    return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle("openExternalBrowser", (e, url) => {
    return shell.openExternal(url);
});

// Opens a local folder in the file manager (creating it first if asked)
ipcMain.handle("openPath", async (e, dir, create) => {
    if (typeof dir !== 'string' || !path.isAbsolute(dir)) return 'invalid path';
    if (create) fs.mkdirSync(dir, { recursive: true });
    return shell.openPath(dir);
});

ipcMain.handle("registerProtocolHandler", () => registerProtocolHandler());

// Offline mode: local Fireline emulator, started right before the game and stopped when it exits.
// A capture of your own placed at <userData>/fireline-responses.json replaces the bundled one.
ipcMain.handle("fireline_start", () => fireline.start({
    responsesFile: path.join(app.getPath('userData'), 'fireline-responses.json'),
}));
ipcMain.handle("fireline_stop", () => fireline.stop());
ipcMain.handle("fireline_info", () => fireline.info());
app.on('will-quit', () => { fireline.stop(); });


// Find the fracturedspace:// deep link (if any) in a list of command line args
function findProtoUri(argv){
    return (argv || []).find((arg) => /^fracturedspace:\/\//i.test(String(arg)));
}

// Force Single Instance Application
function processProtoUri(uri){
    const m = String(uri).match(/^fracturedspace:\/\/([^\/]+)\/(.*?)\/?$/i)

    if(m){
        const command = m[1];
        const payload = m[2];
        if(command == 'auth'){
            processAuthUri(payload)
        }
        return true
    }else{
        return false
    }
}

function processAuthUri(path){
    const m = path.match(/^([^\/]+)\/([^\/]+)$/)
    if(m){
        const provider = m[1];
        const token = decodeURIComponent(m[2]);
        // Tokens are passed to the game on its command line, only accept safe characters
        if(!/^[A-Za-z0-9._~+\/=-]+$/.test(token)){
            return false
        }
        if(provider == "discord"){
            settings.sotreSet('discord_token', token)
            if (mainWindow && mainWindow.webContents.getURL()) mainWindow.reload()
            return true
        }
    }

    return false
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {

        // Protocol handler for Windows and Linux (the URL arrives as a command line argument)
        // argv: An array of the second instance’s (command line / deep linked) arguments
        if (process.platform !== 'darwin') {
            protoUrl = findProtoUri(commandLine);
            if (protoUrl) processProtoUri(protoUrl);
        }
        // logEverywhere("app.makeSingleInstance# ")
        // logEverywhere("event: "+ event)
        // logEverywhere("commandLine: "+ commandLine)
        // logEverywhere("commandLineLen: "+ commandLine.length)
        // logEverywhere("protoUrl: "+ protoUrl)
        // logEverywhere(commandLine)
        console.log("commandLine", commandLine)


        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
            // mainWindow.loadFile('views/validate.html')
        }
    })

    // Create myWindow, load the rest of the app, etc...
    app.on('ready', async () => {
        await createWelcomeWindow();
    })

}

async function createWelcomeWindow () {
    const protocolResult = registerProtocolHandler();
    if (!protocolResult.ok) console.log('Protocol handler registration failed:', protocolResult.message);

    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 800,
      height: 850,
      webPreferences: {
        preload: appPath + '/views/js/preload.js',
        // nodeIntegration: false,
        nodeIntegration: true,
        contextIsolation: false,
        // experimentalFeatures: true,
        // Debug: `--show-linux-settings` shows the Linux-only settings on any platform
        additionalArguments: app.commandLine.hasSwitch('show-linux-settings') ? ['--show-linux-settings'] : [],
    }
    })
    mainWindow.removeMenu();

    // The window has full Node access, so never let it navigate to or open remote pages
    mainWindow.webContents.on('will-navigate', (e, navUrl) => {
        if (!navUrl.startsWith('file://')) e.preventDefault();
    });
    mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
        if (/^https?:\/\//i.test(openUrl)) shell.openExternal(openUrl);
        return { action: 'deny' };
    });

    // Protocol handler for Windows/Linux: app was cold-started from a deep link
    // (handle before loading the page so a new token is picked up on first render)
    if (process.platform !== 'darwin') {
        protoUrl = findProtoUri(process.argv);
        if (protoUrl) processProtoUri(protoUrl);
    }

    // and load the index.html of the app.
    mainWindow.loadFile('views/home.html')
    // logEverywhere("createWindow# " + protoUrl)
  
    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null
    })
}

// Register the fracturedspace:// handler used by the Discord sign-in redirect
function registerProtocolHandler() {
    try {
        if (process.platform === 'linux') return registerLinuxProtocolHandler();
        let ok;
        if (process.defaultApp && process.argv.length >= 2) {
            // Running via `electron .` in dev: register electron.exe + app path
            ok = app.setAsDefaultProtocolClient('fracturedspace', process.execPath, [path.resolve(process.argv[1])]);
        } else {
            ok = app.setAsDefaultProtocolClient('fracturedspace');
        }
        return { ok, message: ok ? 'registered' : 'setAsDefaultProtocolClient failed' };
    } catch (e) {
        return { ok: false, message: String(e && e.message || e) };
    }
}

// Quote one Exec= argument as the desktop entry spec requires
function desktopExecArg(arg) {
    return '"' + String(arg).replace(/(["`$\\])/g, '\\$1').replace(/%/g, '%%') + '"';
}

// On Linux a URL scheme is handled by whichever .desktop file is the default for the
// x-scheme-handler/<scheme> mime type. An AppImage has no installed .desktop file (and its path
// changes when it is moved or renamed), so Electron's setAsDefaultProtocolClient can't work for it.
// Instead, write our own hidden .desktop file pointing at the current executable on every start
// and make it the default handler. This also covers the .deb/.rpm builds and `npm start`.
const LINUX_HANDLER_DESKTOP = 'fractured-space-bootstrapper-url-handler.desktop';
function registerLinuxProtocolHandler() {
    if (process.env.SNAP || process.env.FLATPAK_ID) {
        return { ok: false, message: 'not supported for Snap/Flatpak packages' };
    }

    let exec;
    if (process.env.APPIMAGE) {
        exec = [process.env.APPIMAGE];
    } else if (process.defaultApp && process.argv.length >= 2) {
        exec = [process.execPath, path.resolve(process.argv[1])];
    } else {
        exec = [process.execPath];
    }

    const dataHome = process.env.XDG_DATA_HOME && path.isAbsolute(process.env.XDG_DATA_HOME)
        ? process.env.XDG_DATA_HOME : path.join(os.homedir(), '.local', 'share');
    const appsDir = path.join(dataHome, 'applications');
    const desktopFile = path.join(appsDir, LINUX_HANDLER_DESKTOP);
    const contents = [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Fractured Space Bootstrapper (sign-in link handler)',
        'Exec=' + exec.map(desktopExecArg).join(' ') + ' %u',
        'Terminal=false',
        'NoDisplay=true',
        'MimeType=x-scheme-handler/fracturedspace;',
        '',
    ].join('\n');

    try {
        fs.mkdirSync(appsDir, { recursive: true });
        let existing = null;
        try { existing = fs.readFileSync(desktopFile, 'utf8'); } catch (e) { /* first run */ }
        if (existing !== contents) fs.writeFileSync(desktopFile, contents, { mode: 0o644 });
    } catch (e) {
        return { ok: false, message: 'could not write ' + desktopFile + ': ' + e.message };
    }

    // Best effort: from desktop-file-utils / xdg-utils, present on all the usual desktops
    execFile('update-desktop-database', [appsDir], { timeout: 10000 }, () => {});
    execFile('xdg-mime', ['default', LINUX_HANDLER_DESKTOP, 'x-scheme-handler/fracturedspace'], { timeout: 10000 }, (err) => {
        if (!err) return;
        try {
            setMimeAppsDefault('x-scheme-handler/fracturedspace', LINUX_HANDLER_DESKTOP);
        } catch (e) {
            console.log('Could not set default protocol handler', e);
        }
    });
    return { ok: true, message: desktopFile };
}

// Minimal ~/.config/mimeapps.list editor, only used when xdg-mime is missing
function setMimeAppsDefault(mime, desktop) {
    const configHome = process.env.XDG_CONFIG_HOME && path.isAbsolute(process.env.XDG_CONFIG_HOME)
        ? process.env.XDG_CONFIG_HOME : path.join(os.homedir(), '.config');
    const file = path.join(configHome, 'mimeapps.list');
    let lines = [];
    try { lines = fs.readFileSync(file, 'utf8').split('\n'); } catch (e) { /* new file */ }
    lines = lines.filter((l) => !l.startsWith(mime + '='));
    let idx = lines.findIndex((l) => l.trim() === '[Default Applications]');
    if (idx < 0) {
        if (lines.length && lines[lines.length - 1] !== '') lines.push('');
        lines.push('[Default Applications]');
        idx = lines.length - 1;
    }
    lines.splice(idx + 1, 0, `${mime}=${desktop}`);
    fs.mkdirSync(configHome, { recursive: true });
    fs.writeFileSync(file, lines.join('\n'));
}

// Log both at dev console and at running node console instance
function logEverywhere(s) {
    console.log(s)
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`console.log("${s}")`)
    }
}


async function changeToUpdateWindow(window){

}

autoUpdater.on('checking-for-update', () => {
    // updateWindow.webContents.send('update', 'Checking for updates', '...');
});

autoUpdater.on('update-not-available', async (info) => {
    mainWindow.webContents.send('update_none', info);
});

autoUpdater.on('update-available', (info) => {
    mainWindow.loadFile('views/update.html');
});

autoUpdater.on('download-progress', (progress) => {
    // logEverywhere("download-progress fired");
    mainWindow.webContents.send('update_progress', progress);
});

autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded');
});

autoUpdater.on('error', (err) => {
    // was `updateWindow`, which is never assigned and crashed the main process
    if (mainWindow) mainWindow.webContents.send('update_error', String(err && err.message || err));
});

ipcMain.on('restart_update', () => {
    autoUpdater.quitAndInstall();
});


//IPC commands
ipcMain.on('open_developer_tools', (event) => {
    event.sender.openDevTools();
});

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', {
        version: app.getVersion()
    });
});

ipcMain.on('set_progress', (event, args) => {
    mainWindow.setProgressBar(args)
});

ipcMain.on('nav_update', () => {
    mainWindow.loadFile('views/update.html');
});

// Why this copy of the app can't auto-update, or null if it can
function updateUnsupportedReason() {
    if (!app.isPackaged) return 'Running from source (not packaged).';
    if (process.platform === 'linux' && !process.env.APPIMAGE) {
        let packageType = null;
        try {
            packageType = fs.readFileSync(path.join(process.resourcesPath, 'package-type'), 'utf8').trim();
        } catch (e) { /* unpacked build */ }
        if (!packageType) {
            return 'Only the AppImage, .deb and .rpm builds can update themselves. Download the latest release from GitHub.';
        }
        // An .rpm can't be installed over the read-only image of Bazzite, Silverblue, Kinoite, ...
        if (packageType === 'rpm' && fs.existsSync('/run/ostree-booted')) {
            return 'This system is image based (rpm-ostree), so the .rpm can not update itself. Use the AppImage build instead.';
        }
    }
    if (!autoUpdater.isUpdaterActive()) return 'The updater is disabled for this build.';
    return null;
}

ipcMain.on('app_checkUpdates', (event) => {
    logEverywhere("ipc_checkForUpdatesAndNotify")
    const unsupported = updateUnsupportedReason();
    if (unsupported) {
        // checkForUpdates() would silently do nothing, leaving "Checking for updates" up forever
        event.sender.send('update_unsupported', unsupported);
        return;
    }
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        // already forwarded to the window by the 'error' event
        console.log('Update check failed', err && err.message);
    });
    event.sender.send('to_render_console', {
        version: app.getVersion()
    });
});