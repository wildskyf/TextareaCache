// background script

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
        var me = bg;
        browser.storage.local.get().then( thing => {
            if (me.isDEV) console.log(thing);
        });
    },

    checkStorageVersion: () => {
        var me = bg;
        browser.storage.local.get().then( local_obj => {
            var exceptions = [ "docs.google.com/spreadsheets", "slack.com", "messenger.com" ];

            if ( !local_obj || (Object.keys(local_obj).length === 0 && local_obj.constructor === Object) ) {
                // obj empty: https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
                //
                // if install this add-on first time

                local_obj = {
                    version: me.VERSION,
                    setting: {},
                    exceptions: exceptions
                }
                browser.storage.local.set(local_obj);
                return;
            }

            if (parseInt(local_obj.version) < me.VERSION) {
                browser.storage.local.set({
                    version: me.VERSION,
                    exceptions: exceptions
                });
                return;
            }
            else if (parseInt(local_obj.version) == me.VERSION) {
                return;
            }

            console.error('There is something wrong with Textarea Cache, reset all data... ')
            browser.storage.local.clear();
            browser.storage.local.set({
                version: me.VERSION,
                setting: {},
                exceptions: exceptions
            });
        });
    },

    applyOptions: () => {
        var me = bg;
        browser.storage.local.get().then( local_obj => {
            var {setting} = local_obj;
            me.isDEV = !!(setting && setting.debug);
        }).catch(e => console.warn(e));
    },

    getOptions: (request, sendBack) => {
        browser.storage.local.get().then( local_obj => {
            var {setting} = local_obj;
            if (sendBack) sendBack(setting);
        }).catch(e => console.warn(e));
        return true;
    },

    setOptions: (request, sendBack) => {
        var me = bg;
        var { log_storage } = me;

        browser.storage.local.get().then( local_obj => {
            log_storage();
            if (local_obj.setting === undefined) {
                if (me.isDEV) console.log('creating setting');
                local_obj.setting = {};
            }
            local_obj.setting[request.key] = request.val;
            browser.storage.local.set(local_obj);
            log_storage();
            sendBack({ msg: 'done'});
        }).catch(e => console.warn(e));
        return true;
    },

    _getTime: date => {
        var date_str = date.getFullYear() + '/' + (parseInt(date.getMonth()) + 1) + '/' + date.getDate();
        return date_str;
    },

    onMessage: () => {
        var me = bg;
        var {log_storage, isDEV} = me;

        browser.runtime.onMessage.addListener( (request, sender, sendBack) => {

            if (isDEV) console.log('bg_get_request', request.behavior);
            switch(request.behavior) {
            case 'get_exceptions':
                browser.storage.local.get().then( local_obj =>
                    sendBack({ expts: local_obj.exceptions })
                );
                break;
            case 'set_exceptions':
                browser.storage.local.set({
                    exceptions: request.val.split('\n').filter(site => site)
                }).then( () => sendBack({ msg: 'done'}));
                break;
            case 'set_options':
                me.setOptions(request, sendBack);
                break;
            case 'get_options':
                me.getOptions(request, sendBack);
                break;
            case 'init':
                if (isDEV) console.log('bg_init');

                browser.storage.local.get().then( local_obj => {
                    var {setting} = local_obj;
                    var {browserAction, pageAction} = setting;

                    if (browserAction) {
                        // can't hide ...
                    }

                    if (pageAction) {
                        browser.tabs.query({ url: request.url }).then(tab_infos => {
                            tab_infos.forEach(tab_info => {
                                browser.pageAction.show(tab_info.id);
                            });
                        }).catch(e => console.warn(e));
                    }
                }).catch(e => console.warn(e));
                break;
            case 'save':
                if (isDEV) console.log('bg_save');
                browser.storage.local.get().then( local_obj => {
                    var {title, val, type, id, url, sessionKey} = request;
                    var key = `${sessionKey} ${title} ${id}`;

                    if (isDEV) console.table({ key: key, val: val, type: type, url: url });

                    local_obj[key] = {
                        time: sessionKey,
                        type: type,
                        val: val,
                        url: url
                    };

                    browser.storage.local.set(local_obj);
                    log_storage();
                }).catch(e => console.warn(e));
                break;
            case 'load':
                if (isDEV) console.log('bg_load');

                browser.storage.local.get().then( data => {
                    sendBack({ data: data });
                });

                break;
            case 'delete':
                if (isDEV) console.log('bg_delete');
                browser.storage.local.remove(request.id).then(() => {
                    browser.storage.local.get().then( data => {
                        sendBack({ done: 1, deleted: request.id, data: data});
                    });
                });
                break;
            case 'clear':
                if (isDEV) console.log('bg_clear');
                browser.storage.local.get().then( local_obj => {
                    var old_obj = Object.assign({}, local_obj);
                    browser.storage.local.clear().then( () => {
                        browser.storage.local.set({
                            version: old_obj.version,
                            setting: old_obj.setting
                        }).then( () => {
                            log_storage();
                            sendBack({ msg: 'done'});
                        });
                    }).catch(e => console.warn(e));
                });
                break;
            }

            return true;
        });
    }

};
bg.init();
