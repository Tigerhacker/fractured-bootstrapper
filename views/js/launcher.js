const child_process = require('child_process');
const path = require('path');
const steam = require('./find-steam.js');
const { isLinux, isWindows } = require('./platform.js');
const settings = require('./settings.js');

module.exports = function (options, callback) {
    steam((folder) => {
        if (isLinux) {
            launchLinux(folder, options, callback);
        } else {
            launchWindows(folder, options, callback);
        }
    });
};

function launchWindows(folder, options, callback) {
    let launchPath = '"' + folder.replace(/\\\\/g, "/") + '/spacegame/Binaries/Win64/Fractured Space.exe"';
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>")
    console.log(launchPath)
    console.log(folder)

    let guid = $('#hidden-guid').val();
    let username = $('#hidden-username').val();
    let host = '-flhost=https://lifeline.returnvector.net';
    let langParam = '-culture=' + options.lang;
    let auth = '-discord=' + options.accessToken;
    let launchCmd = `set SteamAppId=310380 & set OPENSSL_ia32cap=:~0x20000000 & ${launchPath} ${host} ${auth} ${langParam}`;

    child_process.exec(launchCmd,
        (error, stdout, stderr) => {
            console.log(error);
            console.log(stdout);
            console.log(stderr);

            if(error){
                ipcRenderer.invoke("showMessageBox", {
                    "title": " ",
                    "type": "error",
                    "message": "Game failed to start",
                    "detail": error.toString().replace(/-discord=\S+/g, "-discord=<removed>")
                });
            }
        });


    let gameUpChecker = setInterval(() => {
        child_process.exec('tasklist', (error, stdout) => {
            let gameUp = stdout.indexOf('Fractured Space.exe') > -1;
            if (!gameUp || error) {
                callback();
                clearInterval(gameUpChecker);
            }
        });
    }, 5000);
}

function launchLinux(folder, options, callback) {
    const proton = require('./proton.js');

    // Get the selected Proton version path from settings
    let protonPath = settings.sotreGet('proton_version_path');
    if (!protonPath) {
        ipcRenderer.invoke("showMessageBox", {
            "title": " ",
            "type": "error",
            "message": "No Proton version selected",
            "detail": "Please select a Proton version from the dropdown before launching."
        });
        callback();
        return;
    }

    let steamRoot = proton.findSteamRoot();
    if (!steamRoot) {
        // Fallback — try common paths
        steamRoot = path.join(require('./platform.js').homeDir, '.steam', 'root');
    }

    let protonExe = proton.getProtonExecutable(protonPath);
    let prefixPath = proton.getOrCreatePrefix();

    let exePath = path.join(folder, 'spacegame', 'Binaries', 'Win64', 'Fractured Space.exe');
    let host = '-flhost=https://lifeline.returnvector.net';
    let langParam = '-culture=' + options.lang;
    let auth = '-discord=' + options.accessToken;

    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>")
    console.log("Proton:", protonExe)
    console.log("Prefix:", prefixPath)
    console.log("Exe:", exePath)
    console.log("Steam Root:", steamRoot)

    let env = Object.assign({}, process.env, {
        'STEAM_COMPAT_DATA_PATH': prefixPath,
        'STEAM_COMPAT_CLIENT_INSTALL_PATH': steamRoot,
        'SteamAppId': '310380',
        'SteamGameId': '310380'
    });

    let child = child_process.spawn(protonExe, [
        'run', exePath, host, auth, langParam
    ], {
        env: env,
        stdio: 'pipe'
    });

    child.stdout.on('data', (data) => {
        console.log('stdout:', data.toString());
    });

    child.stderr.on('data', (data) => {
        console.log('stderr:', data.toString());
    });

    child.on('error', (error) => {
        console.log('Launch error:', error);
        ipcRenderer.invoke("showMessageBox", {
            "title": " ",
            "type": "error",
            "message": "Game failed to start",
            "detail": error.toString().replace(/-discord=\S+/g, "-discord=<removed>")
        });
    });

    child.on('close', (code) => {
        console.log('Game process exited with code:', code);
    });

    // Monitor the game process using pgrep on Linux
    let gameUpChecker = setInterval(() => {
        child_process.exec('pgrep -f "Fractured Space.exe"', (error, stdout) => {
            let gameUp = stdout && stdout.trim().length > 0;
            if (!gameUp || error) {
                callback();
                clearInterval(gameUpChecker);
            }
        });
    }, 5000);
}