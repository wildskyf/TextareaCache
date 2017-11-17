// popup script

var panel = {

    $select        : null,
    $show_cache    : null,
    $copy_btn      : null,
    $delete_btn    : null,
    $delete_all_btn: null,

    setBodyEmpty: () => {
        var textnode = document.createTextNode('There is no cache here!');
        document.body.textContent = '';
        document.body.style.padding = '20px';
        document.body.appendChild(textnode);
    },

    _formatDate: key => {
        var timestamp = key.split(' ')[0];
        var tmp_key_array = key.split(' ').reverse();
        tmp_key_array.pop();
        var else_info = tmp_key_array.reverse().join(' ');
        if (!timestamp.includes('/')) {
            var origin_date = new Date(Number(timestamp));
            var year = origin_date.getFullYear();
            var month = origin_date.getMonth()+1;
            var day = origin_date.getDate();
            timestamp = `${year}/${month}/${day}`;
        }
        return timestamp + ' ' + else_info;
    },

    showPreview: (isWYSIWYG, val) => {
        // val is used to show preview of WYSIWYG,
        // so it should not be escaped.
        //
        // for security issues, I will remove all <script> & </script> tag
        var me = panel;

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

    _sort: obj_array => {
        // by last_modified
        var tmp_array = []; // for reverse the order of saved cache
        for (var key in obj_array) {
            if (!obj_array[key]) continue;
            var tmp_data = obj_array[key];
            tmp_data.key = key;
            tmp_array.push(tmp_data);
        }

        return tmp_array.sort( (a,b) => {
            var a_time = a.last_modified || new Date(parseInt( a.time || 0));
            var b_time = b.last_modified || new Date(parseInt( b.time || 0));

            return b_time - a_time;
        });
    },

    showSelect: (whole_data) => {
        var me = panel;
        var { $select, $show_cache } = me;

        me._sort(whole_data).forEach(one_data => {
            var { type } = one_data;
            var cache = one_data.val;
            var txt = me._formatDate(one_data.key).split(" ");
            txt.pop(); // hide the serial number
            txt = txt.join(' ');

            var option = document.createElement('option');
            option.textContent = txt; // todo: remove date stamp
            option.value = one_data.key;
            option.title = `${me._formatDate(one_data.key)}\n(${one_data.url})\n\n${one_data.val.substr(0,40)}...`;

            $select.appendChild(option);

            if ($show_cache.innerHTML == '')
                me.showPreview(type == 'WYSIWYG', cache);

            if (!document.querySelector('option')) {
                me.setBodyEmpty();
            }
        });
    },

    init: () => {
        var me = panel;
        var whole_data = null;

        browser.runtime.sendMessage({
            behavior: 'load'
        }).then( ( resObj => {

            if (!(resObj && resObj.data)) return false;

            delete resObj.data.version;
            delete resObj.data.setting;
            delete resObj.data.exceptions;

            whole_data = resObj.data;
            if (Object.keys(whole_data).length <= 0) {
                me.setBodyEmpty();
                return false;
            }

            var $select         = me.$select         = document.querySelector('#cache_seletor');
            var $show_cache     = me.$show_cache     = document.querySelector('#show_cache');
            var $copy_btn       = me.$copy_btn       = document.querySelector('#copy_btn');
            var $delete_btn     = me.$delete_btn     = document.querySelector('#delete_btn');
            var $delete_all_btn = me.$delete_all_btn = document.querySelector('#delete_all_btn');

            me.showSelect(whole_data);

            $select.addEventListener('change', e => {
                var key = e.target.value;
                var cache = whole_data[key].val;
                var isWYSIWYG = whole_data[key].type == 'WYSIWYG';

                me.showPreview(isWYSIWYG, cache);
            });

            $copy_btn.addEventListener('click', () => {
                if ($show_cache.type == 'WYSIWYG') {
                    me.selectText($show_cache);
                }
                else {
                    document.querySelector("textarea").select();
                }
                document.execCommand("Copy");
            });

            $delete_all_btn.addEventListener('click', () => {
                browser.runtime.sendMessage({
                    behavior: 'clear'
                }).then(res => {
                    if (res.msg == 'done') {
                        me.setBodyEmpty();
                    }
                });
            });

            $delete_btn.addEventListener('click', () => {
                browser.runtime.sendMessage({
                    behavior: 'delete',
                    id: $select.value
                }).then( res => {
                    whole_data = res.data;
                    $select.querySelector(`[value="${res.deleted}"]`).remove();

                    var key = $select.value;

                    if (!whole_data[key]) {
                        me.setBodyEmpty();
                        return false;
                    }

                    var cache = whole_data[key].val;
                    var isWYSIWYG = whole_data[key].type == 'WYSIWYG';

                    me.showPreview(isWYSIWYG, cache);
                });
            });
        }));
    }
};

window.onload = panel.init;
