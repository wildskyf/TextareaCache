var ta_bg = {};

ta_bg.init = () => {
    var me = ta_bg;
    me.listenMessageFromContentScript();

    me.setupCacheList();
    me.setupAutoClear();
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
        url: runtime.getURL("view/list/list.html"),
        type: "popup", // "normal", "popup"
        height: 450,
        width: 800
    }).then(()=>{});
};

ta_bg._popupListInTab = () => {
    tabs.create({
        url: runtime.getURL("view/list/list.html")
    });
};

ta_bg._popupLiteByBrowserAction = () => {
    browseraction.openpopup();
};

ta_bg.setupCacheList = () => {
    var me = ta_bg;
    var { setting } = ta_database.data;

    if (!setting) {
        setting = {
            popupType: 'tab',
            skipConfirmPaste: false,
            showContextMenu: true
        };
    }

    if (setting.popupType == "window") {
        browserAction.onClicked.removeListener(ta_bg._popupLiteByBrowserAction);

        browserAction.setPopup({ popup: "" });

        browserAction.onClicked.addListener(ta_bg._popupListInWindow);
    }
    else {
        browserAction.onClicked.removeListener(ta_bg._popupListInWindow);

        browserAction.setPopup({
            popup: runtime.getURL("view/lite/lite.html")
        });

        browserAction.onClicked.addListener(ta_bg._popupLiteByBrowserAction);
    }
};

ta_bg.setupContext = req => {
    var me = ta_bg;
    var site_names = Object.keys(ta_database.data).filter( t => t.includes(req.url));
    var datas = site_names.map( name => ta_database.data[name] ).filter( d => d.url == req.url );
    const menuItems = []
    for (let i=0; i<datas.length; i++) {
        const o = datas[i]
        const o2 = {type: o.type, val: o.val}
        if (o.type == 'WYSIWYG') o2.val = domPurify.sanitize(o.val)
        menuItems.push(o2)
    }
    me.showCachesInContext(menuItems);
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
        const {type, val} = cache;
        const flag = type == 'WYSIWYG' ? 'w' : 't'
        menus.create({
            id: flag + ':' + val,
            title: val,
            contexts: ["editable"]
        });
    });
    menus.onClicked.addListener(ta_bg._menuOnClick);
};

ta_bg.setupAutoClear = () => {
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

    const me = ta_bg
    const delay = 3000
    const interval = 15 * 60 * 1000
    const checkDelay = () => void setTimeout(() => {
        const t = Date.now()
        if (t - me.lastRunAutoClear < interval) return
        me.lastRunAutoClear = t
        checkAutoClear()
    }, delay)
    checkDelay();
    runtime.onMessage.addListener(checkDelay)
};
