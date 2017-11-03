// content script

var tcl = {
    isDEV: false,

    init: () => {
        var me = tcl;
        tcl.initDBTable();
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

    saveToStorage: event => {
        var save_info = tcl.getContent(event.target);

        if (tcl.strip(save_info.val).length == 0) return;

        browser.runtime.sendMessage({
            behavior: 'save',
            title: document.title,
            url: location.href,
            val: save_info.val,
            id: event.target.dataset.id,
            type: save_info.isWYSIWYG ? 'WYSIWYG' : 'txt'
        });
    },

    strip: html => {
       var tmp = document.createElement("DIV");
       tmp.innerHTML = html;
       return tmp.textContent || tmp.innerText || "";
    }
};

tcl.init();

