var ModeSelector = (function ModeSelector() {

  const MODES = {
    CONQUEST: 'conquest',
    CONQUEST_CHARON: 'conquestcharon',
    CONQUEST_XMAS: 'conquestxmas',
    CONQUEST3V3: 'conquest3v3',
    FRONTLINE: 'frontline',
    HORDE: 'horde',
    DISCOVERY: 'discovery',
    RIFT: 'rift',
    PAYLOAD: 'payload',
    ARKAIN: 'arkain',
    INFECTION: 'infection',
    EYE_ASSAULT: 'eyeassault'
  };

  function ModeSelector(options) {
    this.el = null;
    this.previousMode = null;
    this.onSelect = null;
    this.elModeList = null;
    this.elModesDescriptions = null;
    this.previousVote = [];

    this.init(options);
  }

  ModeSelector.prototype.init = function init(options) {
    this.onSelect = options.onSelect || function () {};

    this.createHTML();

    engine.on("SetModeList", this.onSetModeList.bind(this));

    if (options.elContainer) {
      options.elContainer.appendChild(this.el);
    }
  };

  ModeSelector.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.className = 'selector-mode';

    this.el.addEventListener('click', this.onClick.bind(this));
  };

  ModeSelector.prototype.onSetModeList = function onSetModeList(modes) {
    let modesHTML = '';

    for (let i = 0; i < modes.length; i++) {
      let mode = modes[i];
      let l10n = '';

      switch(mode.Name.toLowerCase()) {
        case MODES.EYE_ASSAULT:
          l10n = 'Eye Assault';
          break;
        case MODES.CONQUEST_XMAS:
          l10n = 'conquestxmas';
          break;
        case MODES.CONQUEST_CHARON:
          l10n = 'conquestcharon';
          break;
        case MODES.CONQUEST:
          l10n = utils.l10n.get('GameModeConquestLabel');
          break;
        case MODES.CONQUEST3V3:
          l10n = utils.l10n.get('GameModeConquest3v3Label');
          break;
        case MODES.FRONTLINE:
          l10n = utils.l10n.get('GameModeFrontlineLabel');
          break;
        case MODES.HORDE:
          l10n = utils.l10n.get('GameModeLastStandGameMode');
          break;
        case MODES.DISCOVERY:
          l10n = utils.l10n.get('GameModeDiscoveryGameMode');
          break;
        case MODES.RIFT:
          l10n = utils.l10n.get('DraftingVIPGameModeName');
          break;
        case MODES.PAYLOAD:
          l10n = utils.l10n.get('DraftingPayloadGameModeName');
          break;
        case MODES.ARKAIN:
          l10n = utils.l10n.get('DraftingArkainGameModeName');
          break;
        case MODES.INFECTION:
          l10n = utils.l10n.get('DraftingInfectionGameModeName');
          break;
        default:
          l10n = '[NSLOCTEXT] GAME MODE NAME MISSING';
          break;
      }

      modesHTML += this.TEMPLATE_MODE(mode.Name, mode.Id, l10n, DataStore.getRewardBonusStatus(mode.Name, 'drafting'));
    }

    this.el.innerHTML = `<ul>${modesHTML}</ul>`;
    utils.l10n.whenReady(function () {
      utils.l10n.load(this.el);
    }.bind(this));
    this.elModeList = this.el.querySelectorAll('.mode');
    this.elModesDescriptions = this.el.querySelectorAll('.mode-description');
  };

  ModeSelector.prototype.TEMPLATE_MODE = function templateBuilder(name, id, l10n, rewardBonusObj) {
    let modeName = name.toLowerCase();
    let imagePath = modeName === MODES.EYE_ASSAULT ? null : modeName === MODES.FRONTLINE
      ? './views/gamemodes/images/medium/solo-frontline.png'
      : modeName === MODES.HORDE
        ? './views/gamemodes/images/medium/last-stand.png'
        : './drafting/modes/' + ((modeName === MODES.CONQUEST3V3 || modeName === MODES.CONQUEST_CHARON || modeName === MODES.CONQUEST_XMAS) ? MODES.CONQUEST : modeName) + '.png';
    return `<li class="mode" data-id="${id}">
              <div class="mode-bonus-reward" data-bonus-active="${rewardBonusObj.active}" data-bonus-type="${rewardBonusObj.type}" data-tooltip="${rewardBonusObj.tooltip}" data-tooltip-align="above center">
                <span>x${rewardBonusObj.bonus}</span>
                <div class="mode-bonus-bdr"></div>
              </div>
              <div class="mode-description" style="background-image: ${imagePath ? `url(${imagePath})` : 'none'};">
                <div class="mode-name">
                  <label>${l10n}</label>
                  <div class="votes">
                    <span class="number-of-votes">0</span>
                    <div class="checkbox"></div>
                  </div>
                </div>                
              </div>
            </li>`;
  };

  ModeSelector.prototype.onClick = function onClick(e) {
    this.elSelected = e.target.classList.contains('vote-button') ? e.target.parentElement : e.target;

    if (this.elSelected) {
      let elId = this.elSelected.dataset.id;
      if (elId) {
        let modeId = parseInt(elId);
        this.onSelect(modeId);
      }
    }
  };

  ModeSelector.prototype.ClearVotes = function ClearVotes() {
    if (this.elModeList) {
      for (let i = 0; i < this.elModeList.length; ++i) {
        var elMode = this.elModeList[i];
        elMode.classList.remove('selected');
        elMode.querySelector('.number-of-votes').innerHTML = 0;
      }
    }
  };

  ModeSelector.prototype.AddVotes = function AddVotes(modes, localPlayer) {
    // Reset all votes
    this.ClearVotes();

    for (var i = 0; i < modes.length; i++) {
      let elMode = this.elModeList[i];
      if (modes[i] > 0) {
        elMode.querySelector('.number-of-votes').textContent = modes[i];

        if (localPlayer && localPlayer.ModeId === i) {
          elMode.classList.add('selected');
          this.previousMode = elMode;

          utils.resizeFontToFit(elMode.querySelector(elMode.classList.contains('selected') ? '.voted' : '.vote'));
        }
      }
    }

  };

  ModeSelector.prototype.updateModes = function updateModes(players) {
    let modes = [];
    let localPlayerIndex = -1;
    let isUpdated = false;
    let localPrevMode = -1;

    if (this.previousMode) {
      localPrevMode = parseInt(this.previousMode.dataset.id);
    }

    // Set each index in the modes array to 0 for however many
    // modes we have to vote against
    if (this.elModeList) {
      this.elModeList.forEach(() => {
        modes.push(0);
      });
    }

    // Loop through each player, checking for local player
    // and checking their mode ID and incrementing the vote
    // for that made
    players.forEach((player, index) => {
      if (player.IsLocalPlayer) localPlayerIndex = index;
      if (player.ModeId > -1) modes[player.ModeId]++;
    });

    // Check if this.previousVote contains anything
    if (this.previousVote.length) {
      if (localPrevMode !== players[localPlayerIndex].ModeId) {
        isUpdated = true;
      } else {
        // Loop through previous votes and check to see
        // if any of the votes have changed
        for (let i = 0; i < this.previousVote.length; i++) {
          if (this.previousVote[i] !== modes[i]) {
            this.previousVote = modes;
            isUpdated = true;
            break;
          }
        }
      }

    }
    // If this.previousVote is empty, set modes to 
    // be the previous votes and use that as our starting basis
    else if (modes.length) {
      this.previousVote = modes;
      isUpdated = true;
    }

    // If the modes have been updated, print the votes to the
    // DOM. Also checking to see if localPlayerIndex is set.
    // Won't be set for spectators
    if (isUpdated) {
      if (localPlayerIndex > -1) {
        this.AddVotes(modes, players[localPlayerIndex]);
      } else {
        this.AddVotes(modes, false);
      }
    }
  };

  ModeSelector.prototype.hide = function hide() {
    if (this.isVisible) {
      AudioPlayer.play('UI_ScreenTransition');
      this.isVisible = false;
      this.el.classList.remove('visible');
    }
  };

  ModeSelector.prototype.show = function show() {
    if (!this.isVisible) {
      AudioPlayer.play('UI_ScreenTransition');
      this.isVisible = true;
      this.el.classList.add('visible');
    }
  };

  return ModeSelector;
})();
