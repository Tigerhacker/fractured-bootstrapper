const {remote} = require('electron');
const installer = require('./installer.js');
const launcher = require('./launcher.js');
const helper = require('./helper.js');

window.interop = {};
window.interop.isInstalled = installer.isInstalled;
window.interop.installFiles = installer.install;
window.interop.launchGame = launcher;

window.interop.openBrowser = helper.openExternal;

window.interop.settingSet = helper.sotreSet;
window.interop.settingGet = helper.sotreGet;
window.interop.settingDel = helper.sotreDel;

window.interop.isTokenValid = helper.isTokenValid;