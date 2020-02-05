const Store = require('electron-store');
const store = new Store();

module.exports.sotreSet = function (key, value) {
    return store.set(key, value);
};

module.exports.sotreGet = function (key) {
    return store.get(key)
};

module.exports.sotreDel = function (key) {
    return store.delete(key)
};

module.exports.sotreGetFolder = function () {
    let value = store.get('folder_override')
    if (typeof value == "string" && value.length > 0){
        return value;
    }
    return undefined;
};