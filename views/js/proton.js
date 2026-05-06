const fs = require('fs');
const path = require('path');
const { isLinux, homeDir } = require('./platform.js');

const PROTON_PREFIX_DIR = path.join(homeDir, '.local', 'share', 'FracturedSpace-proton-prefix');

/**
 * Returns an array of candidate Steam root directories for the current system.
 * Covers native, Flatpak, and Snap installations.
 */
function getSteamRootCandidates() {
    if (!isLinux) return [];

    return [
        // Native installs
        path.join(homeDir, '.local', 'share', 'Steam'),
        path.join(homeDir, '.steam', 'steam'),
        path.join(homeDir, '.steam', 'root'),
        // Flatpak
        path.join(homeDir, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam'),
        path.join(homeDir, '.var', 'app', 'com.valvesoftware.Steam', 'data', 'Steam'),
        // Snap
        path.join(homeDir, 'snap', 'steam', 'common', '.steam', 'steam'),
        path.join(homeDir, 'snap', 'steam', 'common', '.local', 'share', 'Steam'),
    ];
}

/**
 * Find the actual Steam root directory by checking candidates for the presence
 * of a steamapps folder.
 */
function findSteamRoot() {
    const candidates = getSteamRootCandidates();
    for (const candidate of candidates) {
        try {
            const steamapps = path.join(candidate, 'steamapps');
            if (fs.existsSync(steamapps) && fs.statSync(steamapps).isDirectory()) {
                // Resolve symlinks to get the real path
                return fs.realpathSync(candidate);
            }
        } catch (e) {
            // skip inaccessible paths
        }
    }
    return null;
}

/**
 * Get all unique Steam library folder paths (including the main one).
 * Parses libraryfolders.vdf from each Steam root candidate.
 */
function getAllSteamLibraryFolders() {
    const vdf = require('vdf');
    const seen = new Set();
    const folders = [];

    const candidates = getSteamRootCandidates();
    for (const candidate of candidates) {
        try {
            const realPath = fs.realpathSync(candidate);
            if (seen.has(realPath)) continue;

            const steamapps = path.join(realPath, 'steamapps');
            if (!fs.existsSync(steamapps)) continue;

            seen.add(realPath);
            folders.push(steamapps);

            // Parse libraryfolders.vdf for additional library paths
            const vdfPath = path.join(steamapps, 'libraryfolders.vdf');
            if (fs.existsSync(vdfPath)) {
                const content = fs.readFileSync(vdfPath, 'utf8');
                const parsed = vdf.parse(content);
                const root = parsed.libraryfolders || parsed.LibraryFolders;
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
                            const libSteamapps = path.join(folderPath, 'steamapps');
                            try {
                                const realLib = fs.realpathSync(libSteamapps);
                                if (!seen.has(realLib) && fs.existsSync(realLib)) {
                                    seen.add(realLib);
                                    folders.push(realLib);
                                }
                            } catch (e) {
                                // skip
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // skip inaccessible paths
        }
    }

    return folders;
}

/**
 * Check if a directory contains a `proton` executable script.
 */
function isProtonDir(dirPath) {
    const protonScript = path.join(dirPath, 'proton');
    try {
        return fs.existsSync(protonScript) && fs.statSync(protonScript).isFile();
    } catch (e) {
        return false;
    }
}

/**
 * Discover all installed Proton versions across all Steam installations.
 * Scans:
 *   - steamapps/common/Proton* (official Valve Proton)
 *   - compatibilitytools.d/* (GE-Proton, custom builds)
 *
 * Returns an array of { name: string, path: string }
 */
function findInstalledProtonVersions() {
    if (!isLinux) return [];

    const seen = new Set();
    const versions = [];

    // Scan steamapps/common for official Proton installs
    const libraryFolders = getAllSteamLibraryFolders();
    for (const steamapps of libraryFolders) {
        const commonDir = path.join(steamapps, 'common');
        try {
            if (!fs.existsSync(commonDir)) continue;
            const entries = fs.readdirSync(commonDir);
            for (const entry of entries) {
                if (!entry.toLowerCase().startsWith('proton')) continue;
                const fullPath = path.join(commonDir, entry);
                try {
                    const realPath = fs.realpathSync(fullPath);
                    if (seen.has(realPath)) continue;
                    if (fs.statSync(realPath).isDirectory() && isProtonDir(realPath)) {
                        seen.add(realPath);
                        versions.push({ name: entry, path: realPath });
                    }
                } catch (e) {
                    // skip
                }
            }
        } catch (e) {
            // skip
        }
    }

    // Scan compatibilitytools.d for GE-Proton / custom builds
    const compatToolsDirs = new Set();
    const candidates = getSteamRootCandidates();
    for (const candidate of candidates) {
        try {
            const toolsDir = path.join(fs.realpathSync(candidate), 'compatibilitytools.d');
            if (fs.existsSync(toolsDir) && fs.statSync(toolsDir).isDirectory()) {
                compatToolsDirs.add(toolsDir);
            }
        } catch (e) {
            // skip
        }
    }

    for (const toolsDir of compatToolsDirs) {
        try {
            const entries = fs.readdirSync(toolsDir);
            for (const entry of entries) {
                const fullPath = path.join(toolsDir, entry);
                try {
                    const realPath = fs.realpathSync(fullPath);
                    if (seen.has(realPath)) continue;
                    if (fs.statSync(realPath).isDirectory() && isProtonDir(realPath)) {
                        seen.add(realPath);
                        versions.push({ name: entry, path: realPath });
                    }
                } catch (e) {
                    // skip
                }
            }
        } catch (e) {
            // skip
        }
    }

    // Sort: "Proton Experimental" first, then by name descending (newest first)
    versions.sort((a, b) => {
        if (a.name === 'Proton Experimental') return -1;
        if (b.name === 'Proton Experimental') return 1;
        return b.name.localeCompare(a.name, undefined, { numeric: true });
    });

    return versions;
}

/**
 * Returns the path to the `proton` script inside a Proton directory.
 */
function getProtonExecutable(protonPath) {
    return path.join(protonPath, 'proton');
}

/**
 * Ensures the Proton prefix directory exists and returns its path.
 */
function getOrCreatePrefix() {
    if (!fs.existsSync(PROTON_PREFIX_DIR)) {
        fs.mkdirSync(PROTON_PREFIX_DIR, { recursive: true });
    }
    return PROTON_PREFIX_DIR;
}

module.exports = {
    findInstalledProtonVersions,
    getProtonExecutable,
    getOrCreatePrefix,
    findSteamRoot,
    getSteamRootCandidates,
    getAllSteamLibraryFolders,
    PROTON_PREFIX_DIR
};
