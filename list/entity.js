var entity = {
    key: null,
    $show_cache: null,

    selectText: dom => {
        var range = null;
        if (document.selection) {
            range = document.body.createTextRange();
            range.moveToElementText(dom);
            range.select();
        }
        else if (window.getSelection) {
            range = document.createRange();
            range.selectNode(dom);
            window.getSelection().addRange(range);
        }
    },

    initButtonEvent: () => {
        var me = entity;
        var $show_cache     = me.$show_cache;
        var $copy_btn       = document.querySelector('#copy_btn');
        var $delete_btn     = document.querySelector('#delete_btn');

        $copy_btn.textContent = browser.i18n.getMessage("copy");
        $delete_btn.textContent = browser.i18n.getMessage("delete");
        $copy_btn.addEventListener('click', () => {
            if ($show_cache.type == 'WYSIWYG') {
                me.selectText($show_cache);
            }
            else {
                document.querySelector("textarea").select();
            }
            document.execCommand("Copy");
        });

        $delete_btn.addEventListener('click', () => {
            browser.runtime.sendMessage({
                behavior: 'delete',
                id: me.key
            }).then( () => {
                document.body.textContent = "";
            });
        });
    },

    showPreview: (isWYSIWYG, val) => {

        // val is used to show preview of WYSIWYG,
        // so it should not be escaped.
        //
        // for security issues, I will remove all <script> & </script> tag
        var me = entity;

        if (isWYSIWYG) {
            me.$show_cache.type = 'WYSIWYG';
            val = val.replace(/<script.*>.*<\/script.*>/g, '');
            me.$show_cache.innerHTML = val;
        }
        else {
            me.$show_cache.type = 'txt';
            var text = document.createTextNode(val);
            var textarea = document.createElement('textarea');
            textarea.appendChild(text);
            me.$show_cache.innerHTML = '';
            me.$show_cache.appendChild(textarea);
        }
    },

    init: () => {
        var me = entity;
        me.$show_cache = document.querySelector('#show_cache');
        var key_arry = decodeURI(location.href).split("entity.html?id=");
        var key = me.key = key_arry[1];

        if (!key) return;

        browser.runtime.sendMessage({
            behavior: 'load'
        }).then( ( res => {

            if (!(res && res.data)) return false;

            delete res.data.version;
            delete res.data.setting;
            delete res.data.exceptions;

            var db_data = res.data;
            me.showPreview(db_data[key].type == 'WYSIWYG', db_data[key].val);

        }));
        me.initButtonEvent();
    }
};

window.onload = () => {
    entity.init();
}
