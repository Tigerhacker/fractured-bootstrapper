var Player = (function () {
  function Player() {
    this.authenticated = false;
    this.selectedShip;
    this.selectedCrew;
    this.selectedSkin;
    this.RANK_TO_SHOW_MMR = 5;
    this.elProfileBadge;
    this.cssFileLoaded = false;
    this.lang = 'en-GB';
    this.ready = false;
    this.EmoteLoadout = [];

    this.currencies = {};

    this.lastLoadoutReported = {};

    // Initial client launch data, to be sent when rejoining an active session
    this.launchData = {
      'shipId': null,
      'loadout': null,
      'materialModifier': null,
      'crewId': null,
      'crewMembers': null
    };
  }

  Player.prototype = {
    // Called from main.js - only after the engine is ready and everything
    init: function init() {
      console.log('Init Player');

      engine.on('GotShipTree', this.onGotShipTree.bind(this));
      engine.on('UpdatePlayer', this.update.bind(this));
      engine.on('Authenticated', this.onEngineAuthenticate.bind(this));
      engine.on('EmailSignupResult', this.onEmailSignup.bind(this));
      engine.on('GotSelectedCrew', this.onGotCrewFromEngine.bind(this));
      engine.on('GotSelectedShip', this.onGotShipFromEngine.bind(this));
      engine.on('OnBadgeChanged', this.updatePlayerBadge.bind(this));
      engine.on('ChangeCurrentNameplate', this.updateNameplate.bind(this));
      engine.on('HangarChanged', this.updateHangar.bind(this));
      engine.on('UpdateEmoteKey', this.onUpdateEmoteKey.bind(this));

      utils.on('ShipLoadoutUpdated', this.onGotLoadoutFromEngine.bind(this));
      utils.on('Crew_Removed', this.onCrewRemoved.bind(this));
      utils.on('LanguageSet', this.onLanguageSet.bind(this));

      utils.dispatch('PlayerReady');
    },

    getInfo: function getInfo(callback) {
      if (!this.Name) {
        return false;
      }

      var avatarId = 'name:' + this.Name;
      var playerInfo = PlayersInfo.get(avatarId);

      if (playerInfo.ready) {
        if (callback) {
          callback(playerInfo);
        }
      } else {
        PlayersInfo.load(avatarId, this.getInfo.bind(this, callback));
      }

      return true;
    },

    rejoinActiveGame: function rejoinActiveGame() {
      var data = this.launchData;

      engine.call('CrewSelected', data.crewId);
      engine.call('ShipSelected', data.shipId);
      engine.call('LoadoutChange', data.shipId, data.loadout, data.materialModifier);
      engine.call('RejoinActiveGame');
    },

    setLaunchData: function setLaunchData(key, value) {
      if (this.launchData[key] === null) {
        this.launchData[key] = value;
      }
    },

    onCrewRemoved: function onCrewRemoved(crewId) {
      if (crewId === this.selectedCrew) {
        var teams = CrewDB.getValidTeams();
        crewId = teams[Object.keys(teams)[0]].Id;

        this.selectCrew(crewId);
      }
    },

    onGotShipFromEngine: function onGotShipFromEngine(shipId) {
      this.setLaunchData('shipId', shipId);

      DataStore.whenReady(function onShipsReady() {
        this.setShip(shipId, true);
      }.bind(this));
    },

    onGotCrewFromEngine: function onGotCrewFromEngine(crewId) {
      CrewDB.whenReady(function onShipsReady() {
        if (!crewId || !CrewDB.getTeam(crewId)) {
          var teams = CrewDB.getValidTeams();
          var teamIds = Object.keys(teams);
          if (teamIds.length > 0) {
            crewId = teams[teamIds[0]].Id;
          }
        }

        if (crewId) {
          this.selectCrew(crewId, true);

          var members = (CrewDB.getTeam(crewId) || {}).CrewMembers;
          this.setLaunchData('crewId', crewId);
          this.setLaunchData('crewMembers', members);
        }
      }.bind(this));
    },

    onGotLoadoutFromEngine: function onGotLoadoutFromEngine(data) {
      var shipId = data.shipId;
      var loadout = data.loadout;
      var materialModifier = data.material;

      if (shipId === this.launchData.shipId) {
        this.setLaunchData('loadout', loadout);
        this.setLaunchData('materialModifier', materialModifier);
      }

      DataStore.whenReady(function onShipsReady() {
        var foundSkin = false;
        var isOK = true;

        if (materialModifier) {
          var skins = (DataStore.getShip(shipId) || {}).skins || {};

          for (var id in skins) {
            if (skins[id].materialModifier === materialModifier) {
              this.selectedSkin = id;
              foundSkin = true;
              break;
            }
          }
        }

        for (var i = 0, len = loadout.length, id; i < len; i++) {
          id = loadout[i];

          if (!DataStore.equipPart(id)) {
            console.warn('cant equip part', id, DataStore.getPart(id));
            isOK = false;
          }

          if (!foundSkin && DataStore.isSkin(id)) {
            this.selectedSkin = id;
            foundSkin = true;
          }
        }

        if (!isOK) {
          this.reportPartsChangeToEngine();
        }
      }.bind(this));
    },

    onGotShipTree: function onGotShipTree(data) {
      if (!data) {
        return;
      }

      for (var k in data.currencies) {
        var current = this.currencies[k];

        if (data.currencies[k] !== current) {
          this.currencies[k] = data.currencies[k];

          if (current !== undefined) {
            utils.dispatch('PlayerCurrencyUpdate_' + k, {
              'previous': current,
              'new': data.currencies[k]
            });
          }
        }
      }
      this.ready = true;
      utils.dispatch('PlayerDataUpdated');
    },

    update: function update(data) {
      var wasAuthenticated = this.isAuthenticated();

      for (var k in data) {
        this[k] = data[k];
      }

      if (!wasAuthenticated && this.IsAuthenticated) {
        this.onAuthenticate();
      }

      this.Rank = RankManager.getRankByXP(this.XPCurrent);

      document.body.dataset.ftue = this.FtueStage;

      console.info('[Player] XP: ' + this.XPCurrent);
      if (this.Rank) {
        console.info('[Player] Rank: ' + this.Rank.Rank);
      }

      if (this.IsAuthenticated && this.Rank.Rank < this.RANK_TO_SHOW_MMR) {
        document.body.classList.add('hide-mmr');
      }

      //Remove all player-level-* classes
      for (var i = document.body.classList.length - 1; i >= 0; i--) {
        if (document.body.classList[i].indexOf("player-level-") !== -1) {
          document.body.classList.remove(document.body.classList[i]);
        }
      }
      //Add player level class
      document.body.classList.add('player-level-' + this.Rank.Rank);

      if (!this.elProfileBadge) {
        this.elProfileBadge = document.getElementById('player-profile-badge');
      }

      DataStore.whenReady(function onReady() {
        // Update Players Equipped Badge
        this.updatePlayerBadge();
        this.updateNameplate();
      }.bind(this));

      if (window.RavenEnabled && Raven){
        Raven.setUserContext({
          "player_id": this.ExternalId
        });

        Raven.setTagsContext({
          "build": this.BuildNumber.split(" ")[0]
        });

        try{
          Raven.setTagsContext({
            "environment": this.BuildNumber.split(" ")[1]
          });
        } catch(e){};

      }
      utils.dispatch('PlayerDataUpdated');
    },

    onAuthenticate: function onAuthenticate() {
      console.info('[Player] Authenticated');

      utils.dispatch('Authenticated');
      utils.dispatch('AuthenticatedSuccess');
    },

    onEngineAuthenticate: function onEngineAuthenticate() {
      this.update({
        'IsAuthenticated': true
      });
    },

    onEmailSignup: function onEmailSignup(isSuccessful) {
      if (isSuccessful) {
        this.update({
          'HasEmail': true
        });
      }
    },

    selectCrew: function selectCrew(crewId, isInit) {
      if (this.selectedCrew === crewId) {
        return;
      }

      var crew = CrewDB.getTeam(crewId);
      var members = [];

      if (!crew) {
        crewId = Config.DEFAULT_CREW;
        crew = CrewDB.getTeam(crewId);
      }

      if (!crew) {
        return;
      }

      if (!CrewDB.validateCrew(crew)) {
        return;
      }

      for (var i = 0, len = crew.CrewMembers.length; i < len; i++) {
        members.push(crew.CrewMembers[i].Id);
      }

      this.selectedCrew = crewId;

      utils.dispatch('CrewSelected', crewId);

      if (!isInit) {
        var members = crew.CrewMembers;

        utils.reportEvent(Config.ANALYTICS.HANGAR_CREW_SELECT, {
          'crewName': crew.Name,
          'crewMember0': members[0] || '',
          'crewMember1': members[1] || '',
          'crewMember2': members[2] || '',
          'crewMember3': members[3] || '',
          'crewMember4': members[4] || '',
          'numberOfCrews': Object.keys(CrewDB.teams).length
        });

        engine.call('CrewSelected', this.selectedShip, crewId);
      }

      return true;
    },

    selectShip: function selectShip(shipId, isInit, skinId) {
      if (this.selectedShip === shipId) {
        if (this.selectedSkin !== skinId) {
          this.selectSkin(skinId, true);
          this.reportShipChangeToEngine();
        }
        return false;
      }

      this.setShip(shipId, isInit, skinId);

      return true;
    },

    setShip: function setShip(shipId, isInit, skinId) {

      this.selectedShip = shipId;
      this.selectedSkin = null;

      var ship = shipId && DataStore.getShip(shipId);
      if (!ship) {
        shipId = '';
        console.warn('No ship to select for the player! Tried selecting: ' + shipId);
      }

      if (!isInit) {
        AudioPlayer.play(AudioPlayer.SelectShip);
      }

      if (skinId) {
        this.selectSkin(skinId, isInit);
      }

      this.reportShipChangeToUI();
      this.reportShipChangeToEngine(shipId);
    },

    selectSkin: function selectSkin(skinId, forceUpdate) {
      if (this.selectedSkin === skinId && forceUpdate !== true) {
        return false;
      }

      var skin = DataStore.getSkin(skinId);
      if (!skin) {
        console.warn('Trying to select invalid skin', skinId);
        return false;
      }

      this.selectedSkin = skinId;

      this.reportPartsChangeToEngine();

      utils.dispatch('ChangeSelectedSkin', {
        'skin': skin
      });

      return true;
    },

    reportShipChangeToEngine: function reportShipChangeToEngine(shipId) {
      engine.call('ShipSelected', '' + (shipId || this.selectedShip));
    },

    reportPartsChangeToEngine: function reportPartsChangeToEngine(shipId) {
      this.reportPartsToEngine(false, shipId);
    },

    reportPartsChangeToEngineScene: function reportPartsChangeToEngineScene(shipId) {
      this.reportPartsToEngine(true, shipId);
    },

    reportPartsToEngine: function reportPartsToEngine(isDisplayOnly, shipId) {
      !shipId && (shipId = this.selectedShip);
      var partIDs = this.getShipEquippedPartIds(shipId, isDisplayOnly);
      var event = isDisplayOnly ? 'LoadoutChangeDisplay' : 'LoadoutChange';
      var skinModifier = this.getSelectedSkinMaterial();
      var lastReported = this.lastLoadoutReported;

      if (isDisplayOnly && !lastReported.isDisplayOnly) {
        if (lastReported.shipId === shipId &&
          lastReported.partIDs.join(',') === partIDs.join(',') &&
          lastReported.skinModifier === skinModifier) {
          return false;
        }
      }

      this.lastLoadoutReported = {
        'isDisplayOnly': isDisplayOnly,
        'shipId': shipId,
        'partIDs': partIDs,
        'skinModifier': skinModifier
      };

      var skin = DataStore.getSkin(this.selectedSkin);
      if (skin) {
        for (var index in partIDs) {
          var partID = partIDs[index];
          if (skin.partsToReplace[partID]) {
            partIDs[index] = skin.partsToReplace[partID];
          }
        }

        skinModifier = skin.materialModifier;
      }

      engine.call(event, shipId, partIDs, skinModifier);

      return true;
    },

    reportShipChangeToUI: function reportShipChangeToUI() {
      utils.dispatch('ShipSelected', {
        'Id': this.selectedShip
      });
    },

    getSelectedSkinMaterial: function getSelectedSkinMaterial() {
      var skin = DataStore.getSkin(this.selectedSkin);

      return skin && skin.materialModifier || '';
    },

    getShipEquippedParts: function getShipEquippedParts(shipId, bGetLockedParts) {
      if (!shipId) {
        shipId = this.selectedShip;
      }

      return DataStore.getSkinLoadout(shipId, this.selectedSkin, bGetLockedParts);
    },

    getShipEquippedPartIds: function getShipEquippedPartIds(shipId, bGetLockedParts) {
      var parts = this.getShipEquippedParts(shipId, bGetLockedParts),
        partIDs = [];

      // Only save IDs, The hull must be first!
      for (var i = 0, len = parts.length; i < len; i++) {
        if (parts[i].isHull) {
          partIDs.unshift(parts[i].Id);
        } else {
          partIDs.push(parts[i].Id);
        }
      }

      return partIDs;
    },

    getShip: function getShip() {
      return this.selectedShip;
    },

    doLogin: function doLogin() {
      if (this.IsAuthenticated) {
        this.onAuthenticate();
      } else {
        engine.call('StartLogin');
      }
    },

    authenticate: function authenticate(username, password) {
      engine.call('Login', EngineStructs.Login(username, password));
    },

    isAuthenticated: function isAuthenticated() {
      return this.IsAuthenticated;
    },

    updatePlayerBadge: function updatePlayerBadge(id) {
      if (id) {
        this.CurrentBadgeGUID = id;
      }

      if (this.CurrentBadgeGUID) {
        this.elProfileBadge.classList.remove('hide-badge');

        utils.updateScope({
          'equippedBadgeImg': '/frontend/images/badges/' + this.CurrentBadgeGUID + '/small.png',
          'equippedBadgeTooltip': DataStore.getBadgeTooltip(this.CurrentBadgeGUID)
        }, document.body);
      } else {
        this.elProfileBadge.classList.add('hide-badge');
      }
    },

    updateNameplate: function updateNameplate(id) {
      if (!id) {
        return;
      }

      this.NameplateGUID = id;
      
      utils.dispatch('UpdateHeaderNameplate');
    },

    onLanguageSet: function onLanguageSet() {
      if (this.lang.indexOf('en-') === -1 && !this.cssFileLoaded) {
        this.cssFileLoaded = true;
        Load.style('css/languages/' + this.lang + '.css', function onGotStyles() {
          var link = document.createElement('link');
          link.rel = 'Stylesheet';
          link.href = 'css/languages/' + this.lang + '.css';
          document.body.appendChild(link);
          console.info('Player loaded with ' + this.lang + ' and styles exist');
        }.bind(this));
      }
    },

    updateHangar: function updateHangar(id) {
      if (id === this.selectedHangar) {
        return;
      }

      this.selectedHangar = id;

      utils.dispatch('HangarUpdated');
    },

    onUpdateEmoteKey: function onUpdateEmoteKey(position, key) {
      this.EmoteLoadout[position].key = key;
      utils.dispatch('EmoteKeyUpdated');
    },

    whenReady: function whenReady(callback) {
      if (this.ready) {
        callback();
      } else {
        utils.on('PlayerDataUpdated', callback);
      }
    }
  };

  return new Player();
}());
