#!/usr/bin/env node
// Regenerates patches/INDEX.md from patches/*/patch.json.
//
//   node scripts/patch-index.js          rewrite the index if it is out of date
//   node scripts/patch-index.js --check  exit 1 if the index is out of date (for CI/review)

'use strict';
const fs = require('fs');
const { INDEX_FILE, renderIndex, writeIndex } = require('./lib/patchindex');

try {
    if (process.argv.includes('--check')) {
        const cur = fs.existsSync(INDEX_FILE) ? fs.readFileSync(INDEX_FILE, 'utf8') : '';
        if (cur !== renderIndex()) {
            console.error('patches/INDEX.md is out of date: run npm run patches:index');
            process.exit(1);
        }
        console.log('patches/INDEX.md is up to date');
    } else {
        console.log(writeIndex() ? 'updated patches/INDEX.md' : 'patches/INDEX.md already up to date');
    }
} catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
}
