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
  Change a `patch.json`, then run:
  `npm run patches:build` → `npm run hashes -- --update --bump`. Commit the
  regenerated `patches/INDEX.md` with it.
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

## README.md for each patch
Keep these separate, under headings: **confirmed findings** (with evidence:
offsets, hashes, dumps, names from the asset), **what the patch does**,
**interpretation** (marked as such), and **not established / limitations**.
Say where the change came from (author, source binary) when it wasn't made
here. Record the output sha256 if you verified a build reproduces a known file.

## Before finishing
`npm run patches:build` succeeds, `npm run hashes` reports all OK,
`npm run patches:index -- --check` passes, and `git diff --cached` contains
no key material.
