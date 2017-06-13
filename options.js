window.onload = () => {

    var $response = document.querySelector('.response');
    var showUpdatedMessage = (status) => {

        if (status == 'success')
            $response.textContent = 'Your change has been saved.';
        else {
            $response.textContent = 'There is something wrong, please report to developer.';
        }
        $response.style.opacity = 1;
        setTimeout( () => {
            $response.style.opacity = 0;
        }, 2000);
    };

    browser.runtime.sendMessage({
        behavior: 'get_options'
    }).then( res => {
        var {setting} = res;
        for (var key in setting) {
            var dom = document.querySelector('#' + key);
            if (!dom) continue;
            switch(dom.type){
                case 'checkbox':
                    if (setting[key]) dom.checked = true;
                    break;
                default:
                    break;
            }
        }
    });

    document.querySelector('#debug').addEventListener('change', e => {
        var isDebug = e.currentTarget.checked;

        browser.runtime.sendMessage({
            behavior: 'set_options',
            key: 'debug',
            val: isDebug
        }).then( () => {
            showUpdatedMessage('success');
        });
    });

    // document.querySelector('#browserAction').addEventListener('change', e => {
    //     var isBrowserAction = e.currentTarget.checked;

    //     browser.runtime.sendMessage({
    //         behavior: 'set_options',
    //         key: 'browserAction',
    //         val: isBrowserAction
    //     }).then( () => {
    //         showUpdatedMessage('success');
    //     });
    // });


    document.querySelector('#pageAction').addEventListener('change', e => {
        var isPageAction = e.currentTarget.checked;

        browser.runtime.sendMessage({
            behavior: 'set_options',
            key: 'pageAction',
            val: isPageAction
        }).then( () => {
            showUpdatedMessage('success');
        });
    });

};
