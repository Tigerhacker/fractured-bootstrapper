var elContainer;
var elTimers;
var elStages = [];
var currentMatchTime;
var scoreboard;

var draftingState = -1;
var shipSelector;
var shipSelected;

var banInfo = null;

var banSelector;
var banShipVoted;
var elShipBanView = null;

var shipOverview = null;
var shipLoadout = null;

var draftingContainerTitles = {};
var stageLabels = {};
var elStagesLabels = {};
var elStagesLines = {};
var elReadyButton;

var elPickingPhaseLabels = [];
var numberOfPlayers = 0;

var elDraftingContainerLabel;
var elDraftingContainer;
var modeSelector;
var sectorSelector;

var elFTUEMask = null;
var ftueLastClass = '';

var isChatWidgetInitialised = false;
var elChatBox = null;

var isUsingHardLock = false;
var IsFirstPhase = true;

var windowWidth;
var windowHeight;
var IsSpectator = false;

var TEMPLATE_HORDE_LORE = '<div class="horde-lore">' +
                            '<div class="warning">' +
                              '<span class="title" data-l10n="DraftingHordeWarningTitle"></span>' +
                              '<span class="sub-title" data-l10n="DraftingHordeWarningSubTitle"></span>' +
                            '</div>' +
                            '<div class="lore-container">' +
                              '<div class="lore-fluff top"></div>' +
                              '<div class="lore-fluff bottom"></div>' +
                              '<div class="lore-content" data-l10n="DraftingHordeLoreContent"></div>' +
                            '</div>' +
                          '</div>';

var DRAFTING_STAGES = {
  WaitingforUsers : 0,
  BalancingTeams: 1,
  ModeSelection: 2,
  ModeDisplay: 3,
  SectorSelection: 4,
  ShipBans: 5,
  ShipSelection: 6,
  PickSelection1: 7,
  PickSelection2: 8,
  PickSelection3: 9,
  ShipOverview: 10,
  Completed: 11
};

function init() {
  if (!!/game=false/.test(window.location.href)) {
    document.body.classList.add('not-game');
    engine._BindingsReady = true;
  }

  elContainer = document.querySelector('#container');  

  DataStore.init();
  Player.init();
  Tooltip.init();
  CrewDB.init();
  Drafting.init();
  Navigation.init({
    'elContainer': elContainer,
    'noHeader': true,
    'noFooter': true
  });

  elTimers = document.querySelectorAll('.countdown label:not(.bottom)');

  elTimersContainers = document.querySelectorAll('.timer');
  elReadyButton = document.querySelector('#ready-button');

  // Storing the drafting containers into variables
  elDraftingContainer = document.querySelector(".drafting-tab");
  elDraftingContainerLabel = elDraftingContainer.querySelector("label");
  elStages = document.querySelector(".stages");
  elChatBox = document.querySelector('.box');
  elStagesInfo = document.querySelectorAll(".stage-info label");
  elPickingPhaseLabels = document.querySelectorAll(".phase");
  elFTUEMask = document.querySelector("#ftue-mask");

  draftingContainerTitles = {
    0: "RDraftingStepConnecting",
    1: "RDraftingStepBalancing",
    2: "RDraftingStepMode",
    3: "RDraftingStepMode",
    4: "RDraftingStepSector",
    5: "RDraftingStepBan",
    6: "SelectShip",
    7: "RDraftingStepPhase1ShipSelection",
    8: "RDraftingStepPhase2ShipSelection",
    9: "RDraftingStepPhase3ShipSelection",
    10: "RDraftingStepLoadout"
  };

  stageLabels = {
    0: "",
    1: "",
    2: 'VoteMode',
    3: 'VoteMode',
    4: 'VoteSector',
    5: 'ShipBans',
    6: 'SelectShip',
    7: 'SelectShip',
    8: 'SelectShip',
    9: 'SelectShip',
    10: 'CustomiseShip',
    11: 'Completed'
  };

  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  UpdateResolution();
  
  console.info('BindingsReady=' + engine._BindingsReady);

  setStageList([2, 6, 10]);

  elReadyButton.addEventListener('click', this.OnReadyButtonClicked.bind(this));
  
  scoreboard = new Scoreboard({
    'elContainer': elContainer,
  });

  var elSelectorContainer = document.querySelector('#selector');
  elShipBanView = elSelectorContainer.querySelector('.selector .ship-ban');

  modeSelector = new ModeSelector({
    'elContainer': elSelectorContainer,
    'onSelect': onGameModeSelected
  });

  sectorSelector = new SectorSelector({
    'elContainer': elSelectorContainer,
    'onSelect': onSectorSelected
  });

  banSelector = new ShipSelector({
    'elContainer': elSelectorContainer,
    'selectorClass': 'selector-ban',
    'onSelect': onBanShipSelected,
    'displayAllShips' : true
  });

  banInfo = new BanInfo({
    'elContainer': elSelectorContainer
  });

  shipSelector = new ShipSelector({
    'elContainer': elSelectorContainer,
    'selectorClass': 'selector-ship',
    'onSelect': onPlayerShipSelected
  });

  shipOverview = new Overview({
    'elContainer': elSelectorContainer
  });

  shipLoadout = new Loadout({
    'elContainer': elSelectorContainer
  });

  setDraftingState(DRAFTING_STAGES.WaitingforUsers);
  
  engine.on('SetHUDData', setHUDData);
  engine.on('SetStageList', setStageList);
  engine.on('SetDraftingGameModeName', setDraftingGameModeName);
  engine.on('SetDraftingState', setDraftingState);
  engine.on('DraftingSetIsUsingHardLock', setIsUsingHardLock);
  engine.on('SetPlayerTeam', onSetPlayerTeam);

  engine.on('SectorSelectedConfirmation', onSectorSelectedConfirmation);
  engine.on('BanShipSelectedConfirmation', onBanShipSelectedConfirmation);
  engine.on('PlayerShipSelectedConfirmation', onPlayerShipSelectedConfirmation);

  engine.on('SetAlphaSector', onSetAlphaSector);
  engine.on('SetBetaSector', onSetBetaSector);

  engine.on('SetShipBanViewActive', onSetShipBanViewActive);
  engine.on('SetShipOverviewActive', onSetShipOverviewActive);

  engine.on('SetBanedShips', onSetBannedShips);
  engine.on('ShipBanVoteEnded', onShipBanVoteEnded);

  engine.on('OnUpdatePlayerFtueCompleted', onUpdatePlayerFtueCompleted);
  engine.on('OnUpdateIsSinglePlayerServer', onUpdateIsSinglePlayerServer);
  engine.on('OpenPurchaseShipDialog', onOpenPurchaseShipDialog);
  engine.on('OpenPurchasePartDialog', onOpenPurchasePartDialog);
  engine.on('OpenPurchaseConsumableDialog', onOpenPurchaseConsumableDialog);
  engine.on('OnPurchaseShipCurrentlySelected', onPurchaseShipCurrentlySelected);
  engine.on('OnPurchasePartCurrentlySelected', onPurchasePartCurrentlySelected);
  engine.on('OnPurchaseConsumableCurrentlySelected', onPurchaseConsumableCurrentlySelected);
  engine.on('OnPurchaseSkinCurrentlySelected', onPurchaseSkinCurrentlySelected);
  engine.on('OnSetPlayerPicking', onSetPlayerPicking);
  engine.on('OnSimulateReadyButtonClick', OnReadyButtonClicked);
  engine.on('OnSetReadyButtonEnabled', OnSetReadyButtonEnabled);
  engine.on('OnSetReadyButtonLocked', OnSetReadyButtonLocked);
  engine.on('SetFogActive', setFogActive);

  engine.on('OnFTUEHighlight', OnFTUEHighlight);

  utils.on('DraftingChangeOverviewVisibility', onSetShipOverviewActive);

  if (engine._BindingsReady) {
    onEngineReady();
  } else {
    console.info('Ready bound.');
    engine.on('Ready', onEngineReady);
  }

  utils.l10n.whenReady(l10nReady);
}

function l10nReady() {
  utils.l10n.load(document.body);
}

function onEngineReady() {
  console.info('onEngineReady called.');

  engine.on('InitDataSent', function () {
	  console.info('InitDataSent received!');
	
	  //Only now tell the other side that we're ready for bindings
    engine.call('CallFromJSBindingReady', '1', 'drafting');
    console.info('CallFromJSBindingReady called.');

    // Browser Testing
    if (/game=false/.test(window.location.href)) {
      DataStore.whenReady(() => {
        engine.call('GetTranslations', 'FrontEnd', Object.keys(Config.l10n['FrontEnd']));
        // engine.trigger('SetDraftingGameModeName', 'infection');
        engine.trigger('SetDraftingState', 2);
        engine.trigger('SetModeList', [
          {
            "__Type":"DraftingSubGameModeUI",
            "Id":0,
            "Name":"conquest"
          },
          {
            "__Type":"DraftingSubGameModeUI",
            "Id":1,
            "Name":"discovery"
          },
          {
            "__Type":"DraftingSubGameModeUI",
            "Id":2,
            "Name":"rift"
          },
          {
            "__Type":"DraftingSubGameModeUI",
            "Id":3,
            "Name":"payload"
          },
          {
            "__Type":"DraftingSubGameModeUI",
            "Id":4,
            "Name":"payload"
          },
          {
            "__Type":"DraftingSubGameModeUI",
            "Id":5,
            "Name":"arkain"
          }
        ], 10);
      });
    }
  });

  console.info('Calling ReadyForData...');
  engine.call('ReadyForData');
}

function onUpdateIsSinglePlayerServer(singlePlayer) {
  Player.IsSpServer = singlePlayer;
}

function onUpdatePlayerFtueCompleted(completed) {
  Player.FtueStage = completed ? DataStore.FTUE_STAGES.DONE : DataStore.FTUE_STAGES.FIRST_TIME;
}

function onSetPlayerTeam(teamId) {
  Player.teamId = teamId;

  shipOverview.UpdateSectorsByPlayerTeam(teamId);
}

function OnSetReadyButtonEnabled(isEnabled) {
  if (!isEnabled) {
    this.elReadyButton.classList.add('disabled');
  } else {
    this.elReadyButton.classList.remove('disabled');
  }
}

function OnSetReadyButtonLocked(isLocked) {
  if (isLocked) {
    this.elReadyButton.classList.add('locked');
  } else {
    this.elReadyButton.classList.remove('locked');
  }
}

function OnReadyButtonClicked() {
  if (!this.elReadyButton.classList.contains('locked') && !this.elReadyButton.classList.contains('disabled')){
    this.elReadyButton.classList.add('locked');
    AudioPlayer.play(AudioPlayer.DraftingReadyUp);
    engine.call('OnReadyButtonClicked', draftingState);
  }
}

function OnFTUEHighlight(hint, duration, delay) {
    if (elFTUEMask) {

    function showHintUI(hint, duration) {
      if (ftueLastClass) {
        elFTUEMask.classList.remove(ftueLastClass);
      }
          
      elFTUEMask.classList.add(hint);
      ftueLastClass = hint;

      elFTUEMask.classList.remove('fade-out');
      elFTUEMask.classList.add('fade-in');

      setTimeout(function() {
        elFTUEMask.classList.remove('fade-in');
        elFTUEMask.classList.add('fade-out');
      }, duration);
    }

    if (delay > 0.0) {
      setTimeout(function() {
        showHintUI(hint, duration);
      }, delay);
    } else {
      showHintUI(hint, duration);
    }
  }
}

function onSetPlayerPicking(begin, end) {
  var tmpState = draftingState;
  if (begin >= 0) {
    tmpState = DRAFTING_STAGES.PickSelection1 + (begin / 2);
  }

  // change the title
  if (elDraftingContainerLabel && draftingContainerTitles) {
    elDraftingContainerLabel.innerHTML = utils.l10n.get(draftingContainerTitles[tmpState]);
  }

  if (scoreboard) {
    scoreboard.SetPlayerPicking(begin, end);

    if (begin != -1 && end != -1) {
      for (var i = 0; i < 3; ++i) {
        elPickingPhaseLabels[i].classList.remove('hidden');

        if (i == begin / 2) {
          elPickingPhaseLabels[i].classList.add('active');
        } else {
          elPickingPhaseLabels[i].classList.remove('active');
        }
      }
    } else {
      for (var i = 0; i < 3; ++i) {
              elPickingPhaseLabels[i].classList.add('hidden');
      }
    }

    if ( draftingState >= DRAFTING_STAGES.ShipOverview ) {
      scoreboard.SetDraftingSelectionComplete();
    }
  }

  // audio queue for stage changed
  if (!IsFirstPhase) {
    AudioPlayer.play(AudioPlayer.DraftingPhaseEnd);
  } else {
    IsFirstPhase = false;
  }
}

function UpdateResolution() {
  var widthRatio = windowWidth / 1920;
  var heightRatio = windowHeight / 1080;

  var leftOffset = (windowWidth - 1920) / 2;
  var topOffset = (windowHeight - 1080) / 2;

  elContainer.style.transform = "scale(" + widthRatio + ", " + heightRatio + ")";
  elContainer.style.left = leftOffset + "px";
  elContainer.style.top = topOffset + "px";
}

function setFogActive() {
  var elFog = elContainer.querySelector('.controls .fog');
  if (elFog) {
    elFog.classList.remove('hidden');
  }
}

function setDraftingGameModeName(gameMode) {
  document.body.dataset.gamemode = gameMode;
  window.gameMode = gameMode;

  switch(gameMode) {
    case 'conquestcharon':
    case 'conquestxmas':
      var eventName = gameMode;
      setHeaderGameModeName(eventName, true);
      shipOverview.SetGameModeName(eventName);
      AudioPlayer.playVO(AudioPlayer.DraftingConquestGameMode);
      return;
    case 'eyeassault':
      setHeaderGameModeName('Eye Assault', true);
      shipOverview.SetGameModeName('Eye Assault');
      return;
    case Config.GAME_MODE_IDS.CONQUEST:
    case Config.GAME_MODE_IDS.CONQUEST3v3:
      setHeaderGameModeName(gameMode);
      shipOverview.SetGameModeName('conquest');
      AudioPlayer.playVO(AudioPlayer.DraftingConquestGameMode);
      return;
    case Config.GAME_MODE_IDS.FRONTLINE:
      setHeaderGameModeName(gameMode);
      AudioPlayer.playVO(AudioPlayer.DraftingFrontlineGameMode);
      return;
    case Config.GAME_MODE_IDS.LAST_STAND:
    case Config.GAME_MODE_IDS.HORDE:
      setHeaderGameModeName(utils.l10n.get('GameModeLastStandGameMode'));
      shipOverview.SetGameModeName(utils.l10n.get('GameModeLastStandGameMode'));
      buildHordeLore();
      AudioPlayer.playVO(AudioPlayer.DraftingHordeGameMode);
      return;
    case Config.GAME_MODE_IDS.DISCOVERY:
      setHeaderGameModeName(utils.l10n.get('GameModeDiscoveryGameMode'));
      shipOverview.SetMainSectorImage(gameMode);
      shipOverview.SetGameModeName(utils.l10n.get('GameModeDiscoveryGameMode'));
      return;
    case Config.GAME_MODE_IDS.RIFT:
      setHeaderGameModeName(utils.l10n.get('DraftingVIPGameModeName'), true);
      shipOverview.SetMainSectorImage(gameMode);
      shipOverview.SetGameModeName(utils.l10n.get('DraftingVIPGameModeName'));
      return;
    case Config.GAME_MODE_IDS.CATALYST:
      setHeaderGameModeName(utils.l10n.get('DraftingPayloadGameModeName'), true);
      shipOverview.SetMainSectorImage(gameMode);
      shipOverview.SetGameModeName(utils.l10n.get('DraftingPayloadGameModeName'));
      return;
    case Config.GAME_MODE_IDS.ARKAIN:
      setHeaderGameModeName(utils.l10n.get('DraftingArkainGameModeName'), true);
      shipOverview.SetMainSectorImage(gameMode);
      shipOverview.SetGameModeName(utils.l10n.get('DraftingArkainGameModeName'));
      return;
    case Config.GAME_MODE_IDS.INFECTION:
      setHeaderGameModeName(utils.l10n.get('DraftingInfectionGameModeName'), true);
      shipOverview.SetMainSectorImage(gameMode);
      shipOverview.SetGameModeName(utils.l10n.get('DraftingInfectionGameModeName'));
      return;
    default:
      setHeaderGameModeName(gameMode);
      shipOverview.SetGameModeName(gameMode);
      shipOverview.SetMainSectorImage(gameMode);
      return;
  }

}

function setHeaderGameModeName(name, titleOnly) {
  if (titleOnly) {
    elContainer.querySelector('#game-mode-name').textContent = name;
  } else {
    elContainer.querySelector('#game-mode-name').textContent = utils.l10n.get('GameModeName').format({ 'gameMode': name });
  }
}

function setStageList(stages){
  this.elStages.innerHTML = '';
  var stagesHTML = '<ul>';

  for (var i in stages){
    var stageId = stages[i];
    let stageName = '';
    if (stageId === 11) {
      stageName = utils.l10n.get('GenericLabelCompleted');
    } else {
      stageName = utils.l10n.get(stageLabels[stageId]);
    }
    var stageLabel = stageLabels[stageId] != '' ? stageName.toUpperCase() : '';
    stagesHTML += '<li class="stage-' + (stageId + 1) + '">' + stageLabel + '</li>';
    
    if (i < stages.length - 1){
      stagesHTML += '<span class="line stage-' + (stageId + 1) + '"></span>';
    }
  }

  stagesHTML += '</ul>';
  this.elStages.innerHTML = stagesHTML;

  for (var i in stages){
    var stageId = stages[i];
    elStagesLabels[stageId] = this.elStages.querySelector('.stage-'+ (stageId));
    elStagesLines[stageId] = this.elStages.querySelector('.line.stage-'+ (stageId));
  }
}

function setIsUsingHardLock(hardLock) {
  isUsingHardLock = hardLock || false;
}

function setDraftingState(state) {
  if (state > DRAFTING_STAGES.Completed)
    return;

  if (state > DRAFTING_STAGES.ShipOverview)
    state = DRAFTING_STAGES.WaitingforUsers;

  if (!this.localPlayer) {
    this.localPlayer = {};
  }

  // reset always to overview
  this.localPlayer.InOverview = false;

  //enable the button
  //this.elReadyButton.classList.add('disabled');
  this.elReadyButton.classList.remove('locked');

  if (!isChatWidgetInitialised) {
      createChatWidget();
  }

  elDraftingContainer.classList.remove('drafting-' + draftingState);

  if (draftingState != DRAFTING_STAGES.WaitingforUsers){
    for (var key in elStagesLabels){
      if (key <= state){
        if (elStagesLabels[key])
          elStagesLabels[key].classList.add('completed');

        if (elStagesLines[key])
          elStagesLines[key].classList.add('completed');
      } else {
        if (elStagesLabels[key])
          elStagesLabels[key].classList.remove('completed');

        if (elStagesLines[key])
          elStagesLines[key].classList.remove('completed');
      }  
    }
  }

  if (state == DRAFTING_STAGES.BalancingTeams) {
    this.elReadyButton.classList.add('disabled');
  } else {
    this.elReadyButton.classList.remove('disabled');
    this.elReadyButton.classList.remove('hidden');
  }

   if (state == DRAFTING_STAGES.ShipSelection){
      shipOverview.SetPlayerOverview(this.localPlayer);
   }

  if ((this.localPlayer && !this.localPlayer.InOverview) || !IsSpectator) {
    shipOverview.hide();

    if (state == DRAFTING_STAGES.ModeSelection || state == DRAFTING_STAGES.ModeDisplay){
      modeSelector.show();
    } else {
      modeSelector.hide();
    }

    if (state == DRAFTING_STAGES.SectorSelection){
      sectorSelector.show();
    } else {
      sectorSelector.hide();
    }

    if (state == DRAFTING_STAGES.ShipBans){
      banSelector.show();
    } else {
      banSelector.hide();
    }

    var shipSelectionVisible = false;
    var displayLoadout = false;

    if (state == DRAFTING_STAGES.ShipSelection){
      shipSelector.show();
      shipOverview.SetButtonText('GenericSelection', 'DraftingTooltipSelectionButton');
      elReadyButton.dataset.tooltip = utils.l10n.get('DraftingTooltipReadyButtonPick');
    } else {
      shipSelector.hide();
    }

    if (state == DRAFTING_STAGES.ShipOverview){
      Navigation.hide(Navigation.VIEWS.UNLOCK);

      var ship = this.shipSelected || '54D0DFA14E57170E5CA88AA0B89AF409'; // default to pioneer
      shipLoadout.SetSelectedShip(ship);

      shipLoadout.show();
      shipOverview.SetButtonText('GenericSelection', 'DraftingTooltipLoadoutButton');
      elReadyButton.dataset.tooltip = utils.l10n.get('DraftingTooltipReadyButtonLoadout');
    } else {
      shipLoadout.hide();
    }
  }

  if (state == DRAFTING_STAGES.ShipBans){
    banInfo.BeginVote();
  }

  if (state == DRAFTING_STAGES.BalancingTeams) {
    shipOverview.show(true);
    this.elReadyButton.classList.add('hidden');
  }

  draftingState = state;
  elDraftingContainer.classList.add('drafting-' + draftingState);
}

function startDrafting() {
  DataStore.isInDrafting = true;
  document.body.classList.add('in-drafting');
}

function createChatWidget(){
  isChatWidgetInitialised = true;
  var chatTemplate = '<span class="chat-user-name">{{name}}:</span>' +
                         '{{message}}';

  new Widget({
    'name': 'Chat',
    'elContainer': elChatBox,
    'template': chatTemplate,
    'onReady': function onChatReady() {
      chat.setSwitchTeamEnabled(false);
      
      window.addEventListener('keydown', function onKeyDown(e) {
        if (!chat.isFocused && e.keyCode === 13) {
          chat.setMode(true);
          chat.preventMessage = true;
        }
      });
    }
  });
}

var Drafting = {
  init: function init(){
  }
};

// mode selection
function onGameModeSelected(modeId) {
  engine.call("OnDraftingModeSelected", modeId);
}

// sector selection
function onSectorSelected(sectorId){
  engine.call("OnDraftingSectorSelected", sectorId);
}

function onSectorSelectedConfirmation(sectorId){
  this.elReadyButton.classList.remove('disabled');
}

// ban Section
function onBanShipSelected(shipId) {
  engine.call("OnDraftingBanShipSelected", shipId);
}

function onBanShipSelectedConfirmation(shipId) {
  banShipVoted = shipId;
  this.banSelector.selectShip(shipId);
  this.elReadyButton.classList.remove('disabled');
}

// ship Selection
function onPlayerShipSelected(shipId, shipOwned) {
  var selectedShip = DataStore.getShip(shipId);
  if (selectedShip && selectedShip.eyeAssaultOnly && !DataStore.isEyeAssaultDraft()) return;
  engine.call("OnDraftingShipSelected", shipId, shipOwned);
}

function onPlayerShipSelectedConfirmation(shipId) {
  this.shipSelected = shipId;
  this.shipSelector.selectShip(shipId);
  this.shipLoadout.SetSelectedShip(this.shipSelected);

  if (!this.elReadyButton.classList.contains('disabled')) {
    this.elReadyButton.classList.remove('locked');
  }
}

function SetPlayerShipSelectionActive(isActive){
  this.shipSelector.SetActive(isActive);
  
  if (isActive){
    this.elReadyButton.classList.remove('disabled');
  } else {
    this.elReadyButton.classList.add('disabled');
  }
}

function onSetAlphaSector(sectorName, sectorId){
  this.banInfo.SetAlphaSectorName(sectorName);
  shipOverview.SetAlphaSector(sectorName, sectorId);
}

function onSetBetaSector(sectorName, sectorId){
  this.banInfo.SetBetaSectorName(sectorName);
  shipOverview.SetBetaSector(sectorName, sectorId);
}

function onSetShipBanViewActive(isActive){
  if (isActive){
    this.elShipBanView.classList.add('visible');
    this.banInfo.BeginVote();
  } else {
    this.elShipBanView.classList.remove('visible');
    this.banInfo.EndVote();
  }
}

function onSetBannedShips(shipGuids){
  this.banInfo.SetBannedShips(shipGuids);
  this.shipSelector.UpdateBanList(shipGuids);
}

function onPurchaseShipCurrentlySelected() {
  if (this.draftingState == DRAFTING_STAGES.ShipSelection) {
    this.shipSelector.OnPurchaseShipCurrentlySelected();
  }
}

function onPurchasePartCurrentlySelected() {
  this.shipLoadout.OnPurchasePartCurrentlySelected();
}

function onPurchaseConsumableCurrentlySelected() {
  this.shipLoadout.OnPurchaseConsumableCurrentlySelected();
}

function onPurchaseSkinCurrentlySelected() {
  this.shipLoadout.OnPurchaseSkinCurrentlySelected();
}

function onShipBanVoteStarted(){
  this.banInfo.BeginVote();
}

function onShipBanVoteEnded(){
  this.banInfo.EndVote();
}

function onOpenPurchaseShipDialog(shipId) {
  this.shipSelector.OpenPurchaseShipDialog(shipId);
}

function onOpenPurchasePartDialog(partId) {
  this.shipLoadout.OpenPurchasePartDialog(partId);
}

function onOpenPurchaseConsumableDialog(consumableId) {
  this.shipLoadout.OpenPurchaseConsumableDialog(consumableId);
}

function onSectorVoteEnded(){
}

function buildHordeLore() {
  var teamContainer = document.querySelector('.teams');

  var div = document.createElement('div');
  div.innerHTML = TEMPLATE_HORDE_LORE;
  div = div.firstChild;

  teamContainer.appendChild(div);
  utils.l10n.load(div);

  utils.resizeFontToFit(document.body.querySelector('.horde-lore .warning .title'));
  utils.resizeFontToFit(document.body.querySelector('.horde-lore .warning .sub-title'));
}

function onSetShipOverviewActive(isActive){
  if (localPlayer && localPlayer.InOverview) {
    // force the overview to be always visible if the player is in overview
    isActive = localPlayer.InOverview;
  }

  // force the view if the player is not registered as local player
  if (IsSpectator && !isActive) {
    return;
  }

  if (isActive){
    shipOverview.show();

    switch (draftingState){
      case DRAFTING_STAGES.ShipSelection:
        shipSelector.hide();
        break;
        
      case DRAFTING_STAGES.ShipBans:
        banSelector.hide();
        break;

      case DRAFTING_STAGES.ModeSelection:
      case DRAFTING_STAGES.ModeDisplay:
        ModeSelector.hide();
        break;

      case DRAFTING_STAGES.SectorSelection:
        sectorSelector.hide();
        break;

      case DRAFTING_STAGES.ShipOverview:
        shipLoadout.hide();
    }

  } else {
    shipOverview.hide();

    switch (draftingState){
      case DRAFTING_STAGES.ShipSelection:
        shipSelector.show();
        break;

      case DRAFTING_STAGES.ShipBans:
        banSelector.show();
        break;

      case DRAFTING_STAGES.ModeSelection:
      case DRAFTING_STAGES.ModeDisplay:
        ModeSelector.show();
        break;

      case DRAFTING_STAGES.SectorSelection:
        sectorSelector.show();
        break;

      case DRAFTING_STAGES.ShipOverview:
        shipLoadout.show();
    }
  }
}

// hud data update
function setHUDData(data) {
  var updateWindow = windowWidth != window.innerWidth || windowHeight != window.innerHeight;
  if (updateWindow) {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;

    UpdateResolution();
  }

  if (data.Players) {
    var teamCount = 0;
    for (var i = 0; i < data.Players.length; ++i){
      if (data.Players[i].IsLocalPlayer){
        if (this.localPlayer) {
          if (this.localPlayer.ShipGUID != data.Players[i].ShipGUID) {
            AudioPlayer.play(AudioPlayer.DraftingSelectShip);
            onPlayerShipSelectedConfirmation(data.Players[i].ShipGUID);
          }

          if (data.PreviewSkin != this.localPreviewSkin) {
            this.localPreviewSkin = data.PreviewSkin;
            var bSkinOwned = data.Skins[i] == this.localPreviewSkin;
            AudioPlayer.play(AudioPlayer.DraftingSelectSkin);
            shipLoadout.UpdateSkinImageByGUID(this.localPreviewSkin, bSkinOwned);
          }

          if (this.localPlayer.Ban != data.Bans[i]) {
            AudioPlayer.play(AudioPlayer.DraftingSelectShipBan);
            onBanShipSelectedConfirmation(data.Bans[i]);
          }
        }

        this.localPlayer = data.Players[i];
        if (data.Consumable !== this.localPlayer.Consumable) {
          this.localPlayer.Consumable = data.Consumable;
          if (shipLoadout.ready) {
            shipLoadout.UpdateConsumable(data.Consumable);
          }
        }
        this.localPlayer.InOverview = data.InOverview ? data.InOverview : false;
        this.localPlayer.teamPositionIndex = teamCount;
      }

      data.Players[i].SkinGUID = data.Skins ? data.Skins[i] : "";
      data.Players[i].Crew = data.Crews[i] ? data.Crews[i] : ""; 
      data.Players[i].SectorId = data.Sectors[i] >= 0 ? data.Sectors[i] : -1;
      data.Players[i].ModeId = data.Modes[i] >= 0 ? data.Modes[i] : -1;
      data.Players[i].Ban = data.Bans[i] ? data.Bans[i] : "";
      data.Players[i].IsReady = data.IsReady ? data.IsReady[i] : false;

      if (data.Players[i].FactionRelationship == 1) {
        teamCount++;
      }
    }

    if (this.localPlayer.InOverview != data.InOverview) {
      this.localPlayer.InOverview = data.InOverview;
      onSetShipOverviewActive(data.InOverview);
    }
  }

  // if no local player is found, the player is a spectator

  var lastIsSpectator = IsSpectator;
  IsSpectator = this.localPlayer ? false : true;
  
  if (IsSpectator != lastIsSpectator) {
    onSetShipOverviewActive(IsSpectator);
    
    if (IsSpectator) {
      this.elReadyButton.classList.add('hidden');
    } else {
      this.elReadyButton.classList.remove('hidden');
    }
  }

  scoreboard.updatePlayers(data.Players);
  if (data.Players && numberOfPlayers !== data.Players.length) {
    numberOfPlayers = data.Players.length;

    if (elPickingPhaseLabels && elPickingPhaseLabels.length == 3) {
      if (scoreboard.playersPerTeam && scoreboard.playersPerTeam[1] && scoreboard.playersPerTeam[1].players) {
        var alliedPlayersCount = Object.keys(scoreboard.playersPerTeam[1].players).length || 0;
        var numPlayerPicking = 2;

        for (var i = 0; i < 3; ++i) {
          var pickingBeginRange = i * numPlayerPicking;
          var pickingEndRange = (i + 1) * numPlayerPicking;
          
          var isStageActive = alliedPlayersCount > pickingBeginRange;
          var isReduced = isStageActive && alliedPlayersCount < pickingEndRange;

          if (isStageActive) {
            elPickingPhaseLabels[i].classList.remove('inactive');

            if (isReduced) {
              elPickingPhaseLabels[i].classList.add('reduced');
            } else {
              elPickingPhaseLabels[i].classList.remove('reduced');
            }
          } else {
            elPickingPhaseLabels[i].classList.add('inactive');
          }
        }
      }
    }
  }

  var timersCount = elTimers.length;
  for (var i = 0; i < timersCount; ++i) {
    elTimers[i].textContent = data.Timer || 0;
  }

  if (this.allyStageInfo !== data.AllyStageInfo) {
    this.allyStageInfo = data.AllyStageInfo;
    this.allySubStageInfo = data.AllySubStageInfo;

    this.elStagesInfo[0].textContent = this.allyStageInfo;

    if (this.allyStageInfo === "") {
      this.elTimersContainers[0].classList.add("hidden");
    }
    else {
      this.elTimersContainers[0].classList.remove("hidden");
    }
  }

  if (draftingState == DRAFTING_STAGES.SectorSelection) {
    sectorSelector.updateSectors(data.Players);
  }

  if (draftingState == DRAFTING_STAGES.ModeSelection || 
    draftingState == DRAFTING_STAGES.ModeDisplay) {
    modeSelector.updateModes(data.Players);
  }

  if (draftingState == DRAFTING_STAGES.ShipBans || draftingState == DRAFTING_STAGES.ShipBansCompleted) {
    banInfo.UpdateBanVotes(data.Players);
  }

  if (draftingState == DRAFTING_STAGES.ShipOverview) {
    shipLoadout.Update(data.Players);
  }
}

window.addEventListener('load', init);
