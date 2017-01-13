var textAreas = document.querySelectorAll('textarea');

if(textAreas.length !== 0) {
	textAreas.forEach( (ta,i) => {
		ta.addEventListener( 'input', e => {
			sessionStorage[i] = ta.value;
		});
	});
}

browser.runtime.onMessage.addListener( (req, sender, sendRes) => {

	if(textAreas.length !== 0) {
		var all_msg = Array.from(textAreas).map( (ta,i) => {
			return {
				current: sessionStorage[i] || ''
			};
		});

		sendRes({
			res: JSON.stringify(all_msg)
		});
	}
});
