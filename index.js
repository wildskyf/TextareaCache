// background script

var bg = {
    isDEV: false,
    VERSION: '2',

    init: () => {
        var me = bg;
        me.checkStorageVersion();
        me.applyOptions();
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

            if (!local_obj.version || local_obj.version !== me.VERSION) {
                me._fallback(local_obj, local_obj.version);
            }
        });
    },

    _fallback: (local_obj, version) => {
        var new_local_obj = {};
        var me = bg;
        var { log_storage } = me;

        if (!version) {
            for (var url in local_obj) {
                var title = url;
                var data_in_url = url[title];

                for (var id in data_in_url) {
                    if (id.includes('length')) continue;

                    var time = _getTime(new Date());
                    var key = `${time} ${title} ${id}`;
                    var type = id.includes('w-') ? 'WYSIWYG' : 'txt';
                    var { val } = data_in_url[id];

                    new_local_obj.version = '3';
                    new_local_obj[key] = {
                        time: new Date(),
                        type: type,
                        val: val
                    };
                    browser.storage.local.set(new_local_obj);
                    log_storage();
                }
            }
        }
        else if (version == '2') {
            var new_obj = {
                version: '3'
            };
            delete local_obj.version;

            for (var key in local_obj) {
                var new_val = local_obj[key];
                var key_arr = key.split(' ');
                var time_arr = key_arr[0].split('/');
                var month = parseInt(time_arr[1]) + 1;

                new_val.time = new Date();
                key_arr[0] = `${time_arr[0]}/${month}/${time_arr[2]}`;
                new_obj[key_arr.join(' ')] = new_val;
            }
            browser.storage.local.clear();
            browser.storage.local.set(new_obj);
            log_storage();
        }

    },

    applyOptions: () => {
        var me = bg;
        browser.storage.local.get().then( local_obj => {
            me._hackForStorage(local_obj);
            var {setting} = local_obj;
            me.isDEV = !!setting.debug;
        }).catch(e => console.warn(e));
    },

    getOptions: (request, sendBack) => {
        var me = bg;
        browser.storage.local.get().then( local_obj => {
            me._hackForStorage(local_obj);
            var {setting} = local_obj;
            if (sendBack) sendBack({ setting: setting });
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
        var date_str = date.getFullYear() + '/' + (parseInt(date.getMonth()) + 1) + '/' + date.getDate();
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
                            time: new Date(),
                            type: type,
                            val: val
                        };

                        // clear unnessary data when saving
                        for (var cache_key in local_obj) {
                            if (cache_key !== 'version' && cache_key !== 'setting' && local_obj[cache_key].val.length == 0) {
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
