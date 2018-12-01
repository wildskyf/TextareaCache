var ta_bg = {};

ta_bg.init = () => {
    var me = ta_bg;
    me.listenMessageFromContentScript();

    // FIXME: the timing for event binding is wrong
    tabs.onUpdated.addListener( tab_id => {
        me.initPageAction({
            forAll: false,
            tab_id: tab_id
        });
    });

    me.setupCacheList();
};

ta_bg.initPageAction = info => {
    var { forAll, tab_id } = info;
    var show_page_action = ta_database.data.setting.pageAction;

    if (forAll) {
        tabs.query({}).then(tab_infos => {
            tab_infos.forEach(tab_info => {
                show_page_action ?
                    pageAction.show(tab_info.id) :
                    pageAction.hide(tab_info.id);
            });
        }).catch(catchErr);
    }
    else {
        show_page_action ?
            pageAction.show(tab_id) :
            pageAction.hide(tab_id);
    }
};

ta_bg.listenMessageFromContentScript = () => {
    var me = ta_bg;

    runtime.onMessage.addListener( (request, sender, sendBack) => {

        switch(request.behavior) {
            case 'init':
                if (ta_database &&
                    ta_database.data &&
                    ta_database.data.setting &&
                    ta_database.data.setting.showContextMenu
                ) {
                    menus.removeAll();
                    menus.onClicked.removeListener(me._menuOnClick);
                    me.setupContext(request);
                }
                break;
            case 'get_exceptions':
                sendBack({ expts: ta_database.data.exceptions });
                break;
            case 'set_exceptions':
                ta_database.set(
                    'exceptions', request.val.split('\n').filter(site => site)
                ).then( () => sendBack({ msg: 'done'}) );
                break;
            case 'set_options':
                ta_database.setOptions(request).then( () => {
                    me.setupCacheList();
                    me.initPageAction({
                        forAll: true
                    });
                    sendBack({ msg: 'done'});
                });
                break;
            case 'get_options':
                sendBack(ta_database.data.setting);
                break;
            case 'save':
                var {title, val, type, id, url, sessionKey} = request;
                ta_database.set(`${sessionKey} ${url} ${id}`, {
                    time: sessionKey,
                    type: type,
                    val: val,
                    url: url,
                    last_modified: new Date()
                });
                break;
            case 'load':
                sendBack({ data: ta_database.data });
                break;
            case 'delete':
                ta_database.remove(request.id).then( () => {
                    sendBack({ msg: 'done', deleted: request.id, data: ta_database.data });
                });
                break;
            case 'clear':
                ta_database.reset().then( () => {
                    sendBack({ msg: 'done' });
                });
                break;
        }

        return true;
    });
};

ta_bg._popupListInWindow = () => {
    windows.create({
        url: extension.getURL("view/list/list.html"),
        type: "detached_panel", // "normal", "popup", "panel", "detached_panel"
        height: 450,
        width: 800
    });
};

ta_bg._popupListInTab = () => {
    tabs.create({
        url: extension.getURL("view/list/list.html")
    });
};

ta_bg._popupLiteByPageAction = tab => {
    pageAction.setPopup({
        tabId: tab.id,
        popup: extension.getURL("view/lite/lite.html")
    });
    pageAction.openPopup();
};

ta_bg._popupLiteByBrowserAction = tab => {
    browserAction.setPopup({
        tabId: tab.id,
        popup: extension.getURL("view/lite/lite.html")
    });
    browserAction.openPopup();
};

ta_bg.setupCacheList = () => {
    var me = ta_bg;
    var { setting } = ta_database.data;

    if (!setting) {
        setting = {
            popupType: 'tab',
            pageActionLite: true,
            skipConfirmPaste: false,
            showContextMenu: true
        };
    }

    if (setting.popupType == "window") {
        browserAction.onClicked.removeListener(ta_bg._popupLiteByBrowserAction);
        browserAction.onClicked.addListener(ta_bg._popupListInWindow);
    }
    else {
        browserAction.onClicked.removeListener(ta_bg._popupListInWindow);
        browserAction.onClicked.addListener(ta_bg._popupLiteByBrowserAction);
    }

    if (!setting.pageAction) return;
    var target_function = setting.popupType == "window" ? ta_bg._popupListInWindow : ta_bg._popupLiteByPageAction;
    if (setting.pageActionLite) {
        pageAction.onClicked.removeListener(target_function);
        pageAction.onClicked.addListener(ta_bg._popupLiteByPageAction);
    }
    else {
        pageAction.onClicked.removeListener(ta_bg._popupLiteByPageAction);
        pageAction.onClicked.addListener(target_function);
    }
};

ta_bg.setupContext = req => {
    var me = ta_bg;
    var site_names = Object.keys(ta_database.data).filter( t => t.includes(req.url));
    var datas = site_names.map( name => ta_database.data[name] ).filter( d => d.url == req.url ).map( d => d.val );
    me.showCachesInContext(datas);
};

ta_bg._menuOnClick = (info, tab) => {
    if (/^\[TEXTAREA CACHE\] /.test(info.menuItemId)) return;

    tabs.sendMessage(tab.id, {
        behavior: 'pasteToTextarea',
        val: info.menuItemId,
        skipConfirmPaste: ta_database.data.setting.skipConfirmPaste
    });
};

ta_bg.showCachesInContext = caches => {
    if (caches.length == 0) return;

    menus.create({
        id: '[TEXTAREA CACHE] open-cache-list',
        title: 'View your caches',
        contexts: ["editable"],
        command: '_execute_browser_action'
    });

    menus.create({
        type: 'separator'
    });

    caches.forEach( cache => {
        menus.create({
            id: cache,
            title: cache,
            contexts: ["editable"]
        });
    });
    menus.onClicked.addListener(ta_bg._menuOnClick);
};
