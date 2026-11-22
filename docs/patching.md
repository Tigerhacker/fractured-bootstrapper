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
npm run patches:build -- --testing --out <dir>            + testing patches, written elsewhere (never into data/)
npm run patches:build -- --only a,b --out <dir>           subset, elsewhere
npm run patches:index [-- --check]                        regenerate / check INDEX.md
npm run release:zip [-- --upload]                         data/ -> dist/ patch zip (+ attach to release)
npm run hashes                                            check data/ against patch_manifest.js
npm run hashes -- --update                                rewrite changed hashes (text payload PRs)
npm run hashes -- --update --bump                         also bump patchLevel (maintainer, at release)
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
#   fill in title + README.md; leave "status": "testing"
npm run patches:build -- --testing --out ../fs-test     # test build OUTSIDE data/
#   copy ../fs-test/BP.pak over a test game install and try it in-game
npm run patches:index
```

Then submit it as described in "Submitting a patch". Don't run
`npm run hashes -- --update` for a binary patch: a `testing` patch never
changes `data/` or `patch_manifest.js`.

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

### Exe sections (new code and data)

When a fix needs more than fits in the exe's INT3 padding, the patch adds code
and data in sections the build appends (`scripts/lib/pe.js`). The patch
declares what goes where. The build writes every header field: section table,
NumberOfSections, SizeOfImage, SizeOfCode, SizeOfInitializedData, the exception
directory and CheckSum.

```jsonc
{
  "id": "status-effect-game-clock",
  "target": "spacegame/Binaries/Win64/Fractured Space.exe",
  "edits": [ /* hooks into existing code: ordinary byte edits */ ],
  "section": {
    "code":   [ { "rva": "0x3E07000", "size": "0x40B", "file": "files/clock-text.bin", "sha256": "…", "note": "…" } ],
    "data":   [ { "rva": "0x3E16000", "size": "0x18", "note": "zeroed unless \"file\" is given" } ],
    "unwind": [ { "begin": "0x3E07000", "end": "0x3E0701B", "unwind": "0x3E0810C" } ]
  }
}
```

Layout, after the base image's last section:

| Section | Access | RVA | Holds |
|---|---|---|---|
| `.fspcode` | RX | code window, fixed in `bases.json` `extension.code` | `section.code` claims (code and read-only data) |
| `.fspdata` | RW | data window, directly after | `section.data` claims |
| `.pdata2` | R | after the data window | the base exception table plus every patch's `unwind` entries |

- **Claims are fixed RVAs.** Patch code embeds them (`rel32` hooks, `rip`-relative
  loads), so a claim never moves. The windows have a fixed size, so one patch's
  claims never move another's either. Claims are listed in `INDEX.md`, the same
  way code caves are named in READMEs.
- **Never move or resize the windows in `bases.json`** once a patch uses them.
  When one fills up, the way forward is a new window appended after the data
  window, with `.pdata2` moved behind it. Nothing references `.pdata2` by a
  fixed address, so that breaks no patch. `pe.js` doesn't support a second
  pair of windows yet.
- **Every function in a code claim needs an `unwind` entry** unless it is a leaf
  that touches neither the stack nor non-volatile registers. Without one, stack
  walks and exception unwinding (crash reporting) break through it. Its unwind
  info must lie inside the same patch's claims.
- **Payload code must be position-independent** (`rip`-relative, image base
  computed at run time) and use no imports. The build adds no relocations.
  Source and a disassembly listing are required; see "Reviewable form" below.
- **Payload files are `.bin`** with a pinned `sha256`. Every claim needs a
  `size`. For code, it must equal the file length; for data, the file (if any)
  can be shorter than `size`, and the rest is zeroed.

### What the build checks
- each base in `vanilla/` matches `bases.json`;
- every edit's `original` bytes are present. A wrong base, or an earlier patch
  that changed those bytes, is an error;
- no two patches edit overlapping bytes of the same asset or file;
- no asset is both replaced and edited, or replaced twice;
- a replace's `baseSha256` matches the vanilla asset, so a replacement made
  against a different base is rejected;
- `requires` exist and aren't disabled;
- for exe sections: every claim is inside its window, no claims overlap, payload
  files match their sha256, unwind entries cover only their own patch's code and
  don't overlap, no byte edit touches the PE header (the build owns it once it
  adds sections), and the base has header room, no overlay and no signature.
  The output is then re-parsed: contiguous sections, SizeOfImage, a sorted
  exception table, every claim written, the checksum, and base bytes unchanged
  outside the header.

Untouched pak entries are copied byte for byte from the vanilla pak, in vanilla
order. Changed entries are re-encoded the way UnrealPak does it: zlib blocks of
64 KiB, each encrypted with padding that repeats its leading bytes, and the
entry hash = sha1 of its stored bytes. Same inputs, same pak.

## Submitting a patch (pull requests)

A patch arrives as `"status": "testing"` and doesn't change what players get
until a maintainer promotes it. Shipped files, and the manifest describing
them, only change at release time. That keeps parallel PRs from conflicting,
and stops untested changes reaching players by accident.

### A binary (exe / pak) patch PR contains only

- `patches/<id>/`: `patch.json` (`"status": "testing"`), `README.md`
  (see `patches/AGENTS.md` for the headings), and any `files/`.
- The regenerated `patches/INDEX.md`.

### It must not contain

- **`views/js/patch_manifest.js`**: no hashes, no `dataMapping` entries, and
  never `patchLevel`. Those describe what ships. A `testing` patch doesn't
  ship, so any manifest change in its PR is wrong by definition.
- **Anything in `data/`.** Binaries there are build outputs, and a build that
  includes `testing` patches must never be committed.
- **Changes to `scripts/`, `patches/bases.json`, `.gitattributes` or other
  patches.** Send builder or format changes as their own PR, and open an issue
  first if your patch needs one. A new base (another stock pak, say) needs a
  maintainer anyway, because they hold the pristine files.
- **New target files** (a new `.pak`, a new loose file). The installer copies
  `dataMapping` files but never deletes any, so a new file can't be withdrawn
  by a later release. Put changes to existing assets into the stock pak that
  holds them (e.g. `BP.pak`) with `mkpatch`, and discuss genuinely new content
  in an issue first.
- **Commits from other PRs.** Base the branch on `master`, one fix per PR.
  If it depends on an unmerged PR, say so in the description instead of
  including that PR's commits.

### Reviewable form (no opaque blobs)

Every byte a patch ships has to be reviewable by someone who didn't write it.
A patch that is only a binary blob may sit as `testing`, but it **won't be
promoted to `shipped`**, and a maintainer may close it as unreviewable.

**Exe code** (byte edits and `section` payloads):
- **Source:** the source (C, C++ or assembly) for every `files/*.bin`, in the
  patch folder, with the exact toolchain, version and build command.
  Rebuilding from them must reproduce each `.bin`'s pinned `sha256`.
- **Disassembly:** a generated listing of every payload (e.g. `<name>.asm`),
  with function boundaries and what each function does.
- **Only your own code and data.** No embedded PE/DLL images (headers, export
  or debug tables), and no copies of the base exe's tables such as `.pdata`.
  The builder generates the unwind table and headers.
- **Annotated edits:** every byte edit carries a `note` naming the
  instructions it replaces and what replaces them. Displaced instructions must
  be accounted for.

**Pak assets:**
- **Byte edits** wherever `mkpatch` can produce them. Hand it only the assets
  you actually changed.
- **For each replaced asset, say what changed inside it:** which exports and
  properties, with before/after values. A UAssetGUI JSON diff of the touched
  exports is ideal; a written list is the minimum.
- **No re-cooks unless needed.** Re-saving regenerates GUIDs and recompresses
  textures (see `patches/recook-churn`), which buries the real change.

**Assets restored from older game releases:**
- the Steam **depot ID** and **ManifestID** they came from, and the **date that
  manifest was released** on Steam;
- the **original path and filename** of each asset in that release, e.g.
  `Content/Maps/ActionConquest/Halloween/Map_X.umap`, next to the path it
  ships under here;
- what, if anything, was changed from the historical file.

That's enough for anyone to download the same manifest and compare.

**Anything made elsewhere** (another repo, a published mod): a link to the
exact commit or file and its sha256, and whether this patch reproduces those
bytes.

### Before opening the PR

```
npm run patches:build -- --testing --out ../fs-test   # your patch builds with all others
npm run patches:build                                 # data/ back to shipped-only
npm run hashes                                        # must say "All hashes match" with no --update
npm run patches:index -- --check
git diff --cached                                     # no key material, no data/, no manifest
```

Test in-game with the files from `../fs-test`, and say in the README what you
tested and on which build. Check the patch meets "Reviewable form" above.

### Text payload PRs (`data/*.js`, `*.css`, `*.json`, `*.ini`)

These files are shipped as-is, and there is no `testing` status for them, so
a merged change goes out with the next release. Therefore:

- **Show the diff against stock.** If the file isn't in `data/` yet, make the
  first commit the unmodified game file on its own, then your change on top,
  so review sees only what you changed.
- **Update the file's hashes with `npm run hashes -- --update`** (no `--bump`),
  and add a `dataMapping` entry if the file is new.
- **Leave `patchLevel` alone.**
- **Don't add `.gitattributes` overrides.** `data/*.js` etc. are already
  `eol=crlf`, and the manifest hashes are taken from that CRLF working copy.
- Keep unrelated changes, such as reformatting or line-ending churn, out of
  the diff.

## Promoting a patch, and `patchLevel` (maintainers)

The launcher writes `patchLevel` into the game folder's `bootlegger.json`
after patching. A copy counts as installed only when its recorded level
equals the launcher's, so a player is asked to repatch whenever the number
changes. The rules follow from that:

- **`patchLevel` changes only when the shipped set changes**, meaning the files
  in `data/` built from `shipped` patches plus the text payloads, and only in a
  maintainer commit for a release.
- **Bump it at most once per release.** If it's already above the level of the
  last published release, don't bump again.
- A PR never sets it. Two PRs that each set it to the same number would claim
  that two different file sets are the same level.

To promote a tested patch: set `"status": "shipped"`, then run

```
npm run patches:build                 # shipped only, into data/
npm run hashes -- --update --bump     # new hashes; bumps only if something changed
npm run patches:index
```

and commit `patch.json`, `INDEX.md` and `patch_manifest.js` together.

## Releases

Order of operations for a launcher release:

```
npm run patches:build                 # data/ = bases + shipped patches
npm run hashes -- --update --bump     # only if any data/ file changed, once per release
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

- One patch per branch/PR, in its own folder, following "Submitting a
  patch" above. Two people rarely touch the same files, and when they touch
  the same *asset*, the build says so.
- Commit the regenerated `patches/INDEX.md` with the patch. In review, the
  INDEX diff shows at a glance which files and assets the PR touches, and
  `npm run patches:index -- --check` fails if someone forgot.
- Use slug IDs, never sequence numbers, so parallel work can't collide.
- Changes to `data/BP.pak` show up in review as JSON and a README, not as a
  71 MB blob.
- Experimental work goes in as `"status": "testing"`. Testers build with
  `--testing --out <dir>`, and a maintainer promotes the patch to `shipped`
  once it's confirmed in-game.
- Never commit `.pak-key`, Steam files in `vanilla/` (only the tracked source-built exe belongs there), or built binaries in `data/`.
  Regenerate them.
