// background script, data from content script:
//
//  {
//      behavior:   'save',
//      title:      'the website title',       /* String */
//      url:        'https://the.website/url', /* String */
//      val:        'the text in textarea',    /* String */
//      id:         'the No. of textarea',     /* String */
//      type:       'is the textarea WYSIWYG', /* String, [WYSIWYG|txt] */
//      sessionKey: 'the timeing open page'    /* String */
//  }

var { storage, runtime, browserAction, pageAction, tabs, windows, menus } = browser;
var { local } = storage;

var catchErr = e => console.error(e);

var ta_database = {
    VERSION: '6',
    data: null,

    _resetData: {
        version: '6',
        setting: {
            pageActionLite: true,
            popupType: 'tab',
            skipConfirmPaste: false,
            showContextMenu: true
        },
        exceptions: [
            "docs.google.com/spreadsheets",
            "slack.com",
            "messenger.com"
        ]
    },

    _loadFromStorage: () => local.get().then( db_data => {
        ta_database.data = db_data;
    }),

    _checkVersion: () => ta_database._loadFromStorage().then( () => {
        var { VERSION, _resetData, data, reset } = ta_database;

        if (!data || !data.version) {
            reset();
        }
        else if (data.version == VERSION) {
            return
        }
        else if (data.version < VERSION) {
            for (var d in data) {
                if (d.includes('"')) {
                    // avoid wrong render when listing
                    delete data[d];
                    local.remove(d);
                }

                if (d == 'setting') {
                    if (d.skipConfirmPaste == undefined) {
                        d.skipConfirmPaste = false;
                    }
                    if (d.showContextMenu == undefined) {
                        d.skipConfirmPaste = true;
                    }
                }
                if ( (new Date(data.last_modified)).toLocaleString() == 'Invalid Date' ) {
                    // avoid Invalid Date
                    if (!data[d]) return;

                    data[d].last_modified = new Date();
                    var tmp = {};
                    tmp[d] = data[d];
                    local.set(tmp);
                }
            }

            local.set(data).catch(catchErr);
        }
        else {
            reset();
        }
    }),

    reset: () => local.clear().then( () => {
        var { data, _resetData } = ta_database;

        var keep_config = Object.assign({}, _resetData);
        if (data.setting) keep_config.setting = data.setting;
        if (data.exceptions) keep_config.exceptions = data.exceptions;

        return local.set(keep_config).then( () => {
            ta_database.data = keep_config;
        });
    }),

    remove: key => local.remove(key).then( () => {
        delete ta_database.data[key];
    }),

    set: (name, obj) => {
        ta_database.data[name] = obj

        var tmp = {};
        tmp[name] = obj;
        return local.set(tmp);
    },

    setOptions: config => {
        var { setting } = ta_database.data;
        var { key, val } = config;
        setting[key] = val;
        return ta_database.set('setting', setting);
    },

    print: () => console.log(ta_database.data),

    init: () => {
        return ta_database._checkVersion();
    }
};

var ta_bg = {
    init: () => {
        var me = ta_bg;
        me.onMessage();

        // FIXME: the timing for event binding is wrong
        tabs.onUpdated.addListener( tab_id => {
            me.initPageAction({
                forAll: false,
                tab_id: tab_id
            });
        });

        me.setupCacheList();
    },

    initPageAction: info => {
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
    },

    onMessage: () => {
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
                sendBack({ expts: ta_database.data.exceptions })
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
    },

    _popupListInWindow: () => {
        windows.create({
            url: browser.extension.getURL("list/list.html"),
            type: "detached_panel", // "normal", "popup", "panel", "detached_panel"
            height: 450,
            width: 800
        });
    },

    _popupListInTab: () => {
        tabs.create({
            url: browser.extension.getURL("list/list.html")
        });
    },

    _popupLite: tab => {
        pageAction.setPopup({
            tabId: tab.id,
            popup: browser.extension.getURL("list/lite.html")
        });
        pageAction.openPopup();
    },

    setupCacheList: () => {
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
            browserAction.onClicked.removeListener(ta_bg._popupListInTab);
            browserAction.onClicked.addListener(ta_bg._popupListInWindow);
        }
        else {
            browserAction.onClicked.removeListener(ta_bg._popupListInWindow);
            browserAction.onClicked.addListener(ta_bg._popupListInTab);
        }

        if (!setting.pageAction) return;
        var target_function = setting.popupType == "window" ? ta_bg._popupListInWindow : ta_bg._popupListInTab;
        if (setting.pageActionLite) {
            pageAction.onClicked.removeListener(target_function);
            pageAction.onClicked.addListener(ta_bg._popupLite);
        }
        else {
            pageAction.onClicked.removeListener(ta_bg._popupLite);
            pageAction.onClicked.addListener(target_function);
        }
    },

    setupContext: req => {
        var me = ta_bg;
        var site_names = Object.keys(ta_database.data).filter( t => t.includes(req.url));
        var datas = site_names.map( name => ta_database.data[name] ).filter( d => d.url == req.url ).map( d => d.val );
        me.showCachesInContext(datas);
    },

    _menuOnClick: (info, tab) => {
        if (/^\[TEXTAREA CACHE\] /.test(info.menuItemId)) return;

        tabs.sendMessage(tab.id, {
            behavior: 'pasteToTextarea',
            val: info.menuItemId,
            skipConfirmPaste: ta_database.data.setting.skipConfirmPaste
        });
    },

    showCachesInContext: caches => {
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
    }
};

ta_database.init().then( () => {
    ta_bg.init();
});

