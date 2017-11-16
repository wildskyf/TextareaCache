// background script
var { storage, runtime, pageAction, tabs } = browser;
var { local } = storage;

var bg = {
    isDEV: false,
    VERSION: '4',

    init: () => {
        var me = bg;
        me.checkStorageVersion();
        me.applyOptions();
        me.onMessage();
    },

    log_storage: () => {
        if (!bg.isDEV) return;
        local.get().then( thing => {
            console.log(thing);
        });
    },

    _catchErr: e => console.error(e),

    _isEmptyObj: obj => (
        // obj empty: https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
        Object.keys(obj).length === 0 && obj.constructor === Object
    ),

    _getTime: date => date.getFullYear() + '/' + (parseInt(date.getMonth()) + 1) + '/' + date.getDate(),

    default_exceptions: [
        "docs.google.com/spreadsheets",
        "slack.com",
        "messenger.com"
    ],

    checkStorageVersion: () => {
        var me = bg;
        local.get().then( db_data => {
            var { default_exceptions, VERSION, _isEmptyObj, _catchErr } = me;

            if ( !db_data || _isEmptyObj(db_data) || parseInt(db_data.version) > VERSION) {
                // if just installed
                // or db_data.version > VERSION, which should not happen
                me.initDatabase();
            }
            else if (parseInt(db_data.version) < VERSION) {
                local.set({
                    version: VERSION,
                    setting: db_data.setting || {},
                    exceptions: default_exceptions
                }).catch(_catchErr);
            }
        }).catch(me._catchErr);
    },

    applyOptions: () => {
        var me = bg;
        local.get().then( local_obj => {
            var {setting} = local_obj;
            me.isDEV = !!(setting && setting.debug);
        }).catch(me._catchErr);
    },

    getOptions: () => {
        return local.get().catch(bg._catchErr);
    },

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

    initPageAction: url => {
        local.get().then( local_obj => {
            var {setting} = local_obj;
            var page_action = setting.pageAction;

            if (page_action) {
                tabs.query({ url: url }).then(tab_infos => {
                    tab_infos.forEach(tab_info => {
                        pageAction.show(tab_info.id);
                    });
                }).catch(bg._catchErr);
            }
        }).catch(bg._catchErr);
    },

    initDatabase: () => local.clear().then( () => {
        local.set({
            version: bg.VERSION,
            setting: {},
            exceptions: bg.default_exceptions
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
                    sendBack({ msg: 'done'});
                });
                break;
            case 'get_options':
                me.getOptions().then( db_data => {
                    sendBack(db_data.setting);
                });

                break;
            case 'init':
                if (isDEV) console.log('bg_init');
                me.initPageAction(request.url);
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
                me.initDatabase().then( () => {
                    sendBack({ msg: 'done' });
                });
                break;
            }

            return true;
        });
    }

};
bg.init();

