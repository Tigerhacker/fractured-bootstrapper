'use strict';

const https = require('https');

const CDN = /^https:\/\/cdn\.discordapp\.com\/avatars\/(\d{15,22})\/((?:a_)?[a-f0-9]{32})\.png(?:\?[^#]*)?$/;
const IMAGE_PATH = /^\/avatars\/image\/(\d{15,22})\/((?:a_)?[a-f0-9]{32})\.png$/;
const MAX_BYTES = 2 * 1024 * 1024;

function download(url, type) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {headers: {'User-Agent': 'FracturedSpace-DiscordAvatars/1.0', Accept: type}}, res => {
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error('Avatar source unavailable'));
                return;
            }
            let size = 0;
            const chunks = [];
            res.on('data', chunk => {
                size += chunk.length;
                if (size > MAX_BYTES) res.destroy(new Error('Avatar response too large'));
                else chunks.push(chunk);
            });
            res.on('error', reject);
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.setTimeout(5000, () => req.destroy(new Error('Avatar source timeout')));
        req.on('error', reject);
    });
}

function create(options) {
    const fetch = options.download || download;
    const now = options.now || Date.now;
    const base = 'http://127.0.0.1:27173';
    const cache = new Map();
    const pending = new Map();

    function cached(key, ttl, load) {
        const hit = cache.get(key);
        if (hit && hit.until > now()) return Promise.resolve(hit.value);
        if (pending.has(key)) return pending.get(key);
        const result = Promise.resolve().then(load).then(value => {
            cache.delete(key);
            if (cache.size >= 128) cache.delete(cache.keys().next().value);
            cache.set(key, {value, until: now() + ttl});
            return value;
        }).finally(() => pending.delete(key));
        pending.set(key, result);
        return result;
    }

    function imageUrl(remote) {
        const match = typeof remote === 'string' && CDN.exec(remote);
        return match ? base + '/avatars/image/' + match[1] + '/' + match[2] + '.png' : '';
    }

    async function onlinePlayers() {
        return cached('online', 15000, async () => {
            const body = JSON.parse((await fetch('https://lifeline.returnvector.net/api/v0/servers/active', 'application/json')).toString());
            if (!body || !Array.isArray(body.servers) || body.servers.length > 256) throw new Error('Invalid server list');
            const rows = [];
            for (const server of body.servers) {
                if (!Array.isArray(server.players)) continue;
                for (const p of server.players.slice(0, 64)) {
                    if (!p || typeof p.username !== 'string' || !/^\d{1,12}$/.test(String(p.user_id_public))) continue;
                    const url = imageUrl('https://cdn.discordapp.com/avatars/' + p.discord_id + '/' + p.profile_image_slug + '.png');
                    rows.push({id: String(p.user_id_public), name: p.username, discord: String(p.discord_id || ''), url});
                }
            }
            return rows;
        });
    }

    async function localProfile() {
        const profile = options.localProfile ? await options.localProfile() : null;
        if (!profile || typeof profile.name !== 'string' || !/^\d{15,22}$/.test(profile.discord)) return null;
        return {id: profile.discord, discord: profile.discord, name: profile.name, url: imageUrl(profile.avatar)};
    }

    async function resolve(id) {
        const explicitName = id.indexOf('name:') === 0;
        const name = explicitName ? id.slice(5) : id;
        const [online, local] = await Promise.all([
            onlinePlayers().catch(() => []),
            localProfile().catch(() => null)
        ]);
        const rows = online.slice();
        if (local) {
            const existing = rows.findIndex(p => p.discord === local.discord);
            if (existing >= 0) rows[existing] = local;
            else rows.push(local);
        }
        const matches = rows.filter(p => p.name === name || (!explicitName && /^\d+$/.test(id) && (p.id === id || p.discord === id)));
        const unique = new Map(matches.map(p => [p.discord || p.id, p]));
        const player = unique.size === 1 ? unique.values().next().value : null;
        const url = player && player.url ? player.url : base + '/avatars/default.png';
        return {steamid: id, personaname: player ? player.name : '', realname: '', avatar: url, avatarmedium: url, avatarfull: url};
    }

    function send(res, status, data, type) {
        res.writeHead(status, {'Content-Type': type,
            'Content-Length': Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8'),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
        res.end(data);
    }

    async function handle(req, res, url) {
        if (req.method !== 'GET') {
            send(res, 405, '{}', 'application/json');
            return;
        }
        try {
            if (url.pathname === '/avatars') {
                const values = url.searchParams.getAll('steamids');
                if (values.length !== 1 || values[0].length > 2048) throw new Error('Invalid avatar request');
                // Native avatar requests contain one Discord username; frontend requests encode name: explicitly.
                const ids = values[0].split(',');
                if (ids.length > 32 || ids.some(id => !id || id.length > 128 || /[\x00-\x1f\x7f]/.test(id))) throw new Error('Invalid avatar identifiers');
                const players = await Promise.all(ids.map(resolve));
                send(res, 200, JSON.stringify({response: {players}}), 'application/json; charset=utf-8');
                return;
            }
            if (url.pathname === '/avatars/default.png') {
                send(res, 200, options.defaultPng, 'image/png');
                return;
            }
            const match = IMAGE_PATH.exec(url.pathname);
            if (!match) { send(res, 404, '{}', 'application/json'); return; }
            const bytes = await cached('image:' + match[1] + ':' + match[2], 300000, async () => {
                const data = await fetch('https://cdn.discordapp.com/avatars/' + match[1] + '/' + match[2] + '.png?size=128', 'image/png');
                if (data.length < 24 || !data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
                    data.readUInt32BE(16) < 1 || data.readUInt32BE(20) < 1 ||
                    data.readUInt32BE(16) > 512 || data.readUInt32BE(20) > 512) throw new Error('Invalid avatar image');
                return data;
            });
            send(res, 200, bytes, 'image/png');
        } catch (_) {
            send(res, 503, '{}', 'application/json');
        }
    }
    return {handle, resolve};
}

module.exports = {create, download};
