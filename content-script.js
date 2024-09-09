// content script

var { runtime } = browser;
var strip = html => html.replace(/<(?:.|\n)*?>/gm, '')

const SAVE_TARGET = 'tc-textContent';
var tcl = {
    sessionKey: String((new Date()).getTime()), // the timestamp at which user open a website

    init: async () => {
        var me = tcl;

        if (await tcl.initExceptionSites()) return;

        tcl.cache_rule = [
            "textarea",
            "iframe",
            "[contentEditable]",
            "[role='textbox']",
            "[aria-multiline='true']"
        ].map( rule => (rule+`:not([${SAVE_TARGET}])`) ).join(',');

        tcl.initContextMenu();
        window.addEventListener('focusin', tcl.focusEventTaDetector)
        const opt = await runtime.sendMessage({behavior: 'get_options'})
        if (!opt.onlyCacheFocusElement) tcl.findTextContentsAndAttachEvents();
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
        }).then(()=>{}).catch(()=>{});

        runtime.onMessage.addListener( req => {
            if (req.behavior != "pasteToTextarea") return;
            if (!req.skipConfirmPaste && !confirm(`paste "${req.val}" ?`)) return;

            document.activeElement.innerHTML = req.val
        });
    },
    attachEventToNode: ta => {
        var me = tcl;
        var rn = Math.random(), isTEXTAREA = ta.tagName == "TEXTAREA";
        ta.setAttribute(SAVE_TARGET, true);
        ta.dataset['tcId'] = isTEXTAREA ? rn : `w-${rn}`;
        ta.addEventListener('keyup', me.saveToStorage);
    },

    focusEventTaDetector: evt => {
        const me = tcl;
        let e = document.activeElement
        while (e.shadowRoot) e = e.shadowRoot.activeElement
        if (e && e.matches(me.cache_rule)) me.attachEventToNode(e)
    },

    findTextContentsAndAttachEvents: () => {
        const me = tcl;
        const q = me.cache_rule;
        const qf = r => r.querySelectorAll(q).forEach(e => {
            if (e.shadowRoot) qf(e.shadowRoot)
            else me.attachEventToNode(e)
        })
        qf(document)
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

