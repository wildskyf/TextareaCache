// content script

var { runtime } = browser;
var strip = html => html.replace(/<(?:.|\n)*?>/gm, '')

const SAVE_TARGET = 'tc-textContent';
var tcl = {
    sessionKey: String((new Date()).getTime()), // the timestamp at which user open a website

    init: async () => {
        var me = tcl;

        if (await tcl.initExceptionSites()) return;

        tcl.initContextMenu();

        tcl.findTextContentsAndAttachEvents();
    },

    initExceptionSites: async () => {
        var res = await runtime.sendMessage({ behavior: 'get_exceptions' });
        return res.expts.some(site => location.href.includes(site));
    },

    initContextMenu: () => {
        runtime.sendMessage({
            behavior: 'init',
            title: window.parent.document.title,
            url: location.href
        });
        runtime.onMessage.addListener( req => {
            if (req.behavior != "pasteToTextarea") return;
            if (!req.skipConfirmPaste && !confirm(`paste "${req.val}" ?`)) return;

            document.activeElement.innerHTML = req.val
        });
    },

    findTextContentsAndAttachEvents: () => {
        var me = tcl;

        const attachEvent = () => {
            const cache_rule = [
                "textarea",
                "iframe",
                "[contentEditable]",
                "[role='textbox']",
                "[aria-multiline='true']"
            ].map( rule => (rule+`:not([${SAVE_TARGET}])`) ).join(',');

            document.querySelectorAll(cache_rule).forEach(ta => {
                var rn = Math.random(), isTEXTAREA = ta.tagName == "TEXTAREA";
                ta.setAttribute(SAVE_TARGET, true);
                ta.dataset['tcId'] = isTEXTAREA ? rn : `w-${rn}`;
                ta.addEventListener('keyup', me.saveToStorage);
            });
        };

        // TODO: PERFORMANCE ISSUE
        //       some textarea might not appear when document finished
        //       loading, but appear when user do something, code here is use
        //       to check every two seconds.

        window.setInterval(attachEvent, 2000);
        attachEvent();
    },

    saveToStorage: event => {
        var save_info = tcl.getContent(event.target);

        if (strip(save_info.val).length == 0) return;

        runtime.sendMessage({
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

