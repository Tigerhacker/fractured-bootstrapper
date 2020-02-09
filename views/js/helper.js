const { shell } = require('electron')

const request = require('request');

const patchManifest = require('./patch_manifest.js')

module.exports.openExternal = function (url) {
    shell.openExternal(url)
};

module.exports.httpPost = function (url) {
    shell.openExternal(url)
};

module.exports.isTokenValid = function (token, callback) {
    options = {
        url: 'https://lifeline.returnvector.net/api/v0/discord/bearercheck',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'User-Agent': 'fs-bootstrapper',
            'X-Patch-Level': patchManifest.patchLevel
        },
        body: token
    };
    
    request(options, callback);
};

module.exports.isTokenValidDump = function (token){
    isTokenValid(token, function(err, res, body) {
        let json = JSON.parse(body);
        console.log(json);
    })
}


