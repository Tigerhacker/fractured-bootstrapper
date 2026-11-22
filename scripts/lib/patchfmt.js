// Shared helpers for patches/<id>/patch.json. Format: see docs/patching.md.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PATCHES_DIR = path.join(ROOT, 'patches');

function hex(buf) {
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function unhex(s) {
    const clean = s.replace(/\s+/g, '');
    if (!/^([0-9a-fA-F]{2})*$/.test(clean)) throw new Error(`bad hex string: ${s.slice(0, 40)}`);
    return Buffer.from(clean, 'hex');
}

function parseOffset(o) {
    const n = typeof o === 'number' ? o : Number(o);
    if (!Number.isInteger(n) || n < 0) throw new Error(`bad offset: ${o}`);
    return n;
}

const STATUSES = ['shipped', 'testing', 'disabled'];

// A patch changes one or more target files. Two spellings are accepted:
//   single target: { target, assets | edits, ... }
//   multi target:  { targets: [ { target, assets | edits }, ... ], ... }
// Returns the targets as a list either way.
function patchTargets(p) {
    const list = p.targets ? p.targets : [{ target: p.target, assets: p.assets, edits: p.edits }];
    if (p.targets && (p.target || p.assets || p.edits)) {
        throw new Error(`${p.id}: use either "targets" or a top-level "target", not both`);
    }
    if (!list.length) throw new Error(`${p.id}: no targets`);
    const seen = new Set();
    return list.map((t) => {
        if (!t.target) throw new Error(`${p.id}: target entry without "target"`);
        if (seen.has(t.target)) throw new Error(`${p.id}: ${t.target} listed twice`);
        seen.add(t.target);
        if (!!t.assets === !!t.edits) throw new Error(`${p.id}: ${t.target} needs exactly one of "assets" (pak) or "edits" (raw file)`);
        return { target: t.target, assets: t.assets, edits: t.edits };
    });
}

function readPatchFile(dir) {
    return JSON.parse(fs.readFileSync(path.join(dir, 'patch.json'), 'utf8'));
}

function loadPatches() {
    if (!fs.existsSync(PATCHES_DIR)) return [];
    return fs.readdirSync(PATCHES_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(PATCHES_DIR, d.name, 'patch.json')))
        .map((d) => {
            const dir = path.join(PATCHES_DIR, d.name);
            const p = readPatchFile(dir);
            if (p.id !== d.name) throw new Error(`patches/${d.name}: id "${p.id}" must match folder name`);
            if (!STATUSES.includes(p.status)) throw new Error(`${p.id}: status must be one of ${STATUSES.join(', ')}`);
            return { ...p, dir, targets: patchTargets(p) };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
}

// Apply byte edits to `buf` in place, checking original bytes. `claims` maps
// byte ranges already edited (by other patches) to detect overlaps.
function applyEdits(buf, edits, who, claims) {
    for (const e of edits) {
        const off = parseOffset(e.offset);
        const orig = unhex(e.original);
        const next = unhex(e.patched);
        if (orig.length !== next.length) throw new Error(`${who} @${e.offset}: original/patched lengths differ`);
        if (off + orig.length > buf.length) throw new Error(`${who} @${e.offset}: past end of file`);
        for (const c of claims) {
            if (off < c.end && c.start < off + orig.length) {
                throw new Error(`${who} @${e.offset}: overlaps bytes already patched by ${c.by}`);
            }
        }
        if (!buf.subarray(off, off + orig.length).equals(orig)) {
            throw new Error(`${who} @${e.offset}: original bytes do not match (wrong base, or another patch moved them)`);
        }
        next.copy(buf, off);
        claims.push({ start: off, end: off + orig.length, by: who });
    }
}

module.exports = { ROOT, PATCHES_DIR, STATUSES, hex, unhex, parseOffset, patchTargets, readPatchFile, loadPatches, applyEdits };
