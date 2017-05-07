// content script

var isDEV = false;

var textAreas = Array.from(document.querySelectorAll('textarea'));
var iframes   = Array.from(document.querySelectorAll('iframe'));

if (textAreas.length || iframes.length) {

	if (isDEV) console.log('sendMessage init');
	browser.runtime.sendMessage({
		behavior: 'init',
		url: location.href,
		ta_num: textAreas.length,
		ifr_num: iframes.length
	});

	// wait for panel's request
	browser.runtime.onMessage.addListener( (request, sender, sendBack) => {
		sendBack({
			url: location.href
		});
	});
}

window.setInterval(() => {
    textAreas.forEach( (ta, i) => {
        if (!ta.changed) return;
        if (isDEV) console.log('save');
        browser.runtime.sendMessage({
            behavior: 'save',
            url: location.href,
            id: i,
            val: ta.value
        });
        ta.changed = false;
    });

	iframes.forEach( (ifr, i) => {
        if (!ifr.changed) return;
        browser.runtime.sendMessage({
            behavior: 'save',
            url: location.href,
            id: 'w-' + i,
            val: ifr.contentWindow.document.body.innerHTML
        });
        ifr.changed = false;
    });
}, 5000);

if (textAreas.length) {
	textAreas.forEach( (ta, i) => {
		ta.addEventListener( 'input', e => {
			if (isDEV) console.log('textarea changed');
            ta.changed = true;
		});
	});
}

if (iframes.length) {
	iframes.forEach( (ifr, i) => {
		var events = ['click', 'keydown', 'keypress', 'keyup', 'focusout'];
		events.forEach( evt_name => {
			ifr.contentWindow.document.body.addEventListener( evt_name, e => {
				if (isDEV) console.log('iframe changed');
				ifr.changed = true;
			});
		});
	});
}

