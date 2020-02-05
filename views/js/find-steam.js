const registry = require('winreg');
const vdf = require('vdf');
const fs = require('fs');

const settings = require('./settings.js');

module.exports = function findSteamFolder(callback) {
    let override = settings.sotreGetFolder();
    if (override !== undefined){
        callback(override.replace(/\\/g, "/"));
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
        let steamPath = items.filter((item) => {
            return item.name === "InstallPath"
        })[0].value;

        let steamappsPath = steamPath + "/steamapps";

        let matchMainFolder = matchAppManifest(steamappsPath, callback);
        if (matchMainFolder) {
            return;
        }

        let libraryFolders = fs.readFileSync(steamappsPath + "/libraryfolders.vdf", "utf8");
        let vdfResult = vdf.parse(libraryFolders);
        let steamOtherFolders = [];
        for (let i = 1; true; i++) {
            let steamFolder = vdfResult.LibraryFolders[i];
            if (steamFolder) {
                steamOtherFolders.push(steamFolder + "/steamapps");
            } else {
                break;
            }
        }

        for (let i = 0; i < steamOtherFolders.length; i++) {
            let matchFolder = matchAppManifest(steamOtherFolders[i], callback);
            if (matchFolder) {
                return;
            }
        }
    });
};


function matchAppManifest(steamappsPath, callback) {
    const appManifestString = "appmanifest_310380.acf";
    try {
        let appManifests = fs.readdirSync(steamappsPath);

        appManifests.forEach(function (file) {
            if (file === appManifestString) {
                callback(steamappsPath.replace(/\\\\/g, "/") + "/common/Space");
                return true;
            }
        });
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('Dir not found: ' + err);
        } else {
            throw err;
        }
    }

    return false;
}