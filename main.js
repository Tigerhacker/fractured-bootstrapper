const {app, BrowserWindow, ipcMain, dialog, session, cookies} = require('electron');
const {autoUpdater} = require("electron-updater");
const pug = require('pug');
const request = require('request');


let mainWindow, updateWindow;
let appPath = app.getAppPath();

async function createWelcomeWindow () {
    app.setAsDefaultProtocolClient('fracturedspace')
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: appPath + '/views/js/preload.js',
        // nodeIntegration: false,
        // contextIsolation: false
    }
    })
  
    // and load the index.html of the app.
    mainWindow.loadFile('index.html')
  
    // Open the DevTools.
    mainWindow.webContents.openDevTools()
  
    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null
    })
  }
  

async function createDiscordWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            preload: appPath + '/views/js/preload.js',
            nodeIntegration: false,
            contextIsolation: false
        }
    });

    mainWindow.loadURL('https://google.com/');
    // mainWindow.loadURL('http://localhost/');

    // mainWindow.removeMenu();
    mainWindow.webContents.openDevTools();
    // mainWindow.maximize();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    let cookies = session.defaultSession.cookies;
    cookies.on('changed', function (event, cookie, cause, removed) {
        if (!cookie.session || removed) {
            return;
        }

        let url = `${(!cookie.httpOnly && cookie.secure) ? 'https' : 'http'}://${cookie.domain}${cookie.path}`;
        cookies.set({
            url: url,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: Math.floor(new Date().getTime() / 1000) + 1209600
        }, function (err) {
            if (err) console.log(err);
        });
    });

}

async function createUpdateWindow() {
    updateWindow = new BrowserWindow({
        width: 500,
        height: 200,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    let params = {
        title: 'Launcher'
    };

    let html = pug.renderFile(appPath + '/views/update.pug', params);
    updateWindow.loadURL('data:text/html,' + encodeURIComponent(html), {
        baseURLForDataURL: `file://${appPath}/views/`
    });

    updateWindow.removeMenu();

    updateWindow.on('closed', function () {
        updateWindow = null;
    });
}

app.on('ready', async () => {
    await createUpdateWindow();
    autoUpdater.checkForUpdates();
});

autoUpdater.on('checking-for-update', () => {
    updateWindow.webContents.send('update', 'Checking for updates', '...');
});

autoUpdater.on('update-available', (info) => {
    updateWindow.webContents.send('update', 'Update found', '...');
});

autoUpdater.on('update-not-available', async (info) => {
    // await createDiscordWindow();
    await createWelcomeWindow();
    updateWindow.close();
});

autoUpdater.on('error', (err) => {
    updateWindow.webContents.send('update', 'Error when updating', JSON.stringify(err));
});

autoUpdater.on('download-progress', (progress) => {
    let progressMsg = `Progress: ${progress.percent} (${progress.transferred} / ${progress.total})`;
    updateWindow.webContents.send('update', 'Downloading', progressMsg);
});

autoUpdater.on('update-downloaded', (info) => {
    autoUpdater.quitAndInstall();
});