// popup script

var { i18n, runtime, tabs } = browser;

var panel = {

    $select        : null,
    $show_cache    : null,
    $copy_btn      : null,
    $delete_btn    : null,
    $delete_all_btn: null,

    setBodyEmpty: () => {
        let $main = document.querySelector('#main');
        let $footer = document.querySelector('#footer');

        $main.textContent = '';
        $footer.textContent = '';

        document.body.classList.add('empty_list');

        var img = document.createElement('IMG');
        img.src = runtime.getURL('icons/tacache-48-bw.png');
        var textnode = document.createTextNode(i18n.getMessage('noCache'));
        $main.appendChild(img);
        $main.appendChild(textnode);
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

    domPurify: null,
    async getDomPurify() {
        if (this.domPurify) return this.domPurify
        const m = await import('../../vendor/dompurify.js')
        return this.domPurify = m.default
    },

    showPreview: (isWYSIWYG, val) => {
        // val is used to show preview of WYSIWYG,
        // so it should not be escaped.
        //
        // for security issues, I will remove all <script> & </script> tag
        var me = panel;

        if (isWYSIWYG) {
            me.$show_cache.type = 'WYSIWYG';
            return me.getDomPurify().then(domPurify => {
                me.$show_cache.innerHTML = domPurify.sanitize(val);
            })
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
            var a_mod = new Date(parseInt(a.last_modified));
            var b_mod = new Date(parseInt(b.last_modified));

            var a_time = a_mod || new Date(parseInt( a.time || 0));
            var b_time = b_mod || new Date(parseInt( b.time || 0));

            return b_time - a_time;
        });
    },

    showSelect: (whole_data) => {
        var me = panel;
        var { $select, $show_cache } = me;

        var l = me._sort(whole_data)
        l.map(one_data => {
            var txt0 = me._formatDate(one_data.key)
            var txta = txt0.split(' ')
            txta.pop(); // hide the serial number
            var txt = txta.join(' ');

            var option = document.createElement('option');
            option.textContent = txt; // todo: remove date stamp
            option.value = one_data.key;
            option.title = `${txt0}\n(${one_data.url})\n\n${one_data.val.substr(0,40)}...`;

            return option;
        }).forEach(e => $select.appendChild(e))
        if (l[0] && !$show_cache.firstChild) {
            me.showPreview(l[0].type == 'WYSIWYG', l[0].val);
        }
        if (!document.querySelector('option')) {
            me.setBodyEmpty();
        }
    },

    initHeaderBtns: () => {
        document.querySelector('#list_page_btn').addEventListener('click', () => {
            tabs.create({
                url: runtime.getURL('/view/list/list.html')
            });
            window.close();
        });

        document.querySelector('#setting_page_btn').addEventListener('click', () => {
            runtime.openOptionsPage()
            window.close();
        });
    },

    selectGoBy: n => {
        var me = panel;
        var $select = me.$select
        var index = $select.selectedIndex + n;
        if (index < 0 || $select.length <= index) return null;
        $select.selectedIndex = index;
        $select.dispatchEvent(new Event('change'));
        return index;
    },

    init: () => {
        var me = panel;
        var whole_data = null;

        me.initHeaderBtns();

        const lr = logc('history-load')
        stor.load().then( ( data => {
            lr.log('get data')

            delete data.version;
            delete data.setting;
            delete data.exceptions;

            whole_data = data;
            if (Object.keys(whole_data).length <= 0) {
                me.setBodyEmpty();
                return false;
            }

            var $select         = me.$select         = document.querySelector('#cache_seletor');
            var $show_cache     = me.$show_cache     = document.querySelector('#show_cache');
            var $copy_btn       = me.$copy_btn       = document.querySelector('#copy_btn');
            var $delete_btn     = me.$delete_btn     = document.querySelector('#delete_btn');
            var $delete_all_btn = me.$delete_all_btn = document.querySelector('#delete_all_btn');

            $copy_btn.textContent = i18n.getMessage('copy');
            $delete_btn.textContent = i18n.getMessage('delete');
            $delete_all_btn.textContent = i18n.getMessage('deleteAll');
            lr.log('init html')
            me.showSelect(whole_data);
            lr.log('fill select element')
            console.log('data size', Object.keys(whole_data).length)

            $select.addEventListener('change', e => {
                var key = e.target.value;
                var cache = whole_data[key].val;
                var isWYSIWYG = whole_data[key].type == 'WYSIWYG';

                me.showPreview(isWYSIWYG, cache);
            });

            $select.addEventListener('wheel', e => {
                e.preventDefault();
                var step = e.deltaY > 0 ? 1 : -1;
                me.selectGoBy(step);
            });

            window.addEventListener('keydown', e => {
                var k = e.key;
                if (!e.ctrlKey || e.isComposing) return;

                var nop = () => e.preventDefault();
                if (k == 'd') {
                    nop();
                    $delete_btn.click();
                }
                else if (k == 'f' || k == 'b') {
                    nop();
                    var step = k == 'f' ? 1 : -1;
                    me.selectGoBy(step);
                }
                else if (k == 'Enter') {
                    nop();
                    $copy_btn.click();
                }
                else if (k == 'c') {
                    var node = e.target;
                    if (node.isContentEditable || node.nodeName == 'textarea') return;
                    nop();
                    $copy_btn.click();
                }
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
                runtime.sendMessage({
                    behavior: 'clear'
                }).then(res => {
                    if (res.msg == 'done') {
                        me.setBodyEmpty();
                    }
                });
            });

            $delete_btn.addEventListener('click', () => {
                var id = $select.value
                stor.delete(id).then(async () => {
                    $select.querySelector(`[value="${id}"]`).remove();
                    var id2 = $select.value

                    let r = await stor.get(id2)
                    if (!r) {
                        me.setBodyEmpty();
                        return false;
                    }

                    var cache = r.val;
                    var isWYSIWYG = r.type == 'WYSIWYG';

                    me.showPreview(isWYSIWYG, cache);
                });
            });
        })).then(() => lr.end());
    }
};

window.onload = panel.init;

function logc(tag) {
    if (Array.isArray(tag)) tag = tag[0]
    console.time(tag)
    return {
        tag,
        log(...a) {
            console.timeLog(this.tag, ...a)
        },
        end() {
            console.timeEnd(this.tag)
        }
    }
}
