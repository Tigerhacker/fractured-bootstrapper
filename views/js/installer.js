const fs = require('fs');
const sha256File = require('sha256-file');
const { shell } = require('electron')

// Launch imports
const electron = require("electron");
const steam = require('./find-steam.js');
// const pJson = require('../../package.json');

const patchManifest = require('./patch_manifest.js')
const dataMapping = patchManifest.dataMapping;

function replaceFiles(directory) {
    try {
        dataMapping.forEach((v) => {
            fs.copyFileSync("resources\\data\\" + v.src, directory + "\\" + v.dest);
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
    if (fs.existsSync('C:\\Windows\\system32\\D3DX9_43.dll')) {
        console.log("Detected DirectX End-User Runtimes (June 2010)")
    } else {
        (async () => {
            const response = await ipcRenderer.invoke("showMessageBox", {
                title: " ",
                type: "warning",
                message: "DirectX End-User Runtimes not installed",
                detail: "Please download and install from https://www.microsoft.com/download/details.aspx?id=8109",
                buttons: ['Ignore', 'Open link'],
            });
            if(response.response == 1){
                shell.openExternal('https://www.microsoft.com/download/details.aspx?id=8109');
            }
        })();
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
        alert(`Error: Failed to write out ${directory}\\bootlegger.json`);
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
        [errors, valid] = validateFiles(folder);
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
        [errors, valid] = validateFiles(folder);
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