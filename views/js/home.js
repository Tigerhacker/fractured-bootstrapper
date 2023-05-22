const { ipcRenderer } = require('electron');

$(document).ready(onReady);

function onReady() {
    username = window.interop.settingGet('discord_name');
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
        $('#welcome-name').html('Welcome ' + username);
        $('#login').hide();
        launchReady();
    }

    $('#login').on('click', login);
    $('#logout').on('click', logout);

    $('#install-files').on('click', installFiles);
    $('#check-files').on('click', window.interop.validateFiles);

    $('#manual-auth').on('click', readManualToken);
    $('#lang-select').on('change', saveLanguage);

    $('#manual-auth').on('click', validateTokenInput);
    $('#check-auth').on('click', debugToken);

    //write game path override
    $('#custom-path-input').val(window.interop.settingGetFolder());
    $('#custom-path-save').on('click', function(){window.interop.settingSet('folder_override', $('#custom-path-input').val()); alert("Override saved\n>"+$('#custom-path-input').val()+"<");location.reload();});
    $('#custom-path-reset').on('click', function(){window.interop.settingDel('folder_override'); $('#custom-path-input').val('');location.reload();});

    
    window.interop.steam((folder) => {$('#game-folder-out').val(folder);});
    
    

    

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
            if (match) {
                $('#install-files').html('Re-install');
                launchBtn.removeClass('disabled');
                launchBtn.on('click', checkAndLaunch);
            } else {
                $('#install-files').html('Install');
                // launchBtn.addClass('disabled');
                launchNotPatched();
                launchBtn.off('click');
            }
        });
    } else {
        console.log('Client launcher not detected!');
        launchBtn.on('click', () => {
            alert('Client launcher not detected!');
        });

    }
}

async function installFiles() {
    if (window.interop) {
        await window.interop.installFiles(
            function (success){
                if(success){
                    alert("Patch completed successfully")
                    location.reload();
                }
            }
        );
    } else {
        alert('Client launcher not detected!');
    }
}

function launchGame() {
    if (window.interop) {
        let launchBtn = $('#launch-game');
        // launchBtn.addClass('disabled');
        // launchBtn.off('click');
        launchRunning(); //disable the button

        // let accessToken = $('#hidden-access-token').val();
        // let lang = $('#lang-select').val();
        window.interop.launchGame(
            {
                accessToken: getToken(),
                lang: getLanguage()
            }, function () {
                // launchBtn.removeClass('disabled');
                // launchBtn.on('click', checkAndLaunch);
                launchReady(); //restore the button
            });
    } else {
        alert('Client launcher not detected!');
    }
}

function login() {
    window.interop.openBrowser("https://discordapp.com/api/oauth2/authorize?client_id=518348437125857280&redirect_uri=https%3A%2F%2Flifeline.returnvector.net%2Fapi%2Fv0%2Fdiscord%2Foauth&response_type=code&scope=identify&state=launcher")
}

function readManualToken(){
    let discord_token = $('#discord_token_input').val()
    if (discord_token.length > 0){
        setToken(discord_token)
    }else{
        alert("Enter a token")
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
        let json = JSON.parse(body);
        console.log(json);
        if (json['username'] === undefined || json['token'] === undefined){
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
                alert(json['message']);
            }
            launchGame();
        },
        function(message){
            if(message == 'unauthorised'){
                alert('Discord token has expired, please re-login')
                logout();
            }else if(message == 'oldclient'){
                alert('Client is out of date, please update'); //fallback
                checkForUpdates(false);
            }else{
                alert('Warning: Server appears to be offline')
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
            alert(message)
            logout()
        }
    )
}

function debugIfValid(err, res, body){
    tokenCallbackHandler(err, res, body, 
        function(json){
            alert(JSON.stringify(json))
            console.log(json)
        }, 
        function(message){
            alert(message)
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
    token = $('#discord_token_input').val()
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

function show_update_checking(){
    notify_container.classList.remove('hide');
    notification_update_updating.style.display = "";
    notification_update_none.style.display = "none";
}
function show_update_none(){
    notify_container.classList.add('hide');
    notification_update_updating.style.display = "none";
    notification_update_none.style.display = "";
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
        alert("Up to date\nLast update: "+payload.releaseDate)
        update_alert = false
    }
});
ipcRenderer.on('update_error', (event, payload) => {
    console.log(payload);
    alert("Error: "+JSON.stringify(payload))
});

ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
    document.getElementById('app_version').innerText = arg.version;
});


// reload with ctrl+r
function keydown_handler(e) {
    if (e.ctrlKey && e.keyCode == 82) {//ctrl+r
        location.reload();
    }
}
document.addEventListener('keydown', keydown_handler, false);