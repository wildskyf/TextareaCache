// background script
var { storage, runtime, browserAction, pageAction, tabs, windows } = browser;
var { local } = storage;

var bg = {
    isDEV: false,
    VERSION: '4',

    init: () => {
        var me = bg;
        me.checkStorageVersion();
        me.applyOptions();
        me.onMessage();
        tabs.onUpdated.addListener( tab_id => {
            me.initPageAction({
                forAll: false,
                tab_id: tab_id
            });
        });
        me.setupCacheList();
    },

    log_storage: () => bg.isDEV && local.get().then( db_data => console.log(db_data)),

    _catchErr: e => console.error(e),

    // obj empty: https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
    _isEmptyObj: obj => (Object.keys(obj).length === 0 && obj.constructor === Object),

    _getTime: date => date.getFullYear() + '/' + (parseInt(date.getMonth()) + 1) + '/' + date.getDate(),

    default_exceptions: [
        "docs.google.com/spreadsheets",
        "slack.com",
        "messenger.com"
    ],

    checkStorageVersion: () => {
        var me = bg;
        var { default_exceptions, VERSION, _catchErr } = me;
        local.get().then( db_data => {

            if (parseInt( db_data && db_data.version) == VERSION) {
                return
            }
            else if (parseInt( db_data && db_data.version) < VERSION) {
                local.set({
                    version: VERSION,
                    setting: db_data.setting || {},
                    exceptions: default_exceptions
                }).catch(_catchErr);
            }
            else {
                // if just installed || some other strange situations (e.g., db_data.version > VERSION ... etc)
                me.initDatabase();
            }
        }).catch(me._catchErr);
    },

    applyOptions: () => {
        local.get().then( db_data => {
            bg.isDEV = !!(db_data.setting && db_data.setting.debug);
        }).catch(bg._catchErr);
    },

    getOptions: () => local.get().catch(bg._catchErr),

    setOptions: request => {
        var me = bg;
        var { log_storage, isDEV } = me;

        return local.get().then( local_obj => {
            log_storage();
            if (!local_obj.setting) {
                if (isDEV) console.log('creating setting');
                local_obj.setting = {};
            }
            local_obj.setting[request.key] = request.val;
            local.set(local_obj);
            log_storage();
        }).catch(bg._catchErr);
    },

    initPageAction: info => {
        var { forAll, tab_id } = info;
        local.get().then( local_obj => {
            var show_page_action = local_obj.setting.pageAction;
            if (forAll) {
                tabs.query({}).then(tab_infos => {
                    tab_infos.forEach(tab_info => {
                        if (show_page_action) {
                            pageAction.show(tab_info.id);
                        }
                        else {
                            pageAction.hide(tab_info.id);
                        }
                    });
                }).catch(bg._catchErr);
            }
            else {
                if (show_page_action) {
                    pageAction.show(tab_id);
                }
                else {
                    pageAction.hide(tab_id);
                }
            }
        }).catch(bg._catchErr);
    },

    initDatabase: old_data => local.clear().then( () => {
        local.set({
            version: bg.VERSION,
            setting: (old_data && old_data.setting) || {},
            exceptions: (old_data && old_data.exceptions)|| bg.default_exceptions
        }).catch(bg._catchErr);
    }).catch(bg._catchErr),

    onMessage: () => {
        var me = bg;
        var {log_storage, isDEV} = me;

        runtime.onMessage.addListener( (request, sender, sendBack) => {

            if (isDEV) console.log('bg_get_request', request.behavior);
            switch(request.behavior) {
            case 'get_exceptions':
                if (isDEV) console.log('get_exceptionsv');
                local.get().then( local_obj => {
                    sendBack({ expts: local_obj.exceptions })
                }).catch(bg._catchErr);
                break;
            case 'set_exceptions':
                if (isDEV) console.log('set_exceptionsv');
                local.set({
                    exceptions: request.val.split('\n').filter(site => site)
                }).then( () => {
                    sendBack({ msg: 'done'});
                }).catch(bg._catchErr);
                break;
            case 'set_options':
                me.setOptions(request).then( () => {
                    me.initPageAction({
                        forAll: true
                    });
                    me.setupCacheList();
                    sendBack({ msg: 'done'});
                });
                break;
            case 'get_options':
                me.getOptions().then( db_data => {
                    sendBack(db_data.setting);
                });

                break;
            case 'save':
                if (isDEV) console.log('bg_save');
                var {title, val, type, id, url, sessionKey} = request;
                var key = `${sessionKey} ${title} ${id}`;

                if (isDEV) console.table({ key: key, val: val, type: type, url: url });

                var tmp = {};
                tmp[key] = {
                    time: sessionKey,
                    type: type,
                    val: val,
                    url: url,
                    last_modified: new Date()
                };

                local.set(tmp).catch(bg._catchErr);
                log_storage();
                break;
            case 'load':
                if (isDEV) console.log('bg_load');
                local.get().then( data => {
                    sendBack({ data: data });
                }).catch(bg._catchErr);
                break;
            case 'delete':
                if (isDEV) console.log('bg_delete');
                local.remove(request.id).then( () => {
                    local.get().then( data => {
                        sendBack({ msg: 'done', deleted: request.id, data: data});
                    }).catch(bg._catchErr);
                }).catch(bg._catchErr);
                break;
            case 'clear':
                if (isDEV) console.log('bg_clear');
                local.get().then( data => {
                    me.initDatabase({
                        setting: data.setting,
                        exceptions: data.exceptions
                    }).then( () => {
                        sendBack({ msg: 'done' });
                    });
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
        var me = bg;

        local.get('setting').then( data => {
            var { setting } = data;

            if (!setting) {
                setting = {
                    popupType: "tab",
                    pageActionLite: false
                };
            }

            if (setting.popupType == "window") {
                browserAction.onClicked.removeListener(bg._popupListInTab);
                pageAction.onClicked.removeListener(bg._popupListInTab);

                browserAction.onClicked.addListener(bg._popupListInWindow);
                pageAction.onClicked.addListener(bg._popupListInWindow);
            }
            else {
                browserAction.onClicked.removeListener(bg._popupListInWindow);
                pageAction.onClicked.removeListener(bg._popupListInWindow);

                browserAction.onClicked.addListener(bg._popupListInTab);
                pageAction.onClicked.addListener(bg._popupListInTab);
            }

            if (setting.pageActionLite) {
                pageAction.onClicked.removeListener(bg._popupListInWindow);
                pageAction.onClicked.removeListener(bg._popupListInTab);

                pageAction.onClicked.addListener(bg._popupLite);
            }
            else {
                pageAction.onClicked.removeListener(bg._popupLite);
            }

        }).catch(bg._catchErr);
    }
};
bg.init();

