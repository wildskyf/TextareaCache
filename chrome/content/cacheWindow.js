const {interfaces: Ci, utils: Cu, classes: Cc} = Components;

Components.utils.import("resource://tacache/cache.jsm");

var cacheWindow = {
  cache : [],
  type : null,
  _Text : 0,
  _Doc : 1,
  copyButton : null,
  opener : null,
  
  init : function () {
    if ( window.arguments ) {
      this.opener = window.arguments[0];
    }
    let copyAndClose = document.getElementById("copyButton");
    let closeAndPaste = document.getElementById("pasteButton");
    if (this.opener) {
      copyAndClose.hidden = true;
      this.copyButton = closeAndPaste;
    }
    else {
      closeAndPaste.hidden = true;
      this.copyButton = copyAndClose;
    }
    
    this.observer.register();
    this.loadSavedText();
  
    this.setCopyButton();
    this.copyButton.focus();
    
    document.getElementById("cacheMenu").addEventListener("DOMMouseScroll", cacheWindow.mouseScroll, false);
    window.addEventListener("unload", cacheWindow.exit, false);
  },
  
  exit : function () {
    cacheWindow.observer.unregister();
    document.getElementById("cacheMenu").removeEventListener("DOMMouseScroll", cacheWindow.mouseScroll, false);
  },
  
  observer : {
    register : function () {
      Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService)
      .addObserver(this, "textarea-cache-ui", false);
    },
    
    unregister : function () {
      Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService)
      .removeObserver(this, "textarea-cache-ui", false);
    },
    
    observe : function (subject, topic, data) {
      switch (data) {
        case "content-changed" :
        case "update-buttons" :
          cacheWindow.loadSavedText();
          break;
      }
    }
  }, 
  
  loadSavedText : function () {
    this.type = this._Text;
    let popup = document.getElementById("cacheMenuPopup");
    let cacheMenu = document.getElementById("cacheMenu");
    while (popup.hasChildNodes()) {
      popup.removeChild(popup.lastChild);
    }
    
    TextareaCacheUtil.writeFile();
    this.cache = TextareaCacheUtil.cache;

    for ( let i = 0; i < this.cache.length; i++ ) {
      let m = popup.appendChild(document.createElement("menuitem"));
      m.value = this.cache[i].text;
      m.deckType = ( "type" in this.cache[i] && this.cache[i].type == TextareaCacheUtil.TYPE_HTML ) ? this._Doc : this._Text;
      m.id = "cacheTitle" + i;
      let time = cacheWindow.getTime( new Date(this.cache[i].time) );
      m.label = time + this.cache[i].title;
      m.setAttribute("anonid", i);
      m.setAttribute("oncommand", "cacheWindow.getContent(this);");
    }
    
    cacheMenu.disabled = 
    document.getElementById("clearAll").disabled = 
    document.getElementById("clearThis").disabled = ( this.cache.length == 0 );
    if ( this.cache.length == 0 ) {
      popup.appendChild(document.createElement("menuitem")).label = "";
      document.getElementById("textContent").value = "";
    }
    else {
      this.getContent( document.getElementById("cacheTitle0") );
    }  
    
    cacheMenu.selectedIndex = 0;
  },
  
  mouseScroll : function (e) {
    let list = document.getElementById("cacheMenu");
    let count = list.itemCount;
    let selected = list.selectedIndex;

    if ( e.detail > 0 )
      selected += ( selected < count - 1 ) ? 1 : 0;
    else
      selected -= ( selected > 0 ) ? 1 : 0;

    list.selectedIndex = selected;
    cacheWindow.getContent(list.selectedItem);
  },
  
  digiFormat : function (num) {
    let s = num.toString();
    if ( s.length < 2 )
      s = "0"+ s;
    return s;
  },
  
  getTime : function (date) {
    let y = date.getFullYear();
    let m = this.digiFormat(date.getMonth()+1);
    let d = this.digiFormat(date.getDate());
    let h = this.digiFormat(date.getHours());
    let n = this.digiFormat(date.getMinutes());    
    return y + "-" + m + "-" + d + " " + h + ":" + n + "  ";
  },
  
  getContent : function (node) {
    this.type = node.deckType;
    document.getElementById("contentDeck").setAttribute("selectedIndex", this.type);
    if ( this.type == this._Text )
      document.getElementById("textContent").value = node.value;
    else {
      document.getElementById("textContent").value = node.value;
      document.getElementById("docContent").contentDocument.body.innerHTML = node.value;
    }
    document.getElementById("cacheMenu").setAttribute("anonid", node.getAttribute("anonid"));
    this.setCopyButton();
  },
  
  setCopyButton : function () {  
    this.copyButton.disabled = ( this.cache.length == 0 );
  },
  
  copyAndClose : function () {
    let nodeID = ( this.type == this._Text ) ? "textContent" : "docContent";
    let node = document.getElementById(nodeID);
    
    node.focus();
    goDoCommand("cmd_selectAll");
    goDoCommand("cmd_copy");
    window.close();
  },
  
  pasteClipboard : function () {
    // opener = { document, node }
    //   document = document of Firefox window
    //   node = the text input node
    //   ** note : document != node.ownerDocument **
    this.opener.node.focus();
    let doc = this.opener.document;
    try {
      var controller = doc.commandDispatcher.getControllerForCommand("cmd_paste");
      if (controller && controller.isCommandEnabled("cmd_paste"))
        controller.doCommand("cmd_paste");
    }
    catch (e) {
    }
  },
  
  confirm : function (aTitle, aMsg) {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService); 
    var button = prompts.confirmEx(window, 
                                   aTitle,
                                   aMsg,
                                   (prompts.BUTTON_TITLE_YES * prompts.BUTTON_POS_0)
                                   + (prompts.BUTTON_TITLE_NO * prompts.BUTTON_POS_1),
                                   null, null, null, null, {});
    return (button == 0);
  },
  
  clearAll : function () {
    TextareaCacheUtil.removeAllItem();
    TextareaCacheUtil.writeFile();
    window.close();
  },
  
  clearThis : function () {
    let index = document.getElementById("cacheMenu").getAttribute("anonid");
    TextareaCacheUtil.removeItem(index);
    
    this.cache = TextareaCacheUtil.cache;
    TextareaCacheUtil.writeFile();
    
    if ( this.cache.length == 0 )
      window.close();
    else
      this.loadSavedText();
  },
  
  onContextMenuShowing : function () {
    let focusedWindow = document.commandDispatcher.focusedWindow;
    let selection = focusedWindow.getSelection().toString();

    document.getElementById("contextCopy").disabled = ( selection.length == 0 ) ? true : false;
  }

}
