// background script

browser.browserAction.setPopup({
    popup: browser.extension.getURL('dashboard.html')
});

browser.runtime.onMessage.addListener( (request, sender, sendBack) => {

	switch(request.behavior) {
		case 'save':
			// browser.storage.local.clear();
			browser.storage.local.get().then( local_obj => {
				var {url, val, id} = request;

				local_obj[url] = local_obj[url] || {};
				local_obj[url][id] = local_obj[url][id] || {};
				local_obj[url][id].val = val;
				browser.storage.local.set(local_obj);

				sendBack({ msg: 'done'});
			});
			break;
		case 'load':
			break;
	}

	return true;
});
