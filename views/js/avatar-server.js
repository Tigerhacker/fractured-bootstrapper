'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const settings = require('./settings');

module.exports.start = function start(resourcesPath) {
    const service = require('./avatar-bridge').create({
        localName: () => settings.sotreGet('discord_name'),
        localProfile: require('./account-avatar').create(settings),
        defaultPng: fs.readFileSync(path.join(resourcesPath, 'data', 'discord-default-avatar.png'))
    });
    const server = http.createServer((request, response) => {
        try {
            const url = new URL(request.url, 'http://127.0.0.1');
            if (url.pathname === '/avatars' || url.pathname.startsWith('/avatars/')) service.handle(request, response, url);
            else {response.writeHead(404, {'Content-Length': 2}); response.end('{}');}
        } catch (_) {response.writeHead(400, {'Content-Length': 2}); response.end('{}');}
    });
    server.on('error', () => console.error('Discord avatar service unavailable'));
    server.listen(27173, '127.0.0.1');
    return server;
};
