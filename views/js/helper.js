const { shell } = require('electron')
const https = require('https');

const patchManifest = require('./patch_manifest.js')

module.exports.openExternal = function (url) {
    shell.openExternal(url)
};

// callback(err, res, body) - same shape as the old `request` library callback.
// Uses https directly because the server expects a GET with a body, which fetch() refuses.
function isTokenValid(token, callback) {
    const body = Buffer.from(String(token || ''), 'utf8');
    const req = https.request('https://lifeline.returnvector.net/api/v0/discord/bearercheck', {
        method: 'GET',
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': body.length,
            'Accept-Charset': 'utf-8',
            'User-Agent': 'fs-bootstrapper',
            'X-Patch-Level': patchManifest.patchLevel
        }
    }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => callback(null, res, Buffer.concat(chunks).toString('utf8')));
        res.on('error', (err) => callback(err, null, null));
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', (err) => callback(err, null, null));
    req.end(body);
}

module.exports.isTokenValid = isTokenValid;
