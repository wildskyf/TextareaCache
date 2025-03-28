var ta_bg = {};

ta_bg.init = () => {
    var me = ta_bg;
    me.listenMessageFromContentScript();
    me.setupContext()
    me.setupCacheList();
    me.setupAutoClear();
};

ta_bg.listenMessageFromContentScript = () => {
    var me = ta_bg;

    let callee
    runtime.onMessage.addListener(callee = (request, sender, sendBack) => {
        const db = ta_database
        if (db.loading) {
            db.loadingPromise.then(() => callee(request, sender, sendBack))
            return true
        }
        switch(request.behavior) {
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
                    const r = request
                    if (r.key == 'popupType') ta_bg.setupCacheList()
                    sendBack({ msg: 'done'});
                    // attach listener according to new config
                    const rl = 'popupType showContextMenu shouldAutoClear'
                    if (rl.split(' ').indexOf(r.key) == -1) return
                    setTimeout(() => browser.runtime.reload(), 300)
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
                ta_database.getAll().then(data => sendBack({data}))
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

// we need this to make textarea cache bg execute once when browser start
// because action.setPopup is not persistent
browser.runtime.onStartup.addListener(() => 'nop')

ta_bg.setupCacheList = () => {
    var me = ta_bg;
    const db = ta_database
    if (db.loading || db.data.setting.popupType == 'window') {
        browserAction.setPopup({popup: ""})
        browserAction.onClicked.addListener(ta_bg._popupListInWindow)
    }
    else {
        browserAction.setPopup({
            popup: runtime.getURL("view/lite/lite.html")
        })
    }
    if (db.loading) db.loadingPromise.then(() => me.setupCacheList())
};

ta_bg.setupContext = () => {
    const db = ta_database
    const me = ta_bg
    if (!menus) return
    if (db.loading || db.data.setting.showContextMenu) {
        menus.onClicked.addListener(me._menuOnClick);
        menus.onShown.addListener(me.updateContext);
    }
    else {
        menus.onClicked.removeListener(me._menuOnClick);
        menus.onShown.removeListener(me.updateContext);
        menus.removeAll()
    }
    if (db.loading) db.loadingPromise.then(() => ta_bg.setupContext())
}
ta_bg.updateContext = async evt => {
    menus.removeAll()
    var me = ta_bg;
    const tab = await tabs.query({active: true, currentWindow: true})
    const url = tab[0].url
    const dataAll = await ta_database.getAll()
    var site_names = Object.keys(dataAll).filter( t => t.includes(url));
    var datas = site_names.map( name => dataAll[name] ).filter( d => d.url == url );
    const menuItems = []
    for (let i=0; i<datas.length; i++) {
        const o = datas[i]
        const o2 = {type: o.type, val: o.val}
        menuItems.push(o2)
    }
    me.showCachesInContext(menuItems);
};

ta_bg.domPurify = null
ta_bg.getDomPurify = async function () {
    if (this.domPurify) return this.domPurify
    const m = await import('./vendor/dompurify.js')
    return this.domPurify = m.default
}

ta_bg._menuOnClick = async (info, tab) => {
    if (/^\[TEXTAREA CACHE\] /.test(info.menuItemId)) return;

    const t = info.menuItemId.charAt(0)
    let b = info.menuItemId.slice(2)
    if (t == 'w') {
        const domPurify = await ta_bg.getDomPurify()
        b = domPurify.sanitize(b)
    }

    tabs.sendMessage(tab.id, {
        behavior: 'pasteToTextarea',
        val: `${t}:${b}`,
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
        const {type, val} = cache;
        const flag = type == 'WYSIWYG' ? 'w' : 't'
        menus.create({
            id: flag + ':' + val,
            title: val,
            contexts: ["editable"]
        });
    });

    menus.refresh()
};

ta_bg.setupAutoClear = () => {
    var checkAutoClear = async () => {
        var data = await ta_database.getAll()
        var setting = ta_database.data.setting

        if (!setting.shouldAutoClear) return;

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
    let delay = 0
    const interval = 15 * 60 * 1000
    const checkDelay = () => void setTimeout(async () => {
        const t = Date.now()
        if (t - me.lastRunAutoClear < interval) return
        me.lastRunAutoClear = t
        checkAutoClear()
    }, delay)
    checkDelay();
    delay = 3000
    runtime.onMessage.addListener(checkDelay)
};
