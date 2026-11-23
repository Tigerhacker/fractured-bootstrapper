var GameModeConfig = (function () {

  const LEGACY_EPISODE_PACK_IDS = {
    HORDE: '71B893A608574E83A464AC3E42080149',
    DISCOVERY: '388BED7A573646BBBDDF331C3419B8EF',
    RIFT: '62244A4AA9B5447F90EACE97CA1E10B5',
    CATALYST: '74F96315716C4F46975F8247AB0EB8B5',
    ARKAIN: '6AB7EF24EB0E42FCB5AB7E35136A073E'
  };
  
  var panels = {
    'lastStand': {
      'Id': 'LastStand',
      'Name': 'GameModeLastStandGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/last-stand.png',
      'Description': 'GameModeLastStandBadgeDescription',
      'RecommendedStatus': Player.Rank.Rank < 5,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'discovery': {
      'Id': 'Discovery',
      'Name': 'GameModeDiscoveryGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/discovery.png',
      'Description': 'GameModeDiscoveryBadgeDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'solo': {
      'Id': 'Training',
      'Name': 'GameModeTrainingGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/solo.png',
      'Description': 'GameModeTrainingBadgeDescription',
      'RecommendedStatus': 'FTUEFlow' in window && FTUEFlow.isVisible && FTUEFlow.step === 'CHOOSE_GAME_MODE',
      'IsLocked': false,
      'headerL10n': 'GameModeSoloGameMode',
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'coop': {
      'Id': 'Coop',
      'Name': 'GameModeCoopGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/quickplay.png',
      'Description': 'GameModeCoopBadgeDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'headerL10n': 'GameModeCoopHeader',
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'pvp': {
      'Id': 'fracturedSpace',
      'Name': 'Online',
      'Image': 'views/gamemodes/images/{{Folder}}/pvp.png',
      'Description': 'GameModePVPBadgeDescription',
      'RecommendedStatus': Player.Rank.Rank > 4,
      'IsLocked': false,
      'headerL10n': 'GameModePVPHeader',
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'svaConquest': {
      'Id': 'soloVsAiConquest',
      'RecommendedStatus': false,
      'IsLocked': false,
      'Image': 'views/gamemodes/images/{{Folder}}/solo-conquest.png',
      'Description': 'GameModeSoloConquestDescription',
      'Name': 'GameModeSoloConquestTitle',
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'ftue': {
      'Id': 'ftue',
      'RecommendedStatus': false,
      'IsLocked': false,
      'HasCompleted': true,
      'Image': 'views/gamemodes/images/{{Folder}}/tutorial.png',
      'Description': 'GameModeTutorialDescription',
      'Name': 'GameModeTutorialTitle',
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'firingRange': {
      'Id': 'firingRange',
      'RecommendedStatus': false,
      'IsLocked': 'FTUEFlow' in window && FTUEFlow.state < 2,
      'Image': 'views/gamemodes/images/{{Folder}}/firing-range.png',
      'Description': 'GameModeFiringRangeDescription',
      'Name': 'GameModeFiringRangeTitle',
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'coopvsai': {
      'Id': 'coopVsAi',
      'Name': 'GameModeCoopConquestName',
      'Image': 'views/gamemodes/images/{{Folder}}/quickplay.png',
      'Description': 'GameModeCoopBadgeDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'fracturedSpace': {
      'Id': 'fracturedSpace',
      'Name': 'GameModeConquestLabel',
      'Image': 'views/gamemodes/images/{{Folder}}/pvp.png',
      'Description': 'GameModeConquestBadgeDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'discoveryPvP': {
      'Id': 'discoveryPvP',
      'Name': 'GameModeDiscoveryPvPGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/discovery.png',
      'Description': 'GameModeDiscoveryBadgePvPDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'discoveryCoop': {
      'Id': 'discoveryCoop',
      'Name': 'GameModeDiscoveryCoopGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/discovery-coop.png',
      'Description': 'GameModeDiscoveryBadgeCoopDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'rift': {
      'Id': 'riftCoop',
      'Name': 'GameModeVIPGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/vip.png',
      'Description': 'GameModeVIPDescription',
      'RecommendedStatus': true,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'riftCoop': {
      'Id': 'riftCoop',
      'Name': 'GameModeVIPCoopGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/vip.png',
      'Description': 'GameModeVIPDescription',
      'RecommendedStatus': true,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'payload': {
      'Id': 'payload',
      'Name': 'GameModePayloadCoopGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/payload.png',
      'Description': 'GameModePayloadDescription',
      'RecommendedStatus': true,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    },
    'arkain': {
      'Id': 'arkain',
      'Name': 'GameModeArkainCoopGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/arkain.png',
      'Name': 'GameModeArkainCoopGameMode',
      'Description': 'GameModeArkainDescription',
      'RecommendedStatus': true,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': true,
      'IsLegacy': false
    },
    'infection': {
      'Id': 'infection',
      'Name': 'GameModeInfectionCoopGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/infection.png',
      'Name': 'GameModeInfectionCoopGameMode',
      'Description': 'GameModeInfectionDescription',
      'RecommendedStatus': true,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': true,
      'IsLegacy': false
    },
    'legacy': {
      'Id': 'legacy',
      'Name': 'GameModeLegacyGameMode',
      'Image': 'views/gamemodes/images/{{Folder}}/legacy.png',
      'Description': 'GameModeLegacyDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'headerL10n': 'GameModeLegacyGameMode',
      'IsLegacy': false
    },
    'svaHorde': {
      'Id': 'svaHorde',
      'Name': 'GameModeLastStandGameModeSolo',
      'Image': 'views/gamemodes/images/{{Folder}}/last-stand.png',
      'Description': 'GameModeLegacyLastStandBadgeDescription',
      'RecommendedStatus': false,
      'IsLocked': true,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': true
    },
    'svaDiscovery': {
      'Id': 'svaDiscovery',
      'Name': 'GameModeDiscoveryGameModeSolo',
      'Image': 'views/gamemodes/images/{{Folder}}/discovery.png',
      'Description': 'GameModeDiscoveryBadgeDescription',
      'RecommendedStatus': false,
      'IsLocked': true,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': true
    },
    'svaRift': {
      'Id': 'svaRift',
      'Name': 'GameModeVIPGameModeSolo',
      'Image': 'views/gamemodes/images/{{Folder}}/vip.png',
      'Description': 'GameModeVIPDescription',
      'RecommendedStatus': false,
      'IsLocked': true,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': true
    },
    'svaPayload': {
      'Id': 'svaPayload',
      'Name': 'GameModePayloadGameModeSolo',
      'Image': 'views/gamemodes/images/{{Folder}}/payload.png',
      'Description': 'GameModePayloadDescription',
      'RecommendedStatus': false,
      'IsLocked': true,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': true
    },
    'svaArkain': {
      'Id': 'svaArkain',
      'Name': 'GameModeArkainGameModeSolo',
      'Image': 'views/gamemodes/images/{{Folder}}/arkain.png',
      'Description': 'GameModeArkainDescription',
      'RecommendedStatus': false,
      'IsLocked': true,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': true
    },
    // Solo vs AI Frontline (from ThaumicTheory's PR #2). The stock gamemodes-script.js
    // already handles Config.GAME_MODE_IDS.SOLO_VS_AI_FRONTLINE in modeSelect by calling
    // engine.call('LaunchProvingGroundsFrontline'); the game just never listed a panel for it.
    'svaFrontline': {
      'Id': 'soloVsAiFrontline',
      'Name': 'GameModeFrontlineLabel',
      'Image': 'views/gamemodes/images/{{Folder}}/solo-frontline.png',
      'Description': 'GameModeSoloFrontlineDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': false,
      'IsNew': false,
      'IsLegacy': false
    }
  };

  // The bootstrapper writes views/gamemodes/bootstrapper-launch.json before each launch and
  // removes it when the game exits: {"offline": false}, or for an offline launch
  // {"offline": true, "check": "http://127.0.0.1:<port>/bootstrapper/launch-check", "nonce": "..."}.
  // Offline only counts if that check URL (the bootstrapper's local emulator) is up and answers
  // with the same nonce, so a file left behind by a crash or hard reboot can't block online play.
  // Every failure (no file, bad JSON, emulator down, wrong nonce, timeout) keeps the stock list.
  // Async requests only: a <script> that fails to load would stall the whole view (Load.js only
  // waits for 'load').
  const LAUNCH_FLAG_URL = 'views/gamemodes/bootstrapper-launch.json';

  // Strings the bootstrapper added to nsloctext.js. The UI asks the engine for every key in
  // nsloctext.js (GetTranslations); for a key missing from the engine's own localisation tables
  // the engine answers with the key itself, and l10n.js prefers that answer over the default
  // ('value || defaultValue'), so the raw key would be shown. Put the English default back
  // whenever the engine only echoed the key (a real translation is left alone).
  const BOOTSTRAPPER_STRINGS = ['GameModeOnlineUnavailableOffline'];

  function restoreBootstrapperStrings() {
    var l10n = window.utils && utils.l10n;
    if (!l10n || !l10n.defaults || !l10n.strings) {
      return;
    }
    var fixed = {};
    var count = 0;
    for (var i = 0; i < BOOTSTRAPPER_STRINGS.length; i++) {
      var key = BOOTSTRAPPER_STRINGS[i];
      var value = l10n.strings[key];
      if (l10n.defaults[key] && (!value || value === key)) {
        fixed[key] = l10n.defaults[key];
        count++;
      }
    }
    if (count) {
      // Saves into l10n.strings and updates every element already bound to these keys
      l10n.applyStrings(fixed, null, true);
    }
  }

  restoreBootstrapperStrings();
  if (window.engine && typeof engine.on === 'function') {
    engine.on('SetTranslations', function onSetTranslations() {
      // After l10n.js has applied the engine's (echoed) values
      setTimeout(restoreBootstrapperStrings, 0);
    });
  }
  const LAUNCH_CHECK_PREFIX = 'http://127.0.0.1:';
  const LAUNCH_CHECK_TIMEOUT_MS = 5000;

  function getJSON(url, timeout, onData) {
    try {
      var request = new XMLHttpRequest();
      request.open('GET', url, true);
      if (timeout) {
        request.timeout = timeout;
      }
      request.onload = function onJSONLoaded() {
        if (request.status && request.status !== 200) {
          return;
        }
        var data;
        try {
          data = JSON.parse(request.responseText);
        } catch (e) {
          return;
        }
        if (data) {
          onData(data);
        }
      };
      request.send();
    } catch (e) {
      // Unreachable: behave as stock
    }
  }

  function requestLaunchMode(onOffline) {
    getJSON(LAUNCH_FLAG_URL, 0, function onLaunchFlag(flag) {
      if (flag.offline !== true || typeof flag.nonce !== 'string' || !flag.nonce ||
          typeof flag.check !== 'string' || flag.check.indexOf(LAUNCH_CHECK_PREFIX) !== 0) {
        return;
      }
      getJSON(flag.check, LAUNCH_CHECK_TIMEOUT_MS, function onLaunchCheck(check) {
        if (check.nonce === flag.nonce) {
          onOffline();
        }
      });
    });
  }

  function GameModeConfig() {
    this.gameModeObjects = {};
    this.offline = false;

    requestLaunchMode(function onOffline() {
      this.offline = true;
      this.applyLaunchMode();
    }.bind(this));
  }

  GameModeConfig.prototype.update = function update() {
    this.buildGameObjects();
  };

  GameModeConfig.prototype.buildGameObjects = function buildGameObjects() {

    // Stage One
    this.gameModeObjects["stage-one"] = [
      Object.assign({}, panels.pvp),
      Object.assign({}, panels.solo)
    ];

    // Stage Two Solo Options
    // Legacy Episodes as a one-row banner over a 2x2 grid (layout in gamemodes-styles.css,
    // [data-game-mode="Training"][data-panels="5"]). 'Folder' picks the image size per tile.
    this.gameModeObjects["stage-two-Training"] = [
      Object.assign({}, panels.legacy, { 'Folder': 'wide' }),
      Object.assign({}, panels.svaConquest, { 'Folder': 'large' }),
      Object.assign({}, panels.svaFrontline, { 'Folder': 'large' }),
      Object.assign({}, panels.ftue, { 'Folder': 'large' }),
      Object.assign({}, panels.firingRange, { 'Folder': 'large' })
    ];

    // Stage Two Co-op Options
    this.gameModeObjects["stage-two-Coop"] = [
      Object.assign({}, panels.coopvsai),
      Object.assign({}, panels.discoveryCoop)
    ];

    // Stage Three Legacy Episode Options
    this.gameModeObjects["stage-three-legacy"] = [
      // Numbered episodes first (1-4 fill the 2x2 grid), Last Stand last
      Object.assign({}, panels.svaDiscovery),
      Object.assign({}, panels.svaRift),
      Object.assign({}, panels.svaPayload),
      Object.assign({}, panels.svaArkain),
      Object.assign({}, panels.svaHorde)
    ];

    this.updateImages();
    this.legacyEpisodeLockedState();
    this.applyLaunchMode();
  };

  // Offline (local emulator): there is nobody to play against, so lock the Online tile and
  // recommend Solo instead. Runs on every rebuild, and once more when the flag arrives in case
  // stage one was already rendered by then.
  GameModeConfig.prototype.applyLaunchMode = function applyLaunchMode() {
    if (!this.offline) {
      return;
    }

    restoreBootstrapperStrings();

    var stageOne = this.gameModeObjects['stage-one'] || [];
    for (var i = 0; i < stageOne.length; i++) {
      var gameMode = stageOne[i];
      if (gameMode.Id === panels.pvp.Id) {
        gameMode.IsLocked = true;
        gameMode.RecommendedStatus = false;
        gameMode.Description = 'GameModeOnlineUnavailableOffline';
      } else if (gameMode.Id === panels.solo.Id) {
        gameMode.RecommendedStatus = true;
      }
    }

    var els = document.querySelectorAll('.view-gamemodes .stage-one .gamemode');
    for (var j = 0; j < els.length; j++) {
      var el = els[j];
      if (el.dataset.badgeName === panels.pvp.Id) {
        el.classList.remove('locked-is-false');
        el.classList.add('locked-is-true');
        el.classList.remove('recommended-true');
        el.classList.add('recommended-false');

        var description = el.querySelector('.gamemode-description span');
        if (description && description.dataset.l10n !== 'GameModeOnlineUnavailableOffline') {
          // Rendered before the flag arrived: rebind the element from the stock description key
          // to ours, so a later translation update can't put the online text back
          var l10n = utils.l10n;
          if (l10n.keysToElements) {
            for (var key in l10n.keysToElements) {
              l10n.keysToElements[key] = l10n.keysToElements[key].filter(function (entry) {
                return entry.el !== description;
              });
            }
          }
          description.dataset.l10n = 'GameModeOnlineUnavailableOffline';
          l10n.add('GameModeOnlineUnavailableOffline', description, 'innerHTML');
          description.innerHTML = l10n.get('GameModeOnlineUnavailableOffline') || 'Not available in offline mode';
        }
      } else if (el.dataset.badgeName === panels.solo.Id) {
        el.classList.remove('recommended-false');
        el.classList.add('recommended-true');
      }
    }
  };

  GameModeConfig.prototype.updateImages = function updateImages() {
    // Overrides and Image Updates
    for(var key in this.gameModeObjects) {
      for (var i = 0; i < this.gameModeObjects[key].length; i++) {
        var gameMode = this.gameModeObjects[key][i];

        if (gameMode.Folder) {
          gameMode.Image = gameMode.Image.format({ 'Folder': gameMode.Folder }, false);
        } else if (this.gameModeObjects[key].length === 1 || this.gameModeObjects[key].length === 4) {
          gameMode.Image = gameMode.Image.format({ 'Folder': i === 0 ? 'large' : 'small' }, false);
        } else if (this.gameModeObjects[key].length === 2) {          
          gameMode.Image = gameMode.Image.format({ 'Folder': 'medium' }, false);
        } else if (this.gameModeObjects[key].length === 3) {
          gameMode.Image = gameMode.Image.format({ 'Folder': 'wide' }, false);
        } else {
          gameMode.Image = gameMode.Image.format({ 'Folder': 'legacy' }, false);
        }
      }
    }
  }

  GameModeConfig.prototype.getConfig = function getConfig(name) {
    return this.gameModeObjects[name];
  };

  GameModeConfig.prototype.legacyEpisodeLockedState = function legacyEpisodeLockedState() {
    let legacyArray = this.gameModeObjects['stage-three-legacy'];
    if (legacyArray && legacyArray.length) {

      for(let i = 0; i < legacyArray.length; i++) {

        let gameMode = legacyArray[i];
        switch(gameMode.Id) {
          case 'svaHorde':
            let hordeEpisode = DataStore.getSeasonEpisode(LEGACY_EPISODE_PACK_IDS.HORDE);
            if (hordeEpisode) {
              gameMode.IsLocked = !hordeEpisode.owned;
            }
            break;
          case 'svaDiscovery':
            let discoveryEpisode = DataStore.getSeasonEpisode(LEGACY_EPISODE_PACK_IDS.DISCOVERY);
            if (discoveryEpisode) {
              gameMode.IsLocked = !discoveryEpisode.owned;
            }
            break;
          case 'svaRift':
            let riftEpisode = DataStore.getSeasonEpisode(LEGACY_EPISODE_PACK_IDS.RIFT);
            if (riftEpisode) {
              gameMode.IsLocked = !riftEpisode.owned;
            }
            break;
          case 'svaPayload':
            let payloadEpisode = DataStore.getSeasonEpisode(LEGACY_EPISODE_PACK_IDS.CATALYST);
            if (payloadEpisode) {
              gameMode.IsLocked = !payloadEpisode.owned;
            }
            break;
          case 'svaArkain':
            let arkainEpisode = DataStore.getSeasonEpisode(LEGACY_EPISODE_PACK_IDS.ARKAIN);
            if (arkainEpisode) {
              gameMode.IsLocked = !arkainEpisode.owned;
            }
            break;
        }
      }
    }    
  };

  return GameModeConfig;

})();
