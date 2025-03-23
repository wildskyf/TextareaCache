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
        let opt = await stor.get('setting')
        if (!opt) opt = await runtime.sendMessage({behavior: 'get_options'})
        if (!opt.onlyCacheFocusElement) {
            tcl.findTextContentsAndAttachEvents();
            if (opt.intervalToSave > 0) {
                tcl.findTextContentInterval(opt.intervalToSave)
            }
        }
    },

    initExceptionSites: async () => {
        var expts = await stor.get('exceptions')
        if (!expts) {
            let res = await runtime.sendMessage({ behavior: 'get_exceptions' });
            expts = res.expts
        }
        return expts.some(site => location.href.includes(site));
    },

    initContextMenu: () => {
        runtime.onMessage.addListener( req => {
            if (req.behavior != "pasteToTextarea") return;
            if (!req.skipConfirmPaste && !confirm(`paste "${req.val.slice(2)}" ?`)) return;

            const e = document.activeElement
            if (!e) return
            tcl.saveToStorage(e)
            tcl.pasteToElement(req.val);
        });
    },
    getInnerHtml: (html) => {
        const dp = new DOMParser()
        const doc = dp.parseFromString(html, 'text/html')
        const r = doc.body.children[0]
        return r?.innerHTML || ''
    },
    pasteToElement: (data, e = document.activeElement) => {
        if (!e) return
        const flag = data.charAt(0)
        let val = data.slice(2)
        if (flag == 'w') val = tcl.getInnerHtml(val)
        if (e.isContentEditable) {
            if (flag == 'w') e.innerHTML = val
            else e.textContent = val
        }
        else e.value = val
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
        while (e && e.shadowRoot) e = e.shadowRoot.activeElement
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
    findTextContentInterval: async ms => {
        let visibleNow = () => {}
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) visibleNow()
        })
        function waitPageVisible() {
            if (!document.hidden) return Promise.resolve();
            return new Promise(ok => visibleNow = () => {
                ok()
                visibleNow = () => {}
            })
        }
        function sleep(ms) {
            return new Promise(wake => setTimeout(wake, ms));
        }

        const me = tcl
        while (true) {
            await sleep(ms);
            await waitPageVisible();
            me.findTextContentsAndAttachEvents();
        }
    },

    saveToStorage: x => {
        let e = x
        if (x instanceof Event) e = x.target
        var save_info = tcl.getContent(e);

        if (strip(save_info.val).length == 0) return;

        // runtime.sendMessage({
        stor.saveTa({
            behavior: 'save',
            title: window.parent.document.title,
            url: location.href,
            val: save_info.val,
            id: e.dataset['tcId'],
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

