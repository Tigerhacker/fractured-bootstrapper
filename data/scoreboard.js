var Scoreboard = (function Scoreboard() {
  function Scoreboard(options) {
    this.elContainer = null;
    this.players = {};
    this.playersPerTeam = {};

    this.hideNonVisiblePlayers = false;
    this.hideComparison = false;
    this.comparer = null;

    this.playerHighlighted;

    this.init(options);
  }


  Scoreboard.prototype.init = function init(options) {
    this.elContainer = options.elContainer;
    this.hideComparison = options.hideComparison;

    if ( !this.hideComparison ) {
      this.comparer = new Comparer({
        'type': Comparer.prototype.SHIP
      });
      this.elContainer.addEventListener('mouseover', this.onMouseOver.bind(this));
    }
    //TODO: REMOVE THIS
    Config.STEAM_KEY = "63582B9E58C1CEFC82FA16BCCAA02EB1";
  };

  Scoreboard.prototype.onMouseOver = function onMouseOver(e) {
    var el = e.target;
    if (el.dataset.shipIdInfo) {
      var ship = DataStore.getShip(el.dataset.shipIdInfo);
      if (ship) {
        this.comparer.compare(ship, ship, el.parentNode.parentNode);
      }
    }
    else {
      this.comparer.hide();
    }
  };

  Scoreboard.prototype.updatePlayers = function updatePlayers(players) {
    if (!players) {
      return;
    }

    var playerIds = {};
    var playerSteamIds = []

    for (var i = 0, len = players.length, playerData; i < len; i++) {
      playerData = players[i];

      var id = playerData.PlayerId;
      var player = this.players[id];
      if ( !playerData.IsBot && playerData.PlayerName ){
        playerSteamIds.push('name:' + playerData.PlayerName);
      }

      //Only show players on teams 1 || 2
      //In horde mode, only show visible players
      if (playerData.Team > 0  && playerData.Team < 3) {
        //Do a visible players check
        if ( !this.hideNonVisiblePlayers || (playerData.IsPlayerMapIconVisible && playerData.SectorVisible) || (playerData.Team === 1) ) {
          if (player) {
            if (playerData.FactionRelationship !== player.FactionRelationship) {
              this.moveTeams(player, playerData);
            }
            player.update(playerData);
          } else {
            this.addPlayer(playerData);
          }
          
          playerIds[id] = true;
        }
      }
    }

    for (var id in this.players) {
      if (!playerIds[id]) {
        this.players[id].destroy();
        delete this.players[id];
      }
    }

    var teams = this.playersPerTeam;
    for (var id in teams) {
      teams[id].update();
    }

    if (!this.playerInfoLoaded){
      PlayersInfo.load( playerSteamIds, this.populateAvatars.bind(this));
      this.playerInfoLoaded = true;
    }

  };

  Scoreboard.prototype.populateAvatars = function populateAvatars() {
    var crewIds = Object.keys(DataStore.crew);
    var usableCrewIds = [];
    for (var i = 0; i < crewIds.length; i++){
      if ( !DataStore.crew[crewIds[i]].HiddenInFE){
        usableCrewIds.push( crewIds[i] );
      }
    }

    var keys = Object.keys(this.players);
    var player = null;
    for (var i = 0; i < keys.length; i++){
      player =  this.players[keys[i]];
      if ( player.PlayerName && !player.IsBot ){
        player.elAvatar.style.backgroundImage = "url('" + PlayersInfo.get('name:' + player.PlayerName).avatarmedium + "')";
      } else if ( player.IsBot ){
        var entryId = Object.keys(DataStore.crew)[ Math.floor(
          Math.randomWithSeed(player.PlayerName.hashString()) * usableCrewIds.length)];
        player.elAvatar.style.backgroundImage = "url('/frontend/images/crew/" + entryId + "/profile-pic.png')";
      }
    }
  }

  Scoreboard.prototype.addPlayer = function addPlayer(playerData) {
    playerData.tooltipAlign = playerData.FactionRelationship === 1? 'right' : 'left';
    
    var player = new TeamPlayer(playerData);

    this.moveTeams(player, playerData);

    this.players[player.id] = player;
    
    player.update(playerData);
  };

  Scoreboard.prototype.moveTeams = function moveTeams(player, playerData) {
    var currentTeamId = player.FactionRelationship;
    var newTeamId = playerData.FactionRelationship;
    var currentTeam = this.playersPerTeam[currentTeamId];
    var newTeam = this.playersPerTeam[newTeamId];

    if (!newTeam) {
      this.playersPerTeam[newTeamId] = newTeam = new Team({
        'Team': newTeamId
      });

      this.elContainer.appendChild(newTeam.el);
    }

    if (currentTeam) {
      currentTeam.removePlayer(player);
    }

    newTeam.addPlayer(player);
  };

  Scoreboard.prototype.updateTeamNames = function updateTeamNames(isSpectator) {
    console.log("DOING UPDATE TEAM NAMES");
    var teams = this.playersPerTeam;
    for (var id in teams) {
      if ( teams[id].team === 1 )
      {
        teams[id].updateTeamName( isSpectator ? utils.l10n.get('ScoreboardBlueTeam') : utils.l10n.get('ResultsAlliedTeam') );
      }
      else
      {
        teams[id].updateTeamName( isSpectator ? utils.l10n.get('ScoreboardRedTeam') : utils.l10n.get('ResultsEnemyTeam') );
      }
    }
  }

  return Scoreboard;
}());

var Team = (function Team() {
  var TEMPLATE_TEAM_HEADER = '<div class="header-text"><span class="{{colour}}-color">{{teamName}}</span></div>' +
						  '<div class="stats">' +
                          '<div class="stat number takedowns">0</div>' +
                          '<div class="stat number deaths">0</div>' +
                          '<div class="stat number supportPoints">0</div>' +
                          '<div class="stat number captures">0</div>' +
                          '</div>';
  var TEMPLATE_TEAM = '<header id="teamHeader-{{team}}">' +
                        TEMPLATE_TEAM_HEADER +
                      '</header>' +
                      '<div class="players">' +
                        '<div class="frame-top"></div>' +
                        '<div class="header">' +
                          '<div class="grid"></div>' +
                          '<label class="level"></label>' +
                          '<label class="player-info" data-l10n="GenericLabelPlayer">Player</label>' +
                          '<label class="stat takedowns" data-tooltip="l10n(GenericLabelTakedowns)" data-tooltip-align="bottom center">T</label>' +
                          '<label class="stat deaths" data-tooltip="l10n(GenericLabelDeaths)" data-tooltip-align="bottom center">D</label>' +
                          '<label class="stat supportPoints" data-tooltip="l10n(GenericLabelSupportPoints)" data-tooltip-align="bottom center">SP</label>' +
                          '<label class="stat captures" data-tooltip="l10n(GenericLabelCaptures)" data-tooltip-align="bottom center">C</label>' +
                        '</div>' +
                        '<div class="header-underline">' +
                          '<div class="underline-left"></div>' +
                          '<div class="underline-right"></div>' +
                        '</div>' +
                        '<div class="content {{colour}}-color">' +
                        '</div>' +
                        '<div class="frame-bottom"></div>' +
                      '</div>';

  function Team(options) {
    this.el;
    this.elPlayers;
    this.team = 0;
    this.colour = '';
    this.teamName = '';
    this.Takedowns;
    this.Deaths;
    this.SupportPoints;
    this.Captures;

    this.elTakedowns;
    this.elDeaths;
    this.elSupportPoints;
    this.elCaptures;

    this.players = {};

    this.init(options);
  }

  Team.prototype.init = function init(options) {
    this.team = options.Team;

    if (this.team === 1) {
      this.teamName = utils.l10n.get('ResultsAlliedTeam');
      this.colour = 'defence';
    } else if (this.team === 2) {
      this.teamName = utils.l10n.get('ResultsEnemyTeam');
      this.colour = 'attack';
    }

    this.createHTML();
  };

  Team.prototype.addPlayer = function addPlayer(player) {
    player.team = this;
    this.players[player.id] = player;

    this.elPlayers.appendChild(player.el);
  };

  Team.prototype.removePlayer = function removePlayer(player) {
    if (this.players[player.id]) {
      this.elPlayers.removeChild(player.el);
      delete this.players[player.id];
    }
  };

  Team.prototype.update = function update() {
    var Takedowns = 0;
    var Deaths = 0;
    var SupportPoints = 0;
    var Captures = 0;

    for (var id in this.players) {
      var player = this.players[id];

      Takedowns += player.Takedowns;
      Deaths += player.Deaths;
      SupportPoints += player.SupportPoints;
      Captures += player.Captures;
    }

    if (Takedowns !== this.Takedowns) {
      this.Takedowns = Takedowns;
      this.elTakedowns.textContent = Takedowns;
    }
    if (Deaths !== this.Deaths) {
      this.Deaths = Deaths;
      this.elDeaths.textContent = Deaths;
    }
    if (SupportPoints !== this.SupportPoints) {
      this.SupportPoints = SupportPoints;
      this.elSupportPoints.textContent = SupportPoints;
    }
    if (Captures !== this.Captures) {
      this.Captures = Captures;
      this.elCaptures.textContent = Captures;
    }
  };

  Team.prototype.updateTeamName = function updateTeamName( teamName ){
    this.teamName = teamName;

    if ( this.el )
    {
      var teamHeader = this.el.querySelector("#teamHeader-" + this.team);
      if (teamHeader) {
        teamHeader.innerHTML = TEMPLATE_TEAM_HEADER.format({
          'teamName': this.teamName,
          'colour': this.colour
        }, false);
		this.elTakedowns = this.el.querySelector('header .stats .takedowns');
		this.elDeaths = this.el.querySelector('header .stats .deaths');
		this.elSupportPoints = this.el.querySelector('header .stats .supportPoints');
		this.elCaptures = this.el.querySelector('header .stats .captures');
      }
    }
  };

  Team.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.className = 'team team-' + this.team;
    this.el.innerHTML = TEMPLATE_TEAM.format(this);

    utils.l10n.whenReady(function(){
      utils.l10n.load( this.el );
    }.bind(this));

    this.elPlayers = this.el.querySelector('.players .content');

    this.elTakedowns = this.el.querySelector('header .stats .takedowns');
    this.elDeaths = this.el.querySelector('header .stats .deaths');
    this.elSupportPoints = this.el.querySelector('header .stats .supportPoints');
    this.elCaptures = this.el.querySelector('header .stats .captures');
  };

  return Team;
}());

var TeamPlayer = (function TeamPlayer() {
  var TEMPLATE_PLAYER = '<div class="grid"></div>' + 
                        '<div class="alive" data-player-highlight="{{id}}">' +
                          '<div class="level-container">' +
                            '<div class="avatar"></div>' +
                            '<div class="level"></div>' +
                          '</div>' +
                          '<div class="player-info">' +
                            '<div class="player-details">' +
                              '<div class="name"></div>' +
                              '<div class="upgrade-data"><span class="highlight ship-upgrade">Silent Running - </span><span class="ship-name">Assassin</span></div>' +
                              '<div class="status utility-color"></div>' +
                              '<div class="badge"></div>' +
                            '</div>' +
                            '<div class="rank">' +
                              'Level <span class="rank-level defence-color"></span> ' +
                              '<span class="rank-name"></sapn>' +
                            '</div>' +
                            '<!-- div class="ship">' +
                              '<span class="ship-icon"></span>' +
                              '<span class="ship-name"></span>' +
                            '</div -->' +
                            '<span class="ship-image"></span>' +
                          '</div>' +
                          '<div class="stats">' +
                            '<div class="stat number takedowns"></div>' +
                            '<div class="stat number deaths"></div>' +
                            '<div class="stat number supportPoints"></div>' +
                            '<div class="stat number captures"></div>' +
                          '</div>' +
                        '</div>' +
                        '<div class="skills"></div>' +
                        '<div class="dead status-overlay">' +
                          '<div class="label">Respawning</div>' +
                          '<div class="timer">0</div>' +
                        '</div>' +
                        '<div class="disconnected status-overlay">' +
                          '<div class="label">Disconnected</div>' +
                        '</div>' +
                        '<div class="norespawn status-overlay">' +
                          '<div class="label">Dead</div>' +
                        '</div>'+
                        '<div class="mute-button" data-player-id="{{id}}" data-bot="{{IsBot}}"></div>';

  var PART_TOOLTIP = "<div class='part-tooltip'>" +
                        "<div class='part-name utility-color'>{{name}}</div>" +
                        "<div class='part-icon' style='background-image: url({{icon}});'></div>" +
                        "<div class='part-description'>{{description}}</div>" +
                      "</div>";

  var TEMPLATE_SKILL = '<div class="skill" data-skill-desc="{{description}}" data-skill-name="{{name}}" data-skill-icon="{{icon}}" data-skill-tooltip="{{tooltip}}">' +
                          '<span class="image" style="background-image: url({{icon}});"></span>' +
                          '<span class="image highlight" style="background-image: url({{highlight-icon}});"></span>' +
                       '</div>';

  var STATUSES = {
    NotReady: 0,
    Ready: 1,
    Active: 2,
    Capturing: 3,
    Respawning: 4,
    NotReady_ConfirmedShip: 5,
    NotReady_ConfirmedLoadout: 6,
    Loadouts_Sending: 7,
    Loadouts_Validation: 8,
    Loading: 9
  };

  var STATUS_TEXTS = {};
  STATUS_TEXTS[STATUSES.NotReady] = 'Not Ready';
  STATUS_TEXTS[STATUSES.Ready] = 'Ready';
  STATUS_TEXTS[STATUSES.Active] = '';
  STATUS_TEXTS[STATUSES.Capturing] = 'Capturing';
  STATUS_TEXTS[STATUSES.Respawning] = '';
  STATUS_TEXTS[STATUSES.NotReady_ConfirmedShip] = 'Selecting Loadout';
  STATUS_TEXTS[STATUSES.NotReady_ConfirmedLoadout] = 'Ready';
  STATUS_TEXTS[STATUSES.Loadouts_Sending] = 'Sending Loadouts';
  STATUS_TEXTS[STATUSES.Loadouts_Validation] = 'Validating Loadouts';
  STATUS_TEXTS[STATUSES.Loading] = 'Loading';

  function TeamPlayer(data) {
    this.id;
    this.el;
    this.tooltipAlign = '';
    this.loadoutKey = '';

    this.FactionRelationship;
    this.team;

    this.HUDTagId;
    this.SteamId;
    this.IsBot;
    this.UserStatus;
    this.InGameUserStatus;
    this.ResourcesUpgradeLevel;
    this.PlayerName;
    this.RankLevel;
    this.RankName;
    this.Takedowns;
    this.Kills;
    this.Deaths;
    this.SupportPoints;
    this.Captures;
    this.IsConnected;
    this.GammaEffect;
    this.NameplateGUID;

    this.elLevel;
    this.elName;
    this.elBadge;
    this.elRankLevel;
    this.elRankName;
    this.elAvatar;
    this.elShipIcon;
    this.elShipName;
    this.elShipUpgrade;
    this.elShipImage;
    this.elStatus;
    this.elTimer;
    this.elTakedowns;
    this.elDeaths;
    this.elSupportPoints;
    this.elCaptures;
    this.elMuteButton;

    this.init(data);
  }

  TeamPlayer.prototype.init = function init(data) {
    console.info('[Player] new', data);
    this.id = data.PlayerId;

    //Add this back in when we have a goodie for scoreboard
    //this.NameplateGUID = data.NameplateGUID;

    this.tooltipAlign = data.tooltipAlign || 'right';

    this._onClick = this.reportClick.bind(this);

    this.createHTML();
    
    if (data.IsLocalPlayer) {
      this.el.classList.add('localPlayer');
    }

    this.update(data);
    console.info('[Player] created');
  };

  TeamPlayer.prototype.update = function update(data) {
    if (this.ShipGUID !== data.ShipGUID) {
      var ship = DataStore.getShip(data.ShipGUID);

      if (ship) {
        this.el.dataset.ship = data.ShipGUID;
        this.ShipGUID = data.ShipGUID;
        this.elShipImage.dataset.shipIdInfo = this.ShipGUID;
        this.el.dataset.shipIdInfo = this.ShipGUID;
        this.elShipImage.style.backgroundImage = "url('" + ship.images.hangar + "')";
        this.elShipUpgrade.textContent = "";
        if ( this.elShipUpgrade.textContent )
        {
          this.elShipName.textContent = " - " + ship.name;
        }
        else
        {
          this.elShipName.textContent = ship.name;
        }
      } else {
        this.elShipImage.style.backgroundImage = '';
        this.elShipUpgrade.textContent = '';
        this.elShipName.textContent = '';
        this.el.dataset.ship = '';
        this.ShipGUID = '';
        this.elShipImage.dataset.shipIdInfo = '';
        this.el.dataset.shipIdInfo = '';
      }

      this.loadoutKey = '';
    }

    if (this.FactionRelationship !== data.FactionRelationship) {
      this.FactionRelationship = data.FactionRelationship;
    }

    if (this.HUDTagId !== data.HUDTagId) {
      this.HUDTagId = data.HUDTagId;
    }

    if (this.GammaEffect !== data.GammaEffect) {
      this.GammaEffect = data.GammaEffect;
      if ( this.GammaEffect )
      {
        this.el.classList.add('has-gamma');
      }
      else
      {
        this.el.classList.remove('has-gamma');
      }
    }

    if (this.UserStatus !== data.UserStatus) {
      this.UserStatus = data.UserStatus;
    }

    if (this.IsDeveloper !== data.IsDeveloper) {
      this.IsDeveloper = data.IsDeveloper;
    }

    if (this.InGameUserStatus !== data.InGameUserStatus) {
      this.el.classList.add('status' + data.InGameUserStatus);
      this.el.classList.remove('status' + this.InGameUserStatus);

      this.InGameUserStatus = data.InGameUserStatus;
      this.elStatus.textContent = STATUS_TEXTS[this.InGameUserStatus];
    }

    if (this.IsConnected !== data.IsConnected) {
      this.el.classList.add('connected-' + data.IsConnected);
      this.el.classList.remove('connected-' + this.IsConnected);

      this.IsConnected = data.IsConnected;
    }
    
    var loadoutKey = data.ShipPartsIDS.join(',');

    if (loadoutKey && this.loadoutKey !== loadoutKey) {
      var SkillsHTML = '';
      for (var i = 0, len = data.ShipPartsIDS.length - 1; i < len; i++) {
        var part = DataStore.getPart(data.ShipPartsIDS[i]);
        if (part && !part.isHull && part.icon) {

          var iconSplit = part.icon.split("/");
          var iconName = iconSplit.pop();
          var highlightIcon = iconSplit.join("/") + "/highlight/" + iconName;
          SkillsHTML += TEMPLATE_SKILL.format(part).format({
            'tooltipAlign': this.tooltipAlign,
            'highlight-icon': highlightIcon
          });
        }
      }

      this.loadoutKey = loadoutKey;
      this.el.querySelector('.skills').innerHTML = SkillsHTML;
    }
    
    if (this.RespawnTimer !== data.RespawnTimer) {
      this.RespawnTimer = data.RespawnTimer;

      var time = Math.floor(this.RespawnTimer % 60);
      this.elTimer.textContent = time;
      this.el.dataset.respawnTime = time;
    }

    if (this.ResourcesUpgradeLevel !== data.ResourcesUpgradeLevel) {
      this.ResourcesUpgradeLevel = data.ResourcesUpgradeLevel;
      this.elLevel.textContent = data.ResourcesUpgradeLevel;
    }
    
    if (this.PlayerName !== data.PlayerName) {
      this.PlayerName = data.PlayerName;
      this.elName.textContent = data.PlayerName;
    }

    if (this.BadgeId !== data.BadgeId && this.elBadge){
      this.BadgeId = data.BadgeId;
      this.elBadge.style.backgroundImage = 'url("/frontend/images/badges/' + this.BadgeId + '/small.png")';
    }
    
    if (this.RankName !== data.RankName) {
      this.RankName = data.RankName;
      this.elRankName.textContent = data.RankName;
    }
    
    if (this.RankLevel !== data.RankLevel) {
      this.RankLevel = data.RankLevel;
      this.el.dataset.rank = this.RankLevel;
      this.elRankLevel.textContent = data.RankLevel;
    }
    
    if (this.Takedowns !== data.Takedowns) {
      this.Takedowns = data.Takedowns;
      this.elTakedowns.textContent = data.Takedowns;
    }
    
    if (this.Deaths !== data.Deaths) {
      this.Deaths = data.Deaths;
      this.elDeaths.textContent = data.Deaths;
    }
    
    if (this.SupportPoints !== data.SupportPoints) {
      this.SupportPoints = data.SupportPoints;
      this.elSupportPoints.textContent = data.SupportPoints;
    }
    
    if (this.Captures !== data.Captures) {
      this.Captures = data.Captures;
      this.elCaptures.textContent = data.Captures;
    }

    if (this.SteamId !== data.SteamId) {
      this.SteamId = data.SteamId;
    }

    if (this.IsBot !== data.IsBot) {
      this.el.dataset.isBot = this.IsBot = data.IsBot;
    }

    this.Kills = data.Kills;
  };

  TeamPlayer.prototype.destroy = function destroy() {
    if (this.team) {
      this.team.removePlayer(this);
    }

    if (this.el) {
      this.el.removeEventListener('mousedown', this._onClick);
      
      if (this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    }
  };

  TeamPlayer.prototype.reportClick = function reportClick(e) {
    if ( e.target === this.elMuteButton ) {
      if ( this.elMuteButton.classList.contains("muted") ) {
        engine.call('TriggerEventInView', Navigation.VIEW_ENUM.InGameView, "UnMutePlayer_Clicked", "" + this.elMuteButton.dataset.playerId);
        this.elMuteButton.classList.remove("muted");
      } else {
        engine.call('TriggerEventInView', Navigation.VIEW_ENUM.InGameView, "MutePlayer_Clicked", "" + this.elMuteButton.dataset.playerId);
        this.elMuteButton.classList.add("muted");
      }
    //} else if ( e.button === 2 ) {
    } else {
      engine.call('OnShipSelected', this.HUDTagId, utils.getMouseClickButton(e));
    }
  };

  TeamPlayer.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.dataset.playerHighlight = this.id;
    this.el.dataset.playerid = this.id;

    //Add this back in when nameplates are done for in game scoreboard
    //this.el.dataset.nameplate = this.NameplateGUID;

    this.el.className = 'player cursor-over';
    this.el.innerHTML = TEMPLATE_PLAYER.format(this);
    this.el.addEventListener('mousedown', this._onClick);

    this.elLevel = this.el.querySelector('.level');
    this.elName = this.el.querySelector('.name');
    this.elBadge = this.el.querySelector('.badge');
    this.elRankLevel = this.el.querySelector('.rank-level');
    this.elRankName = this.el.querySelector('.rank-name');
    this.elAvatar = this.el.querySelector('.avatar');
    /*this.elShipIcon = this.el.querySelector('.ship-icon');*/
    this.elShipName = this.el.querySelector('.ship-name');
    this.elShipUpgrade = this.el.querySelector('.ship-upgrade');
    this.elShipImage = this.el.querySelector('.ship-image');
    this.elStatus = this.el.querySelector('.status');
    this.elTimer = this.el.querySelector('.timer');
    this.elTakedowns = this.el.querySelector('.takedowns');
    this.elDeaths = this.el.querySelector('.deaths');
    this.elSupportPoints = this.el.querySelector('.supportPoints');
    this.elCaptures = this.el.querySelector('.captures');
    this.elMuteButton = this.el.querySelector('.mute-button');
  };

  return TeamPlayer;
}());
