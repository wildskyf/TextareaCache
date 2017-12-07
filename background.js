// background script
var { storage, runtime, browserAction, pageAction, tabs, windows } = browser;
var { local } = storage;

var bg = {
    isDEV: false,
    VERSION: '4',

    currentData: null,

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

    log_storage: () => bg.isDEV && console.log(bg.currentData),

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
            me.currentData = db_data;

            if (parseInt( db_data && db_data.version) == VERSION) {
                return
            }
            else if (parseInt( db_data && db_data.version) < VERSION) {
                var updateData = {
                    version: VERSION,
                    setting: db_data.setting || {},
                    exceptions: default_exceptions
                };
                me.currentData = Object.assign( db_data, updateData);
                local.set(updateData).catch(_catchErr);
            }
            else {
                // if just installed || some other strange situations (e.g., db_data.version > VERSION ... etc)
                me.initDatabase();
            }
        }).catch(me._catchErr);
    },

    applyOptions: () => {
        bg.isDEV = !!(bg.currentData.setting && bg.currentData.setting.debug);
    },

    setOptions: request => {
        var me = bg;
        var { log_storage, isDEV } = me;

            log_storage();
            if (!me.currentData.setting) {
                if (isDEV) console.log('creating setting');
                me.currentData.setting = {};
            }
            me.currentData.setting[request.key] = request.val;
            local.set(me.currentData);
            log_storage();
    },

    initPageAction: info => {
        var { forAll, tab_id } = info;
        var show_page_action = bg.currentData.setting.pageAction;
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
    },

    initDatabase: old_data => local.clear().then( () => {
        var me = bg;
        var resetData = {
            version: bg.VERSION,
            setting: (old_data && old_data.setting) || {},
            exceptions: (old_data && old_data.exceptions)|| bg.default_exceptions
        };
        me.currentData = resetData;
        local.set(resetData).catch(me._catchErr);
    }).catch(bg._catchErr),

    onMessage: () => {
        var me = bg;
        var {log_storage, isDEV} = me;

        runtime.onMessage.addListener( (request, sender, sendBack) => {

            if (isDEV) console.log('bg_get_request', request.behavior);
            switch(request.behavior) {
            case 'get_exceptions':
                if (isDEV) console.log('get_exceptionsv');
                sendBack({ expts: me.currentData.exceptions })
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
                sendBack(me.currentData.setting);
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
                sendBack({ data: me.currentData });
                break;
            case 'delete':
                if (isDEV) console.log('bg_delete');
                local.remove(request.id).then( () => {
                    sendBack({ msg: 'done', deleted: request.id, data: me.currentData});
                }).catch(bg._catchErr);
                break;
            case 'clear':
                if (isDEV) console.log('bg_clear');
                me.initDatabase({
                    setting: me.currentData.setting,
                    exceptions: me.currentData.exceptions
                }).then( () => {
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
        var me = bg;

        var { setting } = me.currentData;

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

        if (setting.pageAction) {
            if (setting.pageActionLite) {
                pageAction.onClicked.removeListener(bg._popupListInWindow);
                pageAction.onClicked.removeListener(bg._popupListInTab);

                pageAction.onClicked.addListener(bg._popupLite);
            }
            else {
                pageAction.onClicked.removeListener(bg._popupLite);
            }
        }

    }
};
bg.init();

