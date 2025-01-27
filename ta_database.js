var ta_database = {
    VERSION: '10',
    data: null,

    _resetData: {
        version: '10',
        setting: {
            popupType: 'tab',
            skipConfirmPaste: false,
            onlyCacheFocusElement: false,
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

    getAll() {
        return local.get()
    },

    configLoad: () => {
        // const data = local.get(['setting', 'version', 'exceptions'])
        var data = localStorage.getItem('config')
        if (data) data = JSON.parse(data)
        else data = ta_database._resetData
        ta_database.data = data
    },
    configSave() {
        var data = JSON.stringify(ta_database.data)
        localStorage.setItem('config', data)
    },

    init: () => {
        ta_database.configLoad()
    },

    // clear history
    reset: () => local.clear(),

    remove: key => local.remove(key),

    set: (name, obj) => {
        if (name in ta_database.data) {
            ta_database.data[name] = obj
            ta_database.configSave()
        }

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

