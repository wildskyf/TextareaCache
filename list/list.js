String.prototype.trunc = String.prototype.trunc || function(n){
    return (this.length > n) ? this.substr(0, n-1) + '&hellip;' : this;
};

var list = {

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

            var list_data = me.makeArray(res.data);
            me.showList(list_data);
            me.onFrameOpen();
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
        var $list = document.querySelector('.list');
        $list.querySelector('table').remove();
        $list.textContent = 'You have no cache';
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
        caches.forEach( cache => {
            list_dom_str += `<tr data-id="${cache.key}">
                <td><input type="checkbox" /></td>
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
                document.querySelector('#detail-frame').style.height = '45vh';
                document.querySelector('.list').style.maxHeight = '45vh';
            })
        })
    },

    onDelete: () => {
        browser.storage.onChanged.addListener( () => {
            location.reload();
        });
        document.querySelector('#detail-frame').src = "./entity.html"
    }
};

window.onload = () => {
    list.init();
}
