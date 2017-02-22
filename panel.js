// popup script

window.onload = () => {
	browser.runtime.sendMessage({
		behavior: 'load'
	}).then( ( resObj => {
		if (!resObj.data) return false;

		for (var i = 0 ; i < resObj.data.length ; ++i) {

			var ta = document.createElement("TEXTAREA");
			var body = document.querySelector('body');
			ta.value = resObj.data[i].val;
			body.appendChild(ta);
		}
	}));
}
