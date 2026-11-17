// Local Fireline emulator for offline (single player) play.
//
// Node port of refireline (https://github.com/Tigerhacker/refireline): the game is pointed at
// http://127.0.0.1:<port> instead of the community backend and every request is answered with a
// pre-recorded response from the original api.fireteam.net, looked up by method + path.
//
// Runs in the main process (so it survives renderer reloads) and only while the game is running.
// Uses nothing but Node's http module; the recordings are loaded on first start and released on stop.
const http = require('http');
const fs = require('fs');
const path = require('path');

const BANNER = 'Fireline Emulator for Fractured Space (fractured-bootstrapper)';
// The recordings were captured against this host; everything after it is the request path
const RECORDED_ORIGIN = 'https://api.fireteam.net/';

let server = null;
let routes = null;
let starting = null;

// Packaged: <install>/resources/data (electron-builder extraResources). Dev: <repo>/data
function defaultResponsesFile() {
    const packaged = path.join(process.resourcesPath || '', 'data', 'fireline-responses.json');
    if (process.resourcesPath && fs.existsSync(packaged)) return packaged;
    return path.join(__dirname, '..', '..', 'data', 'fireline-responses.json');
}

// Strip the recorded origin (or any origin) so only "o/player_info/<id>?query" is left
function recordedPath(url) {
    url = String(url);
    if (url.startsWith(RECORDED_ORIGIN)) return url.slice(RECORDED_ORIGIN.length);
    return url.replace(/^[a-z]+:\/\/[^\/]+\//i, '');
}

// Builds the lookup table. Same file format as refireline's responses.json
// (list of {request:{method,url}, response:{status_code,content}}), so captures made with its
// util/mitm-extractor.py can be dropped in unchanged.
function loadResponses(file) {
    const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(entries)) throw new Error('responses file must be a JSON array');

    const exact = new Map(); // "METHOD path?query" -> response
    const byPath = new Map(); // "METHOD path" -> response (last recording wins, as in refireline)
    for (const entry of entries) {
        if (!entry || !entry.request || !entry.response) continue;
        const method = String(entry.request.method || 'GET').toUpperCase();
        const full = recordedPath(entry.request.url);
        const pathOnly = full.split('?', 1)[0];
        const response = {
            status: Number(entry.response.status_code) || 200,
            body: Buffer.from(String(entry.response.content == null ? '' : entry.response.content), 'utf8'),
        };
        exact.set(method + ' ' + full, response);
        byPath.set(method + ' ' + pathOnly, response);
    }
    return { exact, byPath, count: entries.length };
}

function lookup(table, method, requestPath, search) {
    return table.exact.get(method + ' ' + requestPath + search) || table.byPath.get(method + ' ' + requestPath) || null;
}

// Same shape as a real Fireline "not found" so the game handles it like any other missing object
function notFound(method, requestPath) {
    return Buffer.from(JSON.stringify({
        error: 'resource_not_found',
        http_status_code: 404,
        error_description: `No recorded response for ${method} /${requestPath}`,
    }), 'utf8');
}

function send(res, status, body, type) {
    res.writeHead(status, {
        'Content-Type': type || 'application/json',
        'Content-Length': body.length,
    });
    res.end(body);
}

function handleRequest(req, res) {
    // The client may send a body (PUT/POST); it is never used, but must be consumed
    req.resume();

    const parsed = new URL(req.url, 'http://localhost');
    const requestPath = parsed.pathname.replace(/^\/+/, '');
    const method = req.method.toUpperCase();

    if (requestPath === '') {
        send(res, 200, Buffer.from(BANNER), 'text/plain');
        return;
    }

    const canned = routes && lookup(routes, method, requestPath, parsed.search);
    if (canned) {
        send(res, canned.status, canned.body);
    } else {
        console.log(`[fireline] no recording for ${method} /${requestPath}${parsed.search}`);
        send(res, 404, notFound(method, requestPath));
    }
}

// Starts the emulator on a free localhost port. Resolves {url, port, entries, file}.
// options.responsesFile: recording to use instead of the bundled one, when it exists
// (e.g. <userData>/fireline-responses.json, so a user can play back their own capture)
function start(options = {}) {
    if (server && server.listening) return Promise.resolve(info());
    if (starting) return starting;

    starting = new Promise((resolve, reject) => {
        let file = defaultResponsesFile();
        if (options.responsesFile && fs.existsSync(options.responsesFile)) file = options.responsesFile;

        try {
            routes = loadResponses(file);
        } catch (e) {
            reject(new Error(`Could not load the offline recordings from ${file}: ${e.message}`));
            return;
        }
        routes.file = file;

        const s = http.createServer(handleRequest);
        s.keepAliveTimeout = 30000;
        s.on('error', (e) => {
            routes = null;
            reject(e);
        });
        s.listen(options.port || 0, '127.0.0.1', () => {
            server = s;
            console.log(`[fireline] offline emulator on ${info().url} (${routes.count} recordings from ${file})`);
            resolve(info());
        });
    }).finally(() => { starting = null; });
    return starting;
}

function stop() {
    const s = server;
    server = null;
    routes = null;
    if (!s) return Promise.resolve();
    return new Promise((resolve) => {
        s.close(() => resolve());
        // Drop keep-alive connections the game left open so close() does not wait on them
        if (typeof s.closeAllConnections === 'function') s.closeAllConnections();
    });
}

function info() {
    if (!server || !server.listening) return null;
    const port = server.address().port;
    return {
        url: `http://127.0.0.1:${port}`,
        port,
        entries: routes ? routes.count : 0,
        file: routes ? routes.file : null,
    };
}

module.exports = {
    start,
    stop,
    info,
    loadResponses,
    defaultResponsesFile,
};
