const vdf = require('vdf');
const fs = require('fs');
const path = require('path');

const { isLinux, isWindows } = require('./platform.js');
const settings = require('./settings.js');

// Only require winreg on Windows — it will crash on Linux
let registry = null;
if (isWindows) {
    registry = require('winreg');
}

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
        findSteamFolderLinux(callback);
    } else {
        findSteamFolderWindows(callback);
    }
};

/**
 * Windows: find Steam via the Windows Registry, then search library folders.
 */
function findSteamFolderWindows(callback) {
    let regKey = new registry({
        hive: registry.HKLM,
        key: '\\SOFTWARE\\Wow6432Node\\Valve\\Steam'
    });

    regKey.values((err, items) => {
        if (items === null){
            callback(null)
            return;
        }
        let steamPath = items.filter((item) => {
            return item.name === "InstallPath"
        })[0].value;

        let steamappsPath = steamPath + "/steamapps";

        let matchMainFolder = matchAppManifest(steamappsPath, callback);
        if (matchMainFolder) {
            return;
        }

        searchLibraryFolders(steamappsPath, callback);
    });
}

/**
 * Linux: search well-known Steam paths for the Fractured Space app manifest.
 * Covers native, Flatpak, and Snap installations.
 */
function findSteamFolderLinux(callback) {
    const proton = require('./proton.js');
    const libraryFolders = proton.getAllSteamLibraryFolders();

    for (const steamapps of libraryFolders) {
        if (matchAppManifest(steamapps, callback)) {
            return;
        }
    }

    // Not found in any Steam library — let user set manually
    callback(null);
}

/**
 * Parse libraryfolders.vdf for additional Steam library paths and search each.
 */
function searchLibraryFolders(steamappsPath, callback) {
    try {
        let libraryFolders = fs.readFileSync(steamappsPath + "/libraryfolders.vdf", "utf8");
        let vdfResult = vdf.parse(libraryFolders);
        let root = vdfResult.libraryfolders || vdfResult.LibraryFolders;
        let steamOtherFolders = [];

        if (root) {
            for (const key of Object.keys(root)) {
                const entry = root[key];
                let folderPath = null;
                if (typeof entry === 'string') {
                    folderPath = entry;
                } else if (typeof entry === 'object' && entry.path) {
                    folderPath = entry.path;
                }
                if (folderPath) {
                    steamOtherFolders.push(path.join(folderPath, 'steamapps'));
                }
            }
        }

        for (let i = 0; i < steamOtherFolders.length; i++) {
            let matchFolder = matchAppManifest(steamOtherFolders[i], callback);
            if (matchFolder) {
                return;
            }
        }
    } catch (e) {
        console.log('Failed to parse library folders: ' + e);
    }
}

function matchAppManifest(steamappsPath, callback) {
    const appManifestString = "appmanifest_310380.acf";
    try {
        let appManifests = fs.readdirSync(steamappsPath);

        for (const file of appManifests) {
            if (file === appManifestString) {
                callback(path.normalize(path.join(steamappsPath, 'common', 'Space')));
                return true;
            }
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('Dir not found: ' + err);
        } else {
            throw err;
        }
    }

    return false;
}