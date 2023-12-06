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
    me.setupAutoClear();
};

ta_bg.initPageAction = info => {
    var { forAll, tab_id } = info;
    var show_page_action = ta_database.data.setting.pageAction;

    if (!pageAction) return;

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
                    ta_database.data.setting.showContextMenu &&
                    menus
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
                    last_modified: String((new Date()).getTime())
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
        type: "popup", // "normal", "popup"
        height: 450,
        width: 800
    }).then(()=>{});
};

ta_bg._popupListInTab = () => {
    tabs.create({
        url: extension.getURL("view/list/list.html")
    });
};

ta_bg._popupLiteByPageAction = tab => {
    pageAction.settitle({
        tabId: tab.id,
        title: "View your saved data (Textarea Cache)"
    })

    pageAction.setIcon({
        tabId: tab.id,
        path: "icons/tacache-48-bw.png"
    });

    pageAction.setPopup({
        tabId: tab.id,
        popup: extension.getURL("view/lite/lite.html")
    });
    pageAction.openPopup();
};

ta_bg._popupLiteByBrowserAction = () => {
    action.openpopup();
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
        action.onClicked.removeListener(ta_bg._popupLiteByBrowserAction);

        action.setPopup({ popup: null });

        action.onClicked.addListener(ta_bg._popupListInWindow);
    }
    else {
        action.onClicked.removeListener(ta_bg._popupListInWindow);

        action.setPopup({
            popup: extension.getURL("view/lite/lite.html")
        });

        action.onClicked.addListener(ta_bg._popupLiteByBrowserAction);
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
        command: '_execute_action'
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

ta_bg.setupAutoClear = () => {
    // XXX: might causing performance issue (not sure)
    // should remove alarm when shouldAutoClear is set to false
    // and add back when shouldAutoClear is set to true

    browser.alarms.create('check-auto-clear', {
        periodInMinutes: 1
    });

    var checkAutoClear = () => {
        var data = ta_database.data;

        if (!data.setting.shouldAutoClear) return;

        var day  = data.setting.autoClear_day,
            hour = data.setting.autoClear_hour,
            min  = data.setting.autoClear_min;

        if (day + hour + min == 0) return;

        var lifetime = day  * 86400 +
                       hour * 3600 +
                       min  * 60;      // by second

        var now = new Date();

        for (var key in data) {
            if (['version', 'setting', 'exceptions'].includes(key)) continue;

            var cache_time = new Date(parseInt(data[key].time));
            var diff = (now.getTime() - cache_time.getTime()) / 1000; // by second

            if (diff > lifetime) {
                ta_database.remove(key);
            }
        }
    };

    browser.alarms.onAlarm.addListener(checkAutoClear);
    checkAutoClear();
};
