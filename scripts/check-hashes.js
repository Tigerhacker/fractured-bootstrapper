#!/usr/bin/env node
// Verifies (and optionally updates) the md5/sha256 hashes in views/js/patch_manifest.js
// against the files in data/.
//
//   node scripts/check-hashes.js            check only; exit 1 on any mismatch/missing file
//   node scripts/check-hashes.js --update   rewrite mismatched hashes in patch_manifest.js
//   node scripts/check-hashes.js --update --bump   also bump patchLevel if anything changed
//
// Also warns about files in data/ that are not listed in dataMapping.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const manifestPath = path.join(root, 'views', 'js', 'patch_manifest.js');
// Files in data/ that are intentionally not part of the patch manifest.
const IGNORED = new Set(['fireline-responses.json']);

const args = process.argv.slice(2);
const update = args.includes('--update');
const bump = args.includes('--bump');
if (args.some((a) => !['--update', '--bump'].includes(a)) || (bump && !update)) {
    console.error('Usage: node scripts/check-hashes.js [--update [--bump]]');
    process.exit(2);
}

function hashFile(file, algo) {
    return crypto.createHash(algo).update(fs.readFileSync(file)).digest('hex');
}

// Load a fresh copy of the manifest (it may have been edited since last require).
delete require.cache[require.resolve(manifestPath)];
const manifest = require(manifestPath);

let text = fs.readFileSync(manifestPath, 'utf8');
let bad = 0;
let changed = 0;

for (const entry of manifest.dataMapping) {
    const file = path.join(dataDir, entry.src);
    if (!fs.existsSync(file)) {
        console.log(`MISSING   ${entry.src}`);
        bad++;
        continue;
    }
    const actual = { md5: hashFile(file, 'md5'), sha256: hashFile(file, 'sha256') };
    const stale = ['md5', 'sha256'].filter((k) => entry[k] !== actual[k]);
    if (stale.length === 0) {
        console.log(`ok        ${entry.src}`);
        continue;
    }
    for (const k of stale) {
        console.log(`MISMATCH  ${entry.src} [${k}]\n    manifest: ${entry[k]}\n    actual:   ${actual[k]}`);
    }
    if (!update) { bad++; continue; }

    // Replace only the hash values inside this entry's object literal, keeping formatting.
    const srcRe = entry.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blockRe = new RegExp(`(src:\\s*"${srcRe}"[\\s\\S]*?)(\\n\\s*\\})`);
    const m = text.match(blockRe);
    if (!m) { console.log(`  could not locate entry for ${entry.src} in the file`); bad++; continue; }
    let block = m[1];
    for (const k of stale) {
        // '*', not '+': a new entry starts with empty hashes ("") and must be filled in too
        block = block.replace(new RegExp(`(${k}:\\s*")[0-9a-fA-F]*(")`), `$1${actual[k]}$2`);
    }
    text = text.replace(m[1], () => block);
    changed++;
    console.log(`  updated ${entry.src}`);
}

const listed = new Set(manifest.dataMapping.map((e) => e.src));
for (const f of fs.readdirSync(dataDir)) {
    if (!listed.has(f) && !IGNORED.has(f)) {
        console.log(`UNLISTED  data/${f} is not in dataMapping`);
    }
}

if (update && changed > 0) {
    if (bump) {
        text = text.replace(/(const patchLevel = )(\d+)(;)/, (_, a, n, c) => {
            console.log(`patchLevel ${n} -> ${Number(n) + 1}`);
            return `${a}${Number(n) + 1}${c}`;
        });
    } else {
        console.log('Note: patchLevel not bumped (use --bump). Bump it if this is a release, or existing users are not prompted to repatch.');
    }
    fs.writeFileSync(manifestPath, text);
}

if (bad) {
    console.log(`\n${bad} problem(s).`);
    process.exit(1);
}
console.log(update && changed ? `\nUpdated ${changed} entr${changed === 1 ? 'y' : 'ies'}.` : '\nAll hashes match.');
