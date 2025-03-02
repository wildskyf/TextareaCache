var { i18n, runtime } = browser;
var option = {

    $response: null,

    showUpdatedMessage: status => {
        var me = option;
        var { $response } = me;

        if (status == 'success')
            $response.textContent = i18n.getMessage('option_saved');
        else {
            $response.textContent = i18n.getMessage('option_save_error');
        }
        $response.style.opacity = 1;
        setTimeout( () => {
            $response.style.opacity = 0;
        }, 2000);
    },

    showExceptionSites: () => {
        runtime.sendMessage({
            behavior: 'get_exceptions'
        }).then( res => {
            var { expts } = res;
            var $excp = document.querySelector('#exception')
            $excp.textContent = expts.join('\n');
            $excp.rows = String(parseInt(expts.length) + 1);
        })
    },

    i18nLabels: () => {
        document.querySelectorAll("label[for]").forEach( label => {
            label.textContent = i18n.getMessage("option_"+label.htmlFor);
        });
        document.querySelector(".hint").textContent = i18n.getMessage("option_exp_site_hint");
    },

    getSettings: () => {
        runtime.sendMessage({
            behavior: 'get_options'
        }).then( setting => {
            for (var key in setting) {
                var dom = document.querySelector('#' + key);
                if (!dom) continue;
                switch (dom.type) {
                case 'number':
                    if (setting[key] !== undefined) dom.value = setting[key];
                case 'checkbox':
                    if (setting[key]) dom.checked = true;
                    break;
                case 'select-one':
                    var value = setting[key];
                    if (!value) return;
                    dom.querySelector(`[value=${value}]`).selected = true;
                default:
                    break;
                }
            }
        });
    },

    init: () => {
        var me = option;
        me.$response = document.querySelector('.response');

        me.i18nLabels();
        me.showExceptionSites();
        me.getSettings();

        document.querySelector('#skipConfirmPaste').addEventListener('change', e => {
            var isSkip = e.currentTarget.checked;

            runtime.sendMessage({
                behavior: 'set_options',
                key: 'skipConfirmPaste',
                val: isSkip
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });
        document.querySelector('#onlyCacheFocusElement').onchange = e => {
            runtime.sendMessage({
                behavior: 'set_options',
                key: 'onlyCacheFocusElement',
                val: e.target.checked
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        }

        document.querySelector('#showContextMenu').addEventListener('change', e => {
            var showContextMenu = e.currentTarget.checked;

            runtime.sendMessage({
                behavior: 'set_options',
                key: 'showContextMenu',
                val: showContextMenu
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });
        if (!browserHas('menus')) {
            const e = $id.showContextMenu
            e.disabled = true
            e.checked = false
            e.parentNode.title = i18n.getMessage('chromium_defect')
            e.id = e.id + '_disabled'
        }

        document.querySelector('#intervalToSave').addEventListener('change', e => {
            var intervalToSave = parseInt(e.currentTarget.value);

            if (Number.isNaN(intervalToSave)) return;

            runtime.sendMessage({
                behavior: 'set_options',
                key: 'intervalToSave',
                val: intervalToSave
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

        document.querySelector('#popupType').addEventListener('change', e => {
            var { value } = e.target;

            runtime.sendMessage({
                behavior: 'set_options',
                key: 'popupType',
                val: value
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

        document.querySelector('#shouldAutoClear').addEventListener('change', e => {
            var shouldAutoClear = e.currentTarget.checked;

            runtime.sendMessage({
                behavior: 'set_options',
                key: 'shouldAutoClear',
                val: shouldAutoClear
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

        Array.from(document.querySelectorAll('.autoclear_input')).forEach( input => {
            input.addEventListener('change', e => {
                var { target } = e;
                runtime.sendMessage({
                    behavior: 'set_options',
                    key: target.id,
                    val: target.value
                }).then( () => {
                    me.showUpdatedMessage('success');
                });
            })
        })

        document.querySelector('#exception').addEventListener('change', e => {
            var { target } = e;
            runtime.sendMessage({
                behavior: 'set_exceptions',
                val: target.value
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });
        $id.exportHistory.onclick = async evt => {
            const r = await browser.runtime.sendMessage({behavior: 'load'})
            const l = []
            for (const [k, v] of Object.entries(r.data)) {
                const id = k.split(' ').at(-1)
                const a = pick(v, 'time url type last_modified'.split(' '))
                l.push(a.concat(id, v.val))
            }
            const csv = csvFormat(l)
            download(new File(
                ['time,url,type,last_modified,id,val\n', csv],
                'textarea-history.csv',
                {type: 'text/plain'}
            ))

            function csvFormat(t) {
                return t.map(r =>
                    r.map(f => csvEncode(f)).join(',') + '\n'
                ).join('')
            }
            function csvEncode(t) {
                const sp = /\n|"|,/
                const nl = /\n/g
                const dq = /"/g
                const cm = /,/g
                if (!sp.test(t)) return t
                return '"' + t.replace(/"/g, '""') + '"'
            }
            function pick(o, kl) {
                return kl.map(k => o[k])
            }
            function download(file) {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(file)
                a.download = file.name
                document.body.appendChild(a)
                a.click()
                setTimeout(() => {
                    URL.revokeObjectURL(a.href)
                    a.remove()
                }, 2000)
            }

        }
    }
};

window.addEventListener('load', option.init);

var $d = document
var $id = new Proxy($d, {
    get(root, id) {
        let e = $(`#${id}`);
        if (!e) e = $(`[name=${id}]`);
        return e;
    }
});
function $all(q, root = $d) {
    return Array.from(root.querySelectorAll(q));
}
function $(q, root = $d) {
    return root.querySelector(q);
}
