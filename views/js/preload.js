const {remote} = require('electron');
const installer = require('./installer.js');
const launcher = require('./launcher.js');
const helper = require('./helper.js');
const settings = require('./settings.js');
const steam = require('./find-steam.js')

window.interop = {};
window.interop.isInstalled = installer.isInstalled;
window.interop.installFiles = installer.install;
window.interop.validateFiles = installer.validate;
window.interop.launchGame = launcher;

window.interop.openBrowser = helper.openExternal;

window.interop.settingSet = settings.sotreSet;
window.interop.settingGet = settings.sotreGet;
window.interop.settingDel = settings.sotreDel;
window.interop.settingGetFolder = settings.sotreGetFolder;

window.interop.isTokenValid = helper.isTokenValid;

window.interop.steam = steam;