var textAreas = document.querySelectorAll('textarea');

if(textAreas.length !== 0) {
	textAreas.forEach( ta => {
		ta.addEventListener( 'input', e => {
			var rect = ta.getBoundingClientRect();
			var pos = `${rect.x},${rect.y}`;
			localStorage[pos] = ta.value;
		});
	});
}
