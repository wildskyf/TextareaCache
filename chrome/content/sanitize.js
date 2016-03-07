Components.utils.import("resource://tacache/cache.jsm");

var textareaCacheSanitize = {
  init : function () {
    window.addEventListener("dialogaccept", textareaCacheSanitize.onDialogAccept, false);

    if ( TextareaCacheUtil.gPref.getBoolPref("extensions.tacache.clearWithSanitize") ) {
      let item = document.querySelector("#itemList > [preference$='formdata']");
      if ( TextareaCacheUtil.cache.length > 0 && item.disabled ) {
        item.disabled = false;
        item.checked = TextareaCacheUtil.gPref.getBoolPref("privacy.cpd.formdata");
      }
    }
  },

  exit : function () {
    window.removeEventListener("dialogaccept", textareaCacheSanitize.onDialogAccept, false);
  },

  onDialogAccept : function () {
    gSanitizePromptDialog.updatePrefs();
    var s = new Sanitizer();
    s.prefDomain = "privacy.cpd.";
    s.range = Sanitizer.getClearRange(gSanitizePromptDialog.selectedTimespan);

    if ( TextareaCacheUtil.gPref.getBoolPref("privacy.cpd.formdata") &&
         TextareaCacheUtil.gPref.getBoolPref("extensions.tacache.clearWithSanitize") )
      TextareaCacheUtil.clearCacheByRange(s.range);
  }
}

window.addEventListener("load", textareaCacheSanitize.init, false);
window.addEventListener("unload", textareaCacheSanitize.exit, false);
