const {app, BrowserWindow, ipcMain} = require('electron');
const {autoUpdater} = require("electron-updater");
const url = require('url')

const settings = require('./views/js/settings.js');

let protoUrl = null

let mainWindow, updateWindow;
let appPath = app.getAppPath();


// Force Single Instance Application
function processProtoUri(uri){
    m = String(uri).match(/^fracturedspace:\/\/([^\/]+)\/(.*)/) 

    if(m){
        command = m[1];
        payload = m[2];
        if(command == 'auth'){
            processAuthUri(payload)
        }
        return true
    }else{
        return false
    }
}

function processAuthUri(path){
    m = path.match(/^([^\/]+)\/([^\/]+)$/) 
    if(m){
        provider = m[1];
        token = m[2];
        if(provider == "discord"){
            settings.sotreSet('discord_token', token)
            if (mainWindow) mainWindow.reload()
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
        if (process.platform == 'win32' && commandLine.length > 1) {
            // Keep only command line / deep linked arguments
            protoUrl = commandLine[commandLine.length -1];
            processProtoUri(protoUrl);
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
    app.setAsDefaultProtocolClient('fracturedspace')
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
  
    // and load the index.html of the app.
    mainWindow.loadFile('views/home.html')

    // Protocol handler for win32
    if (process.platform == 'win32') {
        // Keep only command line / deep linked arguments
        protoUrl = process.argv.slice(1)
    }
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
    updateWindow.webContents.send('update_error', err);
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