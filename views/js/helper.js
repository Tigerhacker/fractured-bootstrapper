const { shell } = require('electron')

const Store = require('electron-store');
const store = new Store();

const request = require('request');


module.exports.openExternal = function (url) {
    shell.openExternal(url)
};

module.exports.httpPost = function (url) {
    shell.openExternal(url)
};

module.exports.sotreSet = function (key, value) {
    return store.set(key, value);
};

module.exports.sotreGet = function (key) {
    return store.get(key)
};

module.exports.sotreDel = function (key) {
    return store.delete(key)
};

module.exports.isTokenValid = function (token, callback) {
    options = {
        url: 'https://lifeline.returnvector.net/api/v0/discord/bearercheck',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'User-Agent': 'fs-bootstrapper'
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
