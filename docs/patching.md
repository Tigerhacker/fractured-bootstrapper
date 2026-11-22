# Binary patches

Patched game binaries (`data/*.exe`, `data/*.pak`) are **build outputs**.
They are gitignored and never committed. Releases carry them in a zip (see
"Releases"). What lives in git is:

```
patches/
  bases.json                 sha256 of each pristine game file a patch applies to
  INDEX.md                   generated: which patches touch which file / pak asset
  <patch-id>/                one folder per fix (not per file; see "Layout")
    patch.json               machine-readable change (applied by the build)
    README.md                why: evidence, interpretation, what is not known
    files/...                whole replacement assets, when byte edits don't fit
vanilla/                     pristine game files (gitignored, you supply them)
.pak-key                     pak AES key (gitignored, you supply it)
```

`scripts/build-patches.js` starts from `vanilla/`, applies every selected
patch, and writes the result into `data/` under the name `patch_manifest.js`
maps it to. Every base in `bases.json` is written out, even if no selected
patch touches it, so `data/` always equals "bases + selected patches". Text payloads (`data/*.js`, `*.css`, `*.json`, `*.ini`) are still
tracked directly in `data/`.

### Layout
Folders are per **fix**, because the fix is what gets reviewed, tested and
switched on or off. One fix may change several files (say the exe and
`BP.pak`), and `"targets"` keeps those changes together in one patch.json.
To see a file's changes ("what touches `BP.pak`?"), read
[`patches/INDEX.md`](../patches/INDEX.md). It's regenerated on every build and
lists, per target file, each patched pak asset or exe edit and the patch that
owns it. Target paths are always full game-relative paths: file names repeat
across the install (e.g. `am.pak` exists under both the CEF and launcher
locales).

## One-time setup

1. **Node.js**: the same major version as the rest of the repo (Node 26 was
   used to verify the current patches). Nothing else is needed for building:
   pak reading/writing, AES and zlib are all in `scripts/lib/pak.js` with no
   dependencies.
   *Determinism*: rebuilt assets are recompressed with Node's bundled zlib.
   The same Node major gives byte-identical output, but a different zlib build
   can change the bytes of re-encoded entries, and so the pak's sha256, though
   never its content. If a rebuild shows a hash change with no patch change,
   check the Node version first.

2. **Pak AES key**: Fractured Space paks are AES-256 encrypted. Ask a
   maintainer for the key and save it as a single line of hex (with or without
   `0x`) in `.pak-key` at the repo root, or set `FS_PAK_AES_KEY`.
   `.pak-key` is gitignored. Don't paste it into issues, logs or commits.

3. **Pristine base files** live in `vanilla/` at the paths `patches/bases.json`
   gives (`file`, or the target path when there is none). The source-built
   exe is **tracked in git** (it's our primary distribution source). Anything
   else under `vanilla/` is gitignored, and you supply it:

   ```
   vanilla/spacegame/Binaries/Win64/spacegame-Win64-Shipping-30.exe
   vanilla/spacegame/Content/Paks/BP.pak
   ```

   - **The exe base is not the Steam exe.** It is the later build compiled from
     source, `spacegame-Win64-Shipping-30.exe` (Jul 2019, sha256 `fa6288c2…`),
     kept under its original build name so it's obvious that it is the starting
     point. The build installs it as `Fractured Space.exe`. The Steam store exe
     (Jan 2019, `08dbf76d…`) is a separate compile: it doesn't support the
     launcher's `-flhost=`/`-discord=` arguments, and it can't be diffed
     against the source build (every address differs). Keep it only as a
     reference for reverse-engineering.
   - **BP.pak** comes from Steam. An installed copy has usually been
     overwritten by the bootstrapper, so first use *Properties → Installed Files
     → Verify integrity of game files*, then copy.
   - The build refuses any file whose sha256 doesn't match `bases.json`.

### Optional tools for inspecting and editing assets

The scripts only move bytes. To understand or change what's *in* a `.uasset`:

- **UAssetGUI** (github.com/atenfyr/UAssetGUI, needs the .NET desktop runtime).
  It opens a cooked `.uasset` + `.uexp` pair, shows imports, exports and
  properties, edits them, and can export/import JSON. The paks are pak version
  4 (roughly UE 4.16–4.19), so try engine versions in that range. Check that an
  open → save without edits produces an identical file before trusting a
  version choice.
- **FModel** (fmodel.app). Browses the game's paks directly once you enter the
  AES key, previews textures and meshes. Read-only.

Neither tool is needed to build. They're for working out *what* to patch and
for writing the README.

## Commands

```
npm run pak -- list    <pak>
npm run pak -- extract <pak> <outDir> [prefix...]          decrypt + inflate to loose files
npm run pak -- diff    <base.pak> <pak|dir> [prefix...]    which assets differ
npm run pak -- mkpatch <base.pak> <pak|dir> patches/<id> <target> [prefix...]
npm run patches:build                                     shipped patches -> data/
npm run patches:build -- --testing                        + testing patches
npm run patches:build -- --only a,b --out <dir>           subset, elsewhere
npm run patches:index [-- --check]                        regenerate / check INDEX.md
npm run release:zip [-- --upload]                         data/ -> dist/ patch zip (+ attach to release)
npm run hashes -- --update --bump                         refresh patch_manifest.js
```

`prefix` matches the start of an entry path, e.g. `HUD/W_Killcam.` (with the
dot, so it doesn't also match `W_KillcamFoo`).

Running `mkpatch` into a folder that already has a patch.json keeps its
id/title/status/requires and adds or replaces just that `<target>`'s section.
Run it once per pak a fix touches. When a patch ends up with several targets,
new replacement files go to `files/<target path>/...` so assets of different
paks can't collide. Raw-file (exe) edits are written by hand into the
`"edits"` list for now.

The build writes into a temporary folder and copies into `data/` only once
every target has built, so a failing patch never leaves `data/` half updated.

## Making a pak patch

```
npm run pak -- extract vanilla/spacegame/Content/Paks/BP.pak work HUD/W_Foo.
#   edit work/HUD/W_Foo.uasset/.uexp (UAssetGUI), or drop in re-cooked files
npm run pak -- mkpatch vanilla/spacegame/Content/Paks/BP.pak work patches/my-fix spacegame/Content/Paks/BP.pak
#   fill in title + README.md, set "status"
npm run patches:build -- --testing
npm run hashes -- --update --bump
```

Hand only the assets you changed to `mkpatch`. Re-saving an asset in the
editor regenerates GUIDs (see `patches/recook-churn`), and that noise ends up
in the diff and conflicts with other people's work.

## patch.json

```jsonc
{
  "id": "hud-aeromatics-font",            // = folder name; slug, not a number
  "title": "...",
  "status": "shipped",                    // shipped | testing | disabled
  "requires": [],                         // other patch ids
  "target": "spacegame/Content/Paks/BP.pak",   // dest path from patch_manifest.js
  "assets": [                             // pak targets
    { "path": "HUD/W_Foo.uexp",           // entry path inside the pak
      "edits": [ { "offset": "0x31C11", "original": "70 51 ...", "patched": "3B 43 ..." } ] },
    { "path": "HUD/W_Foo.uasset",
      "replace": "files/HUD/W_Foo.uasset",
      "baseSha256": "<sha256 of the vanilla asset, null if new>",
      "sha256": "<sha256 of the replacement>" }
  ]
}
```

For a raw file target (e.g. the exe), use top-level `"edits": [...]` with file
offsets instead of `"assets"`. It's the same table as in the exe patch write-ups.

A fix that changes more than one file uses `"targets"` instead of the
top-level `target`/`assets`/`edits` (not both):

```jsonc
{
  "id": "firing-range-null-lobby-guard",
  "title": "...",
  "status": "testing",
  "requires": [],
  "targets": [
    { "target": "spacegame/Binaries/Win64/Fractured Space.exe",
      "edits": [ { "offset": "0x207600F", "original": "48 8B 48 20 48 8B 01", "patched": "E9 BC F5 F8 FD 90 90" } ] },
    { "target": "spacegame/Content/Paks/BP.pak",
      "assets": [ ... ] }
  ]
}
```

Every target needs an entry in `bases.json` and in `patch_manifest.js`
`dataMapping` (that's where its output name in `data/` comes from).

`mkpatch` stores a same-size asset with up to 128 changed runs as `edits`, and
anything else as `replace`.

### What the build checks
- each base in `vanilla/` matches `bases.json`;
- every edit's `original` bytes are present. A wrong base, or an earlier patch
  that changed those bytes, is an error;
- no two patches edit overlapping bytes of the same asset or file;
- no asset is both replaced and edited, or replaced twice;
- a replace's `baseSha256` matches the vanilla asset, so a replacement made
  against a different base is rejected;
- `requires` exist and aren't disabled.

Untouched pak entries are copied byte for byte from the vanilla pak, in vanilla
order. Changed entries are re-encoded the way UnrealPak does it: zlib blocks of
64 KiB, each encrypted with padding that repeats its leading bytes, and the
entry hash = sha1 of its stored bytes. Same inputs, same pak.

## Releases

Order of operations for a launcher release:

```
npm run patches:build                 # data/ = bases + shipped patches
npm run hashes -- --update --bump     # only if any data/ file changed
npm run deploy                        # Windows installer -> draft release v<version>
                                      #   predeploy: check-hashes; postdeploy: release:zip --upload
# then run the "Build Linux" workflow (publish ticked), then publish the draft
```

- **`fractured-space-patch-v<version>-pl<patchLevel>.zip`** is attached to every
  release. It's laid out like the game folder (Steam: `steamapps/common/Space`).
  It holds every `dataMapping` file plus `bootlegger.json`, so the launcher
  sees the patch level as installed, and also `SHA256SUMS.txt` and
  `README-PATCH.txt` with by-hand instructions. Players can extract it over
  their game folder without the launcher. Packing checks every file against
  `patch_manifest.js`. The archive is deterministic: fixed timestamps and order.
- **Linux CI** doesn't have `vanilla/` or the key. It downloads that zip from
  the (draft) release and unpacks it into `data/` with
  `node scripts/release-zip.js unpack <zip>`, then checks hashes before
  building. So the zip has to be on the release before the workflow runs.
- `prebuild` / `predeploy` / `prepack` run `check-hashes.js`, so an installer
  is never built from a `data/` that disagrees with `patch_manifest.js`.
- Testing builds (`--testing`) are for testers' machines. Never deploy from a
  `data/` built with testing patches.

## Working together

- One patch per branch/PR, in its own folder. Two people rarely touch the same
  files, and when they touch the same *asset*, the build says so.
- Commit the regenerated `patches/INDEX.md` with the patch. In review, the
  INDEX diff shows at a glance which files and assets the PR touches, and
  `npm run patches:index -- --check` fails if someone forgot.
- Use slug IDs, never sequence numbers, so parallel work can't collide.
- Changes to `data/BP.pak` show up in review as JSON and a README, not as a
  71 MB blob.
- Experimental work goes in as `"status": "testing"`. Testers build with
  `--testing`, and the patch is promoted to `shipped` once it's confirmed
  in-game.
- Never commit `.pak-key`, Steam files in `vanilla/` (only the tracked source-built exe belongs there), or built binaries in `data/`.
  Regenerate them.
