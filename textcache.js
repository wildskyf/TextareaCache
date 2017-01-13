var textAreas = document.querySelectorAll('textarea');

if(textAreas.length !== 0) {
	textAreas.forEach( ta => {
		ta.addEventListener( 'input', e => {
			var rect = ta.getBoundingClientRect();
			var pos = `${rect.x},${rect.y}`;
			sessionStorage[pos] = ta.value;
		});
	});
}

browser.runtime.onMessage.addListener( (req, sender, sendRes) => {

	if(textAreas.length !== 0) {
		var all_msg = Array.from(textAreas).map( ta => {
			var rect = ta.getBoundingClientRect();
			return {
				current: sessionStorage[`${rect.x},${rect.y}`] || ''
			};
		});

		console.log(JSON.stringify(all_msg));
		sendRes({
			res: JSON.stringify(all_msg)
		});
	}
});
