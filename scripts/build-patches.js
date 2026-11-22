#!/usr/bin/env node
// Builds patched game files from pristine bases in vanilla/ plus patches/*/patch.json,
// writing them into data/ (or --out). See docs/patching.md.
//
//   node scripts/build-patches.js                 build "shipped" patches into data/
//   node scripts/build-patches.js --testing       also include "testing" patches
//   node scripts/build-patches.js --out <dir>     write outputs somewhere else
//   node scripts/build-patches.js --only <id,...> build only these patches (+ requires)
//
// Also regenerates patches/INDEX.md. Afterwards run
// `npm run hashes -- --update --bump` to refresh patch_manifest.js.

'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { openPak, readEntry, writePak } = require('./lib/pak');
const { ROOT, PATCHES_DIR, loadPatches, applyEdits } = require('./lib/patchfmt');
const { dataMapping } = require('../views/js/patch_manifest');
const { writeIndex } = require('./lib/patchindex');
const pe = require('./lib/pe');

const VANILLA_DIR = path.join(ROOT, 'vanilla');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

function parseArgs() {
    const a = process.argv.slice(2);
    const opts = { statuses: new Set(['shipped']), out: path.join(ROOT, 'data'), only: null };
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '--testing') opts.statuses.add('testing');
        else if (a[i] === '--out') opts.out = path.resolve(a[++i]);
        else if (a[i] === '--only') opts.only = a[++i].split(',');
        else { console.error(`unknown argument ${a[i]}`); process.exit(2); }
    }
    return opts;
}

function selectPatches(all, opts) {
    const byId = new Map(all.map((p) => [p.id, p]));
    let chosen = opts.only
        ? opts.only.map((id) => byId.get(id) || (() => { throw new Error(`no patch "${id}"`); })())
        : all.filter((p) => opts.statuses.has(p.status));
    // Pull in requirements, and refuse requirements that are disabled.
    const set = new Map(chosen.map((p) => [p.id, p]));
    const queue = [...chosen];
    while (queue.length) {
        const p = queue.shift();
        for (const r of p.requires || []) {
            const dep = byId.get(r);
            if (!dep) throw new Error(`${p.id} requires missing patch "${r}"`);
            if (dep.status === 'disabled') throw new Error(`${p.id} requires disabled patch "${r}"`);
            if (!set.has(r)) { set.set(r, dep); queue.push(dep); }
        }
    }
    return [...set.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function loadBases() {
    return JSON.parse(fs.readFileSync(path.join(PATCHES_DIR, 'bases.json'), 'utf8'));
}

// bases.json maps a target (game path) to its pristine file. The file lives at
// vanilla/<target> unless "file" names it differently (e.g. the source-built exe
// is kept under its original build name, spacegame-Win64-Shipping-30.exe).
function loadBase(target) {
    const base = loadBases()[target];
    const want = base && base.sha256;
    if (!want) throw new Error(`patches/bases.json has no entry for ${target}`);
    const file = path.join(VANILLA_DIR, base.file || target);
    if (!fs.existsSync(file)) throw new Error(`missing pristine base ${path.relative(ROOT, file)} (see docs/patching.md)`);
    const buf = fs.readFileSync(file);
    if (sha256(buf) !== want) throw new Error(`${path.relative(ROOT, file)} is not the pristine file (sha256 mismatch)`);
    return file;
}

function outputFor(target, opts) {
    const m = dataMapping.find((d) => d.dest === target);
    if (!m) throw new Error(`target ${target} is not in patch_manifest.js dataMapping`);
    return path.join(opts.out, m.src);
}

function buildRaw(target, patches, opts) {
    let buf = Buffer.from(fs.readFileSync(loadBase(target)));
    const claims = [];
    for (const p of patches) applyEdits(buf, p.edits, p.id, claims);
    const withSection = patches.filter((p) => p.section);
    if (withSection.length) {
        // The builder owns the PE header once it adds sections.
        const hdr = pe.headerRange(pe.parse(buf));
        for (const c of claims) {
            if (c.start < hdr.end) throw new Error(`${c.by}: edit at 0x${c.start.toString(16)} touches the PE header, which the build rewrites when adding sections`);
        }
        const layout = loadBases()[target].extension;
        if (!layout) throw new Error(`${target}: patches add exe sections, but patches/bases.json has no "extension" layout for it`);
        const parts = withSection.map((p) => ({
            who: p.id,
            code: (p.section.code || []).map((c) => {
                const bytes = readPayload(p, c);
                // "size" is what INDEX.md shows, so it must agree with the file.
                if (Number(c.size) !== bytes.length) throw new Error(`${p.id}: ${c.file} is ${bytes.length} bytes, "size" says ${c.size}`);
                return { ...c, bytes };
            }),
            data: (p.section.data || []).map((d) => ({ ...d, bytes: d.file ? readPayload(p, d) : null })),
            unwind: p.section.unwind || [],
        }));
        const res = pe.extend(buf, layout, parts);
        buf = res.buf;
        for (const s of res.sections) console.log(`  section ${s.name} rva ${pe.hex(s.va)} vsize ${pe.hex(s.vsize)} raw ${pe.hex(s.raw.length)}`);
    }
    return writeOut(target, buf, opts);
}

function readPayload(p, c) {
    const data = fs.readFileSync(path.join(p.dir, c.file));
    if (!c.sha256) throw new Error(`${p.id}: ${c.file} needs a "sha256"`);
    if (sha256(data) !== c.sha256) throw new Error(`${p.id}: ${c.file} does not match sha256`);
    return data;
}

function copyBase(target, opts) {
    return writeOut(target, fs.readFileSync(loadBase(target)), opts);
}

function buildPak(target, patches, opts) {
    const pak = openPak(loadBase(target));
    const baseEntries = new Map(pak.entries.map((e) => [e.name, e]));
    const assets = new Map(); // name -> { data, by: [ids], replacedBy, claims }

    for (const p of patches) {
        for (const a of p.assets) {
            const who = `${p.id}:${a.path}`;
            let st = assets.get(a.path);
            if (!st) {
                const be = baseEntries.get(a.path);
                st = { data: be ? Buffer.from(readEntry(pak, be)) : null, by: [], replacedBy: null, claims: [] };
                assets.set(a.path, st);
            }
            if (st.replacedBy) throw new Error(`${who}: asset already replaced by ${st.replacedBy}`);
            if (a.replace) {
                if (st.by.length) throw new Error(`${who}: asset already edited by ${st.by.join(', ')}`);
                const baseSha = st.data ? sha256(st.data) : null;
                if ((a.baseSha256 || null) !== baseSha) throw new Error(`${who}: base asset does not match baseSha256`);
                const data = fs.readFileSync(path.join(p.dir, a.replace));
                if (a.sha256 && sha256(data) !== a.sha256) throw new Error(`${who}: ${a.replace} does not match sha256`);
                st.data = data;
                st.replacedBy = p.id;
            } else {
                if (!st.data) throw new Error(`${who}: no such asset in base pak`);
                applyEdits(st.data, a.edits, who, st.claims);
            }
            st.by.push(p.id);
        }
    }

    // Base order is kept; untouched entries are copied byte for byte from the
    // pristine pak. New assets go at the end, sorted.
    const items = pak.entries.map((e) => {
        const st = assets.get(e.name);
        return st ? { name: e.name, data: st.data, compress: e.compression !== 0 } : { name: e.name, from: { pak, entry: e } };
    });
    for (const name of [...assets.keys()].filter((n) => !baseEntries.has(n)).sort()) {
        items.push({ name, data: assets.get(name).data });
    }
    const out = outputFor(target, opts);
    writePak(out, { mountPoint: pak.mountPoint, items, key: pak.key || require('./lib/pak').loadKey() });
}

function writeOut(target, buf, opts) {
    const out = outputFor(target, opts);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
}

function main() {
    const opts = parseArgs();
    const patches = selectPatches(loadPatches(), opts);
    // One "part" per (patch, target); a multi-target patch contributes to several files.
    const byTarget = new Map();
    for (const p of patches) {
        for (const t of p.targets) {
            if (!byTarget.has(t.target)) byTarget.set(t.target, []);
            byTarget.get(t.target).push({ id: p.id, dir: p.dir, assets: t.assets, edits: t.edits, section: t.section });
        }
    }
    // Every registered base is an output, patched or not, so data/ always
    // matches bases + selected patches. (--only builds just the targets it names.)
    if (!opts.only) {
        for (const target of Object.keys(loadBases())) {
            if (!byTarget.has(target)) byTarget.set(target, []);
        }
    }
    if (!byTarget.size) { console.log('nothing to build'); return; }
    // Build everything into a staging folder first, so a failure in one target
    // never leaves data/ half updated.
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-patches-'));
    const staged = { ...opts, out: staging };
    try {
        for (const [target, ps] of byTarget) {
            console.log(`${target}: ${ps.map((p) => p.id).join(', ') || '(no patches, pristine copy)'}`);
            if (!ps.length) {
                copyBase(target, staged);
            } else if (ps.some((p) => p.assets)) {
                if (ps.some((p) => p.edits)) throw new Error(`${target}: mixes pak and raw patches`);
                buildPak(target, ps, staged);
            } else {
                buildRaw(target, ps, staged);
            }
        }
        for (const target of byTarget.keys()) {
            const from = outputFor(target, staged);
            const to = outputFor(target, opts);
            fs.mkdirSync(path.dirname(to), { recursive: true });
            fs.copyFileSync(from, to);
            console.log(`${target}\n  -> ${path.relative(ROOT, to) || to}  sha256 ${sha256(fs.readFileSync(to))}`);
        }
    } finally {
        fs.rmSync(staging, { recursive: true, force: true });
    }
    if (writeIndex()) console.log('updated patches/INDEX.md');
}

try {
    main();
} catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
}
