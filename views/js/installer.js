const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { shell, ipcRenderer } = require('electron')

const steam = require('./find-steam.js');

const patchManifest = require('./patch_manifest.js')
const dataMapping = patchManifest.dataMapping;

// Packaged: <install>/resources/data (electron-builder extraResources). Dev: <repo>/data
function dataDir() {
    const packaged = path.join(process.resourcesPath || '', 'data');
    if (process.resourcesPath && fs.existsSync(packaged)) return packaged;
    return path.join(__dirname, '..', '..', 'data');
}

function sha256File(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function replaceFiles(directory) {
    const src = dataDir();
    try {
        dataMapping.forEach((v) => {
            const dest = path.join(directory, v.dest);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(path.join(src, v.src), dest);
        });
    }catch (e){
        alert("Patching failed: \n"+e)
        console.log(e);
    }
}

function validateFiles(directory) {
    checkDirectXRedist()
    
    let errors = [];
    let valid = [];
    dataMapping.forEach((v) => {
        let hash = null;
        try {
            hash = sha256File(directory + "/" + v.dest);
            if(hash != v.sha256){
                errors.push(v.dest);
            }else{
                valid.push(v.dest);
            }
        }catch (e){
            errors.push(v.dest);
            console.log(e);
        }
        console.log(v.dest, hash, v.sha256);
    });
    console.log(errors);
    console.log(valid);
    return [errors, valid];
}

function checkDirectXRedist(){
    // Only meaningful on Windows; Proton ships its own d3dx9
    if (process.platform !== 'win32') return;
    if (fs.existsSync('C:\\Windows\\system32\\D3DX9_43.dll')) {
        console.log("Detected DirectX End-User Runtimes (June 2010)")
    } else {
        // Handled in the main process: the page reloads right after an install, which
        // would otherwise discard the button click before it could open the link.
        ipcRenderer.invoke("promptDirectXRedist");
    }
}

function writeManifest(directory) {
    let manifestData = {
        version: patchManifest.patchLevel,
        status: "ok"
    };
    try {
        fs.writeFileSync(directory + '/bootlegger.json', JSON.stringify(manifestData));
    }catch (e){
        alert(`Error: Failed to write out ${path.join(directory, 'bootlegger.json')}`);
        return false;
    }

    return true;
}

function dirtyManifest(directory) {
    let manifestData = {
        version: patchManifest.patchLevel,
        status: "dirty"
    };
    fs.writeFileSync(directory + '/bootlegger.json', JSON.stringify(manifestData));
}

function readManifest(directory) {
    try {
        let manifestData = JSON.parse(fs.readFileSync(directory + '/bootlegger.json'));
        return manifestData.version;
    } catch (ex) {
        return "0";
    }
}

module.exports.install = function (callback) {
    steam((folder) => {
        let success = true;
        // alert("DEBUG ENABLED: FILES WILL NOT BE PATCHED")
        replaceFiles(folder);
        const [errors, valid] = validateFiles(folder);
        if(errors.length > 0){
            ipcRenderer.invoke("showMessageBox", {
                "title": " ",
                "type": "error",
                "message": "Patch failed to install",
                "detail": `Failed to patch ${errors.length} of ${valid.length+errors.length} files\n\n${errors.join("\n")}\n\nMake sure the game is closed and try again`
            });
            success = false;
        }else{
            if (! writeManifest(folder)){
                success = false;
            }
        }
        callback(success);
    });
};

module.exports.validate = function (callback) {
    steam((folder) => {
        const [errors, valid] = validateFiles(folder);
        if(errors.length > 0){
            ipcRenderer.invoke("showMessageBox", {
                "title": " ",
                "type": "error",
                "message": "Patch failed to validate",
                "detail": `${errors.length} mismatched files found (out of ${valid.length+errors.length} files\n\n${errors.join("\n")}\n\nYou should re-install the patch`
            });
        }else{
            ipcRenderer.invoke("showMessageBox", {
                "title": " ",
                "type": "info",
                "message": "Patch validated",
                "detail": `All ${valid.length} files match`
            });
        }
    });
};


module.exports.isInstalled = function (callback) {
    steam((folder) => {
        callback(patchManifest.patchLevel === readManifest(folder));
    });
};