#!/usr/bin/env node
// Pak inspection / diff tool. See docs/patching.md.
//
//   node scripts/pak.js list    <pak>
//   node scripts/pak.js extract <pak> <outDir> [prefix...]
//   node scripts/pak.js diff    <base.pak> <modified.pak|dir> [prefix...]
//   node scripts/pak.js mkpatch <base.pak> <modified.pak|dir> <patchDir> <target> [prefix...]
//
// `prefix` filters entries by path prefix (e.g. HUD/W_Killcam). `mkpatch` writes
// <patchDir>/patch.json (+ files/ for whole-asset replacements) describing how
// to turn the base entries into the modified ones. Edit title/description after.
// <modified> may be a folder of loose assets laid out by pak path (as `extract`
// writes them); files it does not contain are treated as unchanged.

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { openPak, readEntry } = require('./lib/pak');
const { hex, patchTargets, readPatchFile } = require('./lib/patchfmt');

// Same-size changes with at most this many differing runs become byte edits;
// anything else is stored as a whole replacement file.
const MAX_EDIT_RUNS = 128;
// Differences closer than this are merged into one run.
const RUN_GAP = 8;

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const matches = (name, prefixes) => !prefixes.length || prefixes.some((p) => name.startsWith(p));

function diffRuns(a, b) {
    const runs = [];
    for (let i = 0; i < a.length; i++) {
        if (a[i] === b[i]) continue;
        const last = runs[runs.length - 1];
        if (last && i - last[1] <= RUN_GAP) last[1] = i + 1;
        else runs.push([i, i + 1]);
    }
    return runs;
}

function walk(dir, rel = '') {
    return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((d) => {
        const r = rel ? `${rel}/${d.name}` : d.name;
        return d.isDirectory() ? walk(dir, r) : [r];
    });
}

// The "modified" side is either a pak, or a folder of loose assets laid out by
// pak path (e.g. work/HUD/W_Killcam.uasset). A folder only overrides: files it
// doesn't contain count as unchanged, not removed.
function openModified(p) {
    if (fs.statSync(p).isDirectory()) {
        return { names: walk(p).sort(), read: (n) => fs.readFileSync(path.join(p, n)), overlay: true };
    }
    const pak = openPak(p);
    const byName = new Map(pak.entries.map((e) => [e.name, e]));
    return { names: pak.entries.map((e) => e.name), read: (n) => readEntry(pak, byName.get(n)), overlay: false };
}

function changedEntries(basePak, mod, prefixes) {
    const base = new Map(basePak.entries.map((e) => [e.name, e]));
    const out = [];
    for (const name of mod.names) {
        if (!matches(name, prefixes)) continue;
        const b = base.get(name);
        const m = mod.read(name);
        if (!b) { out.push({ name, added: true, mod: m }); continue; }
        const o = readEntry(basePak, b);
        if (!o.equals(m)) out.push({ name, base: o, mod: m });
    }
    if (!mod.overlay) {
        const modNames = new Set(mod.names);
        for (const e of basePak.entries) {
            if (matches(e.name, prefixes) && !modNames.has(e.name)) out.push({ name: e.name, removed: true });
        }
    }
    return out;
}

function describe(c) {
    if (c.added) return `ADDED    ${c.name} (${c.mod.length} bytes)`;
    if (c.removed) return `REMOVED  ${c.name}`;
    if (c.base.length !== c.mod.length) return `RESIZED  ${c.name} ${c.base.length} -> ${c.mod.length}`;
    const runs = diffRuns(c.base, c.mod);
    const n = runs.reduce((t, [s, e]) => t + e - s, 0);
    return `CHANGED  ${c.name} ${runs.length} run(s), ${n} byte(s)`;
}

function main() {
    const [cmd, ...args] = process.argv.slice(2);
    if (cmd === 'list' && args.length === 1) {
        const p = openPak(args[0]);
        console.log(`version ${p.version}, mount ${p.mountPoint}, ${p.entries.length} entries`);
        for (const e of p.entries) {
            console.log(`${e.name}\t${e.uncompressedSize}\t${e.compression ? 'zlib' : 'raw'}${e.encrypted ? '+aes' : ''}`);
        }
    } else if (cmd === 'extract' && args.length >= 2) {
        const [pakFile, outDir, ...prefixes] = args;
        const p = openPak(pakFile);
        let n = 0;
        for (const e of p.entries) {
            if (!matches(e.name, prefixes)) continue;
            const dest = path.join(outDir, e.name);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, readEntry(p, e));
            n++;
        }
        console.log(`extracted ${n} file(s) to ${outDir} (mount point ${p.mountPoint})`);
    } else if (cmd === 'diff' && args.length >= 2) {
        const [a, b, ...prefixes] = args;
        const changes = changedEntries(openPak(a), openModified(b), prefixes);
        for (const c of changes) console.log(describe(c));
        console.log(`${changes.length} entr${changes.length === 1 ? 'y' : 'ies'} differ`);
    } else if (cmd === 'mkpatch' && args.length >= 4) {
        const [a, b, dir, target, ...prefixes] = args;
        const changes = changedEntries(openPak(a), openModified(b), prefixes);
        // An existing patch keeps its metadata and other targets; this target's
        // section is added or replaced. Once a patch has several targets, new
        // replacement files go under files/<target>/ so targets can't collide.
        const existing = fs.existsSync(path.join(dir, 'patch.json')) ? readPatchFile(dir) : null;
        const others = existing ? patchTargets(existing).filter((t) => t.target !== target) : [];
        const filesDir = others.length ? path.posix.join('files', target) : 'files';
        const assets = [];
        for (const c of changes) {
            if (c.removed) throw new Error(`${c.name}: removing pak entries is not supported`);
            if (!c.added && c.base.length === c.mod.length) {
                const runs = diffRuns(c.base, c.mod);
                if (runs.length <= MAX_EDIT_RUNS) {
                    assets.push({
                        path: c.name,
                        edits: runs.map(([s, e]) => ({
                            offset: '0x' + s.toString(16).toUpperCase(),
                            original: hex(c.base.subarray(s, e)),
                            patched: hex(c.mod.subarray(s, e)),
                        })),
                    });
                    continue;
                }
            }
            const rel = path.posix.join(filesDir, c.name);
            const dest = path.join(dir, rel);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, c.mod);
            assets.push({
                path: c.name,
                replace: rel,
                baseSha256: c.added ? null : sha256(c.base),
                sha256: sha256(c.mod),
            });
        }
        const meta = existing
            ? { id: existing.id, title: existing.title, status: existing.status, requires: existing.requires || [] }
            : { id: path.basename(path.resolve(dir)), title: 'TODO', status: 'testing', requires: [] };
        const all = [...others, { target, assets }];
        const patch = all.length === 1
            ? { ...meta, target, assets }
            : { ...meta, targets: all.map((t) => (t.assets ? { target: t.target, assets: t.assets } : { target: t.target, edits: t.edits })) };
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'patch.json'), JSON.stringify(patch, null, 2) + '\n');
        console.log(`wrote ${path.join(dir, 'patch.json')}: ${target} with ${assets.length} asset(s)` +
            (others.length ? `, plus ${others.length} other target(s)` : ''));
    } else {
        console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 12).join('\n'));
        process.exit(2);
    }
}

main();
