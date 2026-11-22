# fractured-bootstrapper
Fractured Space Bootstrapper, alternative to the Bootlegger.

This is a 3rd party launcher for FS to re-enable multiplayer functionality


# What does this do?
- Automates the patching of the final version of FS on steam to allow:
  * Use of an alternate backend: https://lifeline.returnvector.net/
  * Re-implements a mutiplayer server browser
  * Removes Steam authentication replacing it with Discord
  * Allows new players who don't *own* the free game to play
- Automates the new Discord authentication process
- Check for updates and auto-updates when required

# Offline mode
Press **Launch Offline** under *Launch Game* (it works without signing in, once the game is patched). The launcher then runs a local copy of the Fireline backend
(a Node port of [refireline](https://github.com/Tigerhacker/refireline)) on a random localhost
port for as long as the game is running, and starts the game with `-flhost=http://127.0.0.1:<port>`. No internet connection or Discord sign-in is needed. Only the solo
(vs AI) modes work.

The emulator replays recorded responses from the original `api.fireteam.net`, bundled as
`data/fireline-responses.json` in refireline's `responses.json` format. To play back your own capture
(see refireline's README), put it at `fireline-responses.json` in the launcher's user data folder
(`%APPDATA%ractured-space-bootstrapper` on Windows, `~/.config/fractured-space-bootstrapper` on Linux).

# Linux
Fractured Space is Windows only, so on Linux the bootstrapper patches the Steam install as normal and
launches the game through **Proton** (or system Wine). Install the game in Steam first, and install a
Proton version (Steam > Library > Tools, or GE-Proton via ProtonUp-Qt).

Which download to use:

| Distro | Package |
| --- | --- |
| Ubuntu / Debian / Mint / Pop!_OS | `.deb` (`sudo apt install ./FracturedSpaceBootstrapper-x86_64.deb`) |
| Fedora Workstation | `.rpm` (`sudo dnf install ./FracturedSpaceBootstrapper-x86_64.rpm`) |
| Bazzite, SteamOS, Silverblue/Kinoite, anything else | `.AppImage` (mark as executable, or add it with Gear Lever) |

All three update themselves. On Ubuntu 24.04+ AppImages of Electron apps are blocked by AppArmor unless
started with `--no-sandbox`, so prefer the `.deb` there.

The AppImage needs FUSE 2 (`libfuse.so.2`) to start. Many distros no longer install it by default:
install `libfuse2t64` (Ubuntu 24.04+), `libfuse2` (older Ubuntu/Debian) or `fuse-libs` (Fedora),
or run it with `--appimage-extract-and-run`.

Linux settings (on the main page):
- **Compatibility tool**: the Proton/Wine build to run the game with. Steam's Proton versions, custom
  ones in `compatibilitytools.d` (GE-Proton etc), and system Wine are detected automatically.
- **Wine prefix**: defaults to `~/.local/share/fractured-space-bootstrapper/compatdata`; the actual
  prefix is the `pfx` folder inside it. "Use Steam's prefix" switches to `steamapps/compatdata/310380`
  if the game was ever run from Steam.
- **Steam Linux Runtime**: newer Proton builds are run inside the runtime container like Steam does.
  Turn it off if the game will not start.
- Logs of the last launch are in `~/.local/share/fractured-space-bootstrapper/logs`.

Discord sign-in: the launcher registers itself for `fracturedspace://` links every time it starts
(`~/.local/share/applications/fractured-space-bootstrapper-url-handler.desktop`). If the browser
still does not hand the login back, press "Fix Discord sign-in link" or use Manual auth.

## Debugging the Linux settings on Windows
The Linux section can be shown on any platform:
- start with `npm run start:linux-ui` (or pass `--show-linux-settings` to the app), or
- set `FS_SHOW_LINUX_SETTINGS=1`, or
- in the developer tools (ctrl+i) run `fsDebug.showLinuxSettings()` (persists; undo with
  `fsDebug.showLinuxSettings(false)`).

`fsDebug.describeLaunch()` shows the exact command and environment that Launch would use.

## Building for Linux
deb/rpm can't be built on Windows. Run the "Build Linux" GitHub Action (tick *publish* to upload to
the draft release that `npm run deploy` created), or run `npm run build:linux` on a Linux machine.

On Windows with WSL 2 (needs `sudo apt-get install -y rpm` in the distro once), run
`npm run build:linux:wsl`. It copies the repo into `~/fsb-build` inside WSL, installs Node 22 there on
first run, builds, and copies the AppImage/deb/rpm and `latest-linux.yml` to `dist\linux`. Add
`-- -Distro <name>` to pick a WSL distro, or `-- -Clean` to reinstall node_modules.
Publish the release only after both the Windows and Linux builds are uploaded, otherwise Linux copies
won't find `latest-linux.yml` and their update check fails.

# Join the Discord community
[https://discord.gg/6DqDJUWgWQ](https://discord.gg/u4gsGCrqfp)
