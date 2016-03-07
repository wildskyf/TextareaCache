var tacacheUI = {

  openWindow : function ( aURL, aFeature, aArg ) {
    aArg = aArg || null;
    var WM = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
    var windows = WM.getEnumerator(null);
    while (windows.hasMoreElements()) {
      var win = windows.getNext();
      if (win.document.documentURI == aURL) {
        win.focus();
        return;
      }
    }
    if ( aArg == null )
      return window.open(aURL, "", "chrome,toolbar,centerscreen" + aFeature);
    else
      return openDialog(aURL, "", "chrome,toolbar,centerscreen" + aFeature, aArg);
  },

  openCacheWindow : function (opener) {
    opener = null || opener;
    this.cacheWindowRef = this.openWindow("chrome://tacache/content/cacheWindow.xul", ", resizable", opener);
  },

  openOptionWindow : function (addWhitelist) {
    try {
      var arg = addWhitelist ? gBrowser.mCurrentBrowser.contentDocument.location.host : null;
    }
    catch (e) {
      var arg = null;
    }

    this.openWindow("chrome://tacache/content/pref-tacache.xul", "", arg);
  }

}