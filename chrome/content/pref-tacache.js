const {interfaces: Ci, utils: Cu, classes: Cc} = Components;

var tacachePref = {
  pref : Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch),

  checkClearSetting : function () {
    var preference = document.getElementById("extensions.tacache.clearCache").value;

    // clear setting != clear after a time span in days
    document.getElementById("clearInDays").disabled = ( preference != 2 );

    // clear setting != clear in the next session
    document.getElementById("restartClearInMin").disabled = ( preference != 1 );
    document.getElementById("clearInMin").disabled = ( preference != 1 );
    document.getElementById("restartClearWhenClose").disabled = ( preference != 1 );

    return undefined;
  },

  readRestartClear : function () {
    var preference = document.getElementById("extensions.tacache.restartClearInMin");
    var minNumber = document.getElementById("clearInMin");

    if ( preference.value < 0 )
      preference.value = 0;

    minNumber.value = ( preference.value == 0 ) ? preference.defaultValue : preference.value;

    return ( preference.value == 0 ) ? "clearWhenClose" : "clearInMin";
  },

  writeRestartClear : function () {
    var minNumber = document.getElementById("clearInMin");
    var restartClear = document.getElementById("restartClearTime");

    return restartClear.value == "clearWhenClose" ? 0 : minNumber.valueNumber;
  },

  init : function () {
    var textbox = document.getElementById("tacache-whitelist");
    var newItem = "";
    if ( window.arguments ) {
      newItem = window.arguments[0];
      var prefWindow = document.getElementById("tacachePrefWindow");
      var whitelistPane = document.getElementById("whitelistPane");
      prefWindow.showPane(whitelistPane);
    }

    // whitelist
    var str = textbox.value;
    textbox.value = str.replace(/ /g, "\n").replace(/%20/g, " ");

    if ( newItem && newItem != "" ) {
      newItem = newItem.replace(/%20/g, " ")
      textbox.value = newItem + "\n" + textbox.value;

      setTimeout( function () {
        textbox.focus();
        textbox.selectionStart = 0;
        textbox.selectionEnd = newItem.length;
      }, 0 );
    }

    var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
    var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
    // Statusbar (addon bar) is removed since Firefox 29
    if ( versionChecker.compare( appInfo.version, "29" ) >= 0 )
      document.getElementById("statusButton").setAttribute("hidden", true);
  },

  uninit: function (save) {
    if ( save == true ||
         ( document.documentElement.instantApply && save == "close" ) ) {
      var textbox = document.getElementById("tacache-whitelist");
      var str = textbox.value;
      str = str.replace(/ /g, "%20").replace(/\n/g, " ").replace(/^\s+/g, '').replace(/\s+$/g, '');
      this.pref.setCharPref( textbox.getAttribute("preference"), str );
    }
  }
}
