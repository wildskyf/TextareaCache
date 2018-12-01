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

    init: () => {
        var me = option;
        me.$response = document.querySelector('.response');

        me.i18nLabels();
        me.showExceptionSites();

        runtime.sendMessage({
            behavior: 'get_options'
        }).then( setting => {
            for (var key in setting) {
                var dom = document.querySelector('#' + key);
                if (!dom) continue;
                switch (dom.type) {
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

            if (setting.pageAction) {
                document.querySelector('#lite-list').classList.remove('hide');
            }
            else {
                document.querySelector('#lite-list').classList.add('hide');
            }
        });

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

        document.querySelector('#pageAction').addEventListener('change', e => {
            var isPageAction = e.currentTarget.checked;

            runtime.sendMessage({
                behavior: 'set_options',
                key: 'pageAction',
                val: isPageAction
            }).then( () => {
                me.showUpdatedMessage('success');
                if (isPageAction) {
                    document.querySelector('#lite-list').classList.remove('hide');
                }
                else {
                    document.querySelector('#lite-list').classList.add('hide');
                }
            });
        });

        document.querySelector('#pageActionLite').addEventListener('change', e => {
            var isLite = e.currentTarget.checked;

            runtime.sendMessage({
                behavior: 'set_options',
                key: 'pageActionLite',
                val: isLite
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

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

        document.querySelector('#exception').addEventListener('change', e => {
            var { target } = e;
            runtime.sendMessage({
                behavior: 'set_exceptions',
                val: target.value
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

    }
};

window.onload = option.init;
