String.prototype.trunc = String.prototype.trunc || function(n){
    return (this.length > n) ? this.substr(0, n-1) + '&hellip;' : this;
};

var list = {
    last_selected_index: null,

    _escapeHTML: str =>  str.replace(/[&"'<>]/g, m => ({
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;"
    })[m]),

    init: () => {
        var me = list;

        browser.runtime.sendMessage({
            behavior: 'load'
        }).then( ( res => {

            if (!(res && res.data)) return false;

            delete res.data.version;
            delete res.data.setting;
            delete res.data.exceptions;

            var list_data = me.makeArray(res.data).reverse();
            me.showList(list_data);
            me.onFrameOpen();
            me.onSelect();
            me.initDelBtn();
        }));

        me.onDelete();
    },

    makeArray: raw => {
        var data = [];
        for (var key in raw) {
            var key_arr = key.split(' ');
            key_arr.shift(); // remove timestamp
            key_arr.pop(); // remove serial num
            raw[key]['title'] = key_arr.join(' ');
            raw[key].key = key;
            data.push(raw[key]);
        }
        return data;
    },

    showNoCache: () => {
        document.body.textContent = 'You have no cache';
    },

    showList: caches => {
        var me = list;
        if (caches.length == 0) {
            me.showNoCache();
            return;
        }
        var list_dom_str = `
            <tr class="list-title">
                <th class="select-title"><input type="checkbox" /></th>
                <th class="url-title">url</th>
                <th class="summary-title">summary</th>
                <th class="date-title">date</th>
                <th></th>
            </tr>
        `;
        caches.forEach( (cache, index) => {
            list_dom_str += `<tr data-id="${cache.key}" data-index="${index + 1}" data-date="${cache.last_modified.getTime()}">
                <td class="checkbox-wrapper"><input type="checkbox" /></td>
                <td><a href="${cache.url}">${cache.url}</a></td>
                <td>${me._escapeHTML(cache.val).trunc(20)}</td>
                <td>${cache.last_modified.toLocaleString()}</td>
                <td>
                    <a class="open-frame" href="./entity.html?id=${encodeURI(cache.key)}" target="detail-frame">show</a>
                </td>
            </tr>`;
        });
        document.querySelector('.list table').innerHTML = list_dom_str;
    },

    onFrameOpen: () => {
        document.querySelectorAll('.open-frame').forEach( frame => {
            frame.addEventListener('click', () => {
                document.querySelector('#detail-frame').style.height = '35vh';
                document.querySelector('.list').style.maxHeight = '40vh';
            })
        })
    },

    onDelete: () => {
        browser.storage.onChanged.addListener(location.reload);
        document.querySelector('#detail-frame').src = "./entity.html";
    },

    onSelect: () => {
        var me = list;
        var $checkbox_all = document.querySelector('.select-title input[type=checkbox]');
        var $checkboxes   = document.querySelectorAll('.checkbox-wrapper input[type=checkbox]');

        // checkbox which is able to select all
        document.querySelector('.select-title').addEventListener('click', e => {
            var target = e.target;
            if (e.target.classList.contains('select-title')) {
                // click nearby
                target = e.target.querySelector('input');
                target.checked = !target.checked
            }
            $checkboxes.forEach( $checkbox => {
                $checkbox.checked = target.checked;
            });
            return false;
        });

        var checkSelectAllStatus = () => {
            if (document.querySelectorAll('.checkbox-wrapper input[type=checkbox]:not(:checked)').length == 0) {
                // every checkbox are not checked
                $checkbox_all.indeterminate = false;
                $checkbox_all.checked = true;
            }
            else if (document.querySelectorAll('.checkbox-wrapper input[type=checkbox]:checked').length == 0) {
                // every checkbox are checked
                $checkbox_all.indeterminate = false;
                $checkbox_all.checked = false;
            }
            else {
                $checkbox_all.checked = false;
                $checkbox_all.indeterminate = true;
            }
        };

        // each checkbox
        $checkboxes.forEach( $checkbox => {
            $checkbox.addEventListener('click', e => {
                var current_selected_index = e.target.parentNode.parentNode.dataset.index;
                var val = e.target.checked;
                if (e.shiftKey && me.last_selected_index) {

                    if (me.last_selected_index < current_selected_index) {
                        for (var i = me.last_selected_index ; i < current_selected_index ; i++ ) {
                            document.querySelector(`[data-index="${i}"] input[type=checkbox]`).checked = val;
                        }
                    }
                    else if (me.last_selected_index > current_selected_index) {
                        for (var j = me.last_selected_index ; j > current_selected_index ; j-- ) {
                            document.querySelector(`[data-index="${j}"] input[type=checkbox]`).checked = val;
                        }
                    }
                }
                checkSelectAllStatus();
                me.last_selected_index = current_selected_index;
            });
        });
    },

    initDelBtn: () => {
        // del all btn
        document.querySelector('#delete_all_btn').addEventListener('click', () => {
            browser.runtime.sendMessage({
                behavior: 'clear'
            });
        });

        // del selected
        document.querySelector('#delete_selected_btn').addEventListener('click', () => {
            var checkboxes = document.querySelectorAll('.checkbox-wrapper input[type=checkbox]:checked');
            Array.from(checkboxes).map(cks => cks.parentNode.parentNode.dataset.id).forEach( id => {
                browser.runtime.sendMessage({
                    behavior: 'delete',
                    id: id
                })
            });
        });
    }
};

window.onload = () => {
    list.init();
}
