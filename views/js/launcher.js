const child_process = require('child_process');
const path = require('path');
const { ipcRenderer } = require('electron');
const steam = require('./find-steam.js');

module.exports = function (options, callback) {
    steam((folder) => {
        if (!folder) {
            ipcRenderer.invoke("showMessageBox", {
                "title": " ",
                "type": "error",
                "message": "Game failed to start",
                "detail": "Could not find the Fractured Space install folder"
            });
            callback();
            return;
        }

        const exePath = path.join(folder, 'spacegame', 'Binaries', 'Win64', 'Fractured Space.exe');
        console.log("Launching", exePath);

        // Arguments are passed directly (no shell), so the token/language can't inject commands
        const args = [
            '-flhost=https://lifeline.returnvector.net',
            '-discord=' + options.accessToken,
            '-culture=' + options.lang,
        ];

        let reported = false;
        function reportError(error) {
            if (reported) return;
            reported = true;
            console.log(error);
            ipcRenderer.invoke("showMessageBox", {
                "title": " ",
                "type": "error",
                "message": "Game failed to start",
                "detail": String(error).replace(/-discord=\S+/g, "-discord=<removed>")
            });
        }

        const child = child_process.spawn(exePath, args, {
            cwd: path.dirname(exePath),
            env: Object.assign({}, process.env, {
                SteamAppId: '310380',
                OPENSSL_ia32cap: ':~0x20000000',
            }),
            stdio: 'ignore',
            windowsHide: false,
        });
        child.on('error', reportError);
        child.on('exit', (code) => {
            if (code) reportError(new Error(`Game exited with code ${code}`));
        });

        let gameUpChecker = setInterval(() => {
            child_process.exec('tasklist', (error, stdout) => {
                let gameUp = !error && stdout.indexOf('Fractured Space.exe') > -1;
                if (!gameUp) {
                    callback();
                    clearInterval(gameUpChecker);
                }
            });
        }, 5000);
    });
};
