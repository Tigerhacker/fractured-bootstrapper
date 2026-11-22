(function Lobby() {
  var VIEW = Navigation.VIEWS.START_GAME;
  var friendsList;
  var lobby;
  var chat;
  var lobbyWidget;
  var gameModes;
  var sessions;
  var defaultMode = '';
  var selectedGameMode;
  var campaigns;

  function init() {
    friendsList = new FriendsList({
      'el': VIEW.el.querySelector('.friends')
    });
    engine.on('GetFriendsList', friendsList.onGetFriendsList.bind(friendsList));
    engine.on('AddFriend', friendsList.addPlayers.bind(friendsList));
    engine.on('RemoveFriend', friendsList.removePlayer.bind(friendsList));
    engine.on('UpdateFriend', friendsList.updatePlayer.bind(friendsList));

    VIEW.el.querySelector('.friends-filter-input').addEventListener('keyup', onFilterFriendsChange);

    lobby = new Lobby({
      'el': VIEW.el.querySelector('.team')
    });
    lobby.on('Click', onClickPlayerInLobby);
    engine.on('LobbyResult', onGotLobbyResult);
    engine.on('AddPlayerToLobby', lobby.addPlayer.bind(lobby));
    engine.on('RemovePlayerFromLobby', lobby.removePlayer.bind(lobby));
    engine.on('SetPlayersCount', lobby.setPlayersCount.bind(lobby));

    chat = new Chat({
      'el': VIEW.el.querySelector('.chat')
    });

    lobbyWidget = new LobbyWidget({
      'elContainer': VIEW.el.querySelector('.in-progress'),
      'onStateChange': onMatchMakingStateChange
    });

    utils.onClick(VIEW.el.querySelector('.matchmaking-play'), onClickPlay);
    utils.onClick(VIEW.el.querySelector('.leave-queue'), onClickLeaveQueue);
    utils.on('CustomPageGameParam', onCustomPageParam);

    gameModes = new GameModesManager({
      'elMenu': VIEW.el.querySelector('#game-mode-carousel'),
      'elSubModes': VIEW.el.querySelector('.sub-modes-list'),
      'onBeforeChange': onBeforeChangeGameModes
    });
    gameModes.on('change', onGameModeChange);
    utils.on('SetSubModeConfigParam', gameModes.setConfigParam.bind(gameModes));


    sessions = new Sessions({
      'el': VIEW.el.querySelector('.game-mode-servers')
    });

    campaigns = new CampaignWidget({
      'elContainer': VIEW.el.querySelector('.view-startgame .active-missions.live-ops-status.campaign-info'),
    });
    if (VIEW.el.querySelector(".campaign-select-required")){
      utils.onClick(VIEW.el.querySelector('.campaign-select-required'), onClickMinimise);
    } else if (VIEW.el.querySelector("[data-campaign-type='galactic']")) {
      utils.onClick(VIEW.el.querySelector("[data-campaign-type='galactic']"), onClickMinimise);
    }

    Controls.init({
      "onChange": onControlsChange
    });

    engine.on('SetCCU', onGetCCU);

    utils.onClick(VIEW.el.querySelector('.uiminimize'), onClickMinimise);
    utils.onClick(VIEW.el.querySelector('.uiclose'), onClickClose);

    utils.on('FillLobbyWithBots', onFillLobbyWithBots);
    utils.on('AddBotToLobby', onAddBotToLobby);

    utils.updateScope({
      'Player': Player
    }, VIEW);

    Navigation.onHide(VIEW, onViewHide);

    Navigation.onShow(VIEW, onViewShown);

    engine.on('AddGameModes', onGotGameModes);

    //Set quickplay flags on lobby for styling
    VIEW.el.dataset.isQuickPlayPvp = DataStore.isQuickPlayPvPEnabled;
    VIEW.el.dataset.isQuickPlayCoop = DataStore.isQuickPlayCoopEnabled;

    //On steam or lobby connection failures:
    utils.on('SteamConnectionStateChanged', onSteamConnectionStateChanged.bind(this));
    utils.on('LobbyReachableStateChanged', onLobbyReachableStateChanged.bind(this));
    onLobbyReachableStateChanged( DataStore.isLobbyReachable );
    onSteamConnectionStateChanged( DataStore.isSteamConnected );
  }

  function onFillLobbyWithBots(botId) {
    while (lobby.addBot(botId));
  }

  function onAddBotToLobby(botId) {
    lobby.addBot(botId);
  }

  function onCustomPageParam(data) {
    if (data && data.page === VIEW.id) {
      if (gameModes.get(data.param)) {
        gameModes.setSelectedGameMode(data.param);
      } else {
        defaultMode = data.param;
      }
      gameModes.onLobbySelected(data.param);
    }
  }

  function onControlsChange(changed, newValue, oldValue) {
    var TEMPLATE_FREE = '<div class="separator fade-out-both bottom"></div>' +
      '<div class="drop-handle"></div>';

    if (changed === "botOptions") {
      var elTeams = document.body.getElementsByClassName("team")[0];
      lobby.autoBotLevel = parseInt(newValue);

      elTeams.classList.remove("botOptions-" + oldValue);
      elTeams.classList.add("botOptions-" + newValue);

      var optionl10n = "FreeSlot";
      newValue = parseInt(newValue);
      if (newValue === 1) {
        optionl10n = "AICaptainEasy";
      } else if (newValue === 4) {
        optionl10n = "AICaptainMedium";
      } else if (newValue === 7) {
        optionl10n = "AICaptainHard";
      } else if (newValue === 9) {
        optionl10n = "GenericLabelPerfectAI";
      }

      //Loop slots + update html
      var slots = document.body.querySelectorAll(".lobby-team li[data-is-slot][data-is-spectator-slot='false']");
      for (var slot, i = 0; i < slots.length; i++) {
        slot = slots[i];
        if (slot.classList.contains("free")) {
          slot.innerHTML = TEMPLATE_FREE + utils.l10n.get(optionl10n);
        }
      }

    }
  }

  function onViewHide() {
    document.body.classList.remove("lobby-open");
    document.removeEventListener('keyup', onKeyPress);
  }

  function onViewShown() {
    document.body.classList.add("lobby-open");
    engine.call('GetGameModes');
  }

  function onGetCCU(ccu) {
    utils.updateScope({
      'onlinePlayers': ccu,
      'averageWaitTime': getAverageWaitTime(ccu)
    }, VIEW);
  }

  function getAverageWaitTime(numberOfPlayers) {
    // Divide by two since CCU = players in matchmaking AND UI.
    numberOfPlayers = Math.round(numberOfPlayers / 2);

    var steps = Config.MM_WAIT_TIMES;
    var averageWaitTime = 0;

    for (var i = 0, len = steps.length; i < len; i++) {
      var step = steps[i];

      if (numberOfPlayers < step.ccu) {
        if (i === 0) {
          averageWaitTime = step.time;
        } else {
          var prevStep = steps[i - 1];
          var ccuPercent = (numberOfPlayers - prevStep.ccu) / (step.ccu - prevStep.ccu);

          averageWaitTime = Math.round(prevStep.time + ccuPercent * (prevStep.time - step.time));
        }
      }

      if (averageWaitTime) {
        break;
      }
    }

    if (!averageWaitTime) {
      averageWaitTime = steps[steps.length - 1].time;
    }

    var minutes = Math.floor(averageWaitTime / 60);
    var seconds = averageWaitTime % 60;

    (minutes < 10) && (minutes = '0' + minutes);
    (seconds < 10) && (seconds = '0' + seconds);

    return minutes + ':' + seconds;
  }

  function onGotGameModes(modes) {
    gameModes.add(modes);
    gameModes.updateModesSet();

    if (defaultMode) {
      gameModes.setSelectedGameMode(defaultMode);
      defaultMode = '';
    } else {
      gameModes.setSelectedGameMode(selectedGameMode);
    }

  }

  // Called before player tries to change game modes
  // Should return true if changing game modes is allowed, false if not
  function onBeforeChangeGameModes(gameModeId) {
    showLobbyLeaveWarning(function onConfirmedLeaveLobby() {
      gameModes.configParam = '';
      gameModes.setSelectedGameMode(gameModeId);
      //Remove AI captain status
      Controls.updateControl("botOptions", -1, true);
    });
  }

  function onGameModeChange(newGameMode) {
    gameModes.updateArrows();
    gameModes.updateContent();

    engine.call('ShowGameMode', newGameMode.Id);
  }

  function onMatchMakingStateChange(data) {
    VIEW.el.classList.remove('state-' + data.oldState);
    VIEW.el.classList.add('state-' + data.newState);
  }

  function onGotLobbyResult(data) {
    lobby.onGotLobbyResult(data);
    chat.clear();
  }

  function onClickPlay() {
    var numberOfPlayersInLobby = getNumberOfPlayersInLobby( false );
    var isCustomMatch = gameModes.getCurrentMode().Id === 'customMatch';

    if (isCustomMatch && numberOfPlayersInLobby < 2) {
      utils.dispatch('ShowStatus', {
        'id': 'not-enough-players',
        'message': utils.l10n.get('CustomNotEnoughPlayers'),
        'showOK': true,
        'showCancel': false
      });

      return false;
    }

    var invites = friendsList.getNumberOfPendingInvites();
    if (invites === 0) {
      engine.call('ClickStartGame');
    } else {
      utils.dispatch('ShowStatus', {
        'id': 'confirm-matchmaking-start',
        'message': utils.l10n.get('CustomConfirmStartGame'),
        'showOK': utils.l10n.get('GenericLabelPlayNow'),
        'showCancel': utils.l10n.get('GenericLabelCancel'),
        'onOK': function onOK() {
          engine.call('ClickStartGame');
        }
      });
    }
  }

  function getNumberOfPlayersInLobby( includeBots ) {
    if ( includeBots === false ) {
      var playerCount = 0;
      for ( var key in lobby.players ) {
        if ( lobby.players[ key ].id && lobby.players[ key ].isBot === false ) {
          playerCount++;
        }
      }
      return playerCount;
    } else {
      return Object.keys(lobby.players).length;
    }
  }

  function onClickMinimise() {
    if ('FTUEFlow' in window && FTUEFlow.state < 4) {
      leaveLobby();
      Navigation.hide(VIEW, 'minimise-button');
      return;
    }

    var elContent = VIEW.el.querySelector('.view-content');

    elContent.addEventListener('webkitAnimationEnd', function onDone(e) {
      e.target.removeEventListener('webkitAnimationEnd', onDone);
      e.target.classList.remove('minimise');
      e.target.parentNode.parentNode.style.display = 'none';
      Navigation.hide(VIEW, 'minimise-button');
    });

    elContent.classList.add('minimise');
  }

  function onClickClose() {
    showLobbyLeaveWarning(function onConfirmLeave() {
      Navigation.hide(VIEW, 'close-button');
    });
  }

  function leaveLobby() {
    //engine.call('LeaveLobby');
    //utils.dispatch('ResetCreditsTicker');
  }

  function showLobbyLeaveWarning(callback) {
    if (shouldShowLobbyLeaveWarning()) {
      utils.dispatch('ShowStatus', {
        'id': 'quit-lobby',
        'message': utils.l10n.get('QuitLobby'),
        'showOK': utils.l10n.get('GenericLabelQuit'),
        'showCancel': utils.l10n.get('GenericLabelCancel'),
        'onOK': function onClickOK() {
          leaveLobby();
          callback();
        }
      });
    } else {
      leaveLobby();
      callback();
    }
  }

  function shouldShowLobbyLeaveWarning() {
    var numberOfPlayersInLobby = Object.keys(lobby.players).length;
    var numberOfInvites = friendsList.getNumberOfPendingInvites();
    var hasLobby = lobby.id !== undefined && lobby.id !== lobby.EMPTY_LOBBY;
    var isSoloVsAi = gameModes.getCurrentMode().Id === 'soloVsAi';

    return !isSoloVsAi &&
      (hasLobby && numberOfPlayersInLobby > 1) ||
      numberOfInvites > 0;
  }

  function onClickLeaveQueue() {
    utils.dispatch('ShowStatus', {
      'id': 'leave-matchmaking-queue',
      'message': utils.l10n.get('LeaveQueue'),
      'showOK': utils.l10n.get('GenericLabelLeaveQueue'),
      'showCancel': utils.l10n.get('GenericLabelCancel'),
      'onOK': function onOK() {
        engine.call('LeaveMatchmakingQueue');
        utils.dispatch('ResetCreditsTicker');
      }
    });
  }

  function onKeyPress(e) {
    if (e.keyCode === 13) {
      chat.focus();
    }
  }

  function onClickPlayerInLobby(player) {
    var message = utils.l10n.get('KickPlayerFromLobby').format({ 'player': player.name }, false);

    if (lobbyWidget.isInQueue()) {
      message += utils.l10n.get('KickPlayerFromLobbyQueueing');
    }

    utils.dispatch('ShowStatus', {
      'id': 'kick-player',
      'message': message,
      'showOK': utils.l10n.get('KickPlayerButton'),
      'showCancel': utils.l10n.get('GenericLabelCancel'),
      'onOK': function onOK() {
        engine.call('KickPlayerFromLobby', player.id);
      }
    });
  }

  function onFilterFriendsChange(e) {
    friendsList.filter(e.target.value);
  }

  function onSteamConnectionStateChanged( isConnected ) {
    if ( VIEW.el ) {
      if ( isConnected ) {
        VIEW.el.classList.remove( 'no-connection' );
      } else {
        VIEW.el.classList.add( 'no-connection' );
      }
    }
  }

  function onLobbyReachableStateChanged( isReachable ) {
    if ( VIEW.el ) {
      if ( isReachable ) {
        VIEW.el.classList.remove( 'lobby-reachable-false' );
      } else {
        VIEW.el.classList.add( 'lobby-reachable-false' );
      }
    }
  }

  var GameModesManager = (function GameModesManager() {
    var TEMPLATE_SUB_MODE = '<label class="sub-game-mode available-{{IsAvailable}} {{Id}}" data-available="{{IsAvailable}}" data-tooltip="{{Description}}" data-tooltip-align="right" data-audio-hover>' +
      '<span class="sub-mode-description">{{subModeDescription}}</span>' +
      '<span class="sub-mode-name">{{Name}}</span>' +
      '<input class="uicheckbox" data-id="{{Id}}" {{disabled}} type="radio" name="submodes" />' +
      '</label>';

    function GameModesManager(options) {
      this.elMenu;

      this.selectedMode = '';
      this.DELAYED_MODE_SELECTION;
      this.modesSet = false;
      this.modes = {};
      this.quickPlayCoopEnabled = DataStore.isQuickPlayCoopEnabled;
      this.quickPlayPvPEnabled = DataStore.isQuickPlayPvPEnabled;

      this.onBeforeChange;

      this.init(options);
    }

    GameModesManager.prototype = Object.create(EventDispatcher.prototype);

    GameModesManager.prototype.init = function init(options) {
      this.elMenu = options.elMenu;
      this.elSubModes = options.elSubModes;
      this.onBeforeChange = options.onBeforeChange;

      utils.onClick(this.elMenu, this.onClick.bind(this));
      this.elSubModes.addEventListener('change', this.onChangeSubModes.bind(this));

      engine.on('SetSelectedGameMode', this.setSelectedGameMode.bind(this));
      engine.on('SetSelectedSubGameModes', this.setSelectedSubGameModes.bind(this));

      utils.on('SelectLobby', this.onLobbySelected.bind(this));

      utils.onClick(VIEW.el.querySelector('#game-mode-carousel'), this.onArrowClick.bind(this));

    };

    GameModesManager.prototype.onClick = function onClick(e) {
      var el = e.target;
      if (el && el.dataset && el.dataset.gameMode) {
        AudioPlayer.play(AudioPlayer.Lobby_SelectGameMode);
        this.onBeforeChange(el.dataset.gameMode);
      }
    };

    GameModesManager.prototype.onChangeSubModes = function onChangeSubModes(e) {
      var el = e.target;
      var modes = [];
      var elModes = this.elSubModes.querySelectorAll('input');

      elModes = Array.prototype.slice.call(elModes);

      for (var i = 0, len = elModes.length; i < len; i++) {
        if (elModes[i].checked) {
          modes.push(elModes[i].dataset.id);
        } else {
          elModes[i].parentNode.classList.remove('checked');
        }
      }
      
      if (modes.length) {
        engine.call('ChangeSubGameModes', modes);
        if (this.selectedMode === 'coopVsAi') {
          this.subGameModeHeaderContent(this.modes[modes[0]]);
        }
      } else {
        this.setSelectedSubGameModes([el.dataset.id]);
      }
    };

    GameModesManager.prototype.subGameModeHeaderContent = function subGameModeHeaderContent(gameMode) {
      if (gameMode) {
        utils.updateScope({
          'gameMode': {
            'Name': gameMode.Name,
            'AverageTime': gameMode.AverageTime,
            'Id': gameMode.Id,
            'Mode': 'matchmaking'
          },
          'hasContent': Boolean(gameMode.Description || gameMode.AverageTime)
        }, VIEW);

        void VIEW.el.querySelector('.gamemode-title').offsetHeight;
      }
    };

    GameModesManager.prototype.setSelectedSubGameModes = function setSelectedSubGameModes(modes) {
      if (modes.length > 1 && this.selectedMode === 'customMatch') {
        modes = modes.splice(0, 1);
      }

      // If a configParam exists, we make sure that it is the only
      //  one that gets selected from the list of sub game modes
      if (this.configParam) {
        var elConfigParam = this.elSubModes.querySelector('input[data-id="' + this.configParam + '"]');
        if (elConfigParam) {
          elConfigParam.checked = true;
          elConfigParam.dispatchEvent(new Event('change', { 'bubbles': true }));
        }
      }
      // If configParam is blank, we default to selecting what code sends us back
      else {
        for (var i = 0, len = modes.length; i < len; i++) {
          var elMode = this.elSubModes.querySelector('input[data-id = "' + modes[i] + '"]');
  
          if (elMode) {
            elMode.checked = this.modes[modes[i]].IsAvailable;
            elMode.dispatchEvent(new Event('change', { 'bubbles': true }));
          }
        }
      }
    };

    GameModesManager.prototype.setSelectedGameMode = function setSelectedGameMode(id) {
      var gameMode = this.get(id);

      if (!gameMode) {
        if (!this.modesSet) {
          this.DELAYED_MODE_SELECTION = id;
        }
        else {
          console.warn('Trying to select an invalid game mode: ' + id + ', valid modes are: ' + Object.keys(this.modes).join(', '));
        }
        return;
      }
      console.log("Game Mode Selected: [" + id + "][" + gameMode.Name + "]");

      //Should not be hard coded :|
      var elServerOptions = document.getElementsByClassName("server-options");
      for (var i = 0; i < elServerOptions.length; i++) {
        elServerOptions[i].dataset.pageLink = "serveroptions " + id;
      }

      switch(id) {
        case 'fracturedSpace':
          VIEW.el.parentElement.classList.remove('hide-mmr');
          this.elSubModes.classList.remove("hidden");
          break;
        case 'horde':
          this.elSubModes.classList.remove("hidden");
          VIEW.el.parentElement.classList.add('hide-mmr');
          break;
        case 'coopVsAi':
          VIEW.el.parentElement.classList.add('hide-mmr');
          this.elSubModes.classList.remove("hidden");
          break;
        default:
          VIEW.el.parentElement.classList.remove('hide-mmr');
          this.elSubModes.classList.remove('hidden');
          break;
      }

      this.selectedMode = id;

      utils.updateScope({
        'gameMode': gameMode,
        'hasContent': Boolean(gameMode.Description || gameMode.AverageTime),            
        'hasSubModes': gameMode.SubModes.length > 0
      }, VIEW);

      this.showSubModes();

      this.dispatch('change', gameMode);
    };

    GameModesManager.prototype.setHeaderContent = function setHeaderContent(gameMode, showHideSubGameModes) {
      if (gameMode) {
        if (showHideSubGameModes) {
          
        } else {
          utils.updateScope({
            'gameMode': gameMode,
            'hasContent': Boolean(gameMode.Description || gameMode.AverageTime)
          }, VIEW);
        }
      }    
    };

    GameModesManager.prototype.onLobbySelected = function onLobbySelected(id) {
      selectedGameMode = id;
      gameModes.setSelectedGameMode(selectedGameMode);

      this.showLobbyIntroVideo(id);

      var showCarousel = (id === 'fracturedSpace' || id === 'customMatch');

      utils.updateScope({
        'showCarousel': showCarousel
      });

    };

    GameModesManager.prototype.onArrowClick = function onArrowClick(e) {
      var el = e.target;

      if (el && el.dataset.carouselArrow) {
        var gameMode = gameModes.modes[el.dataset.carouselArrow];
        onBeforeChangeGameModes(gameMode.Id);
      }
    };

    GameModesManager.prototype.updateArrows = function updateArrows() {

      var carouselModes = ["fracturedSpace", "customMatch"];
      var currentIndex = carouselModes.indexOf(this.getCurrentMode().Id);

      var arrows = {
        'prevArrow': carouselModes[currentIndex - 1] ? carouselModes[currentIndex - 1] : carouselModes[carouselModes.length - 1],
        'nextArrow': carouselModes[currentIndex + 1] ? carouselModes[currentIndex + 1] : carouselModes[0]
      };

      utils.updateScope({
        'arrows': arrows
      }, VIEW);

      VIEW.el.querySelector('.game-mode-title').setAttribute('style', '');
    };

    GameModesManager.prototype.updateContent = function updateContent(mode) {
      let currentGameMode = this.getCurrentMode();

      if (currentGameMode) {
        let name = this.getCurrentMode().Name;
        let avgTime = this.getCurrentMode().AverageTime;
        let avgTimeText = this.getCurrentMode().Id === 'fracturedSpace' ? utils.l10n.get('GameModesAverageGameTime') : '';
        let desc = this.getCurrentMode().Description;
  
        if (mode) {
          name = mode.Name;
          avgTime = mode.AverageTime;
          avgTimeText = mode.Id === 'fracturedSpace' ? utils.l10n.get('GameModesAverageGameTime') : '';
          desc = mode.Description;
        }
  
        utils.updateScope({
          'carousel': {
            'Name': name,
            'AverageTime': avgTime,
            'AverageTimeText': avgTimeText,
            'Description': desc
          }
        }, VIEW);
      }

      utils.resizeFontToFit(VIEW.el.querySelector('.game-mode-title'));
    };

    GameModesManager.prototype.showSubModes = function showSubModes() {
      var html = '';
      var gameMode = this.modes[this.selectedMode] || {};
      var modes = gameMode.SubModes || [];

      for (var i = 0, len = modes.length; i < len; i++) {
        this.modes[modes[i].Id] = modes[i];
        var gmDescription = '';

        switch(modes[i].Id) {
          case Config.GAME_MODE_IDS.CONQUEST:
            gmDescription = 'SubGameModeConquestDescription';
            break;
          case Config.GAME_MODE_IDS.HORDE:
            gmDescription = 'SubGameModeLastStandDescription';
            break;
          case Config.GAME_MODE_IDS.RIFT:
            gmDescription = 'SubGameModeRiftDescription';
            break;
          case Config.GAME_MODE_IDS.PAYLOAD:
            gmDescription = 'SubGameModePayloadDescription';
            break;
          case Config.GAME_MODE_IDS.ARKAIN:
            gmDescription = 'SubGameModeArkainDescription';
            break;
          case Config.GAME_MODE_IDS.INFECTION:
            gmDescription = 'SubGameModeInfectionDescription';
            break;
          case Config.GAME_MODE_IDS.DISCOVERY:
            gmDescription = 'SubGameModeDiscoveryDescription';
            break;
          case Config.GAME_MODE_IDS.FRONTLINE:
            gmDescription = 'SubGameModeFrontlineDescription';
            break;
          case Config.GAME_MODE_IDS.CONQUEST3v3:
            gmDescription = 'SubGameMode3v3Description';
            break;
        }

        html += TEMPLATE_SUB_MODE.format(modes[i]).format({
          'disabled': modes[i].IsAvailable ? '' : 'disabled',
          'subModeClass': modes[i].Id,
          'subModeDescription': utils.l10n.get(gmDescription),
          'Description': modes[i].Description
        });
      }

      this.elSubModes.innerHTML = html;
    };

    GameModesManager.prototype.getMenu = function getMenu(id) {
      return this.elMenu.querySelector('[data-game-mode = "' + id + '"]');
    };

    GameModesManager.prototype.getCurrentMode = function getCurrentMode() {
      if (!this.selectedMode) {
        this.selectedMode = 'fracturedSpace';
      }
      console.warn('[Lobby Gamemode] Current mode [' + this.selectedMode + ']. Does it exist in the modes list? ' + (this.modes[this.selectedMode] ? 'Yes' : 'No'));
      return this.modes[this.selectedMode];
    };

    GameModesManager.prototype.get = function get(id) {
      return this.modes[id];
    };

    GameModesManager.prototype.add = function add(modes) {
      if (!Array.isArray(modes)) {
        modes = [modes];
      }

      for (var i = 0, len = modes.length; i < len; i++) {
        this.modes[modes[i].Id] = modes[i];
      }
    };

    GameModesManager.prototype.updateModesSet = function updateModesSet() {
      this.modesSet = true;
      if (this.DELAYED_MODE_SELECTION) {
        this.setSelectedGameMode(this.DELAYED_MODE_SELECTION);
      }
      this.DELAYED_MODE_SELECTION = null;
    };

    GameModesManager.prototype.setConfigParam = function setConfigParam(param) {
      if (!param) {
        return;
      }

      this.configParam = param;

      this.showLobbyIntroVideo(param);
    };

    GameModesManager.prototype.showLobbyIntroVideo = id => {
      if (!id) {
        return;
      }

      let showIntroVideo = false;
      let eventName = '';

      switch(id) {
        case Config.GAME_MODE_IDS.HORDE:
          if (!Player.HasVisitedLastStandLobby) {
            showIntroVideo = true;
            Player.HasVisitedLastStandLobby = true;
            eventName = 'SetHasVisitedLastStandLobby';
          }
          break;
        case Config.GAME_MODE_IDS.RIFT:
          if (!Player.HasWatchedVIPVideo) {
            showIntroVideo = true;
            Player.HasWatchedVIPVideo = true;
            eventName = 'SetHasWatchedVIPVideo';
          }
          break;
        case Config.GAME_MODE_IDS.DISCOVERY:
          if (!Player.HasWatchedDiscoveryVideo) {
            showIntroVideo = true;
            Player.HasWatchedDiscoveryVideo = true;
            eventName = 'SetHasWatchedDiscoveryVideo';
          }
          break;
        case Config.GAME_MODE_IDS.PAYLOAD:
          if (!Player.HasWatchedPayloadVideo) {
            showIntroVideo = true;
            Player.HasWatchedPayloadVideo = true;
            eventName = 'SetHasWatchedPayloadVideo';
          }
          break;
        case Config.GAME_MODE_IDS.ARKAIN:
          if (!Player.HasWatchedArkainVideo) {
            showIntroVideo = true;
            Player.HasWatchedArkainVideo = true;
            eventName = 'SetHasWatchedArkainVideo';
          }
          break;
        case Config.GAME_MODE_IDS.INFECTION:
          if (!Player.HasWatchedInfectionVideo) {
            showIntroVideo = true;
            Player.HasWatchedInfectionVideo = true;
            eventName = 'SetHasWatchedInfectionVideo';
          }
          break;
      }

      if (showIntroVideo && eventName) {
        engine.call(eventName, true);
        Navigation.show(Navigation.VIEWS.LOBBY_VIDEO, function onShow() {
          utils.dispatch('ShowIntroVideo', id);
        });
      }
    };

    return GameModesManager;
  }());

  var Sessions = (function () {
    var TEMPLATE_SERVER = '<div class="server in-progress-{{InProgress}}" data-index="{{Index}}" data-rejoin="{{Rejoin}}" class="cursor-over">' +
      '<div class="server-mode">{{GameMode}}</div>' +
      '<div class="server-name">{{Name}}</div>' +
      '<div class="server-players">{{NumPlayers}}/{{MaxPlayers}}</div>' +
      '<div class="server-status">{{StatusText}}</div>' +
      '<div class="separator fade-out-both bottom"></div>' +
      '</div>';

    function Sessions(options) {
      this.el;
      this.elList;
      this.elSpec;
      this.elRefresh;
      this.elJoin;

      this.refreshClicks = 0;

      this.selectedServerIndex = -1;

      this.timeoutRender;
      this.serversMap = {};

      this.init(options || {});
    }

    Sessions.prototype = {
      init: function init(options) {
        engine.call('UpdatePlayerRegions', ["lon", "nyc", "lax", "hk"], "lax");

        this.el = options.el;
        this.elList = this.el.querySelector('.servers-list');
        this.elSpec = VIEW.el.querySelector('.button-servers-spectator');
        this.elRefresh = VIEW.el.querySelector('.button-servers-refresh');
        this.elJoin = VIEW.el.querySelector('.button-servers-join');

        this.elList.addEventListener('click', this.onClick.bind(this));
        this.elList.addEventListener('dblclick', this.onDoubleClick.bind(this));
        utils.onClick(this.elRefresh, this.refresh.bind(this));
        utils.onClick(this.elJoin, this.join.bind(this));
        utils.onClick(this.elSpec, this.joinAsSpectator.bind(this));

        engine.on('Sessions_RefreshInProgress', this.onBeginSessionRefresh.bind(this));
        engine.on('Sessions_AddSessions', this.onAddSessions.bind(this));

          this.elSpec.style.visibility = 'visible';
        
      },

      onClick: function onClick(e) {
        var serverIndex = e.target.dataset.index;
        if (serverIndex !== undefined) {
          var server = this.serversMap[serverIndex];
          if (server && server.Joinable && !server.IsFull) {
            this.selectedServerIndex = serverIndex;
            this.SetJoinState(true);
            this.highlightServer(serverIndex);

            return server;
          }
        }
      },

      onDoubleClick: function onDoubleClick(e) {
        var server = this.onClick(e);
        if (server) {
          this.join();
        }
      },

      join: function join(isPureSpectator) {
        var joiningAsPureSpectator = false;
        if (isPureSpectator === true) {
          joiningAsPureSpectator = true;
        }

        var server = this.serversMap[this.selectedServerIndex] || {};

        utils.reportEvent(Config.ANALYTICS.SESSIONS_JOIN_SERVER, {
          'serverName': server.Name || '',
          'gameMode': server.GameMode || '',
          'numberOfPlayers': server.NumPlayers || 0,
          'serverInProgress': !!server.InProgress
        });

        utils.preventAudioEvents();

        engine.call('Sessions_JoinServer', this.selectedServerIndex * 1, server.Name || '', joiningAsPureSpectator);
      },

      joinAsSpectator: function joinAsSpectator() {
        this.join(true);
      },

      refresh: function refresh() {
        this.refreshClicks++;

        engine.call('Sessions_Refresh');
      },

      clearList: function clearList() {
        this.serversMap = {};
        this.elList.innerHTML = '';
        this.SetJoinState(false);
      },

      onBeginSessionRefresh: function onBeginSessionRefresh() {
        this.clearList();
        this.SetRefreshState(true);
      },

      onAddSessions: function onAddSessions(servers) {
        var serverGroups = [[], [], []];

        for (var i = 0, len = servers.length, server; i < len; i++) {
          server = servers[i];

          var shouldAddServer = true;

          server.StatusText = utils.l10n.get('ServerStatus' + (server.InProgress ? 'InProgress' : 'WarmUp'));

          if (shouldAddServer) {
            var name = server.Name || '';
            var group = /^\s*(?:\u2665|&#0*9829;|&#x0*2665;|&hearts;)/i.test(name) ? 0 :
              /^\s*tiger/i.test(name) ? 1 : 2;
            serverGroups[group].push(server);
          }

          this.serversMap[server.Index] = server;
        }

        var serversToRender = serverGroups[0].concat(serverGroups[1], serverGroups[2]);
        var html = '';
        for (var i = 0, len = serversToRender.length; i < len; i++) {
          html += TEMPLATE_SERVER.format(serversToRender[i]);
        }

        this.elList.innerHTML = html;

        if (servers.length === 0) {
          window.setTimeout(this.showNoServers.bind(this), 200);
        }

        this.SetRefreshState(false);
      },

      showNoServers: function showNoServers() {
        var self = this;

        utils.dispatch('ShowStatus', {
          'id': 'sessions-empty',
          'title': '',
          'message': utils.l10n.get('NoServersErrorMessage'),
          'showOK': utils.l10n.get('ButtonRefresh'),
          'showCancel': utils.l10n.get('GenericLabelClose'),
          'onOK': function onOK() {
            self.refresh();
          },
          'onCancel': function onCancel() {

          }
        });
      },

      SetRefreshState: function SetRefreshState(isRefreshing) {
        if (isRefreshing) {
          this.elRefresh.classList.add('disabled');
          this.elRefresh.innerHTML = utils.l10n.get('ButtonRefreshing');
        } else {
          this.elRefresh.classList.remove('disabled');
          this.elRefresh.innerHTML = utils.l10n.get('ButtonRefresh');
        }
      },

      SetJoinState: function SetJoinState(canJoin) {
        if (canJoin) {
          this.elJoin.classList.remove('disabled');
          this.elSpec.classList.remove('disabled');
          this.elJoin.innerHTML = utils.l10n.get('ButtonJoinServer');
        } else {
          this.elJoin.classList.add('disabled');
          this.elSpec.classList.add('disabled');
          this.elJoin.innerHTML = utils.l10n.get('ButtonSelectServerToJoin');
        }
      },

      highlightServer: function highlightServer(index) {
        var elCurrentHighlight = this.elList.querySelector('.highlight');
        var elServer = this.elList.querySelector('[data-index = "' + index + '"]');

        if (elCurrentHighlight) {
          elCurrentHighlight.classList.remove('highlight');
        }
        if (elServer) {
          elServer.classList.add('highlight');
        }
      }
    };

    return Sessions;
  }());

  var Lobby = (function Lobby() {
    var TEMPLATE = '<div class="image" style="background-image: url(\'{{avatarmedium}}\');"></div>' +
      '<span class="name">{{name}}</span>' +
      '<span class="rank">' +
      utils.l10n.get('GenericLabelLevel') + 
      ' <span class="defence-color">{{rank}}</span>' +
      '<span class="mmr-wrapper {{mmrVisibility}}"> ' + utils.l10n.get('GenericLabelMMR') +' <span class="mmr">{{(f)mmr}}</span></span>' +
      '</span>' +
      '<span class="spectator {{spectatorVisibility}}">' + utils.l10n.get('Spectating') + '</span>' +
      '<b class="kick cursor-over" data-click-id="{{id}}" data-audio-hover></b>' +
      '<div class="drag-handle" data-drag-id="{{id}}"></div>' +
      '<div class="drop-handle"></div>' +
      '<div class="separator fade-out-both bottom"></div>';

    var TEMPLATE_FREE = '<div class="separator fade-out-both bottom"></div>' +
      '<div class="drop-handle"></div>';

    var TEMPLATE_HEADER = '<span class="team-name">{{name}}</span>' +
      '<span class="team-mmr">MMR <span class="team-mmr-value">{{(f)mmr}}</span></span>';

    var AI_CAPTAINS = [
      { id: "AI_CAPTAIN_0", level: 0, name: utils.l10n.get('AICaptainEasy1'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_1", level: 1, name: utils.l10n.get('AICaptainEasy2'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_2", level: 2, name: utils.l10n.get('AICaptainEasy3'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_3", level: 3, name: utils.l10n.get('AICaptainMedium1'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_4", level: 4, name: utils.l10n.get('AICaptainMedium2'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_5", level: 5, name: utils.l10n.get('AICaptainMedium3'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_6", level: 6, name: utils.l10n.get('AICaptainHard1'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_7", level: 7, name: utils.l10n.get('AICaptainHard2'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_8", level: 8, name: utils.l10n.get('AICaptainHard3'), avatar: "images/default-avatar.png" },
      { id: "AI_CAPTAIN_9", level: 9, name: utils.l10n.get('GenericLabelPerfectAI'), avatar: "images/default-avatar.png" },
    ];

    function Lobby(options) {
      this.el;
      this.elPlayers;
      this.elTeamsHeader;

      this.id = 0;
      this.isOwner;

      this.didGetLobby = false;
      this.lobby;
      this.players = {};
      this.slots = [];
      this.teams = [];

      this.autoBotLevel = -1;

      this.EMPTY_LOBBY = 0;

      this.ERROR_CODES = {
        'FAIL': 0,
        'SUCCESS': 1
      };

      this.init(options);
    }

    Lobby.prototype = Object.create(EventDispatcher.prototype);

    Lobby.prototype.init = function init(options) {
      this.el = options.el;
      this.elPlayers = this.el.querySelector('.teams');
      this.elTeamsHeader = this.el.querySelector('.teams-header');
      this.elSpectators = document.querySelector('#team-spectator');

      this.bound_onMouseMove = this.onMouseMove.bind(this);
      this.bound_onMouseUp = this.onMouseUp.bind(this);

      this.el.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.elSpectators.addEventListener('mousedown', this.onMouseDown.bind(this));

      this.el.addEventListener('click', this.onClick.bind(this));
      this.elSpectators.addEventListener('click', this.onClick.bind(this));

      PlayersInfo.on('loaded', this.updatePlayers.bind(this));

      this.setPlayersCount(2, 1);
      this.populateBots();
    };

    Lobby.prototype.onGotLobbyResult = function onGotLobbyResult(lobby) {
      if (lobby.errorCode !== this.ERROR_CODES.SUCCESS) {
        return;
      }

      this.didGetLobby = true;
      this.id = lobby.id;

      if (this.id === this.EMPTY_LOBBY) {
        for (var id in this.players) {
          this.removePlayer(this.players[id]);
        }
      }
    };

    Lobby.prototype.updatePlayers = function updatePlayers() {
      for (var id in this.players) {
        var el = this.el.querySelector('[data-id = "' + id + '"]');

        if (el) {
          var playerInfo = PlayersInfo.get(id);
          if (!playerInfo.isSpectator) {
            playerInfo.spectatorVisibility = "hidden";
          }
          else {
            playerInfo.spectatorVisibility = "";
          }
          el.innerHTML = TEMPLATE.format(this.players[id]).format(playerInfo);
        }
      }
    };

    Lobby.prototype.setPlayersCount = function setPlayersCount(numberOfPlayers, teams = 1, numberOfSpectators) {
      if (teams > 1) {
        VIEW.el.classList.add('multiple-teams');
      } else {
        VIEW.el.classList.remove('multiple-teams');
      }

      this.slots = [];
      this.teams = [];
      this.elPlayers.innerHTML = '';
      this.elTeamsHeader.innerHTML = '';

      VIEW.el.dataset.playersCount = numberOfPlayers;

      var elSpectatorTeams = document.querySelectorAll('.lobby-team.spectator');
      this.elSpectators.style.display = numberOfSpectators > 0 ? 'block' : 'none';

      for (var i = 0; i < elSpectatorTeams.length; ++i) {
        elSpectatorTeams[i].innerHTML = '';
      }

      var currentSpectatorSlot = 0;
      var maxSpectatorSlot = 2;

      for (var i = 0; i < teams; i++) {
        var players = [];
        var team = {
          'name': utils.l10n.get('GenericTeam') + ' ' + (i + 1),
          'mmr': 0
        };

        var elTeam = document.createElement('ul');
        elTeam.className = 'lobby-team';

        this.teams.push(team);

        var elTeamHeader = document.createElement('div');
        elTeamHeader.className = 'team-header';
        elTeamHeader.innerHTML = TEMPLATE_HEADER.format(team);

        team.elHeader = elTeamHeader;

        for (var j = 0; j < numberOfPlayers; j++) {
          var slot = {
            'isFree': true,
            'el': document.createElement('li'),
            'team': i,
            'isSpectatorSlot': false,
            'hostText': utils.l10n.get('GenericHost'),
            'slotId': j
          };

          elTeam.appendChild(slot.el);

          players.push(slot);

          slot.el.dataset.team = i;
          slot.el.dataset.isSlot = true;
          slot.el.dataset.isSpectatorSlot = false;
          slot.el.dataset.hostText = utils.l10n.get('GenericHost');

          this.markSlotAsFree(slot);
        }

        for (var k = 0; k < numberOfSpectators; k++) {
          var slot = {
            'isFree': true,
            'el': document.createElement('li'),
            'team': i,
            'isSpectatorSlot': true,
            'hostText': utils.l10n.get('GenericHost')
          };

          elSpectatorTeams[currentSpectatorSlot].appendChild(slot.el);
          currentSpectatorSlot = (currentSpectatorSlot + 1) % maxSpectatorSlot;

          players.push(slot);

          slot.el.dataset.team = i;
          slot.el.dataset.isSlot = true;
          slot.el.dataset.isSpectatorSlot = true;
          slot.el.dataset.hostText = utils.l10n.get('GenericHost');

          this.markSlotAsFree(slot);
        }

        this.elPlayers.appendChild(elTeam);
        this.elTeamsHeader.appendChild(elTeamHeader);
        this.slots.push(players);
      }
    };

    Lobby.prototype.populateBots = function populateBots() {
      for (var i = 0; i < AI_CAPTAINS.length; i++) {
        friendsList.addBot(AI_CAPTAINS[i]);
      }
    };

    Lobby.prototype.addPlayer = function addPlayer(player) {
      if (this.players[player.id]) {
        return;
      }

      if (!player.team) {
        player.team = 0;
      }

      var freeSlot = this.getNextFreeSlot(player.team, player.isSpectator, !player.isBot);

      if (!freeSlot) {
        return;
      }

      if (player.mmr < 0) {
        player.mmr = 0;
      }

      var playerInfo = PlayersInfo.get(player.id);

      freeSlot.isFree = false;
      freeSlot.playerId = player.id;

      if (!player.isSpectator) {
        player.spectatorVisibility = "hidden";
      }
      else {
        player.spectatorVisibility = "";
      }

      if (player.isBot) 
      {
        player.name = AI_CAPTAINS[player.botDifficulty].name;
      }

      freeSlot.el.innerHTML = TEMPLATE.format(player).format(playerInfo);
      freeSlot.el.dataset.id = player.id;
      freeSlot.el.classList.remove('free');

      this.players[player.id] = player;

      friendsList.setPlayerInLobby(player.id);

      if (player.isOwner) {
        freeSlot.el.classList.add('owner');
      }
      if (player.isLocalPlayer) {
        freeSlot.el.classList.add('local');

        VIEW.el.classList.remove('owner-' + !player.isOwner);
        this.isOwner = player.isOwner;
        VIEW.el.classList.add('owner-' + player.isOwner);
      }

      this.updateTeamsMMR();

      if (!playerInfo.ready) {
        PlayersInfo.load(player.id);
      }
    };

    Lobby.prototype.addBot = function addBot(botId, team, slotPosition) {
      var bot;
      for (var i = 0; i < AI_CAPTAINS.length; i++) {
        if (AI_CAPTAINS[i].id === botId) {
          bot = AI_CAPTAINS[i];
          break;
        }
      }

      if (!bot) {
        return;
      }

      var freeSlot;
      if (!slotPosition) {
        if (team === undefined) {
          freeSlot = this.getNextFreeSlot(0, false, false) || this.getNextFreeSlot(1, false, false);
        } else {
          freeSlot = this.getNextFreeSlot(team, false, false);
        }
      }
      else {
        freeSlot = this.getSlotById(team, slotPosition);
      }

      if (!freeSlot) {
        return;
      }
      console.log("Slot check");
      console.log(freeSlot);


      //Set bot id to next free ID
      this.botCount = this.botCount || 0;
      var botID = this.botCount;
      this.botCount++;

      engine.call('AddBotToLobby', botID.toString(), freeSlot.team, bot.level);

      return true;
    };

    Lobby.prototype.startDragging = function startDragging(e, playerIdToDrag) {
      AudioPlayer.play(AudioPlayer.DragAndDrop_Pickup);

      this.dragData = {
        'playerId': playerIdToDrag,
        'startX': e.pageX,
        'startY': e.pageY,
        'el': e.target.parentNode
      };

      // Add dragging classes to style everything
      VIEW.el.classList.add('during-dragging');
      this.dragData.el.classList.add('dragging');

      window.addEventListener('mousemove', this.bound_onMouseMove);
      window.addEventListener('mouseup', this.bound_onMouseUp);
    };

    Lobby.prototype.stopDragging = function stopDragging() {
      var audioToPlay = '';

      if (this.dragData) {
        if (this.elDropTarget) {
          var playerId = this.elDropTarget.dataset.id || '';
          var team = this.elDropTarget.dataset.team * 1;
          var isSpectator = this.elDropTarget.dataset.isSpectatorSlot === 'true';

          this.elDropTarget.classList.remove('drop-target');
          this.elDropTarget = null;
          
          //Cannot drag bots into spectator slots
          if ( isSpectator && this.players[ this.dragData.playerId] && this.players[ this.dragData.playerId].isBot ) {
            audioToPlay = AudioPlayer.DragAndDrop_Revert;
          } else {
            if (playerId) {
              audioToPlay = AudioPlayer.DragAndDrop_Switch;
            } else {
              audioToPlay = AudioPlayer.DragAndDrop_Drop;
            }

            // this.swapSlots(this.dragData.playerId, playerId, team, isSpectator);
            engine.call('LobbyPlayerChangeTeams', this.dragData.playerId, playerId, team, isSpectator);
          }
        } else {
          //Clear player drag thing
          if ( this.elDropTarget ) {
            this.elDropTarget.classList.remove('drop-target');
            this.elDropTarget = null;
          }
          audioToPlay = AudioPlayer.DragAndDrop_Revert;
        }

        this.dragData.el.classList.remove('dragging');
        this.dragData.el.style.transform = '';
      }

      if (audioToPlay) {
        AudioPlayer.play(audioToPlay);
      }

      this.dragData = null;
      VIEW.el.classList.remove('during-dragging');

      window.removeEventListener('mousemove', this.bound_onMouseMove);
      window.removeEventListener('mouseup', this.bound_onMouseUp);
    };

    Lobby.prototype.swapSlots = function swapSlots(draggedPlayerId, droppedPlayerId, team, isSpectator) {
      // Create temporary array of players to update
      let tempPlayers = JSON.parse(JSON.stringify(this.players));

      let draggedPlayer = this.players[draggedPlayerId];
      let dropTarget = false;

      if (droppedPlayerId) {
        dropTarget = this.players[droppedPlayerId];
      }

      if (dropTarget) {
        
      } else {
        // Get the first empty slot on the team that the player is being dropped onto
        let emptySlot = this.getNextFreeSlot(team, isSpectator, false);

        if (emptySlot !== null) {
          
        }
      }

      engine.call('LobbyPlayerChangeTeams', draggedPlayerId, droppedPlayerId, team, isSpectator);
    };

    Lobby.prototype.drag = function drag(e) {
      var el = e.target;
      var x = e.pageX - this.dragData.startX;
      var y = e.pageY - this.dragData.startY;
      var isValidDropPoint = false;
      var didChangeTargets = false;

      if (Math.abs(x) < 2 || Math.abs(y) < 2) {
        return;
      }

      // Move the dragged player with the pointer
      this.dragData.el.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(.85)';

      var isDropTarget = el.classList.contains('drop-handle');
      if (isDropTarget) {
        el = el.parentNode;
      }

      // If not dragging over a target, or changed from the previous target player was on,
      // Remove the old target "drop target" style
      if (isDropTarget && !this.elDropTarget) {
        didChangeTargets = true;
      }
      if (this.elDropTarget && el !== this.elDropTarget) {
        this.elDropTarget.classList.remove('drop-target');
        this.elDropTarget = null;
        didChangeTargets = true;
      }

      // Check if element the pointer is now over is a valid drop target
      if (el.dataset.hasOwnProperty('team')) {
        isValidDropPoint = true;
        this.elDropTarget = el;
        this.elDropTarget.classList.add('drop-target');
      }

      if (isValidDropPoint && (didChangeTargets || !this.elDropTarget)) {
        AudioPlayer.play(AudioPlayer.DragAndDrop_SlotOver);
      }
    };

    Lobby.prototype.onMouseDown = function onMouseDown(e) {
      var playerIdToDrag = e.target.dataset.dragId;

      if (playerIdToDrag && this.teams.length > 1) {
        this.startDragging(e, playerIdToDrag);
      }
    };

    Lobby.prototype.onMouseMove = function onMouseMove(e) {
      if (!this.dragData) {
        return;
      }
      this.drag(e);
    };

    Lobby.prototype.onMouseUp = function onMouseUp(e) {
      this.stopDragging(e);
    };

    Lobby.prototype.changePlayerTeam = function changePlayerTeam(playerIdToMove, targetPlayerId, team) {
      var playerToMove = JSON.parse(JSON.stringify(this.players[playerIdToMove]));

      this.removePlayer(this.players[playerIdToMove]);

      if (targetPlayerId) {
        var newPlayer = JSON.parse(JSON.stringify(this.players[targetPlayerId]));
        this.removePlayer(this.players[targetPlayerId]);

        newPlayer.team = playerToMove.team;
        this.addPlayer(newPlayer);
      }

      playerToMove.team = team;
      this.addPlayer(playerToMove);
    };

    Lobby.prototype.removePlayer = function removePlayer(player) {
      if (!player) {
        //Cannot remove a player that doesn't exist
        return;
      }

      var slot = null;
      for (var iTeam = 0; iTeam < this.slots.length; iTeam++) {
        for (var iPlayer = 0; iPlayer < this.slots[iTeam].length; iPlayer++) {
          if (this.slots[iTeam][iPlayer].playerId === player.id) {
            slot = this.slots[iTeam][iPlayer];
            break;
          }
        }
      }

      if (slot) {
        this.markSlotAsFree(slot);

        delete this.players[player.id];

        this.updateTeamsMMR();

        friendsList.setPlayerInLobby(player.id);
      } else {
        console.warn("Didn't find a player to remove", player);
      }
    };

    Lobby.prototype.markSlotAsFree = function markSlotAsFree(slot) {
      if (!slot) {
        return;
      }

      slot.isFree = true;
      delete slot.botId;
      delete slot.playerId;

      delete slot.el.dataset.id;
      delete slot.el.dataset.botId;

      var optionl10n = "FreeSlot";
      if (this.autoBotLevel === 1) {
        optionl10n = "AICaptainEasy";
      } else if (this.autoBotLevel === 4) {
        optionl10n = "AICaptainMedium";
      } else if (this.autoBotLevel === 7) {
        optionl10n = "AICaptainHard";
      } else if (this.autoBotLevel === 9) {
        optionl10n = "GenericLabelPerfectAI";
      }

      var elTeams = document.body.getElementsByClassName("team")[0];

      if (elTeams && elTeams.classList) {
        if (elTeams.classList.contains("botOptions-1")) {
          optionl10n = "AICaptainEasy";
        } else if (elTeams.classList.contains("botOptions-2")) {
          optionl10n = "AICaptainMedium";
        } else if (elTeams.classList.contains("botOptions-3")) {
          optionl10n = "AICaptainHard";
        }
      }

      if (!slot.isSpectatorSlot) {
        slot.el.innerHTML = TEMPLATE_FREE + utils.l10n.get(optionl10n);
      }
      else {
        slot.el.innerHTML = TEMPLATE_FREE + utils.l10n.get('SpectatorSlot');
      }

      slot.el.classList.add('free');
      slot.el.classList.remove('owner');
      slot.el.classList.remove('local');
      slot.el.classList.remove('botId');
    };

    Lobby.prototype.getNextFreeSlot = function getNextFreeSlot(team, isSpectator, includeSpectatorSlots) {
      var slots = this.slots[team];

      for (var i = 0, len = slots.length; i < len; i++) {
        if (slots[i].isFree) {
          if (!isSpectator) {
            if (includeSpectatorSlots || !slots[i].isSpectatorSlot) {
              return slots[i];
            }
          }
          else if (slots[i].isSpectatorSlot) {
            return slots[i];
          }
        }
      }

      return null;
    };

    Lobby.prototype.getSlotById = function getSlotById(team, id) {
      var slots = this.slots[team];

      for (var i = 0, len = slots.length; i < len; i++) {
        var slot = slots[i];
        if (id === slot.slotId) {
          return slot;
        }

      };

      return null;
    };

    Lobby.prototype.updateTeamsMMR = function updateTeamsMMR() {
      for (var i = 0; i < this.teams.length; i++) {
        this.teams[i].mmr = 0;
      }

      for (var id in this.players) {
        var player = this.players[id];

        if (player && !player.isSpectator) {
          this.teams[player.team].mmr += player.mmr;
        }
      }

      this.el.dataset.players = Object.keys(this.players).length;

      for (var i = 0; i < this.teams.length; i++) {
        var team = this.teams[i];

        team.elHeader.innerHTML = TEMPLATE_HEADER.format(team);
      }
    };

    Lobby.prototype.onClick = function onClick(e) {
      var elClicked = e.target;
      var id = elClicked.dataset.clickId;
      var player = this.players[id];

      if (player) {
        this.dispatch('Click', player);
      }
    };

    return Lobby;
  }());

  var FriendsList = (function FriendsList() {
    var TEMPLATE = '<div class="image" style="background-image: url(\'{{avatar}}\');"></div>' +
      '<span class="name">{{name}}</span>' +
      '<b class="invite cursor-over" data-click-id="{{id}}" data-audio-click="UI_PanelOpen" data-tooltip="l10n(LobbyTooltipInviteToLobby)" data-tooltip-align="bottom center"></b>';

    function FriendsList(options) {
      this.el;
      this.elBotAuto;
      this.elBotCaptains;
      this.elBotCaptainsTitle;
      this.elPlayersOwn;
      this.elPlayersDontOwn;
      this.elPlayersDontOwnTitle;

      this.players = {};
      this.bots = {};

      this.invites = {};

      this.TIME_TO_MARK_INVITED = 20000;

      this.init(options);
    }

    FriendsList.prototype = Object.create(EventDispatcher.prototype);

    FriendsList.prototype.init = function init(options) {
      this.el = options.el;
      this.elPlayersOwn = this.el.querySelector('.own');
      this.elPlayersDontOwn = this.el.querySelector('.dont-own');
      this.elPlayersDontOwnTitle = this.el.querySelector('.dont-own-title');

      this.elBotCaptains = this.el.querySelector('.bot-captains');
      this.elBotCaptainsTitle = this.el.querySelector('#bot-captain-title');
      this.elBotAuto = this.el.querySelector('.bot-selection');
      this.elBotCaptainsTitle.addEventListener('click', this.onBotTitleClick.bind(this));

      this.el.addEventListener('click', this.onClick.bind(this));
      PlayersInfo.on('loaded', this.updatePlayers.bind(this));

      utils.l10n.load( this.elBotAuto );
    };

    FriendsList.prototype.onGetFriendsList = function onGetFriendsList(own, dontOwn) {
      this.elPlayersOwn.innerHTML = '';
      this.elPlayersDontOwn.innerHTML = '';
      this.players = {};
      this.addPlayers(own, true);
      this.addPlayers(dontOwn, false);
    };

    FriendsList.prototype.removePlayer = function removePlayer(player) {
      if (!player) {
        //Cannot remove a player that doesn't exist
        return;
      }
      if (this.players[player.id]) {
        delete this.players[player.id];
      }

      var el = this.el.querySelector('[data-id = "' + player.id + '"]');
      if (el) {
        el.parentNode.removeChild(el);
      }
    };

    FriendsList.prototype.updatePlayers = function updatePlayers() {
      for (var id in this.players) {
        this.updatePlayer(this.players[id]);
      }
    };

    FriendsList.prototype.updatePlayer = function updatePlayer(player) {
      if (this.players[player.id]) {
        this.players[player.id] = player;
      }

      var el = this.el.querySelector('[data-id = "' + player.id + '"]');
      if (el) {
        var playerInfo = PlayersInfo.get(player.id);
        el.innerHTML = TEMPLATE.format(player).format(playerInfo);
      }
    };

    FriendsList.prototype.setPlayerInLobby = function setPlayerInLobby(playerId) {
      var el = this.el.querySelector('[data-id = "' + playerId + '"]');
      if (el) {
        if (lobby.players[playerId]) {
          delete this.invites[playerId];
          el.classList.add('inlobby');
          el.querySelector('.invite').dataset.tooltip = 'l10n(LobbyTooltipAlreadyInLobby)';
        } else {
          el.classList.remove('inlobby');
          el.querySelector('.invite').dataset.tooltip = 'l10n(LobbyTooltipInviteToLobby)';
        }
      }
    };

    FriendsList.prototype.addBot = function addBot(bot) {
      var el = document.createElement('li');
      el.dataset.botId = bot.id;
      el.className = 'defence-color';
      el.dataset.audioHover = 'General_Highlight';
      el.dataset.tooltip = bot.name;
      el.dataset.tooltipAlign = 'bottom center';
      el.innerHTML = TEMPLATE.format(bot);

      this.elBotCaptains.appendChild(el);

      this.bots[bot.id] = bot;
    };

    FriendsList.prototype.addPlayers = function addPlayers(players, doesOwn) {
      if (!players) {
        return;
      }

      if (!Array.isArray(players)) {
        players = [players];
      }

      var ids = [];
      var elContainer = doesOwn ? this.elPlayersOwn : this.elPlayersDontOwn;

      for (var i = 0, len = players.length, player, playerInfo; i < len; i++) {
        player = players[i];
        playerInfo = PlayersInfo.get(player.id);

        if (!playerInfo.ready) {
          ids.push(player.id);
        }

        var el = document.createElement('li');
        el.dataset.id = player.id;
        el.className = 'defence-color';
        el.dataset.audioHover = 'General_Highlight';
        el.innerHTML = TEMPLATE.format(player).format(playerInfo);

        if (this.invites[player.id]) {
          el.classList.add('invited');
        }

        elContainer.appendChild(el);

        this.players[player.id] = player;

        this.setPlayerInLobby(player.id);
      }

      PlayersInfo.load(ids);
    };

    FriendsList.prototype.getNumberOfPendingInvites = function getNumberOfPendingInvites() {
      return Object.keys(this.invites).length;
    };

    FriendsList.prototype.onBotTitleClick = function onBotTitleClick() {
      if (this.elBotCaptainsTitle.classList.contains("minimized")) {
        this.elBotCaptainsTitle.classList.remove("minimized");
        this.elBotCaptains.classList.remove("minimized");
        this.elBotAuto.classList.remove("minimized");
      } else {
        this.elBotCaptainsTitle.classList.add("minimized");
        this.elBotCaptains.classList.add("minimized");
        this.elBotAuto.classList.add("minimized");
      }
    };

    FriendsList.prototype.onClick = function onClick(e) {
      var elClicked = e.target,
        id = elClicked.dataset.clickId,
        player = this.players[id];

      if (player) {
        if (!this.invites[player.id]) {
          engine.call('InvitePlayerToLobby', player.id);

          this.invites[player.id] = true;
          elClicked.parentNode.classList.add('invited');

          window.setTimeout(function () {
            if (elClicked && elClicked.parentNode) {
              elClicked.parentNode.classList.remove('invited');
            }
            if (player) {
              delete this.invites[player.id];
            }
          }.bind(this), this.TIME_TO_MARK_INVITED);
        }
      } else {
        var bot = this.bots[id],
          ctrlPressed = e.ctrlKey;
        if (bot) {
          if (ctrlPressed) {
            utils.dispatch('FillLobbyWithBots', id);
          } else {
            utils.dispatch('AddBotToLobby', id);
          }
        }
      }
    };

    FriendsList.prototype.filter = function filter(filterText) {
      var elContainer = this.elPlayersOwn;

      //Case insensitive filtering
      filterText = filterText.toUpperCase();

      //Hide non-game owners when typing text
      if (filterText.length > 0) {
        this.elPlayersDontOwn.style.display = "none";
        this.elPlayersDontOwnTitle.style.display = "none";
      }
      else {
        this.elPlayersDontOwn.style.display = "";
        this.elPlayersDontOwnTitle.style.display = "";
      }

      for (var playerKey in this.players) {
        var player = this.players[playerKey];

        var elPlayer = elContainer.querySelector('li[data-id = "' + player.id + '"]');
        if (!filterText || player.name.toUpperCase().search(filterText) !== -1) {
          //Show players that match the filter
          if (elPlayer) {
            elPlayer.style.display = "";
          }
        }
        else {
          //Hide non matching players
          if (elPlayer) {
            elPlayer.style.display = "none";
          }
        }

      }

    };

    return FriendsList;
  }());

  var Chat = (function Chat() {
    var TEMPLATE_MESSAGE = '<span class="time number defence-color">[{{time}}]</span>' +
      '<span class="player defence-color">{{player}}:</span>' +
      '<span class="message">{{message}}</span>';

    function Chat(options) {
      this.el;
      this.elMessages;

      this.isFocused = false;

      this.TYPES = {
        'NORMAL': 0
      };

      this.init(options);
    }

    Chat.prototype = Object.create(EventDispatcher.prototype);

    Chat.prototype.init = function init(options) {
      this.el = options.el;
      this.elMessages = this.el.querySelector('ul');
      this.elInput = this.el.querySelector('input');

      this.elInput.addEventListener('keyup', this.onKeyUp.bind(this));
      this.elInput.addEventListener('focus', this.focus.bind(this));
      this.elInput.addEventListener('blur', this.onBlur.bind(this));

      engine.on('NewChatMessage', this.addMessage.bind(this));
    };

    Chat.prototype.onKeyUp = function onKeyUp(e) {
      if (e.keyCode === 13) {
        var message = this.elInput.value;
        if (message) {
          engine.call('SendChatMessage', message);
          this.dispatch('SendMessage', message);
        }

        this.elInput.value = '';
      }
    };

    Chat.prototype.clear = function clear() {
      this.elInput.value = '';
      this.elMessages.innerHTML = '';
    };

    Chat.prototype.focus = function focus() {
      this.elInput.focus();
      this.dispatch('focus');
    };

    Chat.prototype.onBlur = function onBlur() {
      this.dispatch('blur');
    };

    Chat.prototype.addMessage = function addMessage(player, message, messageType) {
      if (typeof message === 'number') {
        messageType = message;
      }
      if (typeof player === 'string') {
        message = player;
      }

      var el = document.createElement('li'),
        playerName = player && player.name || '';

      el.className = 'type-' + messageType;
      el.innerHTML = TEMPLATE_MESSAGE.format({
        'time': this.getTimestamp(),
        'player': playerName,
        'message': message.sanitise()
      });

      var isScrollAtBottom = this.elMessages.scrollTop === this.elMessages.scrollHeight - this.elMessages.offsetHeight;

      this.elMessages.appendChild(el);

      if (isScrollAtBottom) {
        this.elMessages.scrollTop = 999999;
      }
    };

    Chat.prototype.getTimestamp = function getTimestamp() {
      var now = new Date(),
        h = now.getHours(),
        m = now.getMinutes(),
        s = now.getSeconds();

      (h < 10) && (h = '0' + h);
      (m < 10) && (m = '0' + m);
      (s < 10) && (s = '0' + s);

      return h + ':' + m + ':' + s;
    };

    return Chat;

  }());

  var Controls = (function () {
    function Controls() {
      this.controls;
      this.onChange;
      this.onApply;

      this.groupData = {};
      this.controlGroups = {};
    }

    Controls.prototype = {
      TYPES: {
        '.toggler': 'Toggler',
        'input[type = "range"]': 'Range',
        '.key-binder': 'KeyBinder'
      },

      init: function init(options) {
        !options && (options = {});

        this.controls = {};
        this.onChange = options.onChange || function () { };
        this.onApply = options.onApply || function () { };

        this.parse(VIEW.el);

        var elApplyButtons = document.querySelectorAll('.buttons .apply');
        for (var i = 0, len = elApplyButtons.length; i < len; i++) {
          elApplyButtons[i].addEventListener('click', this.onApplyClick.bind(this));
        }
      },

      onApplyClick: function onApplyClick() {
        this.onApply();
      },

      get: function get(id) {
        return this.controls[id];
      },

      parse: function parse(el) {
        for (var selector in this.TYPES) {
          var elements = el.querySelectorAll(selector);
          for (var i = 0, len = elements.length; i < len; i++) {
            this.createController(this.TYPES[selector], elements[i]);
          }
        }
      },

      createController: function createController(type, el) {
        var controlName = el.dataset.name;

        if (this.controls[controlName]) {
          this.controls[controlName].update(el);
          return;
        }

        this.controls[controlName] = new window['Control_' + type + '_Bots']({
          'el': el,
          'onChange': this.onControllerChange.bind(this)
        });

        el.dataset.hasControl = true;
        el.control = this.controls[controlName];

        if (el.dataset.group) {
          if (!this.groupData[el.dataset.group]) {
            this.groupData[el.dataset.group] = {};
          }

          this.groupData[el.dataset.group][controlName] = this.controls[controlName].value;
          this.controlGroups[controlName] = el.dataset.group;
        }
      },

      onControllerChange: function onControllerChange(controller, oldValue) {
        var controlName = controller.name,
          group = this.controlGroups[controlName];

        if (group) {
          this.groupData[group][controlName] = controller.value;
          this.onChange(group, this.groupData[group], controlName);
        } else {
          this.onChange(controlName, controller.value, oldValue);
        }
      },

      updateControl: function updateControl(name, value, shouldSendEvents) {
        var group = this.groupData[name],
          control = this.controls[name];

        if (group) {
          var controls = HUDManager.unseralize(value);

          for (var controlName in controls) {
            group[controlName] = controls[controlName];
            this.updateControl(controlName, controls[controlName]);
          }
        }

        if (control) {
          if (control instanceof window.Control_Range_Bots) {
            if (!control.dontConvert && value <= 1) {
              value = Math.round(value * 100);
            }
          }

          control.set(value, shouldSendEvents);
        }
      },

      addValueToControl: function addValueToControl(controlName, key, value) {
        var control = this.controls[controlName];
        if (control) {
          control.add(key, value);
        }
      },

      values: function getValues() {
        var values = {};

        for (var name in this.controls) {
          values[name] = this.controls[name].value;
        }

        return values;
      }
    };

    return new Controls();
  }());

  /* Controller wrappers - logic, UI, and onChange events */

  window.Control_Range_Bots = (function () {
    function Range(options) {
      this.el;
      this.elValue;
      this.onChange;
      this.name;
      this.value;
      this.dontConvert;

      this.init(options);
    }

    Range.prototype = {
      init: function init(options) {
        this.el = options.el;
        this.name = this.el.dataset.name;
        this.value = this.el.value;
        this.onChange = options.onChange || function () { };
        this.dontConvert = this.el.dataset.dontConvert === 'true';

        var elParent = this.el.parentNode;
        this.elValue = elParent.querySelector('.range-value');

        this.el.addEventListener('input', this.updateValue.bind(this));
        this.el.addEventListener('mousedown', this.onMouseDown.bind(this));

        console.info('[Control|Range|' + this.name + '] Create', this.el);
      },

      updateValue: function updateValue() {
        var oldValue = this.value;

        this.set(this.el.value);

        this.onChange(this, oldValue);
      },

      set: function set(value) {
        if (!this.dontConvert && value < 1) {
          value = Math.round(value * 100);
        }

        if (this.value === value / 100) {
          return;
        }

        this.el.value = value;
        this.value = this.dontConvert ? value : value / 100;

        if (this.elValue) {
          this.elValue.innerHTML = value;
        }
      },

      add: function add() {
        // not relevant to controller
      },

      onMouseDown: function onMouseDown() {
        var name = this.name;

        utils.dispatch('InputRangeStart', name);

        window.addEventListener('mouseup', function onMouseUp() {
          window.removeEventListener('mouseup', onMouseUp);

          utils.dispatch('InputRangeEnd', name);
        });
      },

      update: function update() { }
    };

    return Range;
  }());

  window.Control_Toggler_Bots = (function () {
    function Toggler(options) {
      this.el;
      this.elValue;
      this.elValues;

      this.currentIndex;
      this.onChange;
      this.name;
      this.value;

      this.isOpen = false;
      this.values = [];

      this.TIME_BEFORE_HIDING = 250;
      this.timeoutClose;

      this.init(options);
    }

    Toggler.prototype = {
      init: function init(options) {
        this.el = options.el;
        this.name = this.el.dataset.name;
        this.onChange = options.onChange || function () { };

        var initIndex = 0,
          html = this.el.innerHTML;

        for (var i = 0, len = this.el.children.length, el; i < len; i++) {
          el = this.el.children[i];

          this.add(el.dataset.value, el.innerHTML);

          if (el.dataset.value === this.el.dataset.value) {
            initIndex = i;
          }
        }

        this.el.innerHTML = '<b class="uipaging prev"></b>' +
          '<b class="value"></b>' +
          '<div class="values">' + html + '</div>' +
          '<b class="uipaging next"></b>';

        this.elValue = this.el.querySelector('.value');
        this.elValues = this.el.querySelector('.values');

        this._onMouseLeave = this.onMouseLeave.bind(this);
        this._onMouseEnter = this.onMouseEnter.bind(this);
        utils.onClick(this.el, this.onClick.bind(this));

        this.select(initIndex, true);

        console.info('[Control|Toggler|' + this.name + '] Create', this.el);
      },

      onClick: function onClick(e) {
        var elClicked = e.target;
        var classList = elClicked.classList;

        if (classList.contains('prev')) {
          this.prev();
        } else if (classList.contains('next')) {
          this.next();
        } else {
          if (this.isOpen) {
            if ('value' in elClicked.dataset) {
              this.set(elClicked.dataset.value, true);
              this.close();
            }
          } else {
            this.open();
          }
        }
      },

      open: function open() {
        this.isOpen = true;
        this.el.classList.add('open');
        this.el.parentNode.classList.add('open');
        this.el.parentNode.parentNode.classList.add('open');

        this.elValues.addEventListener('mouseleave', this._onMouseLeave);
      },

      close: function close() {
        this.elValues.removeEventListener('mouseleave', this._onMouseLeave);
        this.isOpen = false;
        this.el.classList.remove('open');
        this.el.parentNode.classList.remove('open');
        this.el.parentNode.parentNode.classList.remove('open');
      },

      onMouseEnter: function onMouseEnter() {
        this.elValues.removeEventListener('mouseenter', this._onMouseEnter);
        window.clearTimeout(this.timeoutClose);
      },

      onMouseLeave: function onMouseLeave() {
        this.elValues.addEventListener('mouseenter', this._onMouseEnter);
        this.timeoutClose = window.setTimeout(this.close.bind(this), this.TIME_BEFORE_HIDING);
      },

      set: function set(value, shouldSendEvents) {
        value = this.getValue(value);

        if (this.value === value) {
          return;
        }

        for (var i = 0, len = this.values.length; i < len; i++) {
          var localValue = this.getValue(this.values[i].key);

          if (localValue === value) {
            this.select(i, !shouldSendEvents);
            return;
          }
        }
      },

      getValue: function getValue(value) {
        if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        }

        return value;
      },

      select: function select(index, isFirstInit) {
        if (this.currentIndex === index && this.value) {
          return;
        }

        if (index >= this.values.length) {
          index = 0;
        } else if (index < 0) {
          index = this.values.length - 1;
        }

        var oldValue = this.value;

        this.currentIndex = index;

        var newValue = this.values[index];
        if (newValue) {
          this.value = newValue.key;
          this.elValue.innerHTML = newValue.value;
        }

        var elCurrent = this.elValues.querySelector('.selected'),
          elNew = this.elValues.querySelector('[data-value = "' + (newValue && newValue.key) + '"]');

        if (elCurrent) {
          elCurrent.classList.remove('selected');
        }
        if (elNew) {
          elNew.classList.add('selected');
        }

        if (!isFirstInit) {
          this.onChange(this, oldValue);
        }
      },

      prev: function prev() {
        this.select(this.currentIndex - 1);
      },

      next: function next() {
        this.select(this.currentIndex + 1);
      },

      add: function add(key, value) {
        this.values.push({
          'key': key,
          'value': value
        });

        if (this.elValues) {
          var elValue = document.createElement('div');
          elValue.dataset.value = key;
          elValue.innerHTML = value;
          this.elValues.appendChild(elValue);
        }
      },

      update: function update() { }
    };

    return Toggler;
  }());

  window.Control_KeyBinder_Bots = (function () {
    function KeyBinderControl(options) {
      this.el;
      this.currentIndex;
      this.onChange;
      this.name;
      this.value;

      this.init(options);
    }

    KeyBinderControl.prototype = {
      init: function init(options) {
        this.update(options.el);

        this.onChange = options.onChange || function () { };

        console.info('[Control|KeyBinder|' + this.name + '] Create:', this.el);
      },

      onClick: function onClick() {
        if (VIEW.el) {
          VIEW.el.classList.add('binding-key');
        }
        if (this.el.parentNode) {
          this.el.parentNode.classList.add('binding-key');
        }

        this.el.classList.add('active');
        this.el.innerHTML = utils.l10n.get('PressAnyKey');

        keyControlBeingBound = this;
        this.originalKey = this.value;

        engine.call('StartKeyBind', this.name);
      },

      set: function set(key) {
        this.el.dataset.hasKey = !!key;
        this.el.classList.remove('active');
        this.value = key;
        this.el.innerHTML = key || EMPTY_KEY_MESSAGE;

        if (this.el.parentNode) {
          this.el.parentNode.classList.remove('binding-key');
        }
        if (VIEW.el) {
          VIEW.el.classList.remove('binding-key');
        }
      },

      reset: function reset() {
        this.set(this.originalKey);
      },

      add: function add() {
        // not relevant to controller
      },

      update: function update(el) {
        this.el = el;
        this.name = this.el.dataset.name;
        this.value = this.el.innerHTML;

        utils.onClick(this.el, this.onClick.bind(this));
      }
    };

    return KeyBinderControl;
  }());

  utils.l10n.whenReady(init);
}());
