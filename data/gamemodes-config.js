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
      'IsLocked': true, //'FTUEFlow' in window && FTUEFlow.state < 2, // Thaumic - Lock crashing gameMode
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
      'IsNew': true,
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
	'svaFrontline': { 
      'Id': 'payload', // Thaumic - Hijacks Payload id to make button function
      'Name': 'GameModeFrontlineLabel',
      'Image': 'views/gamemodes/images/{{Folder}}/solo-frontline.png',
      'Description': 'GameModeSoloFrontlineDescription',
      'RecommendedStatus': false,
      'IsLocked': false,
      'IsBeta': true,
      'IsNew': false,
      'IsLegacy': false
    } 
  };

  function GameModeConfig() {
    this.gameModeObjects = {};
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
    this.gameModeObjects["stage-two-Training"] = [
      Object.assign({}, panels.legacy),
      Object.assign({}, panels.svaConquest),
      Object.assign({}, panels.ftue),
      Object.assign({}, panels.firingRange)
    ];

    // Stage Two Co-op Options
    this.gameModeObjects["stage-two-Coop"] = [
      Object.assign({}, panels.coopvsai),
      Object.assign({}, panels.discoveryCoop)
    ];

    // Stage Three Legacy Episode Options
    this.gameModeObjects["stage-three-legacy"] = [
      Object.assign({}, panels.svaHorde),
      Object.assign({}, panels.svaDiscovery),
      Object.assign({}, panels.svaRift),
      Object.assign({}, panels.svaPayload),
      Object.assign({}, panels.svaArkain),
	  Object.assign({}, panels.svaFrontline)
    ];

    this.updateImages();
    this.legacyEpisodeLockedState();
  };

  GameModeConfig.prototype.updateImages = function updateImages() {
    // Overrides and Image Updates
    for(var key in this.gameModeObjects) {
      for (var i = 0; i < this.gameModeObjects[key].length; i++) {
        var gameMode = this.gameModeObjects[key][i];

        if (this.gameModeObjects[key].length === 1 || this.gameModeObjects[key].length === 4) {
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
