# Working in patches/

Each folder here is one fix (not one file) for the game's binaries. Full
format, commands and release flow: [docs/patching.md](../docs/patching.md).
Per-file view of what is patched: [INDEX.md](INDEX.md) (generated).

## Hard rules
- **Never write the pak AES key anywhere**: not in files, READMEs, commit
  messages, logs, or command lines that get echoed. Code reads it from the
  gitignored `.pak-key` or `FS_PAK_AES_KEY`. If you need it and it's missing,
  ask; don't search for it or recover it.
- **Never hand-edit `data/*.exe` or `data/*.pak`.** They are build outputs.
  Change a `patch.json` and commit the regenerated `patches/INDEX.md` with it.
- **A patch PR doesn't touch `views/js/patch_manifest.js` or `data/`.** New
  patches are `testing`, and testing patches don't ship. Only a maintainer
  promoting a patch to `shipped` runs `npm run hashes -- --update --bump`, once
  per release. **Never set or bump `patchLevel` in a PR.** It's what makes
  players repatch, and it changes only when the shipped set changes (see
  docs/patching.md, "Promoting a patch, and patchLevel").
- **Test builds go elsewhere:** `npm run patches:build -- --testing --out <dir>`,
  never `--testing` into `data/`.
- **Bases**: only the source-built exe
  (`vanilla/spacegame/Binaries/Win64/spacegame-Win64-Shipping-30.exe`) is
  tracked. Never commit Steam files from `vanilla/`. A new base goes in
  `bases.json` with its sha256 and where it came from.
- **Targets are full game-relative paths** (`spacegame/Content/Paks/BP.pak`).
  File names repeat across the install.

## Making a patch
- Folder name = `id` = a descriptive slug, never a number. New patches start
  as `"status": "testing"` and become `"shipped"` only after someone confirms
  them in-game.
- Pak changes: run `npm run pak -- mkpatch <vanilla pak> <dir of edited assets> patches/<id> <target>`.
  Give it only the assets you actually changed: re-saved assets carry GUID and
  texture churn (see `recook-churn/`).
- Exe changes: hand-write `edits` with file offsets plus `original`/`patched`
  bytes, and add the RVA and a note per edit. Any code cave you use must be
  named in the README; the build rejects overlaps, but people need to see
  claimed ranges.
- One fix that touches several files uses `"targets": [...]`. Don't split it
  into folders linked by `requires`.
- Target existing stock files. Changes to assets that live in `BP.pak` go
  into `BP.pak` via `mkpatch`, not into a new pak. The installer never deletes
  files, so a new target file can't be withdrawn later. New targets, new bases
  and builder/format changes need a maintainer and their own PR.
- **No opaque blobs.** Exe payloads need source plus the exact build command,
  reproducing the pinned sha256, and a disassembly listing. Never embed PE/DLL
  images or copies of base tables. Replaced pak assets need a description of
  the exports and properties changed. Assets restored from older releases need
  the Steam depot ID, ManifestID, manifest release date, and each asset's
  original path and filename. A patch without these won't be promoted to
  `shipped`. See docs/patching.md, "Reviewable form".
- A PR contains only `patches/<id>/` and `patches/INDEX.md`, based on
  `master`, with no commits from other PRs and no `.gitattributes` changes.

## README.md for each patch
Keep these separate, under headings: **confirmed findings** (with evidence:
offsets, hashes, dumps, names from the asset), **what the patch does**,
**interpretation** (marked as such), and **not established / limitations**.
Say where the change came from (author, source binary) when it wasn't made
here. Record the output sha256 if you verified a build reproduces a known file.

## Before finishing
- `npm run patches:build -- --testing --out <dir>` succeeds.
- `npm run patches:build` (shipped only) followed by `npm run hashes` reports
  "All hashes match" without `--update`.
- `npm run patches:index -- --check` passes.
- `git diff --cached` contains no key material, nothing under `data/`, and no
  change to `patch_manifest.js`.

Full PR checklist: docs/patching.md, "Submitting a patch".
