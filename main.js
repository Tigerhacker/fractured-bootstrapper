const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const {autoUpdater} = require("electron-updater");
const url = require('url')

const settings = require('./views/js/settings.js');

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

ipcMain.handle("showOpenDialog", async (e, options) => {
    return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle("openExternalBrowser", (e, url) => {
    return shell.openExternal(url);
});


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

        // Protocol handler for win32
        // argv: An array of the second instance’s (command line / deep linked) arguments
        if (process.platform == 'win32') {
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
    if (process.defaultApp && process.argv.length >= 2) {
        // Running via `electron .` in dev: register electron.exe + app path
        app.setAsDefaultProtocolClient('fracturedspace', process.execPath, [require('path').resolve(process.argv[1])])
    } else {
        app.setAsDefaultProtocolClient('fracturedspace')
    }
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

    // Protocol handler for win32: app was cold-started from a deep link
    // (handle before loading the page so a new token is picked up on first render)
    if (process.platform == 'win32') {
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

ipcMain.on('app_checkUpdates', (event) => {
    logEverywhere("ipc_checkForUpdatesAndNotify")
    autoUpdater.checkForUpdatesAndNotify();
    event.sender.send('to_render_console', {
        version: app.getVersion()
    });
});