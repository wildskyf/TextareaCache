browser.browserAction.setPopup({
    popup: browser.extension.getURL('dashboard.html')
});
browser.runtime.onMessage.addListener( (request, sender, sendBack) => {

	browser.tabs.query({active:true}).then( tabs => {
		browser.tabs.sendMessage(tabs[0].id, '').then( resObj => {
			sendBack({
				res: resObj.res
			});
		});
	});

	return true;
});
