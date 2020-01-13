$(document).ready(onReady);

function onReady() {
    $('#welcome-name').html('Welcome, ' + window.interop.settingGet('discord_name'));

    $('#login').on('click', login);
    $('#logout').on('click', logout);
    $('#install-files').on('click', installFiles);

    $('#manual-auth').on('click', readManualToken);
    $('#lang-select').on('change', saveLanguage);

    $('#manual-auth').on('click', validateTokenInput);

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
                $('#install-files').html('Reinstall');
                launchBtn.removeClass('disabled');
                launchBtn.on('click', launchGame);
            } else {
                $('#install-files').html('Install');
                launchBtn.addClass('disabled');
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
        await window.interop.installFiles();
        logout();
    } else {
        alert('Client launcher not detected!');
    }
}

function launchGame() {
    if (window.interop) {
        let launchBtn = $('#launch-game');
        launchBtn.addClass('disabled');
        launchBtn.off('click');

        // let accessToken = $('#hidden-access-token').val();
        // let lang = $('#lang-select').val();
        window.interop.launchGame(
            {
                accessToken: getToken(),
                lang: getLanguage()
            }, function () {
                launchBtn.removeClass('disabled');
                launchBtn.on('click', launchGame);
            });
    } else {
        alert('Client launcher not detected!');
    }
}

function login() {
    window.interop.openBrowser("https://lifeline.returnvector.net/static/discord_manual.html")
}

function readManualToken(){
    var discord_token = $('#discord_token_input').val()
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

function tokenCallback(err, res, body) {
    let json = JSON.parse(body);
    console.log(json);
    console.log(res);

    if (res['statusCode'] == 200){
        if (json['username'] === undefined || json['token'] === undefined){
            //invalid response
            alert("Invalid response")
        }else{
            //All good
            window.interop.settingSet('discord_name', json['username']);
            window.interop.settingSet('discord_token', json['token']);
            location.reload();
        }
    }else if (res['statusCode'] == 401){
        alert("Discord token not valid")
    }else{
        //Unkown server error
        alert("Server error" + res['statusCode'])
    }
}
function validateToken(token){    
    return window.interop.isTokenValid(token, tokenCallback);
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
