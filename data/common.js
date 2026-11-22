/*
  This file should be included on ALL PAGES
  The below code will run every time for all pages
*/

// "use strict";

// Dynamically load objects that are shared between all frames
function loadCommonScripts() {
  Load.js('data/translations/nsloctext.js');
  Load.js('script/l10n.js');
  Load.js('script/player.js');
  Load.js('script/DataStore.js');
  Load.js('script/crew-db.js');
  Load.js('script/audio.js');
  Load.js('script/RankManager.js');
  Load.js('script/UserInteractionTracker.js');
  Load.js('script/tooltip.js');
  Load.js('script/Subtitles.js');
  Load.js('script/dragger.js');
  Load.js('script/counter.js');
  Load.js('script/reward-manager.js');
  Load.js('script/FE-Particles.js');
  Load.js('script/card-templates.js');
  Load.js('script/NameplateManager.js');
}

var Load = {
  css: function loadCSS(src, callback) {
    var elStyle = document.createElement('link');

    elStyle.href = src;
    elStyle.type = 'text/css';
    elStyle.rel = 'Stylesheet';

    if (callback) {
      elStyle.addEventListener('load', callback);
    }

    document.body.appendChild(elStyle);
  },

  html: function loadHTML(src, callback) {
    var request = new XMLHttpRequest();

    request.open('GET', src, true);

    if (callback) {
      request.addEventListener('load', function onHTMLLoad() {
        callback(request.response);
      });
    }

    request.send();
  },

  htmlAsync: function htmlAsync(src, cb){
    return new Promise( function(resolve, reject){
      if (cb){
        src = src + '?_=' + Date.now();
      }

      var request = new XMLHttpRequest();
      request.open('GET', src, true);
      request.onload = () => { resolve(request.response) };
      request.onerror = () => { reject() };
      request.send();
    });
  },

  js: function loadJS(src, callback) {
    var elScript = document.createElement('script');
    var elExistingScript = document.querySelector('script');

    if (callback) {
      elScript.addEventListener('load', callback);
    }

    elScript.src = src;

    elExistingScript.parentNode.insertBefore(elScript, elExistingScript);
  },

  style: function loadStyles(src, callback) {
    var request = new XMLHttpRequest();

    request.open('GET', src, true);

    if (callback) {
      request.addEventListener('load', function onHTMLLoad() {
        callback(request.response);
      });
    }

    request.send();
  },

  json: function loadJSON(src, callback) {
    var request = new XMLHttpRequest();

    request.open('GET', src, true);

    if (callback) {
      request.addEventListener('load', function onJSONLoad() {
        var json = request.response.toString();

        try {
          var json = JSON.parse(json);
          callback(json);
        } catch(e) {
          callback(false);
        }
      });
    }

    request.send();
  }
};

var REGEX_NUMBERS = /\B(?=(\d{3})+(?!\d))/g;

// Common methods
var utils = (function () {
  function utils() {
    this.listeners = {};
    this.timeoutStartTimers = null;
    this.timeoutUpdateTimers = null;
    this.ftueButtonBind = true;

    window.addEventListener('load', this.init.bind(this));
  }

  utils.prototype = {
    // Calls when a page was loaded - common logic
    init: function realInit() {
      this.l10n = new l10n({
        'namespace': 'FrontEnd'
      });

      Load.js('script/CrewCardDesign.js');

      RankManager.init();

      UserInteractionTracker.init();

      this.createColourStyles();

      Tooltip.init();

      StatusHelper.init();

      UIHighlighter.init();

      document.body.classList.add('loaded');

      // Listen for mouse down - blocj middle mouse button
      document.body.addEventListener('mousedown', this.onMouseDown.bind(this));

      // Listen for mouseover on the entire document
      document.body.addEventListener('mouseover', this.onMouseOver.bind(this));

      // Listen for clicks
      document.body.addEventListener('click', this.onDocumentClick.bind(this));

      // Listen for key events
      document.body.addEventListener('keydown', this.onDocumentKeyDown.bind(this));

      // Listen for change events for uicheckbox
      document.body.addEventListener('change', this.onInputchange.bind(this));

      // Listen for key events
      window.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);

      this.updateSaleTimers();
    },

    NSLOCTEXT: function NSLOCTEXT(commentText) {
      commentText = commentText.replace('<!--', '').replace('-->', '').replace(/\r\n/g, '\t').replace(/\n/g, '\t');
      var comment = document.createComment(commentText);
      document.body.appendChild(comment);
      this.realInit();
    },

    getRelativePosition: function getRelativePosition(elementFrom, elementTo) {
      var fromPos = this.getPosition(elementFrom);
      var toPos = this.getPosition(elementTo);
      var relPos = { 'x': (toPos.x - fromPos.x), 'y': (toPos.y - fromPos.y) };
      return relPos;
    },

    getPosition: function getPosition(element) {
      if (element && element.nodeName !== "BODY") {
        var parentEl = element.parentElement;
        var parentPosStyle = '';
        var pos = { 'x': element.offsetLeft, 'y': element.offsetTop };
        while (parentEl.nodeName !== "BODY") {
          parentPosStyle = window.getComputedStyle(parentEl)["position"];
          if (parentPosStyle === "absolute" || parentPosStyle === "relative") {
            pos.x += parentEl.offsetLeft;
            pos.y += parentEl.offsetTop;
          }
          parentEl = parentEl.parentElement;
        }
        return pos;
      }
    },

    startTimer: function startTimer(el, showAsNumbers) {
      window.clearTimeout(this.timeoutStartTimers);

      var now = Date.now();
      var time = (new Date(parseInt(el.dataset.time)));

      var seconds = Math.max(Math.round((time - now) / 1000), 0);
      var hours = Math.floor(seconds / 3600);
      seconds -= hours * 3600;

      var minutes = Math.floor(seconds / 60);
      seconds -= minutes * 60;
      var days = Math.floor(hours / 24);

      if (showAsNumbers){
        hours = hours % 24;
        var timeStr = "";
        timeStr += (days) ? ((days < 10) ? "0" + days : days) + ":" : "";
        timeStr += (hours) ? ((hours < 10) ? "0" + hours : hours) + ":" : "";
        timeStr += (minutes) ? ((minutes < 10) ? "0" + minutes : minutes) + ":" : "";
        timeStr += (seconds < 10) ? "0" + seconds : seconds;
        el.textContent = timeStr;
        el.classList.add("timer-regular");
      } else {
        if (hours > 23) {

          if (days === 1) {
            el.textContent = "1 " + this.l10n.get('GenericDaySingular').toLowerCase();
          }
          else {
            el.textContent = days + " " + this.l10n.get('GenericDayPlural').toLowerCase();
          }

          el.classList.add('timer-small');
          el.classList.remove('timer-regular');
        } else {
          if (hours === 1) {
            el.textContent = " 1 " + this.l10n.get('GenericHourSingular').toLowerCase();
          }
          else if (hours > 1) {
            el.textContent = hours + " " + this.l10n.get('GenericHourPlural').toLowerCase();
          }

          el.classList.add('timer-regular');
          el.classList.remove('timer-small');
        }
      }

      if (time < new Date()) {
        el.dispatchEvent(new Event("timerFinished"));
      } else {
        this.timeoutStartTimers = window.setTimeout(this.startTimer.bind(this, el, showAsNumbers), 1000);
      }
    },

    updateSaleTimers: function updateSaleTimers(elContainer) {
      window.clearTimeout(this.timeoutUpdateTimers);

      !elContainer && (elContainer = document.body);
      var elTimers = Array.prototype.slice.call(elContainer.querySelectorAll('div.update-ticking-timer.active-true'));
      var now = Date.now();

      for (var i = 0, len = elTimers.length; i < len; i++) {
        var el = elTimers[i];
        var time = (new Date(el.dataset.time));

        var seconds = Math.max(Math.round((time - now) / 1000), 0);
        var hours = Math.floor(seconds / 3600);
        seconds -= hours * 3600;

        var minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;

        if (hours > 23) {
          var days = Math.floor(hours / 24);
          var dayHours = hours % 24;

          if (days === 1) {
            el.textContent = "1 " + this.l10n.get('GenericDaySingular').toLowerCase();
          }
          else {
            el.textContent = days + " " + this.l10n.get('GenericDayPlural').toLowerCase();
          }

          if (dayHours === 1) {
            el.textContent += " 1 " + this.l10n.get('GenericHourSingular').toLowerCase();
          }
          else if (dayHours > 0) {
            el.textContent += " " + dayHours + " " + this.l10n.get('GenericHourPlural').toLowerCase();
          }

          el.classList.add('timer-small');
          el.classList.remove('timer-regular');
        } else {
          (hours < 10) && (hours = '0' + hours);
          (minutes < 10) && (minutes = '0' + minutes);
          (seconds < 10) && (seconds = '0' + seconds);

          el.textContent = hours + ':' + minutes + ':' + seconds;

          el.classList.add('timer-regular');
          el.classList.remove('timer-small');
        }

        // Reset item if the timer expires
        if (time < new Date()) {
          var timedSaleParentEl = this.findAncestor(el, 'has-timed-sale-true');
          if (timedSaleParentEl) {
            var timedSaleEl = this.findAncestor(el, 'timed-sale');

            // Replace has-timed-sale-true with has-timed-sale-false if it exists
            if (timedSaleParentEl.classList.contains('has-timed-sale-true')) {
              timedSaleParentEl.classList.remove('has-timed-sale-true');
              timedSaleParentEl.classList.add('has-timed-sale-false');
            }

            // Replace has-sale-true with has-sale-false if it exists
            if (timedSaleParentEl.classList.contains('has-sale-true')) {
              timedSaleParentEl.classList.remove('has-sale-true');
              timedSaleParentEl.classList.add('has-sale-false');
            }

            // Replace has-sale-saving-true with has-sale-saving-false if it exists
            if (timedSaleParentEl.classList.contains('has-sale-saving-true')) {
              timedSaleParentEl.classList.remove('has-sale-saving-true');
              timedSaleParentEl.classList.add('has-sale-saving-false');
            }

            // If the element has data-is-timed, set it to false
            if (timedSaleEl.dataset.isTimed) {
              timedSaleEl.dataset.isTimed = false;
            }
          }
        }

      }

      if (elTimers.length) {
        this.timeoutUpdateTimers = window.setTimeout(this.updateSaleTimers.bind(this), 1000);
      }
    },

    getDisplayTimeFromSeconds: function getDisplayTimeFromSeconds(seconds, showHours) {
      //Default to true:
      showHours = showHours !== false;

      var hours = Math.floor(seconds / 3600);
      seconds -= hours * 3600;

      var minutes = Math.floor(seconds / 60);
      seconds -= minutes * 60;

      var outputString = "";

      if (hours > 23) {
        var days = Math.floor(hours / 24);
        var dayHours = hours % 24;

        if (days === 1) {
          outputString = "1 " + this.l10n.get('GenericDaySingular').toLowerCase();
        }
        else {
          outputString = days + " " + this.l10n.get('GenericDayPlural').toLowerCase();
        }

        if (dayHours === 1) {
          outputString += " 1 " + this.l10n.get('GenericHourSingular').toLowerCase();
        }
        else if (dayHours > 0) {
          outputString += " " + dayHours + " " + this.l10n.get('GenericHourPlural').toLowerCase();
        }
      } else {
        
        (hours < 10) && (hours = '0' + hours);
        (minutes < 10) && (minutes = '0' + minutes);
        (seconds < 10) && (seconds = '0' + seconds);

        if ( showHours ) {
          outputString = hours + ':' + minutes + ':' + seconds;
        } else {
          outputString = minutes + ':' + seconds;
        }
      }

      return outputString;
    },

    // Create CSS rules from the Config colours, for easier change later
    createColourStyles: function createColourStyles() {
      var COLOUR_TEMPLATE = '.{{id}}-color {' +
        'color: {{colour}};' +
        'border-color: {{colour}};' +
        '} ' +
        '{{id}} {' +
        'color: {{colour}};' +
        '} ' +
        '.mono-button.{{id}}-color:hover {' +
        'background-color: {{colourFadedDown}};' +
        '}';
      var cssText = '';
      var elStyle = document.createElement('style');

      for (var id in Config.COLOURS) {
        var colour = Config.COLOURS[id];

        cssText += COLOUR_TEMPLATE.format({
          'id': id.toLowerCase(),
          'colour': colour,
          'colourFadedDown': colour.replace(/\,\s?1\)/, ', 0.2)')
        });
      }

      cssText += 'highlight {' +
        'color: ' + Config.COLOURS.UTILITY + ';' +
        '}';

      elStyle.type = 'text/css';
      elStyle.innerHTML = cssText;

      document.body.appendChild(elStyle);
    },

    // Get the button which triggered the click event
    getMouseClickButton: function getMouseClickButton(e) {
      return e ?
        e.button === 0 ? 'left' :
          e.button === 1 ? 'middle' :
            e.button === 2 ? 'right' : ''
        : '';
    },

    getMatchingParent: function getMatchingParent(el, selector) {
      var functionName = 'webkitMatchesSelector' in el ? 'webkitMatchesSelector' :
        'matches' in el ? 'matches' :
          '';

      if (functionName) {
        while (el) {
          el = el.parentNode;

          if (el && el[functionName] && el[functionName](selector)) {
            return el;
          }
        }
      }

      return null;
    },

    // Show a loading indicator inside an element
    showLoading: function showLoading(el) {
      if (!el) {
        return;
      }

      // If there already is an indicator - do nothing
      var elLoading = el.querySelector('.loading-indicator');
      if (elLoading) {
        return;
      }

      elLoading = document.createElement('div');
      elLoading.className = 'loading-indicator';
      el.appendChild(elLoading);
    },

    hideLoading: function hideLoading(el) {
      if (!el) {
        return;
      }

      var elLoading = el.querySelector('.loading-indicator');
      if (elLoading) {
        elLoading.parentNode.removeChild(elLoading);
      }
    },

    resizeFontToFit: function resizeFontToFit(el, checkHeight) {
      if (!el) return;

      el.style.fontSize = '';
      var fontSize = parseFloat(window.getComputedStyle(el).fontSize);

      while (el.scrollWidth > el.offsetWidth) {
        fontSize = fontSize - 0.1;
        el.style.fontSize = fontSize + 'px';
      }
      if (checkHeight) {
        while (el.scrollHeight > el.offsetHeight) {
          fontSize = fontSize - 0.1;
          el.style.fontSize = fontSize + 'px';
        }
      }
    },

    onClick: function onClick(selector, listener, bDblClick) {
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) {
        return;
      }

      var e = bDblClick ? 'dblclick' : 'click';

      el.addEventListener(e, listener);

      return true;
    },

    reportEvent: function reportEvent(name, args) {
      !args && (args = {});

      args.uiEventID = name;

      if (!args.uiEventType) {
        args.uiEventType = 'Click';
      }

      // This event has been commented after receiving an email from deltaDNA for the excessive event spam
	    // However these information may be still needed in the future
      if (args.EventName) {
        name = args.EventName || 'uiEvent';
        delete args.EventName;

        // Add the current page the player is in
        var currentPage = window.Navigation && Navigation.getActiveViews(Navigation.MAIN);
        args.uiCurrentPage = ((currentPage || [])[0] || {}).id || '';

        // Force all arguments to be strings
        for (var k in args) {
          args[k] = '' + args[k];
        }

        window.engine.call('ReportEvent', name, args);
      }
    },

    exitGame: function exitGame() {
      window.engine.call('ExitGame');
    },

    dispatch: function dispatch(eventName, data) {
      var listeners = this.listeners[eventName] || [];
      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i]) {
          listeners[i](data);
        }
      }
    },

    on: function on(eventName, callback) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
      }

      this.listeners[eventName].push(callback);
    },

    off: function off(eventName, callback) {
      var listeners = this.listeners[eventName] || [];
      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i] === callback) {
          listeners[i] = null;
          break;
        }
      }
    },

    once: function once(eventName, callback) {
      function callbackOnce() {
        this.off(eventName, boundCallback);
        callback.apply(this, arguments);
      }

      var boundCallback = callbackOnce.bind(this);
      this.on(eventName, boundCallback);
    },

    // HTTP request helper
    get: function get(url, callback, dontAddCacheBusting) {
      var requestURL = url;
      if (!dontAddCacheBusting) {
        requestURL += (/\?/.test(url) ? '&' : '?') + '_cb=' + Date.now();
      }

      var self = this;

      var request = new XMLHttpRequest();
      request.responseType = 'json';
      request.open('GET', requestURL, true);

      request.onload = function onRequestLoad() {
        console.log('[Request] onload: ' + requestURL);
        var response = request.response;

        if (!response) {
          console.error('[Request] Error (no response): ' + requestURL);
          onError();
        } else {
          if (typeof response === 'string') {
            try {
              response = JSON.parse(response);
              console.log('[Request] Success');
            } catch (ex) {
              if ( request.hasOwnProperty("responseText")){
                console.warn('[Request] Invalid JSON (' + requestURL + '): ' + request.responseText);
              } else {
                console.warn('[Request] Invalid JSON (' + requestURL + ') no response text');
              }
            }
          }

          callback(response);
        }
      };

      request.onerror = function onRequestError() {
        console.error('[Request] Error: ' + requestURL);
        onError();
      };

      function onError() {
        if (dontAddCacheBusting) {
          callback();
        } else {
          self.get(url, callback, true);
        }
      }

      console.log('[Request] ' + requestURL);
      request.send();
    },

    // Random method with min and max limits
    random: function random(min, max) {
      if (Array.isArray(min) && max === undefined) {
        return min[window.utils.random(0, min.length - 1)];
      } else if (min === undefined && max === undefined) {
        return window.utils.random(0, 1) === 0;
      }

      return Math.round(Math.random() * (max - min)) + min;
    },

    // Prevent middle mouse button interaction (scrolling)
    onMouseDown: function onMouseDown(e) {
      if (e.which === 2 || e.button === 1) {
        e.preventDefault();
      }
      if (e.button === 2) {
        e.stopPropagation();
        e.preventDefault();
      }

    },

    onMouseOver: function onMouseOver(e) {
      var el = e.target;
      if (!el) {
        return;
      }

      function getElementHoverAudio(element) {
        var data = element.dataset || {};

        if (data.hasOwnProperty('audioHover') && data.audioHover === '') {
          return 'General_Highlight';
        } else {
          return data.audioHover;
        }
      }

      var audioId = getElementHoverAudio(el);
      var elAudio = el;

      if (!audioId) {
        do {
          elAudio = elAudio.parentNode;
          if (elAudio) {
            audioId = getElementHoverAudio(el);
          }
        } while (elAudio && !audioId);
      }

      if (audioId && audioId !== 'NONE' &&
        (audioId !== this.lastHoverAudioPlayed || !this.isSameNode(elAudio, this.lastHoverAudioPlayedEl))
      ) {
        if (window.getComputedStyle(elAudio).pointerEvents !== 'none') {
          AudioPlayer.play(AudioPlayer[audioId] ? AudioPlayer[audioId] : audioId);
        }
      }

      if (audioId !== 'NONE') {
        this.lastHoverAudioPlayedEl = elAudio;
        this.lastHoverAudioPlayed = audioId;
      }
    },

    onDocumentKeyDown: function onDocumentKeyDown(e) {
      if (e.keyCode === 9) { // TAB Key
        e.preventDefault();
      }
    },

    onInputchange: function onInputchange(e) {
      var el = e.target;

      if (!el.classList.contains('uicheckbox')) {
        return;
      }

      var elParent = el.parentNode;
      if (elParent.tagName.toUpperCase() === 'LABEL') {
        if (el.checked) {
          elParent.classList.add('checked');
        } else {
          elParent.classList.remove('checked');
        }
      }
    },

    onDocumentClick: function onDocumentClick(e) {
      var el = e.target;
      if (!el) {
        return;
      }

      var data = el.dataset || {};
      var href = el.getAttribute('href') || data.href;
      var page = data.pageLink;
      var eventReport = data.report;
      var crewSoundId = data.crewSoundId;
      var crewFullscreenId = data.crewFullscreenId;
      var audioId = data.audioClick;
      var engineEvent = data.engineEvent;

      if (eventReport) {
        try {
          eventReport = JSON.parse(eventReport);
        } catch (ex) {
          console.error('[Analytics] Error parsing event data: ', eventReport);
          eventReport = null;
        }

        if (eventReport) {
          var eventName = eventReport.Name;
          delete eventReport.Name;
          window.utils.reportEvent(eventName, eventReport);
        }
      }

      if (audioId) {
        var audio = AudioPlayer[audioId] ? AudioPlayer[audioId] : audioId;
        AudioPlayer.play(audio);
      }

      if (href) {
        // window.engine.call('OpenURL', href);
        window.engine.call('OpenURLViaOverlay', href);
        e.preventDefault();
      }

      if (page) {
        Navigation.show(page, data.pageLinkSource || '');
      }

      if (crewSoundId) {
        window.engine.call('AudioPlay_CrewMember', crewSoundId);
      }

      if (crewFullscreenId) {
        AudioPlayer.play(AudioPlayer.General_Confirm);
        Navigation.show(Navigation.VIEWS.CREW_MEMBER, 'crew-link', function onShow() {
          window.utils.dispatch('CrewMember_Show', {
            'id': crewFullscreenId
          });
        });
      }

      if (engineEvent) {
        //can pass in comma separated arguments e.g. data-engine-event="LaunchProvingGrounds,1" 
        if (engineEvent.indexOf(',') !== -1) {
          var params = engineEvent.split(',');
          for (var i = 0; i < params.length; i++) {
            var param = params[i].toString().trim();
            if (!isNaN(param)) {
              param = parseFloat(param);
            } else if (param === 'true' || param === 'false') {
              param = (param === 'true');
            }
            params[i] = param;
          }
          engine.call.apply(engine, params);
        } else {
          engine.call(engineEvent);
        }

        e.stopPropagation();
      }
    },

    isSameNode: function isSameNode(elA, elB) {
      if (!elA && !elB) {
        return false;
      }

      if (elA && !elB || !elA && elB) {
        return false;
      }

      var dataA = elA.dataset || {},
        dataB = elB.dataset || {},
        idA = dataA.id,
        idB = dataB.id;

      if (idA && !idB) {
        return false;
      }
      if (!idA && idB) {
        return false;
      }
      if (idA && idB && idA === idB) {
        return true;
      }

      return elA.isEqualNode(elB);
    },

    cloneElement: function cloneElement(el) {
      var clonedElement = document.createElement(el.tagName);

      clonedElement.innerHTML = el.innerHTML;
      clonedElement.className = el.className;

      for (var k in el.dataset) {
        if (el.dataset.hasOwnProperty(k)) {
          clonedElement.dataset[k] = el.dataset[k];
        }
      }

      clonedElement.style.cssText = el.style.cssText;

      return clonedElement;
    },

    addClick: function addClick(el, callback) {
      el.addEventListener('mousedown', (function onClick(callback) {
        return function onClick(e) {
          if (e.which === 1) {
            callback(e);
          }
        };
      }(callback)));
    },

    animateStats: function animateStats(el) {
      var elStats = el.querySelectorAll('.stat');

      for (var i = 0, len = elStats.length; i < len; i++) {
        var elTracks = elStats[i].querySelectorAll('[data-scale]');

        for (var j = 0, len2 = elTracks.length, elTrack; j < len2; j++) {
          elTrack = elTracks[j];

          elTrack.style.transform = 'scaleX(' + elTrack.dataset.scale / 100 + ')';
        }
      }
    },

    polarToCartesian: function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    },

    describeArc: function describeArc(x, y, radius, startAngle, endAngle) {
      if (endAngle === 360) {
        endAngle = 359.99;
      }

      var start = this.polarToCartesian(x, y, radius, endAngle),
        end = this.polarToCartesian(x, y, radius, startAngle),
        arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

      var d = [
        'M', start.x, start.y,
        'A', radius, radius, 0, arcSweep, 0, end.x, end.y
      ].join(' ');

      return d;
    },

    generateLevel: function generateLevel(el) {
      if (!el) {
        return;
      }

      if (!el.dataset.isReady) {
        if (!el.offsetWidth) {
          window.clearTimeout(el.timeoutLevel);
          el.timeoutLevel = window.setTimeout(this.generateLevel.bind(this, el), 50);
          return;
        }
        el.dataset.isReady = true;
      }

      var data = el.dataset || {};
      var level = data.level || 0;
      var colour = Config.COLOURS[data.colour || 'LEVEL'] || data.colour || 'rgba(255, 255, 255, 1)';
      var bgColour = Config.COLOURS[data.backgroundColour] || data.backgroundColour || 'rgba(255, 255, 255, .15)';
      var background = Config.COLOURS[data.backgroundFillColour] || data.backgroundFillColour || 'rgba(0, 0, 0, .4)';
      var progress = data.progress || 0;
      var endMarker = data.endMarker || false;
      var pathTooltip = data.pathTooltip || null;
      var MARGIN = ('margin' in data ? data.margin : 3) * 1;
      var CONTAINER_SIZE = Math.max(el.offsetWidth, el.offsetHeight, 10);
      var SIZE = Math.max((CONTAINER_SIZE || data.levelSize || 0) - MARGIN * 2, 0);
      var PADDING = ('padding' in data ? data.padding : 0) * 1;
      var key = level + '_' + progress + '_' + colour + '_' + bgColour + '_' + SIZE;
      var LINE_SIZE = (data.lineSize || 3) * 1;
      var BG_LINE_SIZE = (data.bgLineSize || 3) * 1;
      var radius = SIZE / 2;
      var elLevel = el.querySelector('b');
      var elProgress = el.querySelector('svg');
      var elPath;
      var elBackgroundPath;
      var elEndMarker;
      var elEndMarkerCircle;
      var elDefs;
      var elEndMarkerId;

      if (data.key === key || SIZE < 0) {
        return;
      }

      if (!elLevel) {
        elLevel = document.createElement('b');
        elLevel.classList.add('radial-level-value');
        el.appendChild(elLevel);
      }
      elLevel.innerHTML = level;

      if (!elProgress) {
        elProgress = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        elProgress.classList.add('radial-level-ring');
        elProgress.setAttribute('version', '1.1');
        elProgress.setAttribute('width', SIZE + 'px');
        elProgress.setAttribute('height', SIZE + 'px');
        elProgress.setAttribute('shape-rendering', 'geometricPrecision');

        elPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        elPath.setAttribute('stroke-width', LINE_SIZE + 1);
        elPath.setAttribute('stroke', colour);
        elPath.setAttribute('fill', 'transparent');

        elBackgroundPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        BG_LINE_SIZE = BG_LINE_SIZE || Math.max(LINE_SIZE - 1, 2);
        elBackgroundPath.setAttribute('stroke-width', BG_LINE_SIZE);
        elBackgroundPath.setAttribute('stroke', bgColour);
        elBackgroundPath.setAttribute('fill', background);

        elProgress.appendChild(elBackgroundPath);
        elProgress.appendChild(elPath);

        //If marker - create marker?
        if (endMarker) {
          elDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          elEndMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          elEndMarkerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

          elEndMarkerId = "end-marker-" + Math.ceil(Math.random() * 999999);

          elEndMarkerCircle.setAttribute('cx', (LINE_SIZE + 1));
          elEndMarkerCircle.setAttribute('cy', (LINE_SIZE + 1));
          elEndMarkerCircle.setAttribute('r', (LINE_SIZE + 1) * 0.5);
          elEndMarkerCircle.setAttribute('stroke', colour);
          elEndMarkerCircle.setAttribute('fill', colour);

          elEndMarker.setAttribute('id', elEndMarkerId);
          elEndMarker.setAttribute('markerWidth', (LINE_SIZE + 1) * 2);
          elEndMarker.setAttribute('markerHeight', (LINE_SIZE + 1) * 2);
          elEndMarker.setAttribute('refX', (LINE_SIZE + 1));
          elEndMarker.setAttribute('refY', (LINE_SIZE + 1));

          elEndMarker.appendChild(elEndMarkerCircle);
          elDefs.appendChild(elEndMarker);
          elProgress.appendChild(elDefs);

          elPath.setAttribute("marker-start", "url(#" + elEndMarkerId + ")");
        }

        el.appendChild(elProgress);
      }

      if (data.size * 1 !== CONTAINER_SIZE) {
        elProgress.setAttribute('width', (SIZE + PADDING) + 'px');
        elProgress.setAttribute('height', (SIZE + PADDING) + 'px');

        elBackgroundPath = el.querySelector('path:nth-child(1)');
        if (elBackgroundPath) {
          var bgArc = this.describeArc(radius + MARGIN,
            radius + MARGIN,
            radius - MARGIN - LINE_SIZE,
            0,
            360);
          elBackgroundPath.setAttribute('d', bgArc);
        }

      }

      if (!elPath) {
        elPath = el.querySelector('path:nth-child(2)');
      }
      elPath.setAttribute('stroke', colour);
      if (pathTooltip) {
        elPath.dataset.tooltip = pathTooltip;
      }

      if (!elBackgroundPath) {
        elBackgroundPath = el.querySelector('path:nth-child(1)');
      }
      elBackgroundPath.setAttribute('stroke', bgColour);

      data.key = key;
      data.size = CONTAINER_SIZE;

      this.setPath(el);

      data.oldProgress = progress;
    },

    setPath: function setPath(el) {
      var self = this,
        elPath = el.querySelector('path:nth-child(2)'),
        data = el.dataset || {},
        elementSize = Math.max(el.offsetWidth, el.offsetHeight),
        MARGIN = ('margin' in data ? data.margin : 3) * 1,
        SIZE = elementSize - MARGIN * 2,
        LINE_SIZE = (data.lineSize || 3) * 1,
        radius = SIZE / 2,
        SPEED = Config.STATS_ANIMATION_SPEED || 0,
        shouldAnimate = data.animate === 'true' && SPEED,
        oldProgress = (data.oldProgress || 0) * 1,
        progressTarget = data.progress * 1,
        progress = shouldAnimate ? oldProgress : progressTarget,
        startAngle = (data.startAngle || 0) * 1,
        lastUpdate = 0,
        isOver = progressTarget > oldProgress,
        speed = isOver ? SPEED : -SPEED;

      function updatePath() {
        var now = Date.now(),
          dt = (now - lastUpdate) / 1000;

        progress += (speed * dt);

        if ((isOver && progress > progressTarget) ||
          (!isOver && progress < progressTarget)) {
          progress = progressTarget;
        }

        var endAngle = startAngle + (progress / 100 * 360);
        var arc = self.describeArc(radius + MARGIN,
          radius + MARGIN,
          radius - MARGIN - LINE_SIZE,
          startAngle,
          endAngle);

        if (startAngle !== endAngle) {
          elPath.setAttribute('d', arc);
        }

        if ((isOver && progress < progressTarget) ||
          (!isOver && progress > progressTarget)) {
          lastUpdate = now;
          window.requestAnimationFrame(updatePath);
        }
      }

      lastUpdate = Date.now();
      window.requestAnimationFrame(updatePath);
    },

    // Update the UI with binding properties from the 'scope' object
    // Used by adding data-bind attribute to an element, with two usages:
    // data-bind="PROPERTY" - will replace the innerHTML with the element with that property
    // data-bind='{"elementPropertyName": "dataPropertyName"}'
    updateScope: function updateScope(properties, view) {
      !view && (view = {});

      //Use view.el, or view if it is an HTMLElement, or document
      var elContainer = view.el || (view instanceof HTMLElement ? view : document);
      var els = elContainer.querySelectorAll('[data-bind]');

      els = Array.prototype.slice.call(els);

      for (var i = 0, len = els.length, el; i < len; i++) {
        el = els[i];

        var bindTo = el.dataset.bind;
        try {
          bindTo = JSON.parse(bindTo);
        } catch (ex) { }

        if (typeof bindTo === 'object') {
          for (var propertyInElement in bindTo) {
            var propertyName = bindTo[propertyInElement],
              value = get(propertyName);

            if (value !== undefined) {
              if (propertyInElement.indexOf('style-') === 0) {
                var styleProperty = propertyInElement.replace('style-', '');
                if (styleProperty === 'backgroundImage') {
                  el.style[styleProperty] = 'url(' + value + ')';
                } else {
                  el.style[styleProperty] = value;
                }
              } else if (propertyInElement.indexOf('data-') === 0) {
                el.dataset[propertyInElement.replace('data-', '')] = value;
              } else if (propertyInElement === 'value') {
                el.value = value;
              } else {
                el[propertyInElement] = value;
              }
            }
          }
        } else {
          var value = get(bindTo);
          if (value !== undefined) {
            if (typeof value === 'string') {
              if (!('dontSanitise' in el.dataset)) {
                value = value.sanitise();
              }

              if ('bindLineBreaks' in el.dataset) {
                value = value.replace(/\n/g, '<br />');
              }
            }

            if ('bindTicker' in el.dataset) {
              var currentValue = parseInt(el.dataset.currentValue || 0);
              var targetValue = parseInt(value.replace(/,/g, ''));
              var diff = targetValue - currentValue;
              var duration = parseInt(el.dataset.tickerDuration);
              var step = 7;
              var isCountingUp = diff !== 0;

              if (duration) {
                step = diff / (duration / (1000 / 60));
              }

              el.dataset.step = step;
              el.dataset.targetValue = targetValue;

              if (el.dataset.sendTickEvents) {
                var e = new CustomEvent('TickerStart', {
                  'detail': {
                    'currentValue': currentValue,
                    'targetValue': targetValue,
                    'isCountingUp': isCountingUp
                  }
                });
                el.dispatchEvent(e);
              }

              this.tickValues(el, isCountingUp);
            } else {
              el.innerHTML = value;
            }
          }
        }
      }

      // Get the value for the given key - support
      // (f) to automatically format a number
      function get(key) {
        var shouldForamt = false;

        if (key.indexOf('(f)') === 0) {
          shouldForamt = true;
          key = key.replace('(f)', '');
        }

        key = key.split('.');
        var value = properties;
        for (var i = 0, len = key.length; i < len; i++) {
          value = value && value[key[i]];
        }

        if (shouldForamt && value !== undefined) {
          value = window.utils.numberWithCommas(value);
        }

        return value;
      }

      this.updateSaleTimers(elContainer);
    },

    tickValues: function tickValues(el, isCountingUp) {
      var current = el.dataset.currentValue;
      var dt = 1000 / 60;
      var target = parseFloat(el.dataset.targetValue);

      window.clearTimeout(el.dataset.timeoutTick);

      // First time updating the value - simply set it
      // Don't want counting up from 0 each time
      if (current === undefined) {
        el.textContent = this.numberWithCommas(target);
        el.dataset.currentValue = target;

        if (el.dataset.sendTickEvents) {
          var e = new CustomEvent('TickerEnd', {
            'detail': {
              'isCountingUp': isCountingUp
            }
          });
          el.dispatchEvent(e);
        }

        el.dataset.sendTickEvents = 'true';

        return;
      }

      current = parseFloat(current);

      if (current < target) {
        var step = parseFloat(el.dataset.step);

        el.dataset.currentValue = Math.min(current + step, target);
        el.textContent = this.numberWithCommas(Math.round(el.dataset.currentValue));

        if (!el.dataset.tickerDuration) {
          el.dataset.step = step + 3;
        }

        el.dataset.timeoutTick = window.setTimeout(this.tickValues.bind(this, el, isCountingUp), dt);
      } else {
        el.dataset.currentValue = target;
        el.textContent = this.numberWithCommas(Math.round(el.dataset.currentValue));

        var e = new CustomEvent('TickerEnd', {
          'detail': {
            'isCountingUp': isCountingUp
          }
        });
        el.dispatchEvent(e);
      }
    },

    // Format a number with commands for thousands
    bindSVGContent: function bindSVGContent( el ) {
      var elList = el.querySelectorAll("[data-svg-content]");
      for ( var i = 0; i < elList.length; i++ ) {
        var elSVGWrapper = elList[i];
        var svgLocation = elSVGWrapper.dataset.svgContent;
        
        Load.html( svgLocation, function(wrapper, content){
          wrapper.innerHTML = content;
        }.bind(this, elSVGWrapper));
      }
    },

    // Format a number with commands for thousands
    numberWithCommas: function numberWithCommas(number) {
      return (number || 0).toString().replace(REGEX_NUMBERS, ',');
    },

    // Add all audio events that need to be stopped here when 
    // player loads into a loading screen
    preventAudioEvents: function preventAudioEvents() {

      // Platinum stop
      AudioPlayer.play(AudioPlayer.Platinum_Anim_End);

    },

    roundDecimal: function roundDecimal(number) {
      return Math.round(number * 1e2) / 1e2;
    },

    findAncestor: function findAncestor(el, cls) {
      if (cls.charAt(0) === '.') {
        cls = cls.slice(1);
      }
      while ((el = el.parentElement) && !el.classList.contains(cls));
      return el;
    },

    shortenNumber: function shortenNumber(number, suffixes, padDecimal) {
      var num = parseInt(number);
      //Quick NaN check
      if (isNaN(num)) {
        return number;
      }
      num = "" + num;

      var numLengths = suffixes || [null, "k", "M", "B"];
      var numLen = Math.floor((num.length - 1) / 3);

      if (numLengths[numLen]) {
        var rounded = (num / Math.pow(1000, numLen));
        if (rounded.toString().indexOf(".") === -1 && padDecimal) {
          rounded = rounded + ".0";
        }
        return rounded + numLengths[numLen];
      }

      return num;

    },

    getPercentage: function getPercentage(current, max) {
      return this.roundDecimal((current / max) * 100);
    },

    charCount: function charCount(el, messageID, max) {
      var elMessage = document.getElementById(messageID);
      if (!el || !elMessage) {
        return;
      }
      var charCount = max - el.value.length;
      if (charCount > max) {
        charCount = max;
      }
      if (charCount < 0) {
        charCount = 0;
      }
      elMessage.textContent = charCount;
    },

    lengthOfDecimals: function lengthOfDecimals(num) {
      var match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
      if (!match) { return 0; }
      return Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0));
    },

    videoTimeUpdate: function videoTimeUpdate(selector, pointInVideo, callback, options) {
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;

      if (!el) {
        console.error('[Video Time Update] Element/Selector doesn\'t exist.');
        return false;
      }

      !options && (options = {});

      el.addEventListener('timeupdate', function () {
        if (el.currentTime >= pointInVideo) {
          el.removeEventListener('timeupdate', arguments.callee, false);
          callback(el, options);
        }
      }, false);

      return true;
    },

    convertFirelineToGuid: function convertFirelineToGuid(fId) {
      return fId.toUpperCase().replace(/-/g, '');
    },

    parseStringToHTML: function parseStringToHTML(string) {
      var child = document.createElement('div');
      child.innerHTML = string;
      child = child.firstChild;
      return child;
    },

    bindSVGContent: function bindSVGContent( el , callback ) {
      var elList = Array.prototype.slice.call(el.querySelectorAll("[data-svg-content]"));
      if (el.dataset.svgContent) {
        elList.push(el);
      }
      for ( var i = 0; i < elList.length; i++ ) {
        var elSVGWrapper = elList[i];
        var svgLocation = elSVGWrapper.dataset.svgContent;
        
        Load.html( svgLocation, function(wrapper, content){
          wrapper.innerHTML = content;

          callback && callback();
        }.bind(this, elSVGWrapper));
      }
    },

    loadFiringRange: function loadFiringRange(okCallback) {
      var playerShip = DataStore.getShip(Player.getShip());
  
      if (playerShip) {
        try {
          this.reportEvent(Config.ANALYTICS.FIRING_RANGE_POPUP_OPEN, {
            'shipName': playerShip.name,
            'shipGUID': playerShip.Id,
            'isShipOwned': Boolean(playerShip.owned),
            'uiEventType': Config.ANALYTICS.UI_EVENT_TYPES.CLICK
          });
        } catch (e) { console.error("Error firing analytics"); }
  
        var message = lobby.state === lobby.STATES.NOT_READY ? this.l10n.get('LaunchFiringRangeNoLobby').replace('{X}', playerShip.name) : this.l10n.get('LaunchFiringRangeLobby');
        this.dispatch('ShowStatus', {
          'id': 'launch-firing-range',
          'message': message,
          'showOK': this.l10n.get('GenericLabelLaunch'),
          'showCancel': this.l10n.get('GenericLabelCancel'),
          'onOK': function onClickOK() {
            try {
              this.reportEvent(Config.ANALYTICS.FIRING_RANGE_OPEN, {
                'uiEventType': Config.ANALYTICS.UI_EVENT_TYPES.NAVIGATION
              });
            } catch (e) { console.error("Error firing analytics"); }
            if (typeof okCallback === "function"){
              okCallback();
            }
            engine.call('TryShipInFiringRange', playerShip.Id);
          },
          'onCancel': function onClickCancel() {
            try {
              this.reportEvent(Config.ANALYTICS.FIRING_RANGE_POPUP_CANCEL, {
                'uiEventType': Config.ANALYTICS.UI_EVENT_TYPES.CLICK
              });
            } catch (e) { console.error("Error firing analytics"); }
          }
        });
      }
    },

    secondsToString: function secondsToString( seconds ) {
      return (seconds < 60 ) ? Math.floor(seconds).toString() : Math.floor(seconds / 60) + ":" + Math.Floor(seconds % 60);
    }
  };

  return new utils();
}());

var EventDispatcher = (function EventDispatcher() {
  function EventDispatcher() {
    this._listeners = {};
  }

  EventDispatcher.prototype.dispatch = function dispatch(eventName, data) {
    if (!this._listeners) {
      this._listeners = {};
    }

    var listeners = this._listeners[eventName] || [];
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i](data);
    }
  };

  EventDispatcher.prototype.on = function on(eventName, callback) {
    if (!this._listeners) {
      this._listeners = {};
    }

    if (!this._listeners[eventName]) {
      this._listeners[eventName] = [];
    }

    this._listeners[eventName].push(callback);
  };

  EventDispatcher.prototype.off = function off(eventName, callback) {
    if (!this._listeners) {
      this._listeners = {};
    }

    var listeners = this._listeners[eventName] || [];
    for (var i = 0, len = listeners.length; i < len; i++) {
      if (listeners[i] === callback) {
        listeners.splice(i, 1);
        break;
      }
    }
  };

  EventDispatcher.prototype.once = function once(eventName, callback) {
    if (!this._listeners) {
      this._listeners = {};
    }

    this.on(eventName, function callbackOnce() {
      this.off(eventName, callbackOnce);
      callback.apply(this, arguments);
    }.bind(this));
  };

  return EventDispatcher;
}());

var UIHighlighter = (function UIHighlighter() {
  function UIHighlighter() {
    this.elHelperText = null;
    this.elHelperContent = null;
    this.element = null;
    this.isVisible = false;
  }

  UIHighlighter.prototype.init = function init() {
    this.elHelperText = document.querySelector('.highlight-helper-text');

    if (this.elHelperText) {
      this.elHelperContent = this.elHelperText.querySelector('.content');
    }

    window.addEventListener('resize', this.onResize.bind(this));
  };

  UIHighlighter.prototype.highlightInHeader = function highlightInHeader(element, text, position) {
    this.highlight('header', element, text, position);
  };

  UIHighlighter.prototype.highlightInHangar = function highlightInHeader(element, text, position) {
    this.highlight('hangar', element, text, position);
  };

  UIHighlighter.prototype.highlightInMain = function highlightInMain(element, text, position) {
    this.highlight('main', element, text, position);
  };

  UIHighlighter.prototype.highlightElement = function highlightElement(element, text, position) {
    this.highlight('', element, text, position);
  };

  UIHighlighter.prototype.highlight = function highlight(type, element, text, position) {
    var wasVisible = false;

    if (this.isVisible && this.elHelperText.classList.contains('visible')) {
      var transitionEnd = function () {
        this.elHelperText.removeEventListener('webkitTransitionEnd', transitionEnd);
        this.highlight(type, element, text, position);
      }.bind(this);

      this.elHelperText.addEventListener('webkitTransitionEnd', transitionEnd);

      this.remove();

      wasVisible = true;
    }

    switch (type) {
      case 'header':
        document.body.classList.add('highlight-in-header');
        document.body.classList.remove('highlight-in-main');
        document.body.classList.remove('highlight-in-hangar');
        break;
      case 'hangar':
        document.body.classList.add('highlight-in-hangar');
        document.body.classList.remove('highlight-in-header');
        document.body.classList.remove('highlight-in-main');
        break;
      case 'main':
        document.body.classList.add('highlight-in-main');
        document.body.classList.remove('highlight-in-header');
        document.body.classList.remove('highlight-in-hangar');
    }

    if (!wasVisible) {
      this.position = position;
      this.elHelperContent.innerHTML = text || '';

      this.isVisible = true;

      if (typeof element === 'string') {
        element = document.querySelector(element);
      }

      if (element) {
        element.classList.add('highlight-enable');
        this.element = element;

        this.attachHelperToElement();

        this.elHelperText.classList.add('visible');
      }
    }
  };


  UIHighlighter.prototype.remove = function remove() {
    if (this.element) {
      this.element.style.display = '';
      this.element.classList.remove('highlight-enable');
      this.element = null;
    }

    document.body.classList.remove('highlight-in-header');
    document.body.classList.remove('highlight-in-main');
    document.body.classList.remove('highlight-in-hangar');

    this.elHelperText.classList.remove('visible');

    this.isVisible = false;
  };

  UIHighlighter.prototype.attachHelperToElement = function attachHelperToElement() {
    var element = this.element;
    var position = this.position;

    if (!element || !this.isVisible) {
      return;
    }

    if (window.getComputedStyle(element).display === 'none') {
      element.style.display = 'block';
    }

    var bounds = element.getBoundingClientRect();
    if (!bounds.left && !bounds.right && !bounds.top && !bounds.bottom) {
      window.setTimeout(this.attachHelperToElement.bind(this), 50);
      return;
    }

    var size = this.elHelperText.getBoundingClientRect();
    var top = bounds.top;
    var bottom = window.innerHeight - top - bounds.height;
    var left = bounds.left;
    var right = window.innerWidth - left - bounds.width;
    var midX = left + bounds.width / 2;
    var midY = top + bounds.height / 2;
    var x = 0;
    var y = 0;

    // If a position wasn't specifically passed - deduce it from where the element is
    if (!position) {
      if (top < left && top < right) {
        position = 'bottom';
      } else if (bottom < left && bottom < right) {
        position = 'top';
      } else if (left < top && left < bottom) {
        position = 'right';
      } else if (right < top && right < bottom) {
        position = 'left';
      }
    }

    if (position === 'top') {
      x = midX - size.width / 2;
      y = top - size.height;
    } else if (position === 'bottom') {
      x = midX - size.width / 2;
      y = top + bounds.height;
    } else if (position === 'left') {
      x = left - size.width;
      y = midY - size.height / 2;
    } else if (position === 'right') {
      x = bounds.left + bounds.width;
      y = midY - size.height / 2;
    }

    x = Math.round(x);
    y = Math.round(y);

    this.elHelperText.dataset.position = position;
    this.elHelperText.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

    window.setTimeout(this.attachHelperToElement.bind(this), 50);
  };

  UIHighlighter.prototype.onResize = function onResize() {
    if (this.element) {
      this.attachHelperToElement(this.element, this.position);
    }
  };

  return new UIHighlighter();
}());

// Switch between elements with blinking animation
var TextSwitcher = (function () {
  function TextSwitcher(options) {
    this.el;
    this.template;

    this.elCurrent;

    this.duration = 0;

    this.variation = 0;
    this.middleSkew = 0;

    this.VARIATION = 0.07;
    this.MIDDLE_SKEW = 35;

    this.DURATION = 0.2;
    this.HIDE_FRAMES = [
      { percent: 0.00, opacity: 1.0 },
      { percent: 0.10, opacity: 0.9 },
      { percent: 0.20, opacity: 0.1 },
      { percent: 0.40, opacity: 1.0, skewX: 0 },
      { percent: 0.60, opacity: 0.5, skewX: -35 },
      { percent: 0.70, opacity: 0.8, skewX: 0 },
      { percent: 0.90, opacity: 0.1, background: 'rgba(255,255,255,.1)' },
      { percent: 1.00, opacity: 0.0, background: 'rgba(255,255,255,0)' }
    ];
    this.SHOW_FRAMES = [
      { percent: 0.00, opacity: 0.0 },
      { percent: 0.10, opacity: 0.1 },
      { percent: 0.20, opacity: 0.8, background: 'rgba(255,255,255,.1)' },
      { percent: 0.40, opacity: 0.5, skewX: 0 },
      { percent: 0.60, opacity: 1.0, skewX: 35, background: 'rgba(255,255,255,0)' },
      { percent: 0.70, opacity: 0.1, skewX: 0 },
      { percent: 0.90, opacity: 0.9 },
      { percent: 1.00, opacity: 1.0 }
    ];

    this.init(options);
  }

  TextSwitcher.prototype = {
    init: function init(options) {
      this.elContainer = options.el;
      this.el = document.createElement('div');
      this.template = options.template;

      this.duration = options.duration || this.DURATION;
      this.variation = 'variation' in options ? options.variation : this.VARIATION;

      this.el.classList.add('text-switcher');
      this.elContainer.appendChild(this.el);
    },

    set: function set(newObject, bSkipAnimation) {
      if (bSkipAnimation) {
        this.elCurrent.innerHTML = this.template ? this.template.format(newObject) : newObject;
        return;
      }

      this.hide();

      var el = newObject;

      if (!(newObject instanceof HTMLElement)) {
        el = document.createElement('div');
        var html = this.template ? this.template.format(newObject) : newObject;
        el.innerHTML = html.sanitise();
      }

      this.el.appendChild(el);
      this.show(el);
    },

    clear: function clear() {
      this.hide();
    },

    show: function show(el) {
      this.elCurrent = el;

      this.elCurrent.style.animationDuration = (this.duration + this.random()) + 's';
      this.elCurrent.addEventListener('webkitAnimationEnd', function onAnimationEnd(e) {
        e.target.removeEventListener('webkitAnimationEnd', onAnimationEnd);
        e.target.classList.remove('animate-show');
      });
      this.elCurrent.classList.add('animate-show');
    },

    hide: function hide() {
      if (this.elCurrent) {
        this.elCurrent.parentNode.removeChild(this.elCurrent);
      }
    },

    random: function random() {
      return Math.round((Math.random() * this.variation * 2 - this.variation) * 100) / 100;
    }
  };

  return TextSwitcher;
}());

var StatusHelper = (function () {

  function StatusHelper() {
    this.elCurrent;
    this.visible = false;
    this.current;

    // Auto hide these IDs after these timeouts
    this.autoHideAfter = {
      'searchinggames': 8000
    };
    this.timeoutAutoHide = null;
  }

  StatusHelper.prototype = {
    init: function init() {
      // Hide/show from the Engine
      engine.on('Status_Show', this.show.bind(this));
      engine.on('Status_Hide', this.hide.bind(this));

      // Hide/show from the UI
      utils.on('ShowStatus', this.onShowUIStatus.bind(this));
      utils.on('HideStatus', this.onHideUIStatus.bind(this));

      // on hide and on show events from the Status object itself
      utils.on('Status_Shown', this.onStatusShown.bind(this));
      utils.on('Status_Hidden', this.onStatusHidden.bind(this));

      window.addEventListener('keyup', this.onKeyPress.bind(this));
    },

    onKeyPress: function onKeyPress(e) {
      var key = e.keyCode;

      // ENTER
      switch (key) {
        case 13:
          if (this.visible) {
            this.sendOK();
            return;
          }
          break;
        case 27:
          if (Config.SUNSET_POPUP_DELAYED) {
            break;
          }
          var isFTUEVisible = 'FTUEFlow' in window && FTUEFlow.isVisible;
          if (!isFTUEVisible && !DataStore.isInDrafting) {
            // Close status windows (send Cancel)
            if (this.visible) {
              this.sendCancel();
              return;
            }

            if ('Navigation' in window) {
              // Close overlay if one is visible, otherwise show menu
              if (Navigation.isOverlayVisible()) {
                Navigation.hideOverlay();
              } else {
                Navigation.show(Navigation.VIEWS.OPTIONS, 'escKey');
              }
            }
          }
          break;
      }
    },

    // No arguments since later on we pass them all to the view itself
    show: function show(options) {
      if (this.visible) {
        this.hide();
      }

      this.current = options;

      Navigation.show(Navigation.VIEWS.STATUS, function onStatusViewReady() {
        window.Status.show(this.current);
      }.bind(this));

      if (options.Id in this.autoHideAfter) {
        window.clearTimeout(this.timeoutAutoHide);
        this.timeoutAutoHide = window.setTimeout(this.hide.bind(this),
          this.autoHideAfter[options.Id]);
      }
    },

    hide: function hide() {
      window.clearTimeout(this.timeoutAutoHide);

      if (window.Status) {
        window.Status.hide();
      }
    },

    onStatusShown: function onStatusShown() {
      this.visible = true;
    },

    onStatusHidden: function onStatusHidden() {
      this.visible = false;
      Navigation.hide(Navigation.VIEWS.STATUS);
    },

    isVisible: function isVisible() {
      return this.visible;
    },

    onHideUIStatus: function onHideUIStatus() {
      this.hide();
    },

    onShowUIStatus: function onShowUIStatus(data) {
      var message = data.message || '',
        status = EngineStructs.StatusWindow(
          data.id,
          data.title,
          message,
          !!data.showActivity,
          data.showOK,
          data.showCancel,
          data.onOK,
          data.onCancel,
          data.onShow,
          data.classes
        );

      console.info('[UI] Show Status:', status);

      this.show(status);
    },

    sendOK: function sendOK() {
      if (!this.visible || !this.current.ShowOKButton) {
        return;
      }

      window.Status && window.Status.onOK();
    },

    sendCancel: function sendCancel() {
      if (!this.visible || !this.current.ShowCancelButton) {
        return;
      }

      window.Status && window.Status.onCancel();
    }
  };

  return new StatusHelper();
}());

var PlayersInfo = (function PlayersInfo() {
  function PlayersInfo() {
    this.players = {};

    this.requesting = {};

    this.DEFAULT_PLAYER_INFO = {
      'personaname': '',
      'avatar': 'images/default-avatar.png',
      'avatarmedium': 'images/default-avatar.png',
      'avatarfull': 'images/default-avatar.png',
      'ready': false
    };
  }

  PlayersInfo.prototype = Object.create(EventDispatcher.prototype);

  PlayersInfo.prototype.get = function get(id) {
    return this.players[id] || this.DEFAULT_PLAYER_INFO;
  };

  /*
   * Returns true if players are being loaded, otherwise, returns false.
   */
  PlayersInfo.prototype.load = function load(ids, callback) {
    var self = this;
    ids = Array.isArray(ids) ? ids : [ids];
    ids = ids.map(String).filter(function (id, index, all) {
      return id && id.length <= 128 && all.indexOf(id) === index;
    }).slice(0, 32);
    if (!ids.length) { if (callback) callback(); return false; }
    var remaining = ids.length;
    function done() { remaining--; if (!remaining && callback) callback(); }
    this.avatarWaiters = this.avatarWaiters || {};
    ids.forEach(function (id) {
      if (self.players[id] && self.players[id].ready) { done(); return; }
      if (self.avatarWaiters[id]) { self.avatarWaiters[id].push(done); return; }
      self.avatarWaiters[id] = [done];
      self.requesting[id] = true;
      var request = new XMLHttpRequest();
      var finished = false;
      function finish(response) {
        if (finished) return;
        finished = true;
        var players = response && response.response && response.response.players;
        var info = players && players[0];
        if (!info || info.steamid !== id) {
          info = {steamid: id, personaname: '', avatar: 'images/default-avatar.png',
            avatarmedium: 'images/default-avatar.png', avatarfull: 'images/default-avatar.png'};
        }
        self.onGotSteamResponse({response: {players: [info]}});
        var waiters = self.avatarWaiters[id];
        delete self.avatarWaiters[id];
        waiters.forEach(function (fn) { fn(); });
      }
      request.onreadystatechange = function () {
        if (request.readyState !== 4) return;
        var body = null;
        if (request.status === 200) { try { body = JSON.parse(request.responseText); } catch (_) {} }
        finish(body);
      };
      request.onerror = request.ontimeout = function () { finish(null); };
      request.open('GET', 'http://127.0.0.1:27173/avatars?steamids=' + encodeURIComponent(id), true);
      request.timeout = 14000;
      request.send();
    });
    return true;
  };

  PlayersInfo.prototype.onGotSteamResponse = function onGotSteamResponse(response) {
    var players = ((response || {}).response || {}).players || [];

    for (var i = 0, len = players.length, player; i < len; i++) {
      player = players[i];
      player.ready = true;
      this.players[player.steamid] = player;
      utils.dispatch('playerInfoLoaded', player.steamid);
      delete this.requesting[player.steamid];
    }

    if (players.length > 0) {
      this.dispatch('loaded');
    }
  };

  return new PlayersInfo();
}());

var VideoLooper = (function VideoLooper() {

  function VideoLooper(options) {
    this.videoStartTime = 0;
    this.loopFrom = options.loopFrom;
    this.loopTo = options.loopTo;
    this.seeking = false;
    this.current = 0;
    this.loaded = false;
    this.inLoop = false;
    this.stopLoop = false;
    this.onStopLoop = options.onStopLoop || null;

    this.source = options.source;
    this.video = options.video;

    this.video.addEventListener("seeked", this.jumpToLoop.bind(this));
    this.video.addEventListener("timeupdate", this.timeUpdate.bind(this));
    this.video.addEventListener("ended", this.onEnd.bind(this));
  }

  VideoLooper.prototype.play = function play() {
    if (!this.loaded) {
      this.video.getElementsByTagName("source")[0].setAttribute("src", this.source);
      this.video.load();
      this.loaded = true;
      this.inLoop = false;
    }
    this.video.play();
  };

  VideoLooper.prototype.pause = function pause() {
    if (this.loaded) {
      this.video.pause();
    }
  };

  VideoLooper.prototype.onEnd = function onEnd(e) {
    if (!this.stopLoop) {
      this.jumpToLoop(e);
    } else if (this.onStopLoop) {
      this.onStopLoop();
    }
  };

  VideoLooper.prototype.reset = function reset() {
    if (this.loaded) {
      this.video.currentTime = 0;
      this.inLoop = false;
      this.video.pause();
    }
  };

  VideoLooper.prototype.restart = function restart() {
    this.video.currentTime = 0;
  };

  VideoLooper.prototype.jumpToLoop = function jumpToLoop() {
    if (!this.stopLoop) {
      if (!this.seeking) {
        if (!this.loopTo ||
          (this.video.currentTime >= this.loopTo) ||
          (this.inLoop && (this.video.currentTime <= this.loopFrom))) {
          if (this.video.currentTime < this.loopFrom) {
            this.inLoop = true;
            this.video.currentTime = this.loopFrom;
            this.seeking = true;
            this.clearSeekFlag();
          }
        }
      }
    }
  };

  VideoLooper.prototype.clearSeekFlag = function clearSeekFlag() {
    setTimeout(function () { this.seeking = false; }.bind(this), 100);
  };

  VideoLooper.prototype.timeUpdate = function timeUpdate() {
    if (!this.stopLoop) {
      if (this.loopTo) {
        if (this.video.currentTime > this.loopFrom) {
          this.inLoop = true;
        }
        if (this.video.currentTime > this.loopTo) {
          this.video.currentTime = this.loopFrom;
          this.inLoop = true;
        }
      }
    }
  };

  return VideoLooper;
})();


loadCommonScripts();

// Data structures for the engine
var EngineStructs = (function () {
  return {
    'SingleCrewEntry': function SingleCrewEntry(id, skin, affinities) {
      return {
        '__Type': 'SingleCrewEntry',
        'Id': id || '',
        'Skin': skin || '',
        'Affinities': affinities || []
      };
    },
    'CrewTeam': function CrewTeam(name, icon, members) {
      return {
        '__Type': 'CrewTeam',
        'Name': name || '',
        'Icon': icon || '',
        'CrewMembers': members || []
      };
    },
    'CrewMember': function CrewMember(id, name, role, stats) {
      return {
        '__Type': 'CrewMember',
        'Id': id || '',
        'Name': name || '',
        'Role': role || '',
        'Stats': stats || {},
      };
    },
    'PlayerData': function PlayerData() {
      return {
        '__Type': 'PlayerData',
        'Name': 'WWWW<B>WWWW\'WWW""WWW</B>WWWWWWWWWWWW',
        'Rank': 5,
        'RankName': 'Commander II',
        'IsDeveloper': false,
        'XPCurrent': 1651,
        'XPNext': 2500,
        'XPProgress': 0.66,
        'IsAuthenticated': false,
        'IsFounder': false,
        'FounderStatus': 0,
        'HasEmail': false,
        'SoftCurrency': 50000,
        'HardCurrency': 0,
        'BuildNumber': '0.1',
        'PreferredRegions': ['eu'],
        'FtueStage': 3,
        'FtueStep': ''
      };
    },
    'ProfileStat': function ProfileStat(parent, key, name, value) {
      return {
        '__Type': 'ProfileStat',
        'ParentKey': parent,
        'Key': key,
        'Name': name,
        'Value': value
      };
    },
    'Resolution': function Resolution(dimensions, refreshRate, text) {
      return {
        '__Type': 'Resolution',
        'Dimensions': dimensions,
        'RefreshRate': refreshRate,
        'StringRepresentation': text
      };
    },
    'Login': function Login(username, password) {
      return {
        '__Type': 'LoginInfo',
        'UserName': username,
        'Password': password
      };
    },
    'GameResultStats': function GameResultStats(_Base, SupportPoints, Captures, Damage, Takedowns) {
      return {
        '__Type': 'GameResultStats',
        '_Base': _Base,
        'SupportPoints': SupportPoints,
        'Captures': Captures,
        'Damage': Damage,
        'Takedowns': Takedowns
      };
    },
    'GameResultPlayer': function GameResultPlayer(name, ship, rank, takedowns, deaths, supportPoints, captures, status) {
      return {
        '__Type': 'GameResultPlayer',
        'Name': name,
        'Ship': ship,
        'CurrentRank': rank,
        'RankName': 'Cadet',
        'Takedowns': takedowns,
        'Deaths': deaths,
        'SupportPoints': supportPoints,
        'Captures': captures,
        'UserStatus': status || 0
      };
    },
    'GameResult': function GameResult(won, didQuit, duration, totalCurrency, totalXP, statsCurrency, statsXP, ModifierWinCurrency, ModifierWinXP, ModifierPremiumCurrency, ModifierPremiumXP) {
      return {
        '__Type': 'GameResult',
        'Won': won,
        'DidQuit': didQuit,
        'Duration': duration,
        'TotalCurrency': totalCurrency,
        'TotalXP': totalXP,
        'Currency': statsCurrency,
        'XP': statsXP,
        'ModifierWinCurrency': ModifierWinCurrency,
        'ModifierWinXP': ModifierWinXP,
        'ModifierPremiumCurrency': ModifierPremiumCurrency,
        'ModifierPremiumXP': ModifierPremiumXP
      };
    },
    'StatusWindow': function StatusWindow(id, title, message, bShowActivity, bShowOK, bShowCancel, onOK, onCancel, onShow, classes) {
      return {
        '__Type': 'StatusWindow',
        'Id': id,
        'Title': title,
        'Message': message,
        'ShowActivity': bShowActivity,
        'ShowOKButton': bShowOK,
        'ShowCancelButton': bShowCancel,
        'onOK': onOK,
        'onCancel': onCancel,
        'onShow': onShow,
        'classes': classes
      };
    }
  };
}());

// A template formatting method
// Replaces {{propertyName}} with properties from the 'args' object
// Supports {{object.property}}
// Use {{(f)valueHere}} to automatically format the value (1000 -> 1,000)
String.prototype.REGEX_FORMAT = /(\{\{([^\}]+)\}\})/g;
String.prototype.REGEX_FORMAT_BR = /\n/g;

String.prototype.format = function format(args, shouldSanitise) {
  !args && (args = {});

  return this.replace(String.prototype.REGEX_FORMAT, function onMatch() {
    var key = arguments[2],
      shouldFormat = key.indexOf('(f)') === 0,
      properties = key.replace('(f)', '').split('.'),
      value = args;

    // support nesting - "I AM {{ship.info.name}}"
    for (var i = 0, len = properties.length; i < len; i++) {
      value = value && value[properties[i]];
    }

    if (value === undefined || value === null) {
      value = arguments[0];
    }

    if (shouldFormat) {
      value = window.utils.numberWithCommas(value);
    }

    if (value && typeof value === 'string') {
      value = value.replace(String.prototype.REGEX_FORMAT_BR, '<br />');

      if (shouldSanitise !== false) {
        value = value.sanitise();
      }
    }

    return value;
  });
};

// Sanitise HTML input
String.prototype.REGEX_SANITISE_LT = /</g;
String.prototype.REGEX_SANITISE_QUOT = /"/g;
String.prototype.sanitise = function sanitise() {
  return this.replace(String.prototype.REGEX_SANITISE_LT, '&lt;')
    .replace(String.prototype.REGEX_SANITISE_QUOT, '&quot;');
};

// Get Unix Timestap from Date String
Date.prototype.getUnixTime = function () {
  return this.getTime() / 1000 | 0;
};

if (!Date.now) {
  Date.now = function () {
    return new Date();
  };
}

Date.time = function () {
  return Date.now().getUnixTime();
};

if (typeof NodeList.prototype.forEach !== "function") {
  NodeList.prototype.forEach = function forEach(fn, thisArg) {
    if (typeof fn !== "function") {
      throw new TypeError(fn + " is not a function");
    }

    for (var i = 0; i < this.length; i++) {
      fn.call(thisArg, this[i], i, this);
    }
  };
}

/**
 *
 */
String.prototype.hashString = function hashString(){
  var hash = 0;
  var char;
  for (var i = 0; i < this.length; i++){
    char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
};

Math.randomWithSeed = function randomWithSeed(seed){
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

function getTimeForBezier(transitionTime, xPoint1, xPoint2, position) {
  var t = (1 - position);
  var t2 = t * t;
  var firstTerm = 3 * t2 * position * xPoint1;
  var secondTerm = 3 * t * (position * position) * xPoint2;
  var thirdTerm = (position * position * position);
  return (firstTerm + secondTerm + thirdTerm) * transitionTime;
}
