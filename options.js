var option = {

    $response: null,

    showUpdatedMessage: status => {
        var me = option;
        var { $response } = me;

        if (status == 'success')
            $response.textContent = 'Your change has been saved.';
        else {
            $response.textContent = 'There is something wrong, please report to developer.';
        }
        $response.style.opacity = 1;
        setTimeout( () => {
            $response.style.opacity = 0;
        }, 2000);
    },

    showExceptionSites: () => {

        browser.runtime.sendMessage({
            behavior: 'get_exceptions'
        }).then( res => {
            var { expts } = res;
            var $excp = document.querySelector('#exception')
            $excp.textContent = expts.join('\n');
            $excp.rows = String(parseInt(expts.length) + 1);
        })

    },

    init: () => {
        var me = option;
        me.$response = document.querySelector('.response');

        me.showExceptionSites();

        browser.runtime.sendMessage({
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

        document.querySelector('#pageAction').addEventListener('change', e => {
            var isPageAction = e.currentTarget.checked;

            browser.runtime.sendMessage({
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

            browser.runtime.sendMessage({
                behavior: 'set_options',
                key: 'pageActionLite',
                val: isLite
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

        document.querySelector('#popupType').addEventListener('change', e => {
            var { value } = e.target;

            browser.runtime.sendMessage({
                behavior: 'set_options',
                key: 'popupType',
                val: value
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

        document.querySelector('#exception').addEventListener('change', e => {
            var { target } = e;
            browser.runtime.sendMessage({
                behavior: 'set_exceptions',
                val: target.value
            }).then( () => {
                me.showUpdatedMessage('success');
            });
        });

    }
};

window.onload = option.init;
