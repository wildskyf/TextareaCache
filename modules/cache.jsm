this.EXPORTED_SYMBOLS = ["TextareaCacheUtil"];

const {interfaces: Ci, utils: Cu, classes: Cc} = Components;

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

// preference strings
const P_CACHE           = "cache";
const P_CLEAR_IN_DAYS   = "clearTimeSpan";
const P_CLEAR_IN_MINS   = "restartClearInMin";
const P_CLEAR_SETTING   = "clearCache";
const P_CACHE_SIZE      = "maxTextSaved";
const P_WRITE_INTERVAL  = "interval";
const P_SAVE_INTERVAL   = "saveInterval";
const P_SAVE_IN_PRIVATE = "saveInPrivate";
const P_WHITELIST       = "whitelist";
const P_DEBUG           = "debug";
const P_STATUS_BUTTON   = "statusButton";
const P_COMPACT_BUTTON  = "compactButton";
const P_HIDE_EMPTY      = "hideEmptyButton";
const P_TOOL_MENU       = "toolMenu";

// clear settings
const NEVER_CLEAR   = 0;     // never clear old data unless the cache is full
const RESTART_CLEAR = 1;     // clear old data in the next session
const CLEAR_BY_DAY  = 2;     // clear old data after one or several days
const CLOSE_CLEAR   = 3;     // clear all data when closing Firefox

const FILENAME      = "textareacache.json";

const DEFAULT_CACHE_SIZE = 50;

const ObserverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

function msg (msg) {
  if ( !TextareaCacheUtil.debug )
    return;

  let d = new Date();
  msg = "TextareaCacheUtil("+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"."+d.getMilliseconds() +") :"+msg;

  let consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
  consoleService.logStringMessage(msg);

  //Cu.reportError(msg);
}

this.TextareaCacheUtil = {
  cache         : [],
  empty         : true,
  ready         : false,

  debug         : false,

  FILE          : null,

  whitelist     : [],    // whitelist saved in array
  whitelistTime : 0,     // the time the whitelist is built

  cacheSize     : 50,    // size of the cache

  isSaving      : null,
  saveInPrivate : false, // save texts or not in a private browsing window

  clearSetting  : null,  // could be NEVER_CLEAR, RESTART_CLEAR, CLEAR_BY_DAY OR CLOSE_CLEAR

  clearInMins   : 5,     // for clearSetting == RESTART_CLEAR, clear old data 5 minutes after restarting Firefox
  clearInDays   : 1,     // for clearSetting == CLEAR_BY_DAY, clear data older than 1 day
  saveInterval  : 3000,  // interval for writing the cache into textareacache.json file, 3 senconds by default
  writeInterval : 1000,  // interval for writing into the cache, 1 second by default

  toolMenu      : false,
  statusButton  : false,
  compactButton : false,
  hideEmpty     : false,

  TYPE_HTML     : "HTML",
  TYPE_TEXT     : "TEXT",

  gPref         : Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch),
  pref          : Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.tacache."),

  // timers
  restartClearTimer : null,
  clearDayTimer     : null,


  ///////////////////////////////////////////////////////
  // deprecated, kept only for backward compatibility
  isDoc : "<D>",

  getPref : function () {
    let cache = [];
    let nsISS = Ci.nsISupportsString;
    let string = this.pref.getComplexValue(P_CACHE, nsISS).data;
    try {
      cache = JSON.parse(string);
    }
    catch (e) {}
    return cache;
  },
  ////////////////////////////////////////////////////////

  prefObserver : {
    register: function () {
      this._branch = TextareaCacheUtil.pref;
      this._branch.QueryInterface(Ci.nsIPrefBranch);
      this._branch.addObserver("", this, false);
    },

    unregister: function () {
      if (!this._branch)
        return;
      this._branch.removeObserver("", this, false);
    },

    observe: function (subject, topic, data) {
      if (topic == "nsPref:changed") {
        TextareaCacheUtil.getSettings();
        switch (data) {
          case P_WHITELIST :
            TextareaCacheUtil.getWhitelist();
            break;
          case P_CACHE_SIZE :
            TextareaCacheUtil.trimCache();
            break;
          case P_STATUS_BUTTON :
            TextareaCacheUtil.notify("status-button");
            break;
          case P_COMPACT_BUTTON :
          case P_HIDE_EMPTY :
            TextareaCacheUtil.notify("toolbar-button");
            break;
        }
      }
    }
  },

  observer : {
    register : function () {
      ObserverService.addObserver(this, "last-pb-context-exited", false);
      ObserverService.addObserver(this, "quit-application-requested", false);
      ObserverService.addObserver(this, "textarea-cache-ui", false);
    },

    unregister : function () {
      ObserverService.removeObserver(this, "last-pb-context-exited", false);
      ObserverService.removeObserver(this, "quit-application-requested", false);
      ObserverService.removeObserver(this, "textarea-cache-ui", false);
    },

    observe : function (subject, topic, data) {
      switch (topic) {
        case "last-pb-context-exited" :
          TextareaCacheUtil.removePrivateItems();
          break;
        case "quit-application-requested" :
          if ( data == "lastwindow" )
            TextareaCacheUtil.uninit();
          break;
        case "textarea-cache-ui" :
          break;
      }
    }
  },

  // data : "status-button"   --    show status button or not
  //        "toolbar-button"  --    check toolbar button
  //        "update-buttons"  --    update toolbar button and status button
  //        "content-changed" --    content of the cache is changed
  notify : function (data) {
    if ( data == null ) {
      let _empty = (this.cache.length == 0);
      data = ( this.empty  ^ _empty ) ? "update-buttons" : "content-changed";
      this.empty = _empty;
    }
    ObserverService.notifyObservers(null, "textarea-cache-ui", data);
  },

  // Settings
  //
  getSettings : function () {
    this.clearSetting     = this.pref.getIntPref(P_CLEAR_SETTING);
    this.cacheSize        = this.pref.getIntPref(P_CACHE_SIZE);
    this.writeInterval    = this.pref.getIntPref(P_WRITE_INTERVAL) * 1000;
    this.saveInterval     = this.pref.getIntPref(P_SAVE_INTERVAL) * 1000;
    this.clearInMins      = this.pref.getIntPref(P_CLEAR_IN_MINS);
    this.clearInDays      = this.pref.getIntPref(P_CLEAR_IN_DAYS);
    this.saveInPrivate    = this.pref.getBoolPref(P_SAVE_IN_PRIVATE);
    this.toolMenu         = this.pref.getBoolPref(P_TOOL_MENU);
    this.compactButton    = this.pref.getBoolPref(P_COMPACT_BUTTON);
    this.hideEmpty        = this.pref.getBoolPref(P_HIDE_EMPTY);
    this.statusButton     = this.pref.getBoolPref(P_STATUS_BUTTON);
    this.debug            = this.pref.getBoolPref(P_DEBUG);
  },

  // Whitelist
  //
  getWhitelist : function () {
    var list = this.pref.getCharPref(P_WHITELIST);
    let temp;

    // still editing
    if ( list.indexOf("\n") >= 0 )
      return;

    if ( list == "" )
      temp = [];
    else
      temp = list.split(" ").sort();

    if ( temp.toString() != this.whitelist.toString() ) { // update whitelist
      this.whitelist = temp;
      this.whitelistTime = Date.now();
    }
  },

  // Check white list
  // return value: true  -- match, do not save
  //               false -- not match, it's okay to save
  //
  checkWhitelist : function (url) {
    if ( this.whitelist == [] )
      return false;

    for ( var i = 0; i < this.whitelist.length; i++ ) {
      let keyword = this.whitelist[i];
      if ( keyword != "" && new RegExp(keyword).test(url) ) {
        return true;
      }
    }
    return false;
  },

  // Methods for cache items
  //
  getItemIndex : function (id) {
    for ( var i = 0; i < this.cache.length; i++ ) {
      if ( id == this.cache[i].id )
        return i;
    }
    return -1;
  },

  moveItemToTop : function (index) {
    this.cache.splice(0, 0, this.cache.splice(index, 1)[0]);
  },

  trimCache : function () {
    if ( this.cache.length > this.cacheSize ) {
      this.cache.splice( this.cacheSize, this.cache.length - this.cacheSize );
      this.writeFile();
      this.notify();
    }
  },

  // if |index| is not assigned, remove the last item
  removeItem : function (index) {
    if ( index == null )
      this.cache.pop();
    else
      this.cache.splice(index, 1);

    this.notify();
  },

  removeAllItem : function () {
    this.cache = [];

    this.notify();
  },

  markOldItems : function () {
    for ( var i = 0; i < this.cache.length; i++ )
      this.cache[i].old = "old";
    this.writeFile();
  },

  removeOldItems : function () {
    if ( this.clearSetting != RESTART_CLEAR )
      return;

    let changed = false;
    for ( var i = this.cache.length - 1; i >= 0; i-- ) {
      if ( "old" in this.cache[i] ) {
        this.removeItem(i);
        changed = true;
      }
    }
    if (changed)
      this.writeFile();
  },

  removePrivateItems : function () {
    let changed = false;
    for ( var i = this.cache.length - 1; i >= 0; i-- ) {
      if ( "private" in this.cache[i] ) {
        this.removeItem(i);
        changed = true;
      }
    }
    if (changed)
      this.writeFile();
  },

  clearOldDataByDay : function () {
    if ( this.clearSetting != CLEAR_BY_DAY )
      return;

    var days = this.clearInDays;
    days = ( days < 1 ) ? 1 : days;

    var endtime = Date.now() - days * 86400 * 1000; // 1 day = 86400 sec
    var range = [ 0, endtime * 1000 ];

    this.clearCacheByRange(range);
  },

  // range: array contains 2 elements
  //   range[0]: start time
  //   range[1]: end time
  // if range == null, clear all items
  //
  clearCacheByRange : function (range) {
    let starttime = range ? range[0] : 0;
    let endtime   = range ? range[1] : Date.now() * 1000;
    let changed   = false;

    for ( let i = this.cache.length - 1; i >= 0; i-- ) {
      let time = Math.abs( parseInt(this.cache[i].time) ) * 1000;
      if ( time >= starttime && time <= endtime ) {
        this.removeItem(i);
        changed = true;
      }
    }
    if (changed)
      this.writeFile();
  },

  // always the first item, eg. this.cache[0]
  updateItemText : function ( text, submitted ) {
    let time = Date.now();

    this.cache[0].time = time;

    if ( submitted )
      this.cache[0].id += time;

    if ( text == this.cache[0].text )
      return;

    this.cache[0].text = text;

    this.notify();
  },

  addNewItem : function ( node, text, submitted, privateWindow ) {
    let title = node.tacacheDoc.title;
    let id = node.tacacheID;

    // get time
    let time = Date.now();

    if ( submitted )
      id += time;

    let temp = { title : title, text : text, id : id, time : time };

    if ( privateWindow )
      temp.private = "true";
    if ( node.nodeName.toLowerCase() != "textarea" )
      temp.type = this.TYPE_HTML;

    if ( this.cache.unshift(temp) > this.cacheSize )
      this.removeItem();

    this.notify();
  },

  // Update cache
  cacheUpdate : function () {
    if ( this.cache.length == 0 )
      return;

    var checkTime = !("time" in this.cache[0]);

    var isDoc = this.isDoc;
    var html = this.TYPE_HTML;
    Array.forEach( this.cache, function (item) {
      if (checkTime) {
        let temp = item.id.split("@");
        item.id = temp[0];
        item.time = parseInt(temp[1]);
        if ( item.id[0] == "-" ) {
          item.time = Math.abs(item.time);
          item.id = item.id.slice(1);
        }
        if ( item.id.indexOf("D") )
          item.id = item.id + isDoc;
      }
      if ( item.id.indexOf(isDoc) > 0 )
        item.type = html;
      item.time = Math.abs(item.time);
    });

    //this.cache.sort( function (a, b) {
    //  return b.time - a.time;
    //});
  },

  // always fired by readFile()
  initCache : function () {
    this.cacheUpdate();

    this.empty = ( this.cache.length == 0 );

    if ( this.cacheSize <= 0 )
      this.cacheSize = DEFAULT_CACHE_SIZE;

    this.trimCache();

    let startup = this.gPref.getIntPref("browser.startup.page");
    var sessionRestore = false;
    try {
      var ss = Cc["@mozilla.org/browser/sessionstartup;1"].getService(Ci.nsISessionStartup);
      sessionRestore = ss.doRestore();
    }
    catch (e) {}

    // clearInMins
    //   > 0 : clear old data after a time interval (in minute)
    //   = 0 : keep clear old data during this session, but clear them this session is closed
    //   < 0 : deprecated since 0.9.0, change clearSetting to NEVER_CLEAR
    //
    // When a new session starts, we may get two kind of data in the cache.
    //   1. "very" old data: they were marked as "old" in the last session, and we will kill them now.
    //   2. normal data: the data saved in the last session. we need to mark them as "old" in this session.
    //
    // If user sets |browser.startup.page| to 3 (always save session and show tabs in last session when starting Firefox)
    //   always clear old data
    //

    if ( this.clearInMins < 0 ) {
      this.clearSetting = NEVER_CLEAR;
      this.clearInMins = 0;
    }

    if ( startup == 3 || !sessionRestore ) {
      if ( this.clearSetting == RESTART_CLEAR ) {
        // clear the "very" old data
        if ( this.clearInMins >= 0 )
          this.removeOldItems();

        let delay = this.clearInMins * 60 * 1000;
        // clear these old data session after a time interval
        if ( this.clearInMins > 0 ) {
          this.restartClearTimer.initWithCallback( function () {
            TextareaCacheUtil.removeOldItems();
          }, this.clearInMins * 60 * 1000, Ci.nsITimer.TYPE_ONE_SHOT );
        }
      }

      // then mark the data left from the last session as "old"
      this.markOldItems();
    }

    // Check the cache every 2 hours
    // Remove items older than assigned time(one day, three days or one week, etc.).
    //
    this.clearOldDataByDay();

    var interval = 30 * 60 * 1000; // 30 mins
    this.clearDayTimer.initWithCallback( function () {
      TextareaCacheUtil.clearOldDataByDay();
    }, interval, Ci.nsITimer.TYPE_REPEATING_PRECISE_CAN_SKIP );
  },

  initTimers : function () {
    this.restartClearTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    this.clearDayTimer     = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  },

  cancelTimers : function () {
    this.restartClearTimer.cancel();
    this.clearDayTimer.cancel();
  },

  // File I/O
  //
  initFile : function () {
    //Cu.reportError("initfile");

    this.FILE = FileUtils.getFile("ProfD", [FILENAME]);
  },

  checkOldPrefAndFile : function () {
    //Cu.reportError("checkfile");

    if (!(this.FILE instanceof Ci.nsIFile))
      this.initFile();

    // get cache from old pref and save it to file
    if ( !this.FILE.exists() ) {

      //Cu.reportError("not exists");

      if ( this.pref.prefHasUserValue(P_CACHE) ) {

        //Cu.reportError("has old pref");

        this.cache = this.getPref();
        this.pref.clearUserPref(P_CACHE);
      }
      this.writeFile();
    }
  },

  writeFile : function () {
    //msg("write");

    if (!(this.FILE instanceof Ci.nsIFile))
      this.initFile();

    var data = JSON.stringify(this.cache);

    //msg("write:>"+data+"<");

    var openFlags = FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE;

    //data is data you want to write to file
    //if file doesnt exist it is created
    var ostream = FileUtils.openFileOutputStream(this.FILE, openFlags);
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var istream = converter.convertToInputStream(data);

    NetUtil.asyncCopy( istream, ostream, function (status) {
      if (!Components.isSuccessCode(status)) {
        // Handle error!
        Cu.reportError("TextareaCacheUtil error on write isSuccessCode = " + status);
        return;
      }
    });
  },

  readFile : function () {
    if (!(this.FILE instanceof Ci.nsIFile))
      this.initFile();

    var data = "";
    let _this = this;

    NetUtil.asyncFetch(this.FILE, function (inputStream, status) {
      //this function is callback that runs on completion of data reading
      if (!Components.isSuccessCode(status)) {
        Cu.reportError("TextareaCacheUtil error on file read isSuccessCode = " + status);
        return;
      }
      var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
      cstream.init(inputStream, "UTF-8", 0, 0);

      let str = {};
      {
        let read = 0;
        do {
          read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
          data += str.value;
        } while (read != 0);
      }
      cstream.close();

      _this.cache = JSON.parse(data);
      if ( !_this.ready ) {
        _this.initCache();
        _this.ready = true;
      }
      return;
    });
  },

  init : function () {
    if ( this.ready )
      return;

    this.getSettings();
    this.getWhitelist();
    this.initTimers();
    this.prefObserver.register();
    this.observer.register();

    this.checkOldPrefAndFile();
    this.readFile();
  },

  uninit : function () {
    this.prefObserver.unregister();
    this.observer.unregister();
    this.cancelTimers();

    if ( this.clearSetting == RESTART_CLEAR )
      this.removeOldItems();
    if ( this.clearSetting == CLOSE_CLEAR ) {
      this.removeAllItem();
      this.writeFile();
    }
  }
};

TextareaCacheUtil.init();