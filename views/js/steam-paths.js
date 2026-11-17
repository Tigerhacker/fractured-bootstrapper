// Steam install / library discovery shared by Windows and Linux.
const fs = require('fs');
const path = require('path');
const os = require('os');

const APP_ID = '310380';
const APP_MANIFEST = `appmanifest_${APP_ID}.acf`;

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

function hasAppManifest(steamappsPath, manifest = APP_MANIFEST) {
    try {
        return fs.existsSync(path.join(steamappsPath, manifest));
    } catch (err) {
        return false;
    }
}

// Reads a single top-level "key" "value" pair out of a VDF/ACF file
function readVdfValue(file, key) {
    try {
        const text = fs.readFileSync(file, 'utf8');
        const m = text.match(new RegExp('^\\s*"' + key + '"\\s+"([^"]*)"', 'mi'));
        return m ? m[1] : null;
    } catch (e) {
        return null;
    }
}

function isDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    } catch (e) {
        return false;
    }
}

function realpath(p) {
    try {
        return fs.realpathSync(p);
    } catch (e) {
        return null;
    }
}

// Candidate Steam root folders on Linux: native (Ubuntu/Debian deb, Fedora rpm, Arch, Bazzite),
// Flatpak and Snap installs. Several of these are usually symlinks to the same place.
function linuxSteamRootCandidates() {
    const home = os.homedir();
    return [
        path.join(home, '.local', 'share', 'Steam'),
        path.join(home, '.steam', 'steam'),
        path.join(home, '.steam', 'root'),
        path.join(home, '.steam', 'debian-installation'),
        path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam'),
        path.join(home, '.var', 'app', 'com.valvesoftware.Steam', 'data', 'Steam'),
        path.join(home, 'snap', 'steam', 'common', '.local', 'share', 'Steam'),
        path.join(home, 'snap', 'steam', 'common', '.steam', 'steam'),
    ];
}

// Unique, resolved Steam root folders that actually contain a steamapps folder
function linuxSteamRoots() {
    const seen = new Set();
    const roots = [];
    for (const candidate of linuxSteamRootCandidates()) {
        const real = realpath(candidate);
        if (!real || seen.has(real)) continue;
        if (!isDir(path.join(real, 'steamapps'))) continue;
        seen.add(real);
        roots.push(real);
    }
    return roots;
}

// Every steamapps folder of every Steam library on Linux (main + extra libraries)
function linuxSteamLibraries() {
    const seen = new Set();
    const libs = [];
    function add(steamapps) {
        const real = realpath(steamapps);
        if (!real || seen.has(real) || !isDir(real)) return;
        seen.add(real);
        libs.push(real);
    }
    for (const root of linuxSteamRoots()) {
        const steamapps = path.join(root, 'steamapps');
        add(steamapps);
        readLibraryFolders(steamapps).forEach(add);
    }
    return libs;
}

module.exports = {
    APP_ID,
    APP_MANIFEST,
    readLibraryFolders,
    hasAppManifest,
    readVdfValue,
    isDir,
    realpath,
    linuxSteamRoots,
    linuxSteamLibraries,
};
