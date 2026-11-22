# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron launcher/patcher for the Steam game Fractured Space (app id 310380). It overwrites a few game files so the game talks to the community backend (`https://lifeline.returnvector.net`) instead of the dead official one, handles Discord sign-in via a `fracturedspace://` deep link, launches the game (directly on Windows, through Proton/Wine on Linux), and can run an offline local backend emulator. Plain CommonJS JavaScript, no bundler, no TypeScript, no test suite, no linter.

## Commands

```
npm start                 # electron .
npm run start:linux-ui    # same, but shows the Linux-only settings on any OS (--show-linux-settings)
npm run pack              # unpacked build into dist/
npm run build             # Windows NSIS installer, no publish
npm run build:linux       # AppImage + deb + rpm (Linux host only; deb/rpm can't be built on Windows)
npm run build:linux:wsl   # same, from Windows via WSL (scripts/build-linux-wsl.ps1 -> .sh); output in dist/linux
npm run deploy            # Windows build + publish to a draft GitHub release
```

Linux release builds are normally made by the manually-dispatched "Build Linux" GitHub Action (`.github/workflows/build-linux.yml`), which uploads to the same draft release `npm run deploy` created. Publish the draft only after both Windows and Linux artifacts (including `latest-linux.yml`) are uploaded, or Linux auto-update breaks.

Developer tools in the app: Ctrl+I. Console helpers: `fsDebug.showLinuxSettings()` / `fsDebug.showLinuxSettings(false)`, `fsDebug.describeLaunch()` (the exact Linux launch command/env). `FS_SHOW_LINUX_SETTINGS=1` also forces the Linux UI.

## Architecture

**Main process (`main.js`)** — single window, single-instance lock, `fracturedspace://auth/discord/<token>` deep-link handling (token is validated against a safe-char regex because it ends up on the game's command line, stored as `discord_token`, then the window reloads), protocol registration (on Linux it writes its own hidden `.desktop` handler on every start because AppImage paths move), electron-updater wiring, and the IPC handlers for dialogs, `openPath`, and the offline emulator (`fireline_start/stop/info`). The emulator lives in the main process so it survives renderer reloads.

**Renderer has full Node access** (`nodeIntegration: true`, `contextIsolation: false`). Almost all logic lives in `views/js/*.js` modules that are `require`d by `views/js/preload.js`, which exposes them on `window.interop` (and `window.fsDebug`). `views/home.html` + `views/js/home.js` (jQuery) is the UI and only talks to `window.interop` and `ipcRenderer`. Because of the Node access, `main.js` blocks navigation to non-`file://` URLs and routes `window.open` to the external browser — keep that invariant. `home.html` stashes/restores `module` around jQuery so jQuery doesn't register itself as a CommonJS module.

`views/js/settings.js` wraps electron-store; its exports are spelled `sotreSet/sotreGet/sotreDel/sotreGetFolder` (sic) and are used everywhere — don't "fix" the name in one place only. `views/js/settings.js` and `views/js/fireline.js` are also required by `main.js`, so they must not depend on renderer-only APIs.

**Patching flow** (`installer.js` + `patch_manifest.js`): files in `data/` are copied into the game folder per `dataMapping` (src → dest under `Space/`), then every dest is SHA-256 checked against the manifest, and `bootlegger.json` (`{version: patchLevel, status}`) is written into the game folder. "Installed" means `bootlegger.json` version equals `patchLevel`. **When any file in `data/` changes, update its hashes in `patch_manifest.js` and bump `patchLevel`**, otherwise validation fails or existing users are never prompted to repatch.

**Binary patches** (`patches/`, `scripts/build-patches.js`, `scripts/lib/pak.js`, docs in `docs/patching.md`): binary payloads such as `data/BP.pak` are build outputs. Folders are per fix, not per file; each `patches/<id>/patch.json` (one `target`, or several under `targets`) describes edits/replacements against a pristine base in `vanilla/` (sha256 pinned in `patches/bases.json`). Don't hand-edit those files in `data/`; change a patch, run `npm run patches:build`, then `npm run hashes -- --update --bump`, and commit the regenerated `patches/INDEX.md` (per-file view). `data/*.exe` and `data/*.pak` are gitignored build outputs; each release carries them in a patch zip (`npm run release:zip`, uploaded by `postdeploy`), which the Linux workflow downloads and unpacks into `data/` before building. The exe base is the source build `vanilla/spacegame/Binaries/Win64/spacegame-Win64-Shipping-30.exe` (tracked in git; the rest of `vanilla/` is ignored), not the Steam store exe. Paks are v4 with AES-256 entries; the key comes from gitignored `.pak-key` or `FS_PAK_AES_KEY` and must never be committed.

**Data files location**: `data/` is shipped via electron-builder `extraResources`, so code resolves it as `process.resourcesPath/data` when packaged and `<repo>/data` in dev (see `dataDir()` in `installer.js`, `defaultResponsesFile()` in `fireline.js`). Note the `build.files` whitelist in `package.json` — only `views/**`, `main.js`, `package.json` are packaged.

**Game folder discovery** (`find-steam.js`, `steam-paths.js`): `folder_override` setting → a `./Space` folder in cwd → Steam libraries (Windows: `winreg` HKLM Valve key + `libraryfolders.vdf`; Linux: common Steam roots incl. Flatpak/Snap). `winreg` is only required on Windows.

**Launch** (`launcher.js`): args are `-flhost=<backend> -discord=<token> -culture=<lang>`, passed via `spawn` without a shell. Tokens are redacted from any displayed error/log (`redact()`). Windows sets `SteamAppId=310380` and `OPENSSL_ia32cap` and polls `tasklist` to detect exit. Linux delegates to `proton.js` `buildLaunch()`, which picks the runner (Steam Proton, `compatibilitytools.d`, or system Wine), the compat-data/prefix dir (default `~/.local/share/fractured-space-bootstrapper/compatdata`, or Steam's `compatdata/310380`), optionally wraps in the Steam Linux Runtime container, sets `HOME` to `~/.var/app/com.valvesoftware.Steam` when only Flatpak Steam has `.steam/sdk64/steamclient.so` (Proton 10's steam.exe asserts otherwise; `sandboxedSteamHome()`), and writes a launch log to `~/.local/share/fractured-space-bootstrapper/logs`. `proton.js` is safe to load on Windows (finds nothing) so the Linux UI can be previewed there.

**Offline mode** (`fireline.js`): a Node `http` port of refireline that replays recorded `api.fireteam.net` responses (`data/fireline-responses.json`, or a user capture at `<userData>/fireline-responses.json`) on a random 127.0.0.1 port. Started right before launch, stopped when the game exits; the game gets `-discord=Captain` so the real token is never sent.

**Updates**: electron-updater against GitHub releases. `updateUnsupportedReason()` in `main.js` explains why a given copy can't self-update (unpacked, non-AppImage/deb/rpm Linux, rpm on rpm-ostree systems) instead of leaving the UI hanging.

## Testing locally

Steam and the game are generally not installed on the dev machine. The single-instance lock means a second `electron .` quits immediately if one is already running; start a test copy with its own `--user-data-dir=<dir>` (optionally `--remote-debugging-port=<port>` to drive it over CDP). To exercise the launch path without the game, point `folder_override` at a folder containing a stand-in `spacegame/Binaries/Win64/Fractured Space.exe` and a `bootlegger.json` with the current `patchLevel`.
