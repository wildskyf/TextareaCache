// content script

var strip = html => html.replace(/<(?:.|\n)*?>/gm, '')

const SAVE_TARGET = 'tc-textContent';
var tcl = {
    sessionKey: String((new Date()).getTime()), // the timestamp at which user open a website
    except_websites: null, // fetch from background script

    init: async () => {
        var me = tcl;

        await tcl.initExceptionSites();

        if (!tcl.checkEnable()) return;

        tcl.initContextMenu();

        tcl.findTextContentsAndAttachEvents();
    },

    initExceptionSites: () => browser.runtime.sendMessage({
        behavior: 'get_exceptions'
    }).then( res => {
        tcl.except_websites = res.expts;
    }),

    checkEnable: () => {
        var url = location.href;
        for (var site of tcl.except_websites) {
            if (url.includes(site)) return false;
        }
        return true;
    },

    initContextMenu: () => {
        browser.runtime.sendMessage({
            behavior: 'init',
            title: window.parent.document.title,
            url: location.href
        });
        browser.runtime.onMessage.addListener( req => {
            if (req.behavior != "pasteToTextarea") return;
            if (!req.skipConfirmPaste) {
                if (!confirm(`paste "${req.val}" ?`)) return;
            }

            document.activeElement.innerHTML = req.val
        });
    },

    findTextContentsAndAttachEvents: () => {
        var me = tcl;
        const cache_rule = [
            "textarea",
            "iframe",
            "[contentEditable]",
            "[role='textbox']",
            "[aria-multiline='true']"
        ];

        const attachEvent = () => {
            Array.from(document.querySelectorAll(
                cache_rule.map( rule => (rule+`:not([${SAVE_TARGET}])`) ).join(',')
            ))
            .map( (ta, i) => {
                var isTEXTAREA = ta.tagName == "TEXTAREA";
                ta.setAttribute(SAVE_TARGET, true);
                ta.dataset['tcId'] = isTEXTAREA ? i : `w-${i}`;
                return ta;
            }).forEach( ta => {
                ta.addEventListener('keyup', me.saveToStorage);
            });
        };

        // TO-DO: performance issue
        //        some textarea might not appear when document finished
        //        loading, but appear when user do something, code here is use
        //        to check every two seconds.

        window.setInterval(attachEvent, 2000);
        attachEvent();
    },

    saveToStorage: event => {
        var save_info = tcl.getContent(event.target);

        if (strip(save_info.val).length == 0) return;

        browser.runtime.sendMessage({
            behavior: 'save',
            title: window.parent.document.title,
            url: location.href,
            val: save_info.val,
            id: event.target.dataset['tcId'],
            type: save_info.isWYSIWYG ? 'WYSIWYG' : 'txt',
            sessionKey: tcl.sessionKey
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
        else {
            alert('Something wrong, please report to developer!');
        }
    }
};

tcl.init();

