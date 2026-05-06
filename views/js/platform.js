const os = require('os');

const platform = os.platform();

module.exports = {
    isLinux: platform === 'linux',
    isWindows: platform === 'win32',
    homeDir: os.homedir(),
    platform: platform
};
