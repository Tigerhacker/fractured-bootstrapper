// Linux: run the Windows-only game through Proton (preferred) or system Wine.
//
// Terminology:
//   compat data folder  - what Steam calls STEAM_COMPAT_DATA_PATH, e.g. steamapps/compatdata/310380
//   wine prefix         - the fake Windows install (drive_c etc), always <compat data folder>/pfx
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const settings = require('./settings.js');
const steamPaths = require('./steam-paths.js');
const { linuxDataDir } = require('./platform.js');

const KEYS = {
    runner: 'linux_runner',              // { type: 'proton'|'wine', path, name }
    prefix: 'linux_prefix_override',     // compat data folder override
    useRuntime: 'linux_use_runtime',     // wrap Proton in the Steam Linux Runtime container (default true)
    protonLog: 'linux_proton_log',       // PROTON_LOG=1 / WINEDEBUG on
    extraEnv: 'linux_extra_env',         // "KEY=value KEY2=value"
};

// Steam Linux Runtime app ids -> default install folder names
const KNOWN_RUNTIMES = {
    '1070560': 'SteamLinuxRuntime',
    '1391110': 'SteamLinuxRuntime_soldier',
    '1628350': 'SteamLinuxRuntime_sniper',
    '4183110': 'SteamLinuxRuntime_4',       // Proton 11 / GE-Proton 11+
};

function defaultPrefixDir() {
    return path.join(linuxDataDir(), 'compatdata');
}

function logsDir() {
    return path.join(linuxDataDir(), 'logs');
}

function isFile(p) {
    try {
        return fs.statSync(p).isFile();
    } catch (e) {
        return false;
    }
}

function findOnPath(binary) {
    for (const dir of (process.env.PATH || '').split(':')) {
        if (!dir) continue;
        const candidate = path.join(dir, binary);
        try {
            fs.accessSync(candidate, fs.constants.X_OK);
            if (isFile(candidate)) return candidate;
        } catch (e) { /* not here */ }
    }
    return null;
}

function protonDisplayName(dir) {
    // Custom tools (GE-Proton etc) carry a nicer name in compatibilitytool.vdf
    return steamPaths.readVdfValue(path.join(dir, 'compatibilitytool.vdf'), 'display_name') || path.basename(dir);
}

// All Proton builds we can find: official ones in every Steam library, plus custom ones
// (GE-Proton, CachyOS, etc) in compatibilitytools.d - per user, and system wide as shipped by
// distro packages (Arch, Bazzite, ...).
function findProtonVersions() {
    const seen = new Set();
    const found = [];

    function consider(dir, source) {
        const real = steamPaths.realpath(dir);
        if (!real || seen.has(real) || !isFile(path.join(real, 'proton'))) return;
        seen.add(real);
        found.push({ type: 'proton', name: protonDisplayName(real), path: real, source });
    }

    function scan(parent, source, filter) {
        let entries = [];
        try {
            entries = fs.readdirSync(parent);
        } catch (e) {
            return;
        }
        for (const entry of entries) {
            if (filter && !filter(entry)) continue;
            consider(path.join(parent, entry), source);
        }
    }

    for (const lib of steamPaths.linuxSteamLibraries()) {
        scan(path.join(lib, 'common'), 'Steam', (e) => /^proton/i.test(e));
    }
    for (const root of steamPaths.linuxSteamRoots()) {
        scan(path.join(root, 'compatibilitytools.d'), 'custom');
    }
    for (const sys of ['/usr/share/steam/compatibilitytools.d', '/usr/local/share/steam/compatibilitytools.d']) {
        scan(sys, 'system');
    }

    // Experimental first, then newest version first
    found.sort((a, b) => {
        const ax = /experimental/i.test(a.name), bx = /experimental/i.test(b.name);
        if (ax !== bx) return ax ? -1 : 1;
        return b.name.localeCompare(a.name, undefined, { numeric: true });
    });
    return found;
}

function findSystemWine() {
    const wine = findOnPath('wine');
    if (!wine) return null;
    let version = '';
    try {
        version = child_process.execFileSync(wine, ['--version'], { timeout: 5000, encoding: 'utf8' }).trim();
    } catch (e) { /* ignore */ }
    return { type: 'wine', name: 'System Wine' + (version ? ` (${version})` : ''), path: wine, source: 'system' };
}

// Every runner the user can pick from, best first
function findRunners() {
    const runners = findProtonVersions();
    const wine = findSystemWine();
    if (wine) runners.push(wine);
    return runners;
}

function getRunner() {
    const saved = settings.sotreGet(KEYS.runner);
    return saved && saved.path ? saved : null;
}

function setRunner(runner) {
    if (!runner || !runner.path) {
        settings.sotreDel(KEYS.runner);
    } else {
        settings.sotreSet(KEYS.runner, { type: runner.type, name: runner.name, path: runner.path });
    }
}

// Steam's own compat data folder for the game, if the game has ever been run through Steam
function steamPrefixDir(gameFolder) {
    if (!gameFolder) return null;
    // <library>/steamapps/common/Space -> <library>/steamapps/compatdata/310380
    const dir = path.resolve(gameFolder, '..', '..', 'compatdata', steamPaths.APP_ID);
    return steamPaths.isDir(dir) ? dir : null;
}

function getPrefixDir() {
    const override = settings.sotreGet(KEYS.prefix);
    if (typeof override === 'string' && override.length > 0) return override;
    return defaultPrefixDir();
}

function isPrefixOverridden() {
    const override = settings.sotreGet(KEYS.prefix);
    return typeof override === 'string' && override.length > 0;
}

function setPrefixDir(dir) {
    if (dir) settings.sotreSet(KEYS.prefix, dir);
    else settings.sotreDel(KEYS.prefix);
}

// The prefix is created by Proton/Wine on first launch; this only reports on it
function prefixInfo() {
    const dir = getPrefixDir();
    const pfx = path.join(dir, 'pfx');
    return {
        compatDataDir: dir,
        winePrefix: pfx,
        exists: steamPaths.isDir(path.join(pfx, 'drive_c')),
        isDefault: !isPrefixOverridden(),
        protonVersion: (() => {
            try {
                return fs.readFileSync(path.join(dir, 'version'), 'utf8').trim();
            } catch (e) {
                return null;
            }
        })(),
    };
}

// Delete the prefix so it is rebuilt on next launch. Only ever deletes the "pfx" sub folder and
// Proton's own bookkeeping files, never the chosen folder itself.
function resetPrefix() {
    const dir = getPrefixDir();
    fs.rmSync(path.join(dir, 'pfx'), { recursive: true, force: true });
    for (const f of ['version', 'config_info', 'tracked_files', 'pfx.lock']) {
        fs.rmSync(path.join(dir, f), { force: true });
    }
}

// Proton 5.13+ declares the Steam Linux Runtime it was built for in toolmanifest.vdf.
// Steam runs it inside that container, and so should we, otherwise newer Proton builds can fail
// on distros whose libraries differ from the runtime (this is what umu-launcher does too).
function findRuntimeFor(protonDir) {
    const appId = steamPaths.readVdfValue(path.join(protonDir, 'toolmanifest.vdf'), 'require_tool_appid');
    if (!appId) return { required: false };

    for (const lib of steamPaths.linuxSteamLibraries()) {
        const installDir = steamPaths.readVdfValue(path.join(lib, `appmanifest_${appId}.acf`), 'installdir')
            || KNOWN_RUNTIMES[appId];
        if (!installDir) continue;
        const entry = path.join(lib, 'common', installDir, '_v2-entry-point');
        if (isFile(entry)) return { required: true, appId, entryPoint: entry, name: installDir };
    }
    return { required: true, appId, entryPoint: null, name: KNOWN_RUNTIMES[appId] || `app ${appId}` };
}

function getUseRuntime() {
    return settings.sotreGet(KEYS.useRuntime) !== false;
}

function getProtonLog() {
    return settings.sotreGet(KEYS.protonLog) === true;
}

function getExtraEnvText() {
    return settings.sotreGet(KEYS.extraEnv) || '';
}

// "A=1 B='two words' C=\"x\"" -> { A: '1', B: 'two words', C: 'x' }
function parseExtraEnv(text) {
    const env = {};
    const re = /([A-Za-z_][A-Za-z0-9_]*)=("([^"]*)"|'([^']*)'|(\S*))/g;
    let m;
    while ((m = re.exec(text || '')) !== null) {
        env[m[1]] = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
    }
    return env;
}

// Works out exactly what to execute. Pure apart from reading settings/disk, so it can be
// inspected from devtools: fsDebug.describeLaunch()
function buildLaunch(gameFolder, gameArgs) {
    const runner = getRunner();
    if (!runner) {
        throw new Error('No Proton or Wine version selected. Pick one under "Linux settings".');
    }
    if (!fs.existsSync(runner.path)) {
        throw new Error(`The selected runner no longer exists:\n${runner.path}\n\nPick another one under "Linux settings".`);
    }

    const exePath = path.join(gameFolder, 'spacegame', 'Binaries', 'Win64', 'Fractured Space.exe');
    const compatData = getPrefixDir();
    const steamRoot = steamPaths.linuxSteamRoots()[0] || '';
    const log = getProtonLog();

    const env = Object.assign({}, process.env, {
        SteamAppId: steamPaths.APP_ID,
        SteamGameId: steamPaths.APP_ID,
        OPENSSL_ia32cap: ':~0x20000000',
    });
    // An AppImage puts its own libraries first; they must not leak into Wine or the game
    if (process.env.APPIMAGE) {
        for (const k of ['LD_LIBRARY_PATH', 'LD_PRELOAD', 'PYTHONHOME', 'PYTHONPATH', 'GSETTINGS_SCHEMA_DIR']) {
            delete env[k];
        }
    }

    let command, args, runtime = null;

    if (runner.type === 'wine') {
        env.WINEPREFIX = path.join(compatData, 'pfx');
        if (!log) env.WINEDEBUG = '-all';
        command = runner.path;
        args = [exePath, ...gameArgs];
    } else {
        const proton = path.join(runner.path, 'proton');
        Object.assign(env, {
            STEAM_COMPAT_DATA_PATH: compatData,
            STEAM_COMPAT_CLIENT_INSTALL_PATH: steamRoot,
            STEAM_COMPAT_INSTALL_PATH: gameFolder,
            STEAM_COMPAT_APP_ID: steamPaths.APP_ID,
            STEAM_COMPAT_TOOL_PATHS: runner.path,
            STEAM_COMPAT_LIBRARY_PATHS: steamPaths.linuxSteamLibraries().join(':'),
        });
        if (log) {
            env.PROTON_LOG = '1';
            env.PROTON_LOG_DIR = logsDir();
        }

        // waitforexitandrun: blocks until the game (and wineserver) exit, so the child exiting
        // tells us the game has closed.
        const protonArgs = ['waitforexitandrun', exePath, ...gameArgs];
        runtime = getUseRuntime() ? findRuntimeFor(runner.path) : { required: false, disabled: true };
        if (runtime.entryPoint) {
            command = runtime.entryPoint;
            args = ['--verb=waitforexitandrun', '--', proton, ...protonArgs];
        } else if (isFile(proton) && isExecutable(proton)) {
            command = proton;
            args = protonArgs;
        } else {
            // proton is a python script; fall back to running it explicitly
            command = findOnPath('python3') || 'python3';
            args = [proton, ...protonArgs];
        }
    }

    Object.assign(env, parseExtraEnv(getExtraEnvText()));

    return {
        command,
        args,
        env,
        cwd: path.dirname(exePath),
        exePath,
        runner,
        runtime,
        compatData,
        logFile: path.join(logsDir(), 'last-launch.log'),
    };
}

function isExecutable(p) {
    try {
        fs.accessSync(p, fs.constants.X_OK);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    KEYS,
    findRunners,
    getRunner,
    setRunner,
    defaultPrefixDir,
    getPrefixDir,
    setPrefixDir,
    steamPrefixDir,
    prefixInfo,
    resetPrefix,
    findRuntimeFor,
    getUseRuntime,
    getProtonLog,
    getExtraEnvText,
    parseExtraEnv,
    logsDir,
    buildLaunch,
};
