var ta_database = {
    VERSION: '8',
    data: null,

    _resetData: {
        version: '8',
        setting: {
            pageActionLite: true,
            popupType: 'tab',
            skipConfirmPaste: false,
            showContextMenu: true,
            intervalToSave: 2000,
            shouldAutoClear: false,
            autoClear_day: 0,
            autoClear_hour: 0,
            autoClear_min: 0
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

    init: () => ta_database._loadFromStorage().then( async () => {
        var me = ta_database;
        var add_on_version = me.VERSION;
        var current_version = me.data && me.data.version;

        if (!current_version) return me.reset();
        if (add_on_version == current_version) return Promise.resolve();

        await me.updateDatabaseVersion();

        // return me.set('version', add_on_version);
    }),

    updateDatabaseVersion: async () => {
        var me = ta_database;

        for (var key in me._resetData.setting) {

            if (me.data.setting[key] == undefined) {
                me.data.setting[key] = me._resetData.setting[key];
                await me.set('setting', me.data.setting);
            }
        }

        if (me.data.setting.version != me.VERSION) {
            me.data.setting.version = me.VERSION;
            await me.set('setting', me.data.setting);
        }
    },

    reset: () => local.clear().then( () => {
        // reserve setting, clean caches
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

    print: () => console.log(ta_database.data)
};

