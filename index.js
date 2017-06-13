// background script

var bg = {
    isDEV: false,
    VERSION: '2',

    init: () => {
        var me = bg;
        me.checkStorageVersion();
        me.onMessage();
    },

    _hackForStorage: obj => {
        // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage/StorageArea/get#Return_value
        if ((typeof obj.length === 'number') && (obj.length > 0)) {
            obj = obj[0];
        }
    },

    log_storage: () => {
        var me = bg;
        browser.storage.local.get().then( thing => {
            me._hackForStorage(thing);
            if (me.isDEV) console.log(thing);
        });
    },

    checkStorageVersion: () => {
        var me = bg;
        browser.storage.local.get().then( local_obj => {
            me._hackForStorage(local_obj);

            if (!local_obj.version) {
                me._fallback(local_obj);
            }
        });
    },

    _fallback: local_obj => {
        var new_local_obj = {};
        var me = bg;
        var { log_storage } = me;

        for (var url in local_obj) {
            var title = url;
            var data_in_url = url[title];

            for (var id in data_in_url) {
                if (id.includes('length')) continue;

                var time = getDate(new Date());
                var key = `${time} ${title} ${id}`;
                var type = id.includes('w-') ? 'WYSIWYG' : 'txt';
                var { val } = data_in_url[id];

                new_local_obj.version = '2';
                new_local_obj[key] = {
                    type: type,
                    val: val
                };
                browser.storage.local.set(new_local_obj);
                log_storage();
            }
        }
    },

    getOptions: (request, sendBack) => {
        var me = bg;
        browser.storage.local.get().then( local_obj => {
            me._hackForStorage(local_obj);
            var {setting} = local_obj;
            sendBack({ setting: setting });
        }).catch(e => console.warn(e));
        return true;
    },

    setOptions: (request, sendBack) => {
        var me = bg;
        var { log_storage } = me;

        browser.storage.local.get().then( local_obj => {
            me._hackForStorage(local_obj);
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
        var date_str = date.getFullYear() + '/' + date.getMonth() + '/' + date.getDate();
        return date_str;
    },

    onMessage: () => {
        var me = bg;
        var {_getTime, log_storage, VERSION, isDEV} = me;

        browser.runtime.onMessage.addListener( (request, sender, sendBack) => {

            if (isDEV) console.log('bg_get_request', request.behavior);
            switch(request.behavior) {
                case 'set_options':
                    me.setOptions(request, sendBack);
                    break;
                case 'get_options':
                    me.getOptions(request, sendBack);
                    break;
                case 'init':
                    if (isDEV) console.log('bg_init');
                    break;
                case 'save':
                    if (isDEV) console.log('bg_save');
                    browser.storage.local.get().then( local_obj => {
                        me._hackForStorage(local_obj);
                        var {title, val, type, id} = request;
                        var time = _getTime(new Date());
                        var key = `${time} ${title} ${id}`;

                        if (isDEV) console.table({ key: key, val: val, type: type });

                        local_obj.version = VERSION;
                        local_obj[key] = {
                            type: type,
                            val: val
                        };

                        // clear unnessary data when saving
                        for (var cache_key in local_obj) {
                            if (cache_key !== 'version' && local_obj[cache_key].val.length == 0) {
                                delete local_obj[cache_key];
                            }
                        }

                        browser.storage.local.set(local_obj);
                        log_storage();
                    }).catch(e => console.warn(e));
                    break;
                case 'load':
                    if (isDEV) console.log('bg_load');

                    browser.storage.local.get().then( data => {
                        me._hackForStorage(data);
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
                    browser.storage.local.clear().then( () => {
                        log_storage();
                        sendBack({ msg: 'done'});
                    }).catch(e => console.warn(e));
                    break;
            }

            return true;
        });
    }

};
bg.init();
