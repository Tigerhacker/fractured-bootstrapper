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

// Finds the real on-disk path of `rel` (e.g. "spacegame/Content/Paks/BP.pak") inside the
// game folder. Returns { path, create, error }; on error, path is null. `create` lists the
// absolute folders (parents first) that must be made before writing to `path`.
//
// Every folder along the way must already exist, unless it is listed in `createDirs`
// (patch_manifest.js). Folders are never created implicitly: a missing one means the
// install is broken or isn't the one we expect. The last part may be missing (it's the file
// we're about to write).
//
// Windows is case-insensitive, so the path is used as is. Elsewhere each part is matched
// case-insensitively, the same way Wine (and so the game) resolves it: a copied install
// can have e.g. "Content/paks", and writing to a new "Content/Paks" beside it would hide
// every pak the game had from Wine. Two entries that differ only in case are an error,
// since Wine would only ever see one of them.
function resolveGamePath(root, rel, { platform = process.platform, createDirs = [] } = {}) {
    const parts = String(rel).split(/[\\/]+/).filter(Boolean);
    const creatable = new Set(createDirs.map(normRel));
    const create = [];
    let cur = root;
    let exists = true; // false once we're inside a folder that is still to be created
    for (let i = 0; i < parts.length; i++) {
        const want = parts[i];
        const last = i === parts.length - 1;
        const shown = parts.slice(0, i + 1).join('/');
        const missing = () => {
            if (last) return null;
            if (!creatable.has(normRel(shown))) return { path: null, create: [], error: `Missing folder: ${shown}` };
            create.push(cur);
            exists = false;
            return null;
        };

        if (!exists) {
            cur = path.join(cur, want);
            const err = missing();
            if (err) return err;
            continue;
        }

        if (platform === 'win32') {
            cur = path.join(cur, want);
            if (last) continue;
            if (fs.existsSync(cur)) {
                if (!isDir(cur)) return { path: null, create: [], error: `Not a folder: ${shown}` };
                continue;
            }
            const err = missing();
            if (err) return err;
            continue;
        }

        let names;
        try {
            names = fs.readdirSync(cur);
        } catch (e) {
            return { path: null, create: [], error: `Can't read folder: ${parts.slice(0, i).join('/') || '.'} (${e.code || e.message})` };
        }
        const matches = names.filter((n) => n.toLowerCase() === want.toLowerCase());
        if (matches.length > 1) {
            const parent = parts.slice(0, i).join('/');
            const list = matches.map((n) => (parent ? parent + '/' : '') + n).join(', ');
            return {
                path: null,
                create: [],
                error: `These differ only in upper/lower case: ${list}. The game only sees one of them; move everything into "${shown}" and delete the other.`,
            };
        }
        if (!matches.length) {
            cur = path.join(cur, want);
            const err = missing();
            if (err) return err;
            continue;
        }
        cur = path.join(cur, matches[0]);
        if (!last && !isDir(cur)) return { path: null, create: [], error: `Not a folder: ${shown}` };
    }
    return { path: cur, create, error: null };
}

function normRel(p) {
    return String(p).split(/[\\/]+/).filter(Boolean).join('/').toLowerCase();
}

// Resolves several paths at once. Returns { paths: { rel: absPath }, create: [absDir], errors: [string] }.
function resolveGamePaths(root, rels, options) {
    const paths = {};
    const create = [];
    const errors = [];
    for (const rel of rels) {
        const r = resolveGamePath(root, rel, options);
        if (r.error) {
            if (!errors.includes(r.error)) errors.push(r.error);
        } else {
            paths[rel] = r.path;
            for (const d of r.create) if (!create.includes(d)) create.push(d);
        }
    }
    return { paths, create, errors };
}

const GAME_EXE = 'spacegame/Binaries/Win64/Fractured Space.exe';

module.exports = { REQUIRED, GAME_EXE, checkGameFolder, resolveGamePath, resolveGamePaths };
