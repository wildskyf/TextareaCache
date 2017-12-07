// content script

var tcl = {
    isDEV: false,
    sessionKey: null, // the timestamp at which user open a website

    cache_rule: [
        "textarea",
        "iframe",
        "[contentEditable]",
        "[role='textbox']",
        "[aria-multiline='true']"
    ],

    except_websites: null, // fetch from background script

    initExceptionSites: () => browser.runtime.sendMessage({
        behavior: 'get_exceptions'
    }).then( res => {
        tcl.except_websites = res.expts;
    }),

    findTextContents: () => {
        var me = tcl;

        document.querySelectorAll(me.cache_rule.join(',')).forEach( (ta, i) => {
            me.isDEV && console.log('ta-class-append');
            var isTEXTAREA = ta.tagName == "TEXTAREA";
            ta.setAttribute('tc-textContent', true);
            ta.dataset.id = isTEXTAREA ? i : `w-${i}`;
        });

        // TO-DO: performance issue
        window.setInterval( () => {
            var not_yet_tc_txt = document.querySelectorAll(me.cache_rule.map( rule => (rule+":not([tc-textContent])") ).join(','));
            if (not_yet_tc_txt.length == 0) return;
            not_yet_tc_txt.forEach( t => t.setAttribute('tc-textContent', true));
            me.attachEvents(not_yet_tc_txt);

        }, 2000);
    },

    attachEvents: doms => {
        var me = tcl;
        var allTxtCnt = doms;

        allTxtCnt.forEach( ta => {
            me.isDEV && console.log('ta-txtcnt-event');
            ta.addEventListener('keyup', me.saveToStorage);
        });
    },

    init: () => {
        var me = tcl;
        me.isDEV && console.log('ta-init');

        tcl.initExceptionSites().then( () => {
            if (!tcl.checkEnable()) return;
            tcl.sessionKey = document.querySelector('body').dataset['taTime'] = String((new Date()).getTime());
            tcl.findTextContents();
            tcl.attachEvents(document.querySelectorAll('[tc-textContent]'));
        });
    },

    checkEnable: () => {
        var url = location.href;
        for (var site of tcl.except_websites) {
            if (url.includes(site)) return false;
        }
        return true;
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

