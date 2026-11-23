const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const steam = require('./find-steam.js');
const { isLinux } = require('./platform.js');
const { GAME_EXE, resolveGamePath, resolveGamePaths } = require('./game-folder.js');
const { dataMapping, createDirs } = require('./patch_manifest.js');

function redact(text) {
    return String(text).replace(/-discord=[^\s"]+/g, "-discord=<removed>");
}

function showLaunchError(error) {
    console.log(error);
    ipcRenderer.invoke("showMessageBox", {
        "title": " ",
        "type": "error",
        "message": "Game failed to start",
        "detail": redact(error && error.message ? error.message : error)
    });
}

const ONLINE_BACKEND = 'https://lifeline.returnvector.net';
const OFFLINE_NAME = 'Captain';

// Read by the patched gamemodes-config.js (async requests that fail safe), so the game's mode
// picker can lock the Online tile when the game is talking to the offline emulator.
// Overwritten before every launch (online launches write {offline: false}) and removed once
// the game exits. An offline flag also names the running emulator's launch-check URL and a
// per-run nonce; the game only locks Online if that URL answers with the same nonce, so a file
// left behind by a crash or hard reboot (dead port, old nonce) can never block online play.
// Not in patch_manifest.js: it isn't validated.
const LAUNCH_FLAG = 'spacegame/Content/UIResources/frontend/views/gamemodes/bootstrapper-launch.json';

function writeLaunchFlag(folder, emulator) {
    const { path: flagPath, error } = resolveGamePath(folder, LAUNCH_FLAG);
    if (error) {
        console.log('Could not write the launch flag:', error);
        return () => {};
    }
    const flag = emulator && emulator.launchCheck && emulator.nonce
        ? { offline: true, check: emulator.launchCheck, nonce: emulator.nonce }
        : { offline: false };
    try {
        fs.writeFileSync(flagPath, JSON.stringify(flag));
    } catch (e) {
        // Not fatal: the game just shows its normal (online) mode list
        console.log('Could not write the launch flag:', e.message);
        return () => {};
    }
    return () => {
        try { fs.unlinkSync(flagPath); } catch (e) { /* already gone */ }
    };
}

// options: { accessToken, lang, offline }
// Offline: the local Fireline emulator (main process) is started first and the game is pointed at
// it; it is stopped again once the game has exited.
module.exports = function (options, callback) {
    steam(async (folder) => {
        if (!folder) {
            showLaunchError("Could not find the Fractured Space install folder");
            callback();
            return;
        }

        // A missing (or, on Linux, case-duplicated) folder means the game would start without
        // its content and quit on a black screen, so stop here with the reason instead.
        // createDirs folders are allowed to be missing here; the validation step catches their files.
        const { errors } = resolveGamePaths(folder, [GAME_EXE, ...dataMapping.map((v) => v.dest)], { createDirs });
        if (errors.length) {
            showLaunchError(`${errors.join("\n\n")}\n\nThe game install looks incomplete or damaged. Verify the game files in Steam (Properties > Installed Files), then install the patch again.`);
            callback();
            return;
        }

        let backend = ONLINE_BACKEND;
        let done = callback;
        let emulator = null;
        if (options.offline) {
            try {
                emulator = await ipcRenderer.invoke('fireline_start');
                backend = emulator.url;
                console.log('Offline mode: local Fireline emulator at', backend, `(${emulator.entries} recordings)`);
            } catch (e) {
                showLaunchError(e);
                callback();
                return;
            }
            done = () => {
                ipcRenderer.invoke('fireline_stop').catch(() => {});
                callback();
            };
        }

        const removeLaunchFlag = writeLaunchFlag(folder, emulator);
        const finish = done;
        done = () => {
            removeLaunchFlag();
            finish();
        };

        // Arguments are passed directly (no shell), so the token/language can't inject commands.
        // Offline: the real token and name are never sent anywhere. The emulator ignores the value,
        // but the game still needs one to use the Discord auth path, so use the placeholder name.
        const args = [
            '-flhost=' + backend,
            '-discord=' + (options.offline ? OFFLINE_NAME : options.accessToken),
            '-culture=' + options.lang,
        ];

        if (isLinux) {
            launchLinux(folder, args, done);
        } else {
            launchWindows(folder, args, done);
        }
    });
};

function launchWindows(folder, args, callback) {
    const exePath = resolveGamePath(folder, GAME_EXE).path || path.join(folder, GAME_EXE);
    console.log("Launching", exePath);

    let reported = false;
    function reportError(error) {
        if (reported) return;
        reported = true;
        showLaunchError(error);
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
}

function launchLinux(folder, gameArgs, callback) {
    const proton = require('./proton.js');

    let launch;
    try {
        launch = proton.buildLaunch(folder, gameArgs);
    } catch (e) {
        showLaunchError(e);
        callback();
        return;
    }

    // Everything Proton/Wine prints goes to a log file the user can attach to a bug report
    let logFd = 'ignore';
    try {
        fs.mkdirSync(path.dirname(launch.logFile), { recursive: true });
        logFd = fs.openSync(launch.logFile, 'w');
        const header = [
            `# ${new Date().toISOString()}`,
            `# runner:  ${launch.runner.name} (${launch.runner.path})`,
            `# runtime: ${launch.runtime ? (launch.runtime.entryPoint || (launch.runtime.disabled ? 'disabled' : 'none')) : 'n/a'}`,
            `# prefix:  ${launch.compatData}`,
            ...(launch.steamHome ? [`# HOME:    ${launch.steamHome} (Flatpak Steam, or set in extra env)`] : []),
            `# command: ${redact([launch.command, ...launch.args].map((a) => JSON.stringify(a)).join(' '))}`,
            '',
        ].join('\n');
        fs.writeSync(logFd, header + '\n');
    } catch (e) {
        console.log('Could not open launch log', e);
        logFd = 'ignore';
    }

    console.log("Launching", launch.command, redact(launch.args.join(' ')));
    let done = false;
    function finish() {
        if (done) return;
        done = true;
        if (typeof logFd === 'number') {
            try { fs.closeSync(logFd); } catch (e) { /* ignore */ }
        }
        callback();
    }

    let child;
    try {
        fs.mkdirSync(launch.compatData, { recursive: true });
        child = child_process.spawn(launch.command, launch.args, {
            cwd: launch.cwd,
            env: launch.env,
            stdio: ['ignore', logFd, logFd],
        });
    } catch (e) {
        showLaunchError(e);
        finish();
        return;
    }

    child.on('error', (e) => {
        showLaunchError(e);
        finish();
    });
    // Proton (waitforexitandrun) and wine both stay alive until the game closes
    child.on('exit', (code, signal) => {
        console.log('Game process exited', code, signal);
        // Same as Windows: any non-zero exit is reported. (Startup inside the runtime container
        // can take well over 30s, so "failed quickly" isn't a usable signal.)
        if (code) {
            showLaunchError(new Error(
                `The game (via ${launch.runner.name}) exited with code ${code}.\n\n` +
                `See the launch log for details:\n${launch.logFile}`
            ));
        }
        finish();
    });
}
