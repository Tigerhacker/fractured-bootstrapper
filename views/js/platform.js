const os = require('os');
const path = require('path');

const platform = process.platform;
const isLinux = platform === 'linux';
const isWindows = platform === 'win32';

const DEBUG_LINUX_SETTING = 'debug_show_linux_settings';

// The Linux-only UI is shown on Linux, or anywhere when forced for debugging via:
//   - command line flag:   --show-linux-settings   (forwarded to the renderer by main.js)
//   - environment:         FS_SHOW_LINUX_SETTINGS=1
//   - devtools console:    fsDebug.showLinuxSettings()   (persisted, undo with fsDebug.showLinuxSettings(false))
function showLinuxSettings() {
    if (isLinux) return true;
    if (process.argv.includes('--show-linux-settings')) return true;
    if (process.env.FS_SHOW_LINUX_SETTINGS === '1') return true;
    try {
        return require('./settings.js').sotreGet(DEBUG_LINUX_SETTING) === true;
    } catch (e) {
        return false;
    }
}

// $XDG_DATA_HOME/fractured-space-bootstrapper (normally ~/.local/share/fractured-space-bootstrapper)
function linuxDataDir() {
    const base = process.env.XDG_DATA_HOME && path.isAbsolute(process.env.XDG_DATA_HOME)
        ? process.env.XDG_DATA_HOME
        : path.join(os.homedir(), '.local', 'share');
    return path.join(base, 'fractured-space-bootstrapper');
}

module.exports = {
    platform,
    isLinux,
    isWindows,
    homeDir: os.homedir(),
    showLinuxSettings,
    linuxDataDir,
    DEBUG_LINUX_SETTING,
};
