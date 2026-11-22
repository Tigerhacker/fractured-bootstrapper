const { ipcRenderer } = require('electron');

$(document).ready(onReady);

function onReady() {
    const username = window.interop.settingGet('discord_name');
    if (username === undefined){
        //if there is a token, try to validate and get username
        if(window.interop.settingGet('discord_token')){
            validateToken(window.interop.settingGet('discord_token'))
            $('#logout').hide();
        }
        $('#logout').hide();
        launchUnauthorised();
    }else{
        //Logged in
        $('#welcome-name').text('Welcome ' + username);
        $('#login').hide();
        launchReady();
    }

    $('#login').on('click', login);
    $('#logout').on('click', logout);

    $('#install-files').on('click', installFiles);
    $('#check-files').on('click', window.interop.validateFiles);

    $('#manual-auth').on('click', readManualToken);
    $('#lang-select').on('change', saveLanguage);

    // $('#manual-auth').on('click', validateTokenInput);
    $('#check-auth').on('click', debugToken);

    
    function browseForGameFolder(){
        (async () => {
            const chosenFolders = await ipcRenderer.invoke("showOpenDialog", {
                title: "",
                type: "info",
                message: "Select the \"Space\" folder",
                detail: "this folder should have the following folders inside: Engine, launcher and spacegame",
                properties: ['openDirectory']
            });
            console.log("chosenFolders", chosenFolders)
            if(chosenFolders.filePaths.length > 0){
                await saveGameFolder(chosenFolders.filePaths[0], true);
            }
        })();
    }

    // Saves the game path override after checking it looks like the game folder.
    // A folder missing Engine/launcher/spacegame gets a warning; the user can take
    // a nearby folder that does look right, pick again, keep it anyway, or cancel.
    async function saveGameFolder(gameFolder, canBrowse){
        gameFolder = (gameFolder || '').trim();
        if (!gameFolder) return;
        const check = window.interop.checkGameFolder(gameFolder);
        if (!check.ok) {
            const required = window.interop.gameFolderRequired.join(', ');
            const buttons = [];
            if (check.suggestion) buttons.push('Use suggested folder');
            if (canBrowse) buttons.push('Choose again');
            buttons.push('Use anyway', 'Cancel');
            const detail = gameFolder + "\n\n" +
                "Missing: " + check.missing.join(', ') + "\n" +
                "The Fractured Space folder (usually called \"Space\") contains the folders " + required + "." +
                (check.suggestion ? "\n\nThis folder looks right instead:\n" + check.suggestion : "");
            const res = await ipcRenderer.invoke("showMessageBox", {
                "title": " ",
                "type": "warning",
                "message": "This is probably not the Fractured Space folder",
                "detail": detail,
                "buttons": buttons,
                "defaultId": 0,
                "cancelId": buttons.length - 1,
                "noLink": true
            });
            const choice = buttons[res.response];
            if (choice === 'Use suggested folder') gameFolder = check.suggestion;
            else if (choice === 'Choose again') { browseForGameFolder(); return; }
            else if (choice !== 'Use anyway') return;
        }
        window.interop.settingSet('folder_override', gameFolder);
        // Wait for the box before reloading, or the reload throws it away.
        await ipcRenderer.invoke("showMessageBox", {
            "title": " ",
            "type": "info",
            "message": "Game path override saved",
            "detail": gameFolder
        });
        location.reload();
    }
    //write game path override
    $('#custom-path-browse').on('click', function(){
        browseForGameFolder();
    });
    $('#custom-path-input').val(window.interop.settingGetFolder());
    $('#custom-path-save').on('click', function(){
        saveGameFolder($('#custom-path-input').val(), false);
    });
    $('#custom-path-reset').on('click', function(){window.interop.settingDel('folder_override'); $('#custom-path-input').val('');location.reload();});

    
    if (window.interop.isLinux) {
        $('.path-hint-windows').hide();
        $('.path-hint-linux').show();
    }

    window.interop.steam((folder) => {
        if (window.interop.showLinuxSettings) setupLinuxSettings(folder);
        if(folder === null){
            (async () => {
                await ipcRenderer.invoke("showMessageBox", {
                    "title": " ",
                    "type": "warning",
                    "message": "Fractured Space not found",
                    "detail": "Could not automatically detect the folder that Fractured Space has been installed into.\nPlease set the game path manually"
                });
                
                browseForGameFolder();
            })();
            window.location = '#custom-path-section';
        }
        $('#game-folder-out').val(folder);
    });
    
    

    

    //load language
    if(getLanguage()){
        $('#lang-select').val(getLanguage());
    }else{
        saveLanguage();
    }

    readVersion();
}

function logout() {
    window.interop.settingDel('discord_name');
    window.interop.settingDel('discord_token');
    location.reload();
}

function readVersion() {
    let launchBtn = $('#launch-game');
    if (window.interop) {
        window.interop.isInstalled(function (match) {
            gamePatched = !!match;
            if (match) {
                $('#install-files').html('Re-install');
                launchBtn.removeClass('disabled');
                launchBtn.on('click', checkAndLaunch);
                $('#launch-offline').on('click', () => launchGame(true));
            } else {
                $('#install-files').html('Install');
                // launchBtn.addClass('disabled');
                launchNotPatched();
                launchBtn.off('click');
                $('#launch-offline').off('click');
            }
            updateOfflineButton(!match);
        });
    } else {
        console.log('Client launcher not detected!');
        launchBtn.on('click', () => {
            ipcRenderer.invoke("showDialog", 'Client launcher not detected!');
        });

    }
}

async function installFiles() {
    if (window.interop) {
        await window.interop.installFiles(
            function (success){
                if(success){
                    ipcRenderer.invoke("showDialog", "Patch completed successfully")
                    location.reload();
                }
            }
        );
    } else {
        ipcRenderer.invoke("showDialog", 'Client launcher not detected!');
    }
}

function launchGame(offline) {
    if (window.interop) {
        let launchBtn = $('#launch-game');
        // launchBtn.addClass('disabled');
        // launchBtn.off('click');
        launchRunning(); //disable the button
        updateOfflineButton(true);
        if (window.interop.isLinux && !window.interop.linux.prefixInfo().exists) {
            // Proton/Wine builds the prefix first, which takes a minute or two
            updateLaunchButton(true, "First launch: setting up the Wine prefix, this can take a few minutes...", "btn-outline-info");
        }

        // let accessToken = $('#hidden-access-token').val();
        // let lang = $('#lang-select').val();
        window.interop.launchGame(
            {
                accessToken: getToken(),
                lang: getLanguage(),
                offline: offline === true
            }, function () {
                // launchBtn.removeClass('disabled');
                // launchBtn.on('click', checkAndLaunch);
                // restore the button (stay disabled if not signed in, offline launch still works)
                if (window.interop.settingGet('discord_name') === undefined) launchUnauthorised();
                else launchReady();
                updateOfflineButton(!gamePatched);
            });
    } else {
        ipcRenderer.invoke("showDialog", 'Client launcher not detected!');
    }
}

function login() {
    window.interop.openBrowser("https://discordapp.com/api/oauth2/authorize?client_id=518348437125857280&redirect_uri=https%3A%2F%2Flifeline.returnvector.net%2Fapi%2Fv0%2Fdiscord%2Foauth&response_type=code&scope=identify&state=launcher")
}

function readManualToken(){
    let discord_token = $('#discord_token_input').val()
    if (discord_token.length > 0){
        setToken(discord_token)
        ipcRenderer.invoke("showDialog", "Token saved")
    }else{
        ipcRenderer.invoke("showDialog", "Enter a token")
    }
}

function setToken(discord_token){    
    return window.interop.settingSet('discord_token', discord_token)
}
function getToken(){    
    return window.interop.settingGet('discord_token')
}

function tokenCallbackHandler(err, res, body, successAction, failureAction) {
    console.log(err);
    console.log(res);
    console.log(body);

    if (res && res['statusCode'] == 200){
        let json = null;
        try { json = JSON.parse(body); } catch (e) { console.log(e); }
        console.log(json);
        if (!json || json['username'] === undefined || json['token'] === undefined){
            //invalid response
            failureAction("Invalid response")
        }else{
            //All good
            successAction(json)
        }
    }else if (res && res['statusCode'] == 401){
        failureAction('unauthorised')
    }else if (res){
        //Unkown server error
        failureAction("Server error" + res['statusCode'])
    }else{
        failureAction("Server error: no response object")
    }
}

function checkAndLaunch(){
    return window.interop.isTokenValid(getToken(), launchIfValid);
}

function launchIfValid(err, res, body){
    tokenCallbackHandler(err, res, body, 
        function(json){
            if(json['message'] !== undefined){
                ipcRenderer.invoke("showDialog", json['message']);
            }
            launchGame();
        },
        function(message){
            if(message == 'unauthorised'){
                ipcRenderer.invoke("showDialog", 'Discord token has expired, please re-login')
                logout();
            }else if(message == 'oldclient'){
                ipcRenderer.invoke("showDialog", 'Client is out of date, please update'); //fallback
                checkForUpdates(false);
            }else{
                ipcRenderer.invoke("showDialog", 'Warning: Server appears to be offline')
                launchGame();
            }
            
        }
    )
}

function saveIfValid(err, res, body){
    tokenCallbackHandler(err, res, body, 
        function(json){
            window.interop.settingSet('discord_name', json['username']);
            window.interop.settingSet('discord_token', json['token']);
            location.reload();
        }, 
        function(message){
            ipcRenderer.invoke("showDialog", message)
            logout()
        }
    )
}

function debugIfValid(err, res, body){
    tokenCallbackHandler(err, res, body, 
        function(json){
            ipcRenderer.invoke("showMessageBox", {
                "title": "Discord Debug",
                "type": "info",
                "message": "Discord token contents",
                "detail": JSON.stringify(json, null, 4)
            });
            console.log(json)
        }, 
        function(message){
            ipcRenderer.invoke("showMessageBox", {
                "title": "Discord Debug",
                "type": "error",
                "message": "ReFireline response:",
                "detail": message
            });
        }
    )
}

function debugToken(){
    return window.interop.isTokenValid(getToken(), debugIfValid);
}

function validateToken(token){    
    return window.interop.isTokenValid(token, saveIfValid);
}

function validateTokenInput(){
    const token = $('#discord_token_input').val()
    validateToken(token)
}

function saveLanguage(){
    var lang = $('#lang-select').val();
    console.log(lang);
    return window.interop.settingSet('game_language', lang);
}

function getLanguage(){
    return window.interop.settingGet('game_language');
}


// Offline launch button (single player, local Fireline emulator, no sign-in needed)
let gamePatched = false;
function updateOfflineButton(disabled){
    document.querySelector('#launch-offline').disabled = disabled;
}


function customPathSave(){
    let path = $('#custom-path-input').val();
    return window.interop.settingSet('game_path', path);
}

function customPathGet(){
    return window.interop.settingGet('game_path');
}

function customPathDel(){
    return window.interop.settingDel('game_path');
}


// Linux settings (Proton/Wine). Shown on Linux, or elsewhere via fsDebug.showLinuxSettings()
function setupLinuxSettings(gameFolder){
    const linux = window.interop.linux;
    $('#linux-settings-section').show();
    if (!window.interop.isLinux) $('#linux-preview-warning').show();

    // Compatibility tool
    function populateRunners(){
        const select = $('#linux-runner-select');
        const runners = linux.findRunners();
        let current = linux.getRunner();
        select.empty();

        if (runners.length === 0) {
            select.append($('<option>').val('').text('-- No Proton or Wine found --'));
            $('#linux-runner-status').text('Install Proton from Steam (Library > Tools > "Proton"), or GE-Proton via ProtonUp-Qt, then press refresh.');
            return;
        }
        runners.forEach((r) => {
            select.append($('<option>').val(r.path).text(r.name + (r.source === 'custom' ? ' (custom)' : '')).data('runner', r));
        });
        if (current && runners.some((r) => r.path === current.path)) {
            select.val(current.path);
        } else {
            // Nothing chosen yet, or it was uninstalled: pick the best one
            current = runners[0];
            linux.setRunner(current);
            select.val(current.path);
        }
        $('#linux-runner-status').text(`${runners.length} found. ${current.path}`);
        updateRuntimeStatus();
    }
    $('#linux-runner-select').on('change', function(){
        const r = $(this).find('option:selected').data('runner');
        linux.setRunner(r);
        $('#linux-runner-status').text(r ? r.path : '');
        updateRuntimeStatus();
    });
    $('#linux-runner-refresh').on('click', populateRunners);

    // Wine prefix
    function updatePrefix(){
        const info = linux.prefixInfo();
        $('#linux-prefix-path').val(info.compatDataDir);
        let status = info.exists
            ? `Prefix exists${info.protonVersion ? ' (created by Proton ' + info.protonVersion + ')' : ''}.`
            : 'Will be created on first launch.';
        status += info.isDefault ? ' Default location.' : ' Custom location.';
        $('#linux-prefix-status').text(status);
        const steamPrefix = linux.steamPrefixDir(gameFolder);
        $('#linux-prefix-steam').toggle(!!steamPrefix && steamPrefix !== info.compatDataDir);
    }
    $('#linux-prefix-browse').on('click', async function(){
        const res = await ipcRenderer.invoke("showOpenDialog", {
            title: "Select a folder for the Wine prefix",
            defaultPath: linux.getPrefixDir(),
            properties: ['openDirectory', 'createDirectory']
        });
        if (res.filePaths && res.filePaths.length > 0) {
            linux.setPrefixDir(res.filePaths[0]);
            updatePrefix();
        }
    });
    $('#linux-prefix-steam').on('click', function(){
        linux.setPrefixDir(linux.steamPrefixDir(gameFolder));
        updatePrefix();
    });
    $('#linux-prefix-default').on('click', function(){
        linux.setPrefixDir(null);
        updatePrefix();
    });
    $('#linux-prefix-open').on('click', function(){
        ipcRenderer.invoke('openPath', linux.getPrefixDir(), true);
    });
    $('#linux-prefix-reset').on('click', async function(){
        const info = linux.prefixInfo();
        const res = await ipcRenderer.invoke("showMessageBox", {
            title: " ",
            type: "warning",
            message: "Delete the Wine prefix?",
            detail: `This permanently deletes:\n${info.winePrefix}\n\nIt will be rebuilt on the next launch. ` +
                `Game files and your Steam install are not touched, but in-game settings stored in the prefix are lost.`,
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            cancelId: 0,
        });
        if (res.response !== 1) return;
        try {
            linux.resetPrefix();
        } catch (e) {
            ipcRenderer.invoke("showDialog", "Could not delete prefix:\n" + e.message);
        }
        updatePrefix();
    });

    // Runtime / logging / env
    function updateRuntimeStatus(){
        const runner = linux.getRunner();
        let text = '';
        if (runner && runner.type === 'proton') {
            const rt = linux.findRuntimeFor(runner.path);
            if (!rt.required) text = 'This Proton version does not need a runtime.';
            else if (rt.entryPoint) text = 'Using ' + rt.name;
            else text = `${rt.name} is not installed. Install it from Steam, or Proton will run without it.`;
        } else if (runner) {
            text = 'Not used with system Wine.';
        }
        $('#linux-runtime-status').text(text);
    }
    $('#linux-use-runtime').prop('checked', linux.getUseRuntime()).on('change', function(){
        window.interop.settingSet(linux.KEYS.useRuntime, this.checked);
    });
    $('#linux-proton-log').prop('checked', linux.getProtonLog()).on('change', function(){
        window.interop.settingSet(linux.KEYS.protonLog, this.checked);
    });
    $('#linux-extra-env').val(linux.getExtraEnvText()).on('change', function(){
        window.interop.settingSet(linux.KEYS.extraEnv, this.value.trim());
    });
    $('#linux-open-logs').on('click', function(){
        ipcRenderer.invoke('openPath', linux.logsDir(), true);
    });

    // fracturedspace:// handler for the Discord sign-in redirect
    async function registerProtocol(){
        const res = await ipcRenderer.invoke('registerProtocolHandler');
        $('#linux-protocol-status').text(res.ok ? 'Sign-in link handler registered.' : 'Sign-in link handler: ' + res.message);
        return res;
    }
    $('#linux-register-protocol').on('click', async function(){
        const res = await registerProtocol();
        ipcRenderer.invoke("showMessageBox", {
            title: " ",
            type: res.ok ? "info" : "warning",
            message: res.ok ? "Sign-in link handler registered" : "Could not register the sign-in link handler",
            detail: (res.message || '') + "\n\nIf signing in through the browser still does not return to the launcher, use \"Manual auth\" below.",
        });
    });

    populateRunners();
    updatePrefix();
}


// Launch button
function updateLaunchButton(disabled, message, style){
    var theButton = document.querySelector('#launch-game');

    theButton.disabled = disabled;
    theButton.innerText = message;
    theButton.className = 'btn w-100 ' + style;
}

function launchReady(){
    updateLaunchButton(false, "Launch Game", "btn-success")
}

function launchRunning(){
    updateLaunchButton(true, "Game is running", "btn-outline-info")
}

function launchUnauthorised(){
    updateLaunchButton(true, "Not signed in", "btn-outline-danger")
}

function launchNotPatched(){
    updateLaunchButton(true, "Game has not been patched yet", "btn-outline-danger")
}

function openDevTools(){
    ipcRenderer.send('open_developer_tools');
}


// update notification
const notify_container = document.getElementById('notificationContainer');
const notification_update_updating = document.getElementById('notification_update_updating');
const notification_update_none = document.getElementById('notification_update_none');

const notification_update_error = document.getElementById('notification_update_error');
let update_error_timer = null;
function show_update_checking(){
    clearTimeout(update_error_timer);
    notify_container.classList.remove('hide');
    notification_update_updating.style.display = "";
    notification_update_none.style.display = "none";
    notification_update_error.style.display = "none";
}
function show_update_none(){
    clearTimeout(update_error_timer);
    notify_container.classList.add('hide');
    notification_update_updating.style.display = "none";
    notification_update_none.style.display = "";
    notification_update_error.style.display = "none";
}
function show_update_error(){
    clearTimeout(update_error_timer);
    notify_container.classList.remove('hide');
    notification_update_updating.style.display = "none";
    notification_update_none.style.display = "none";
    notification_update_error.style.display = "";
    update_error_timer = setTimeout(() => {
        notify_container.classList.add('hide');
    }, 10000);
}

let update_alert = false;
function checkForUpdates(send_alert){
    show_update_checking();
    if(send_alert){
        update_alert=true;
    }
    console.log("checkForUpdates");
    ipcRenderer.send('app_checkUpdates');
}

ipcRenderer.on('update_none', (event, payload) => {
    show_update_none();
    console.log("No udpate")
    console.log(payload);
    if (update_alert){
        ipcRenderer.invoke("showDialog", "Up to date\nLast update: "+payload.releaseDate)
        update_alert = false
    }
});
ipcRenderer.on('update_unsupported', (event, reason) => {
    console.log("Auto-update unavailable:", reason);
    show_update_none();
    if (update_alert){
        ipcRenderer.invoke("showDialog", "Automatic updates are not available for this copy of the launcher.\n\n" + reason);
        update_alert = false;
    }
});
ipcRenderer.on('update_error', (event, payload) => {
    console.log(payload);
    update_alert = false;
    show_update_error();
});

ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
    document.getElementById('app_version').innerText = arg.version;
});


// reload with ctrl+r
function keydown_handler(e) {
    if (e.ctrlKey && e.keyCode == 73) { // ctrl+i
        openDevTools()
    } 
    if (e.ctrlKey && e.keyCode == 82) { // ctrl+r
        location.reload();
    }
}
document.addEventListener('keydown', keydown_handler, false);