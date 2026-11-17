const fs = require('fs');
const path = require('path');

const settings = require('./settings.js');
const { isLinux } = require('./platform.js');
const steamPaths = require('./steam-paths.js');

module.exports = function findSteamFolder(callback) {
    let override = settings.sotreGetFolder();
    if (override !== undefined){
        callback(path.normalize(override));
        return;
    }

    if (fs.existsSync("Space")) {
        callback("Space");
        return;
    }

    if (isLinux) {
        findLinux(callback);
    } else {
        findWindows(callback);
    }
};

function findInLibraries(candidates) {
    for (const candidate of candidates) {
        if (steamPaths.hasAppManifest(candidate)) {
            return path.normalize(path.join(candidate, "common", "Space"));
        }
    }
    return null;
}

function findLinux(callback) {
    callback(findInLibraries(steamPaths.linuxSteamLibraries()));
}

function findWindows(callback) {
    // winreg is Windows only, so only load it here
    const registry = require('winreg');
    let regKey = new registry({
        hive: registry.HKLM,
        key: '\\SOFTWARE\\Wow6432Node\\Valve\\Steam'
    });

    regKey.values((err, items) => {
        const installPath = !err && Array.isArray(items)
            ? items.find((item) => item.name === "InstallPath")
            : undefined;
        if (!installPath) {
            callback(null);
            return;
        }

        const steamappsPath = path.join(installPath.value, "steamapps");
        const candidates = [steamappsPath].concat(steamPaths.readLibraryFolders(steamappsPath));
        callback(findInLibraries(candidates));
    });
}
