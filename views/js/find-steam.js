const registry = require('winreg');
const fs = require('fs');
const path = require('path');

const settings = require('./settings.js');

const APP_MANIFEST = "appmanifest_310380.acf";

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
        const candidates = [steamappsPath].concat(readLibraryFolders(steamappsPath));

        for (const candidate of candidates) {
            if (hasAppManifest(candidate)) {
                callback(path.normalize(path.join(candidate, "common", "Space")));
                return;
            }
        }

        callback(null);
    });
};

// Returns the steamapps folders of all extra Steam libraries.
// Handles both the old ("1" "D:\\Lib") and new ("path" "D:\\Lib") libraryfolders.vdf formats.
function readLibraryFolders(steamappsPath) {
    let text;
    try {
        text = fs.readFileSync(path.join(steamappsPath, "libraryfolders.vdf"), "utf8");
    } catch (err) {
        console.log('libraryfolders.vdf not readable: ' + err);
        return [];
    }

    const folders = [];
    const re = /^\s*"(path|\d+)"\s+"([^"]+)"\s*$/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
        const folder = m[2].replace(/\\\\/g, "\\");
        if (m[1] === "path" || /[\\\/]/.test(folder)) {
            folders.push(path.join(folder, "steamapps"));
        }
    }
    return folders;
}

function hasAppManifest(steamappsPath) {
    try {
        return fs.existsSync(path.join(steamappsPath, APP_MANIFEST));
    } catch (err) {
        return false;
    }
}
