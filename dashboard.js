// popup script

window.onload = () => {
	browser.runtime.sendMessage({
		behavior: 'load'
	}).then( ( resObj => {
		if (!resObj) return false;
		JSON.parse(resObj.res).forEach( obj => {
			var ta = document.createElement("TEXTAREA");
			var body = document.querySelector('body');
			ta.value = obj.current;
			body.appendChild(ta);
		});
	}));
}
