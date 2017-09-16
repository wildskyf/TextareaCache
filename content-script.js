// content script

var tcl = {
    isDEV: false,
    textareas: null,
    wysiwyg_editors: null,

    init: () => {
        var me = tcl;

        me.textareas = Array.from(document.querySelectorAll('textarea')),
        me.wysiwyg_editors = Array.from(document.querySelectorAll('[contenteditable="true"]')),
        me.initToBackgroundScript();
        me.addEventListener();
        me.connectBackgroundWhenChanged();
    },

    initToBackgroundScript: () => {
        var me = tcl;
        var {textareas,wysiwyg_editors,isDEV} = me;

        if (textareas.length || wysiwyg_editors.length) {
            if (isDEV) console.log('sendMessage init');
            browser.runtime.sendMessage({
                behavior: 'init',
                title: document.title,
                url: location.href
            });
        }
    },

    _multiEventBinding: (target, event_array, callback) => {
        event_array.forEach(event => {
            target.addEventListener(event, e => {
                callback();
            });
        });
    },

    addEventListener: () => {
        var me = tcl;
        var {textareas,wysiwyg_editors,isDEV} = me;

        textareas.length && textareas.forEach( (ta, i) => {
            me._multiEventBinding(ta, ['input', 'focusout'], e => {
                if (ta.changed) return;
                if (isDEV) console.log('textarea changed');
                ta.changed = true;
            });
        });

        wysiwyg_editors.length && wysiwyg_editors.forEach( (editor, i) => {
            me._multiEventBinding(editor, ['click', 'keydown', 'keypress', 'keyup', 'focusout'], e => {
                if (editor.changed) return;
                if (isDEV) console.log('iframe changed');
                editor.changed = true;
            });
        });

    },

    connectBackgroundWhenChanged: () => {
        var me = tcl;
        var {textareas,wysiwyg_editors,isDEV} = me;

        window.setInterval(() => {

            textareas.forEach( (ta, i) => {
                if (!ta.changed) return;
                if (isDEV) console.log('save');
                browser.runtime.sendMessage({
                    behavior: 'save',
                    title: document.title,
                    url: location.href,
                    val: ta.value,
                    id: i,
                    type: 'txt'
                });
                ta.changed = false;
            });

            wysiwyg_editors.forEach( (editor, i) => {
                if (!editor.changed) return;
                browser.runtime.sendMessage({
                    behavior: 'save',
                    title: document.title,
                    val: editor.innerHTML,
                    id: 'w-' + i,
                    type: 'WYSIWYG'
                });
                editor.changed = false;
            });

        }, 2000);

    }

};
tcl.init();

