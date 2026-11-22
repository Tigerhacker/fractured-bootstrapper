// Sanity check for a user-chosen game folder ("Space"): it must contain the three
// top-level folders of the install. Pure Node, no renderer APIs.
const fs = require('fs');
const path = require('path');

const REQUIRED = ['Engine', 'launcher', 'spacegame'];

function isDir(p) {
    try { return fs.statSync(p).isDirectory(); } catch (e) { return false; }
}

// Names are matched case-insensitively: Windows doesn't care, and on Linux a
// copied install can end up with different casing.
function missingFolders(dir) {
    let names;
    try {
        names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name.toLowerCase());
    } catch (e) {
        return REQUIRED.slice();
    }
    return REQUIRED.filter((r) => !names.includes(r.toLowerCase()));
}

// Returns { ok, missing, suggestion }. `suggestion` is a nearby folder that does
// look like the game folder, for the common mistakes: picking the folder above
// it (steamapps/common), or one of its subfolders (spacegame, Engine, ...).
function checkGameFolder(dir) {
    const missing = missingFolders(dir);
    if (!missing.length) return { ok: true, missing, suggestion: null };
    const candidates = [path.join(dir, 'Space'), path.dirname(dir), path.dirname(path.dirname(dir))];
    const suggestion = candidates.find((c) => c !== dir && isDir(c) && !missingFolders(c).length) || null;
    return { ok: false, missing, suggestion };
}

module.exports = { REQUIRED, checkGameFolder };
