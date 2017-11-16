// content script

var tcl = {
    isDEV: false,
    sessionKey: null,

    cache_rule: [
        "textarea",
        "iframe",
        "[contentEditable]",
        "[role='textbox']",
        "[aria-multiline='true']"
    ],

    except_websites: null,

    initExceptionSites: () => {
        var me = tcl;
        return browser.runtime.sendMessage({
            behavior: 'get_exceptions'
        }).then( res => {
            var { expts } = res;
            me.except_websites = expts;
        });
    },

    findTextContents: () => {
        var me = tcl;

        document.querySelectorAll(me.cache_rule.join(',')).forEach( (ta, i) => {
            me.isDEV && console.log('ta-class-append');
            var isTEXTAREA = ta.tagName == "TEXTAREA";
            ta.classList.add('ta-textContent');
            ta.dataset.id = isTEXTAREA ? i : `w-${i}`;
        });

        window.setInterval( () => {
            document.querySelectorAll(me.cache_rule.map(rule => (rule+":not(.ta-textContent)")).join(','))
        }, 2000);
    },

    attachEvents: () => {
        var me = tcl;
        var allTxtCnt = document.querySelectorAll('.ta-textContent');

        allTxtCnt.forEach( ta => {
            me.isDEV && console.log('ta-txtcnt-event');

            var saveFunction = {
                add: event => {
                    me.isDEV && console.log('ta-event-fire-focus', event);
                    event.target.addEventListener('keyup', me.saveToStorage);
                },
                remove: event => {
                    me.isDEV && console.log('ta-event-fire-blur');
                    event.target.removeEventListener('keyup', me.saveToStorage);
                }
            };
            ta.onfocus = saveFunction.add;
            ta.onblur  = saveFunction.remove;
        });
    },

    init: () => {
        var me = tcl;
        me.isDEV && console.log('ta-init');

        tcl.initExceptionSites().then( () => {
            if (!tcl.checkEnable()) return;
            tcl.initDBTable();
            tcl.sessionKey = document.querySelector('body').dataset['taTime'] = String((new Date()).getTime());
            tcl.findTextContents();
            tcl.attachEvents();
        })
    },

    checkEnable: () => {
        var url = location.href;
        for (var site of tcl.except_websites) {
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
            title: window.parent.document.title,
            url: location.href,
            val: save_info.val,
            id: event.target.dataset.id,
            type: save_info.isWYSIWYG ? 'WYSIWYG' : 'txt',
            sessionKey: tcl.sessionKey
        });
    }
};

tcl.init();

