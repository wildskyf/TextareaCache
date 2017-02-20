// content script

var isDEV = false;

var textAreas = Array.from(document.querySelectorAll('textarea'));

if (textAreas.length) {

	if (isDEV) console.log('init');
	browser.runtime.sendMessage({
		behavior: 'init',
		url: location.href,
		ta_num: textAreas.length
	});

	textAreas.forEach( (ta, i) => {
		ta.addEventListener( 'input', e => {
			if (isDEV) console.log('save');
			browser.runtime.sendMessage({
				behavior: 'save',
				url: location.href,
				id: i,
				val: ta.value
			});
		});
	});

	browser.runtime.onMessage.addListener( (request, sender, sendBack) => {
		sendBack({ url: location.href });
	});
}
