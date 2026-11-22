#!/usr/bin/env node
// The manual-patch zip published with each release, and the way CI gets the
// patched binaries back into data/ (they are build outputs and not in git).
//
//   node scripts/release-zip.js create [--upload]
//       data/ -> dist/fractured-space-patch-v<version>-pl<patchLevel>.zip, laid out
//       like the game folder (Steam: steamapps/common/Space). Every file is checked
//       against patch_manifest.js first. --upload attaches it to the GitHub release
//       v<version> (draft or published) with `gh release upload --clobber`.
//
//   node scripts/release-zip.js unpack <zip> [dataDir]
//       zip -> data/ (or dataDir) (game paths mapped back to data/ names), hash-checked.
//
// See docs/patching.md, "Releases".

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { writeZip, readZip } = require('./lib/zip');
const { patchLevel, dataMapping } = require('../views/js/patch_manifest');
const { version } = require('../package.json');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const zipName = () => `fractured-space-patch-v${version}-pl${patchLevel}.zip`;

function readme(entries) {
    return [
        `Fractured Space community patch, launcher v${version}, patch level ${patchLevel}`,
        '',
        'The Fractured Space Bootstrapper launcher installs these files for you.',
        'Use this zip only if you want to patch the game by hand.',
        '',
        'How to install:',
        '  1. Find the game folder: in Steam, right-click Fractured Space >',
        '     Manage > Browse local files. It contains the "spacegame" and',
        '     "Engine" folders (usually ...\\steamapps\\common\\Space).',
        '  2. Back up the files listed below if you want to be able to undo this.',
        '     Steam "Verify integrity of game files" also restores the originals.',
        '  3. Extract this zip into that folder, replacing existing files.',
        '  4. Optionally check the files against SHA256SUMS.txt.',
        '',
        'bootlegger.json tells the launcher this patch level is already installed.',
        'The game still needs the launcher (or the same command-line arguments) to',
        'connect to the community backend.',
        '',
        'Files:',
        ...entries.map((e) => `  ${e}`),
        '',
    ].join('\r\n');
}

function create(upload) {
    const files = [];
    for (const m of dataMapping) {
        const src = path.join(DATA, m.src);
        if (!fs.existsSync(src)) throw new Error(`data/${m.src} missing: run npm run patches:build first`);
        const data = fs.readFileSync(src);
        if (sha256(data) !== m.sha256) throw new Error(`data/${m.src} does not match patch_manifest.js (rebuild, then npm run hashes -- --update --bump)`);
        files.push({ name: m.dest, data, sha: m.sha256 });
    }
    files.sort((a, b) => a.name.localeCompare(b.name));
    const boot = Buffer.from(JSON.stringify({ version: patchLevel, status: 'ok' }));
    const sums = files.map((f) => `${f.sha}  ${f.name}`).join('\n') + '\n';
    const entries = [
        { name: 'README-PATCH.txt', data: Buffer.from(readme(files.map((f) => f.name))) },
        { name: 'SHA256SUMS.txt', data: Buffer.from(sums) },
        { name: 'bootlegger.json', data: boot },
        ...files.map((f) => ({ name: f.name, data: f.data })),
    ];
    const out = path.join(ROOT, 'dist', zipName());
    fs.mkdirSync(path.dirname(out), { recursive: true });
    writeZip(out, entries);
    console.log(`${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MiB  sha256 ${sha256(fs.readFileSync(out))}`);
    if (upload) {
        execFileSync('gh', ['release', 'upload', `v${version}`, out, '--clobber'], { stdio: 'inherit' });
        console.log(`uploaded to release v${version}`);
    }
}

function unpack(zipFile, dataDir = DATA) {
    const byDest = new Map(dataMapping.map((m) => [m.dest, m]));
    let n = 0;
    for (const e of readZip(zipFile)) {
        const m = byDest.get(e.name);
        if (!m) continue; // README, SHA256SUMS, bootlegger.json
        const data = e.read();
        if (sha256(data) !== m.sha256) throw new Error(`${e.name} in zip does not match patch_manifest.js (zip is from another patch level?)`);
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, m.src), data);
        n++;
        byDest.delete(e.name);
    }
    if (byDest.size) throw new Error(`zip is missing: ${[...byDest.keys()].join(', ')}`);
    console.log(`unpacked ${n} file(s) into ${path.relative(ROOT, dataDir) || dataDir}`);
}

try {
    const [cmd, ...args] = process.argv.slice(2);
    if (cmd === 'create' && args.every((a) => a === '--upload')) create(args.includes('--upload'));
    else if (cmd === 'unpack' && (args.length === 1 || args.length === 2)) unpack(args[0], args[1] && path.resolve(args[1]));
    else {
        console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 15).join('\n'));
        process.exit(2);
    }
} catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
}
