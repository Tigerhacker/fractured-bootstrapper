'use strict';

// Same fixed Lifeline validation endpoint, body and headers as the launcher.
// The avatar lookup has its own bounded request and does not change login state.
function validate(token, callback) {
    const request = require('https').request('https://lifeline.returnvector.net/api/v0/discord/bearercheck', {
        method: 'GET', headers: {'Content-Type': 'application/json', 'Accept-Charset': 'utf-8',
            'User-Agent': 'fs-bootstrapper', 'X-Patch-Level': require('./patch_manifest.js').patchLevel,
            'Content-Length': Buffer.byteLength(token)}
    }, response => {
        const chunks = []; let length = 0;
        response.on('data', chunk => {
            length += chunk.length;
            if (length > 1024 * 1024) response.destroy(new Error('Account response too large'));
            else chunks.push(chunk);
        });
        response.on('error', error => callback(error));
        response.on('end', () => callback(null, response, Buffer.concat(chunks).toString('utf8')));
    });
    request.setTimeout(5000, () => request.destroy(new Error('Account lookup timeout')));
    request.on('error', error => callback(error));
    request.end(token);
}

function create(settings, helper = {isTokenValid: validate}, now = Date.now) {
    let currentToken, currentName, until = 0, value = null, pending = null;
    return function localProfile() {
        const token = settings.sotreGet('discord_token');
        const name = settings.sotreGet('discord_name');
        if (typeof token !== 'string' || !token || typeof name !== 'string' || !name) {
            currentToken = currentName = undefined;
            value = pending = null; until = 0;
            return Promise.resolve(null);
        }
        if (token === currentToken && name === currentName) {
            if (pending) return pending;
            if (until > now()) return Promise.resolve(value);
        }
        currentToken = token; currentName = name; value = null;
        const operation = new Promise(resolve => {
            let finished = false;
            const timer = setTimeout(() => finish(null), 5500);
            function finish(profile) {
                if (finished) return;
                finished = true; clearTimeout(timer); resolve(profile);
            }
            try {
                helper.isTokenValid(token, (error, response, body) => {
                    try {
                        if (error || !response || response.statusCode !== 200 || typeof body !== 'string' || body.length > 1024 * 1024) return finish(null);
                        const user = JSON.parse(body);
                        if (typeof user.username !== 'string' || !user.username || user.username.length > 128 ||
                            /[\x00-\x1f\x7f]/.test(user.username) || !/^\d{15,22}$/.test(user.id) ||
                            !/^(?:a_)?[a-f0-9]{32}$/.test(user.avatar)) return finish(null);
                        finish({id: user.id, discord: user.id, name: user.username,
                            avatar: 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png'});
                    } catch (_) { finish(null); }
                });
            } catch (_) { finish(null); }
        });
        pending = operation.then(profile => {
            // An in-flight response from a previous login must never supply the next account.
            if (settings.sotreGet('discord_token') !== token || settings.sotreGet('discord_name') !== name) return null;
            if (currentToken === token && currentName === name) {
                value = profile; until = now() + (profile ? 60000 : 15000); pending = null;
            }
            return profile;
        });
        return pending;
    };
}

module.exports = {create};
