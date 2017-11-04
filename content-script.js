// content script

var tcl = {
    isDEV: false,
    sessionKey: null,

    exceptWebsites: [
        "docs.google.com/spreadsheets"
    ],

    init: () => {
        var me = tcl;
        if (!tcl.checkEnable()) return;
        tcl.initDBTable();
        tcl.sessionKey = document.querySelector('body').dataset['taTime'] = String((new Date()).getTime());
        document.querySelectorAll('textarea, [contentEditable]').forEach( (ta, i) => {
            ta.classList.add('ta-textContent');
            ta.dataset.id = ta.tagName == "TEXTAREA" ? i : `w-${i}`;
        });
        document.querySelectorAll('.ta-textContent').forEach( ta => {
            ta.addEventListener('focus', event => {
                me.isDEV && console.log('add eventlistener');
                event.target.addEventListener('keyup', me.saveToStorage);
            });
            ta.addEventListener('blur', event => {
                me.isDEV && console.log('rm eventlistener');
                event.target.removeEventListener('keyup', me.saveToStorage);
            });
        });
    },

    checkEnable: () => {
        var url = location.href;
        for (var site of tcl.exceptWebsites) {
            if (url.includes(site)) return false;
        }
        return true;
    },

    initDBTable: () => {
        browser.runtime.sendMessage({
            behavior: 'init',
            title: document.title,
            url: location.href
        });
    },

    getContent: target => {
        if (target.tagName == "TEXTAREA") {
            // textarea
            // console.log('textarea');
            return {
                val: target.value,
                isWYSIWYG: false
            };
        }
        else if (target.contentEditable) {
            // WYSIWYG
            // console.log('WYSIWYG');

            let dp = new DOMParser();
            let bodyNode = target.cloneNode(true);
            let doc = dp.parseFromString(bodyNode.innerHTML, "text/html");

            while (bodyNode.firstChild) {
                bodyNode.removeChild(bodyNode.firstChild);
            }
            doc.body.childNodes.forEach( childNode => {
                let newNode = childNode.cloneNode(true);
                bodyNode.appendChild(newNode);
            });

            /*
             * raw data ===>     bodyNode
             * save data ===>    bodyNode.outerHTML
             * output data ===>  dp.parseFromString(bodyNode.outerHTML, "text/html")
             */

            return {
                val: bodyNode.outerHTML,
                isWYSIWYG: true
            };
        }
    },

    _strip: html => html.replace(/<(?:.|\n)*?>/gm, ''),

    saveToStorage: event => {
        var save_info = tcl.getContent(event.target);

        if (tcl._strip(save_info.val).length == 0) return;

        browser.runtime.sendMessage({
            behavior: 'save',
            title: document.title,
            url: location.href,
            val: save_info.val,
            id: event.target.dataset.id,
            type: save_info.isWYSIWYG ? 'WYSIWYG' : 'txt',
            sessionKey: tcl.sessionKey
        });
    }
};

tcl.init();

