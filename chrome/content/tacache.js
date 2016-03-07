Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
//Components.utils.import("resource:///modules/CustomizableUI.jsm");
Components.utils.import("resource://tacache/cache.jsm");

var textareaCache = {
  util            : TextareaCacheUtil,

  isWindowPrivate : false,

  /********** for Debug *******************/
  msg : function (msg) {
    if ( !this.util.debug )
      return;
    var d = new Date();
    console.log(
      "Textarea Cache ("+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"."+d.getMilliseconds() +") :"+msg
    );
  },
  /*****************************************/

  saveToFile : function () {
    //this.msg("save to file");

    this.util.isSaving = null;
    this.util.writeFile();
  },

  getTopDoc : function (node) {
    let doc = node.ownerDocument ? node.ownerDocument : node;
    while ( doc.defaultView && doc.defaultView.parent.document != doc ) {
      doc = doc.defaultView.parent.document;
    }
    return doc;
  },

  getID : function (node) {
    let nodeName = node.nodeName.toLowerCase();

    //this.msg("getID:"+nodeName+","+node.id);

    let browser = window.gBrowser.getBrowserForDocument(node.tacacheDoc);
    let docShellID = browser.docShell.historyID;
    let index = browser.sessionHistory.index;

    let nodeID = node.id;
    if ( node.id == "" && "form" in node ) {
      try {
        nodeID = node.form.id;
      }
      catch (e) {}
    }
    if ( nodeID == "" ) {
      let offsetTop = node.offsetTop;
      let count = 0;
      while ( "offsetParent" in node && node.offsetParent && count++ < 3 ) { // for saving time, we iterate only 3 levels
        node = node.offsetParent;
        offsetTop += node.offsetTop;
      }
      nodeID = offsetTop;
    }

    //this.msg("getID get:"+nodeID);

    return docShellID + "-" + index + "#" + nodeID;
  },

  getText : function (node) {
    let text = "";
    if ( node.nodeName.toLowerCase() == "textarea" )
      text = node.value;
    else
      text = node.innerHTML;

    return text;
  },

  clearNode : function (node) {
    delete node.tacacheText;
    delete node.tacacheID;
    delete node.tacacheDoc;
    delete node.tacacheWhitelist;
  },

  beforeWrite : function (node, submitted) {
    //this.msg("beforewrite:"+node.tacacheText);

    delete node.waiting;

    let text = node.tacacheText;
    if ( !("tacacheText" in node) || text == "" )
      return;

    if ( this.isWindowPrivate && !this.util.saveInPrivate )
      return;

    node.tacacheDoc = node.tacacheDoc || this.getTopDoc(node);
    node.tacacheID = node.tacacheID || this.getID(node);

    // check whitelist
    if ( !node.tacacheWhitelist || ( node.tacacheWhitelist.time < this.util.whitelistTime ) ) {
      node.tacacheWhitelist = { match : this.util.checkWhitelist(node.tacacheDoc.location), time : Date.now() };
    }
    if ( node.tacacheWhitelist.match )
      return;

    // the node is hidden
    if ( node.style.display == "none" || node.scrollHeight == 0 || node.scrollWidth == 0 )
      return;

    // for debug
    //if ( this.util.cache.length > 0 )
      //this.msg( node.tacacheID + ","+this.util.cache[0].id );

    if ( this.util.cache.length > 0 && node.tacacheID == this.util.cache[0].id ) // already saved in cache[0]
      this.util.updateItemText(text, submitted);
    else {
      let index = this.util.getItemIndex(node.tacacheID);

      //this.msg("find index:"+index);

      if ( index > 0 ) {
        this.util.moveItemToTop(index);
        this.util.updateItemText(text, submitted);
      }
      else
        this.util.addNewItem(node, text, submitted, this.isWindowPrivate);
    }
  },

  prepareToSave : function () {
    if ( !this.util.isSaving ) {
      this.util.isSaving = window.setTimeout( function () {textareaCache.saveToFile();}, this.util.saveInterval );
    }
  },

  onInput : function (e) {
    let node = e.target;
    let nodeName = node.nodeName.toLowerCase();

    //textareaCache.msg("on input");

    if ( nodeName != "textarea" && ( node.ownerDocument.designMode != "on" && !node.isContentEditable ) )
      return;

    //textareaCache.msg("input>"+nodeName+","+node.ownerDocument.designMode+","+node.isContentEditable);

    if ( node.ownerDocument.designMode == "on" && node.ownerDocument.activeElement.isContentEditable ) {
      node = node.ownerDocument.activeElement;
      //textareaCache.msg("input new>"+node.nodeName+","+node.id+","+node.isContentEditable);
    }

    // this should not happen, just in case
    if ( nodeName == "html" )
      node = node.ownerDocument.body;

    let temp = textareaCache.getText(node);
    //textareaCache.msg("input>"+temp+"<");

    node.tacacheText = temp;

    if ( !("waiting" in node) ) {
      node.waiting = window.setTimeout( function () {textareaCache.beforeWrite(node);}, TextareaCacheUtil.writeInterval );
    }
    textareaCache.prepareToSave();

  },

  onKeyup : function (e) {
    let node = e.target;
    let nodeName = node.nodeName.toLowerCase();

    //textareaCache.msg("on keyup " + e.keyCode);

    if ( nodeName != "textarea" && ( node.ownerDocument.designMode != "on" && !node.isContentEditable ) )
      return;
    if ( nodeName == "textarea" && node.rows == 1 )
      return;

    let temp = textareaCache.getText(node);

    if ( temp == "" && e.keyCode == 13 ) {
      //textareaCache.msg("submit");

      // keyup event is always fired after input event. so we can cancel the timeout
      window.clearTimeout(node.waiting);
      textareaCache.beforeWrite(node, true);
      textareaCache.clearNode(node);
      textareaCache.prepareToSave();
    }
  },

  onChange : function (e) {
    let node = e.target;

    // Only for textarea node
    if ( node.nodeName.toLowerCase() != "textarea" || node.rows == 1 )
      return;

    node.tacacheText = node.value;
    window.clearTimeout(node.waiting);
    textareaCache.beforeWrite(node);
    textareaCache.prepareToSave();
  },

  // ui
  //
  checkToolbarButton : function () {
    var button  = document.getElementById("textareaCacheButton");
    var compact = TextareaCacheUtil.compactButton;
    var empty   = TextareaCacheUtil.empty;
    var hide    = TextareaCacheUtil.hideEmpty;

    //textareaCache.msg( CustomizableUI.getPlacementOfWidget("textareaCacheButton").area );

    if (!button)
      return;

    if (!compact)
      button.setAttribute("type", "menu-button");
    else if ( button.hasAttribute("type") )
      button.removeAttribute("type");

    if ( empty )
      button.classList.add("empty");
    else
      button.classList.remove("empty");

    button.setAttribute("hidden", hide && empty);
    button.disabled = compact && empty;
  },

  checkStatusButton : function () {
    var showStatusButton = TextareaCacheUtil.statusButton;

    var button  = document.getElementById("tacacheStatusButton");
    var empty = TextareaCacheUtil.empty;

    if ( button )
      button.setAttribute("hidden", ( !showStatusButton || empty ) );
  },

  checkButtons : function () {
    this.checkStatusButton();
    this.checkToolbarButton();
  },

  checkToolMenu : function () {
    var showmenu = TextareaCacheUtil.toolMenu;
    var toolmenu = document.getElementById("tacacheToolMenu");
    if (toolmenu) {
      toolmenu.disabled = ( TextareaCacheUtil.empty );
      toolmenu.setAttribute("hidden", !showmenu);
    }
  },

  onContentMenu : function (e) {
    var tacacheContextMenuOpenCache = document.getElementById("tacacheContextOpenCache");
    if ( gContextMenu.onTextInput &&
         document.popupNode.localName.toLowerCase() != "input" &&
         !TextareaCacheUtil.empty )
      tacacheContextMenuOpenCache.hidden = false;
    else
      tacacheContextMenuOpenCache.hidden = true;
  },

  observer : {
    register : function () {
      let ObserverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
      ObserverService.addObserver(this, "textarea-cache-ui", false);
    },

    unregister : function () {
      let ObserverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
      ObserverService.removeObserver(this, "textarea-cache-ui", false);
    },

    observe : function (subject, topic, data) {
      switch (data) {
        case "status-button" :
          textareaCache.checkStatusButton();
          break;
        case "update-buttons" :
          textareaCache.checkButtons();
          break;
        case "toolbar-button" :
          textareaCache.checkToolbarButton();
          break;
      }
    }
  },

  init : function () {
    textareaCache.observer.register();

    textareaCache.isWindowPrivate = PrivateBrowsingUtils.isWindowPrivate(window);

    gBrowser.addEventListener("keyup", textareaCache.onKeyup, false);
    gBrowser.addEventListener("input", textareaCache.onInput, false);
    gBrowser.addEventListener("change", textareaCache.onChange, false);

    let menu_ToolsPopup = document.getElementById("tacacheToolMenu").parentNode;
    menu_ToolsPopup.addEventListener("popupshowing", textareaCache.checkToolMenu, false);
    document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", textareaCache.onContentMenu, false);

    let menuPanel = document.getElementById("PanelUI-popup");
    if ( menuPanel )
      menuPanel.addEventListener("popupshown", textareaCache.checkToolbarButton, false);

    textareaCache.checkButtons();
  },

  exit : function () {
    textareaCache.observer.unregister();

    gBrowser.removeEventListener("keyup", textareaCache.onKeyup, false);
    gBrowser.removeEventListener("input", textareaCache.onInput, false);
    gBrowser.removeEventListener("change", textareaCache.onChange, false);

    let menu_ToolsPopup = document.getElementById("tacacheToolMenu").parentNode;
    menu_ToolsPopup.removeEventListener("popupshowing", textareaCache.checkToolMenu, false);
    document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", textareaCache.onContentMenu, false);

    let menuPanel = document.getElementById("PanelUI-popup");
    if ( menuPanel )
      menuPanel.removeEventListener("popupshown", textareaCache.checkToolbarButton, false);
  }

}

window.addEventListener("load", textareaCache.init, false);
window.addEventListener("unload", textareaCache.exit, false);
