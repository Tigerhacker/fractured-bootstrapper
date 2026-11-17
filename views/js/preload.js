const installer = require('./installer.js');
const launcher = require('./launcher.js');
const helper = require('./helper.js');
const settings = require('./settings.js');
const steam = require('./find-steam.js')
const platform = require('./platform.js');

window.interop = {};
window.interop.isInstalled = installer.isInstalled;
window.interop.installFiles = installer.install;
window.interop.validateFiles = installer.validate;
window.interop.launchGame = launcher;

window.interop.openBrowser = helper.openExternal;

window.interop.settingSet = settings.sotreSet;
window.interop.settingGet = settings.sotreGet;
window.interop.settingDel = settings.sotreDel;
window.interop.settingGetFolder = settings.sotreGetFolder;

window.interop.isTokenValid = helper.isTokenValid;

window.interop.steam = steam;

// Platform
window.interop.isLinux = platform.isLinux;
window.interop.isWindows = platform.isWindows;
window.interop.platform = platform.platform;
window.interop.showLinuxSettings = platform.showLinuxSettings();

// Linux (Proton/Wine). The module is safe to load on Windows, it just finds nothing,
// which lets the Linux settings be previewed there for debugging.
window.interop.linux = require('./proton.js');

// Debug helpers, use from the developer tools console (ctrl+i)
window.fsDebug = {
    // Show/hide the Linux-only settings on any platform (persisted)
    showLinuxSettings(show = true) {
        if (show) settings.sotreSet(platform.DEBUG_LINUX_SETTING, true);
        else settings.sotreDel(platform.DEBUG_LINUX_SETTING);
        location.reload();
    },
    // What would be executed on Launch (Linux), with the token removed
    describeLaunch() {
        return new Promise((resolve) => {
            steam((folder) => {
                try {
                    const l = window.interop.linux.buildLaunch(folder || '/path/to/Space', ['-discord=<removed>']);
                    const extraEnv = Object.keys(l.env)
                        .filter((k) => /^(STEAM|Steam|PROTON|WINE|OPENSSL|DXVK|VKD3D)/.test(k))
                        .reduce((o, k) => Object.assign(o, { [k]: l.env[k] }), {});
                    resolve({ command: l.command, args: l.args, cwd: l.cwd, env: extraEnv, runtime: l.runtime, logFile: l.logFile });
                } catch (e) {
                    resolve({ error: e.message });
                }
            });
        });
    },
};
