(function GameModes() {

  const GAME_MODE_NAMES = {
    ARKAIN: Config.GAME_MODE_IDS.ARKAIN,
    COOP_VS_AI: Config.GAME_MODE_IDS.COOP_VS_AI,
    FTUE: Config.GAME_MODE_IDS.FTUE,
    INFECTION: Config.GAME_MODE_IDS.INFECTION,
    LAST_STAND: Config.GAME_MODE_IDS.HORDE,
    LEGACY_EPISODES: Config.GAME_MODE_IDS.LEGACY,
    PAYLOAD: Config.GAME_MODE_IDS.PAYLOAD,
    SOLO_VS_AI_CATALYST: Config.GAME_MODE_IDS.SOLO_VS_AI_CATALYST,
    SOLO_VS_AI_CONQUEST: Config.GAME_MODE_IDS.SOLO_VS_AI_CONQUEST,
    SOLO_VS_AI_DISCOVERY: Config.GAME_MODE_IDS.SOLO_VS_AI_DISCOVERY,
    SOLO_VS_AI_FRONTLINE: Config.GAME_MODE_IDS.SOLO_VS_AI_FRONTLINE,
    SOLO_VS_AI_HORDE: Config.GAME_MODE_IDS.SOLO_VS_AI_HORDE,
    SOLO_VS_AI_RIFT: Config.GAME_MODE_IDS.SOLO_VS_AI_RIFT,
    SOLO_VS_AI_ARKAIN: Config.GAME_MODE_IDS.SOLO_VS_AI_ARKAIN,
    THE_RIFT: Config.GAME_MODE_IDS.RIFT,

    COOP_PANEL: 'Coop',
    DISCOVERY: 'discovery',
    DISCOVERY_COOP: 'discoveryCoop',
    DISCOVERY_PANEL: 'Discovery',
    DISCOVERY_PVP: 'discoveryPvP',
    FIRING_RANGE: 'firingRange',
    FRACTURED_SPACE: 'fracturedSpace',
    LAST_STAND_PANEL: 'LastStand',
    PVP_PANEL: 'pvp',
    SOLO_PANEL: 'Training',
    THE_RIFT_COOP: 'riftCoop',
  };

  var VIEW = Navigation.VIEWS.GAME_MODES;
  var STAGE_ID = ["stage-one", "stage-two", "stage-three"];

  var modeSelection;

  function init() {
    modeSelection = new ModeSelection({ el: VIEW.el });

    Navigation.onHide(VIEW, modeSelection.reset.bind(modeSelection));

    utils.on('GameModeUnlocked', onGameModeUnlocked);
  }

  function onGameModeUnlocked() {
    modeSelection.buildConfig();
    modeSelection.reset();
  }

  var ModeSelection = (function () {

    var TEMPLATE = VIEW.el.querySelector('#gamemode-template').innerHTML;

    function ModeSelection(options) {
      this.options = options || {};
      this.gameModeConfig;

      this.el = this.options.el;
      this.elBackButton = this.el.querySelector('.back');

      this.stages = [];
      this.modes = [];

      this.currentStage;
      this.prevStage;

      this.modeType;
      this.prevModeType;

      this.id = Math.ceil(Math.random() * 10000);

      this.buildConfig();
    }

    ModeSelection.prototype.buildConfig = function buildConfig() {
      this.currentStage = 0;
      this.prevStage = 0;
      this.modeType = false;

      this.gameModeConfig = this.gameModeConfig || new GameModeConfig();
      this.gameModeConfig.update();
      
      //Create stage display
      var elGameModeContainers = this.el.querySelectorAll('.gamemode-container');

      // Reset stages each time we get the new Game Mode Config
      this.stages = [];

      for (var i = 0; i < elGameModeContainers.length; i++) {
        this.stages[i] = new Stage({
          el: elGameModeContainers[i],
          stage: i,
          stageId: STAGE_ID[i],
          config: this.gameModeConfig,
          modeSelect: this.modeSelect.bind(this)
        });
      }

      //Clone back button to remove previous listeners
      var elTmp = this.elBackButton,
        elClone = elTmp.cloneNode(true);
      elTmp.parentNode.replaceChild(elClone, elTmp);
      this.elBackButton = elClone;

      this.elBackButton.addEventListener('click', this.backButtonEvent.bind(this), false);

      this.reset();

      utils.on('BattleButtonClicked', this.onBattleButtonClicked.bind(this));
    };

    ModeSelection.prototype.onBattleButtonClicked = function onBattleButtonClicked() {
      if (this.currentStage) {
        this.backButtonEvent();
      }
    };

    ModeSelection.prototype.reset = function reset() {
      this.updateView(0);
      this.resetFlow();
    };

    ModeSelection.prototype.backButtonEvent = function backButtonEvent(event) {
      event && event.stopImmediatePropagation();

      this.modeType = this.prevModeType || false;
      this.prevModeType = null;
      
      this.updateView(this.currentStage - 1);
    };

    ModeSelection.prototype.modeSelect = function modeSelect(stageId, stageName, modeId) {
      var modeConfig = this.gameModeConfig.getConfig(stageName)[modeId];
      
      if (!modeConfig.IsLocked) {

        this.prevModeType = this.modeType;
        this.modeType = modeConfig.Id;
        this.sendAnalytics(this.modeType);
        
        AudioPlayer.play(AudioPlayer.GameModeSelectorPanelClick);
        
        switch(this.modeType) {
          case GAME_MODE_NAMES.SOLO_PANEL:
		  case GAME_MODE_NAMES.COOP_PANEL:
		     this.stageTwoView(this.modeType);
            break;
          case GAME_MODE_NAMES.LAST_STAND_PANEL:
            this.lobbySelection('horde');
            break;
          case GAME_MODE_NAMES.DISCOVERY_PANEL:
            this.stageTwoView(this.modeType);
            break;
          case GAME_MODE_NAMES.DISCOVERY_PVP:
          case GAME_MODE_NAMES.DISCOVERY_COOP:
            this.lobbySelection(this.modeType);
            break;
          case GAME_MODE_NAMES.FIRING_RANGE:
            utils.loadFiringRange(function(){
              VIEW.el.classList.add("no-input");
            }.bind(this));
            break;
          case GAME_MODE_NAMES.FTUE:
            VIEW.el.classList.add("no-input");
            AudioPlayer.play(AudioPlayer.Header_Play);
            utils.preventAudioEvents();
            engine.call('LaunchFTUE', 1);
            break;
          case GAME_MODE_NAMES.SOLO_VS_AI_CONQUEST:
            this.showConquestTutorialPopup('soloVsAiConquest');
            break;
		  case GAME_MODE_NAMES.SOLO_VS_AI_FRONTLINE:            
			utils.preventAudioEvents();
			VIEW.el.classList.add("no-input");
			engine.call('LaunchProvingGroundsFrontline');
			break;
          case GAME_MODE_NAMES.COOP_VS_AI:
          case GAME_MODE_NAMES.FRACTURED_SPACE:
          case GAME_MODE_NAMES.THE_RIFT:
          case GAME_MODE_NAMES.THE_RIFT_COOP:
          case GAME_MODE_NAMES.PAYLOAD:
          case GAME_MODE_NAMES.ARKAIN:
          case GAME_MODE_NAMES.INFECTION:
          case GAME_MODE_NAMES.SOLO_PANEL:
            this.lobbySelection(this.modeType);
            break;
          case GAME_MODE_NAMES.LEGACY_EPISODES:
            this.stageThreeView(this.modeType);
          case GAME_MODE_NAMES.SOLO_VS_AI_CATALYST:
          case GAME_MODE_NAMES.SOLO_VS_AI_ARKAIN:
          case GAME_MODE_NAMES.SOLO_VS_AI_DISCOVERY:
          case GAME_MODE_NAMES.SOLO_VS_AI_HORDE:
          case GAME_MODE_NAMES.SOLO_VS_AI_RIFT:
            this.loadLegacyEpisodes(this.modeType);
          default:
            break;
        }
      }
    };

    ModeSelection.prototype.stageTwoView = function stageTwoView() {
      this.stages[1].setMode(this.modeType);
      this.updateView(1);
    };

    ModeSelection.prototype.stageThreeView = function stageThreeView() {
      this.stages[2].setMode(this.modeType);
      this.updateView(2);
    };

    ModeSelection.prototype.lobbySelection = function lobbySelection(modeType) {
      Navigation.show('hangar');

      Navigation.show(Navigation.VIEWS.START_GAME, function () {
        switch(modeType) 
{
          case GAME_MODE_NAMES.DISCOVERY_PVP:
            utils.dispatch('SetSubModeConfigParam', Config.GAME_MODE_IDS.DISCOVERY);
            utils.dispatch('SelectLobby', GAME_MODE_NAMES.FRACTURED_SPACE);
            break;
          case GAME_MODE_NAMES.DISCOVERY_COOP:
            utils.dispatch('SetSubModeConfigParam', Config.GAME_MODE_IDS.DISCOVERY);
            utils.dispatch('SelectLobby', GAME_MODE_NAMES.COOP_VS_AI);
           break;
          case GAME_MODE_NAMES.THE_RIFT_COOP:
            utils.dispatch('SetSubModeConfigParam', Config.GAME_MODE_IDS.THE_RIFT);
            utils.dispatch('SelectLobby', GAME_MODE_NAMES.COOP_VS_AI);
            break;
          case GAME_MODE_NAMES.PAYLOAD: //Thaumic - hijack multiplayer payload for frontline
            //utils.dispatch('SetSubModeConfigParam', Config.GAME_MODE_IDS.PAYLOAD);
            //utils.dispatch('SelectLobby', GAME_MODE_NAMES.COOP_VS_AI);
			utils.preventAudioEvents();
			VIEW.el.classList.add("no-input");
			engine.call('LaunchProvingGroundsFrontline');
            break;
          case GAME_MODE_NAMES.ARKAIN:
            utils.dispatch('SetSubModeConfigParam', Config.GAME_MODE_IDS.ARKAIN);
            utils.dispatch('SelectLobby', GAME_MODE_NAMES.COOP_VS_AI);
            break;
          case GAME_MODE_NAMES.INFECTION:
            utils.dispatch('SetSubModeConfigParam', Config.GAME_MODE_IDS.INFECTION);
            utils.dispatch('SelectLobby', GAME_MODE_NAMES.COOP_VS_AI);
            break;
          case GAME_MODE_NAMES.COOP_VS_AI:
            utils.dispatch('SetSubModeConfigParam', Config.GAME_MODE_IDS.CONQUEST);
            utils.dispatch('SelectLobby', GAME_MODE_NAMES.COOP_VS_AI);
            break;
          default:
            utils.dispatch('SelectLobby', modeType);
            break;
        }
      }.bind(this));

    };

    ModeSelection.prototype.loadLegacyEpisodes = function loadLegacyEpisodes(id) {
      if (id) {
        let svaId;

        switch(id) {

          case GAME_MODE_NAMES.SOLO_VS_AI_HORDE:
            svaId = GAME_MODE_NAMES.LAST_STAND;
            break;
		  case GAME_MODE_NAMES.SOLO_VS_AI_DISCOVERY:
            svaId = GAME_MODE_NAMES.DISCOVERY;
            break;
          case GAME_MODE_NAMES.SOLO_VS_AI_RIFT:
            svaId = GAME_MODE_NAMES.THE_RIFT;
            break;
		  case GAME_MODE_NAMES.SOLO_VS_AI_CATALYST:
            svaId = GAME_MODE_NAMES.PAYLOAD;
            break;
          case GAME_MODE_NAMES.SOLO_VS_AI_ARKAIN:
            svaId = GAME_MODE_NAMES.ARKAIN;
            break;
          default:
            svaId = '';
            break;
        }

        if (svaId) {
          engine.call('LaunchTutorialByID', svaId);
        }
      }
    };

    ModeSelection.prototype.updateView = function updateView(newStage) {
      for (var i = 0; i < this.stages.length; i++) {
        if (i === newStage) {
          this.stages[i].show(newStage, this.currentStage);
          this.resizeTitles(this.stages[i].el);
        }
        else if (i === this.currentStage) {
          this.stages[i].hide(newStage, this.currentStage);
        }
      }

      this.elBackButton.dataset.stage = STAGE_ID[newStage];

      this.prevStage = this.currentStage;
      this.currentStage = newStage;
    };

    ModeSelection.prototype.resetFlow = function resetFlow() {
      this.modeType = false;

      this.stages.forEach((obj, index) => {
        if (index === 0) {
          obj.el.classList.remove('slide-left');
          obj.el.classList.remove('slide-right');
          obj.el.classList.add('active');
        } else {
          obj.el.classList.add('slide-right');
          obj.el.classList.remove('slide-left');
          obj.el.classList.remove('active');       
        }
      });
    };

    ModeSelection.prototype.sendAnalytics = function sendAnalytics(modeType) {

      utils.reportEvent(Config.ANALYTICS.GAMEMODES_CHANGE_VIEW, {
        'uiEventType': 'GameModeNavigation',
        'newPage': modeType
      });

    };

    ModeSelection.prototype.showConquestTutorialPopup = function showConquestTutorialPopup(gamemode) {
      if (Player.hasOwnProperty('hasPlayedConquest') && !Player.hasPlayedConquest) {
        this.createConquestTutorialPopup(gamemode);
      } else if (gamemode === 'fracturedSpace') {
        this.lobbySelection(gamemode);
      } else if (gamemode === 'soloVsAiConquest') {
        this.loadSVAConquest();
      }
    };

    ModeSelection.prototype.createConquestTutorialPopup = function createConquestTutorialPopup(gamemode) {
      var cto = document.createElement('div');
      cto.id = 'conquest-tutorial-overlay';
      cto.innerHTML = VIEW.el.querySelector('#conquest-tutorial-template').innerHTML;

      // Bind Events
      cto.querySelector('.buttons').addEventListener('click', this.onCTOButtonClick.bind(this, cto, gamemode), false);
      cto.addEventListener('webkitTransitionEnd', this.onCTOTransitionEnd.bind(this, cto), false);

      document.body.appendChild(cto);

      setTimeout(function() {
        cto.classList.add('active');
      }, 20);
    };

    ModeSelection.prototype.onCTOButtonClick = function onCTOButtonClick(overlay, gamemode, e) {
      if (!e.target.classList.contains('button')) {
        return;
      }

      overlay.classList.remove('active');

      switch(e.target.id) {
        case 'video':
          this.showConquestVideo(gamemode);
          break;
        case 'tutorial':          
          AudioPlayer.play(AudioPlayer.Header_Play);
          utils.preventAudioEvents();
          VIEW.el.classList.add("no-input");
          engine.call('LaunchConquestTutorial');
          break;
        case 'skip':
          Player.hasPlayedConquest = true;
          this.showConquestTutorialPopup(gamemode);
          break;
        default:
          return;
      }
    };

    ModeSelection.prototype.showConquestVideo = function showConquestVideo(gamemode) {
      utils.on('ViewHidden', function onViewHidden(gamemode, data) {
        var viewId = data.view.id;

        if (viewId === Navigation.VIEWS.VIDEO_PLAYER.id) {
          if (gamemode === 'fracturedSpace') {
            this.lobbySelection(gamemode);
          } else if (gamemode === 'soloVsAiConquest') {
            this.loadSVAConquest();
          }
        }
      }.bind(this, gamemode));

      Navigation.show(Navigation.VIEWS.VIDEO_PLAYER, function onShow() {
        utils.dispatch('ShowVideo', 'CONQUEST');
      });
    };

    ModeSelection.prototype.loadSVAConquest = function loadSVAConquest() {
      AudioPlayer.play(AudioPlayer.Header_Play);
      utils.preventAudioEvents();
      VIEW.el.classList.add("no-input");
      engine.call('LaunchProvingGroundsConquest');
    };

    ModeSelection.prototype.onCTOTransitionEnd = function onCTOTransitionEnd(overlay) {
      if (!overlay.classList.contains('active')) {
        overlay.parentNode.removeChild(overlay);
      }
    };

    ModeSelection.prototype.resizeTitles = function resizeTitles(el) {
      let titles = el.querySelectorAll('.gamemode-name span');
      if (titles) {

        for(let i = 0; i < titles.length; i++) {
          let title = titles[i];
          if (title && !title.style.fontSize) {
            utils.resizeFontToFit(title);
          }
        }
      }
    };

    var Stage = (function () {

      function Stage(options) {
        this.el = options.el;
        this.stageNum = options.stage;
        this.stageId = options.stageId;

        this.modeSelect = options.modeSelect;

        this.modeType;

        this.modes = [];

        this.stageType = "";

        this.config = options.config;
        this.modeData;

        this.content = "";

        this.init();

      }

      Stage.prototype.init = function init() {
        this.createHTML();
      };

      Stage.prototype.setMode = function setMode(type) {
        this.modeType = type;
        this.update(this.modeType);

        this.el.dataset.gameMode = this.modeType;
      };

      Stage.prototype.update = function update(type) {
        this.stageType = "-" + type;

        this.createHTML();
      };

      Stage.prototype.show = function show(newStage, currentStage) {
        if (newStage > currentStage) {
          this.el.classList.add('slide-left');
          this.el.classList.remove("slide-right");
        } else if (newStage < currentStage) {
          this.el.classList.add("slide-right");
          this.el.classList.remove('slide-left');
        }
        this.el.classList.add("active");
      };

      Stage.prototype.hide = function hide(newStage, currentStage) {
        if ((newStage > currentStage) || newStage === undefined && currentStage === undefined) {
          this.el.classList.add('slide-left');
          this.el.classList.remove("slide-right");
        } else if (newStage < currentStage) {
          this.el.classList.add("slide-right");
          this.el.classList.remove('slide-left');
        }
        this.el.classList.remove("active");
      };

      Stage.prototype.createHTML = function createHTML() {
        this.modeData = this.config && this.config.getConfig(this.stageId + this.stageType);

        if (this.stageId === "stage-one") {
          if (DataStore.isQuickPlayCoopEnabled) {
            //GameModesTCorPQuickplay
            this.el.dataset.l10nHeader = "GameModeSelectTCorPQuickplay";
          }
          else {
            this.el.dataset.l10nHeader = "GameModeSelectTCorP";
          }
        }

        this.el.innerHTML = "";
        this.modes = [];

        if (this.modeData) {
          this.content = '';

          for (var i = 0; this.modeData.length > i; i++) {
            let content = this.buildContent(this.modeData[i]);
            this.modes.push(new StageOption({
              id: i,
              elContainer: this.el,
              content: content,
              onclick: this.optionClicked.bind(this)
            }));
          }

          this.el.dataset.panels = this.modeData.length;

          utils.l10n.load(this.el);
        }
      };

      Stage.prototype.buildContent = function buildContent(modeData) {
        modeData.rewardBonus = DataStore.getRewardBonusStatus(modeData.Id, 'gameModeScreen');
        
        return TEMPLATE.format(modeData, false);
      };

      Stage.prototype.optionClicked = function optionClicked(modeId) {
        if (this.modeData[modeId]) {
          if ('FTUEFlow' in window && FTUEFlow.isVisible && FTUEFlow.stage === 1) {
            engine.call('tutorialLevelupCompleted', modeId === 0 ? 'solo' : modeId === 1 ? 'co-op' : 'pvp');
          }
          this.modeSelect && this.modeSelect(this.stageNum, this.stageId + this.stageType, modeId);
        }
      };

      Stage.prototype.getModeEl = function getModeEl(modeId) {
        return this.modes[modeId].elButton;
      };

      var StageOption = (function () {

        function StageOption(options) {
          this.elContainer = options.elContainer;

          this.el;

          this.id = options.id;
          this.onclick = options.onclick;

          this.init(options.content);
        }

        StageOption.prototype.init = function init(content) {
          this.el = document.createElement("div");
          this.el.innerHTML = content;

          this.el = this.el.firstElementChild;

          this.elContainer.appendChild(this.el);

          this.el.addEventListener("click", this.clicked.bind(this));
        };

        StageOption.prototype.clicked = function clicked(event) {
          event.stopImmediatePropagation();
          event.preventDefault();
          
          this.onclick && this.onclick(this.id);
        };

        return StageOption;

      })();

      return Stage;

    })();

    return ModeSelection;
  })();

  utils.l10n.whenReady(init);
})();
