window.onload = () => {
	var textarea = document.querySelector('textarea');

	browser.runtime.sendMessage().then( resObj => {
		textarea.value = resObj.res;
	});
}
