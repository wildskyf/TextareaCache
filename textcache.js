// content script

var textAreas = Array.from(document.querySelectorAll('textarea'));

textAreas.forEach( (ta, i) => {
	ta.addEventListener( 'input', e => {
		browser.runtime.sendMessage({
			behavior: 'save',
			url: location.href,
			id: i,
			val: ta.value
		});
	});
});

