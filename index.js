// background script

var isDEV = false;

var log_storage = window.log = () => {
	browser.storage.local.get().then( thing => {
		if (isDEV) console.log(thing);
	});
};

browser.runtime.onMessage.addListener( (request, sender, sendBack) => {

	if (isDEV) console.log(request.behavior);
	switch(request.behavior) {
		case 'init':
			if (isDEV) console.log('bg_init');

			browser.tabs.query({url: request.url}).then((tab_infos) => {
				tab_infos.forEach(tab_info => {
					browser.pageAction.show(tab_info.id);
				});
			});

			browser.storage.local.get().then( local_obj => {
				log_storage();
				if (local_obj[request.url] === undefined) {
					if (isDEV) console.log('creating record');
					local_obj[request.url] = {};
					for (var i = 0 ; i < request.ta_num ; ++i) {
						local_obj[request.url][i] = { val: "" };
					}
					local_obj[request.url].length = request.ta_num;
					browser.storage.local.set(local_obj);
					log_storage();
				}
			});
			break;
		case 'save':
			if (isDEV) console.log('bg_save');
			browser.storage.local.get().then( local_obj => {
				var {url, val, id} = request;

				local_obj[url] = local_obj[url] || {};
				local_obj[url][id] = local_obj[url][id] || {};
				local_obj[url][id].val = val;
				browser.storage.local.set(local_obj);

				log_storage();
			});
			break;
		case 'load':
			if (isDEV) console.log('bg_load');

			browser.tabs.query({active:true}).then( tabs => {
				browser.tabs.sendMessage(tabs[0].id, 'url').then( res => {
					browser.storage.local.get().then( data => {
						sendBack({ data: data[res.url] });
					});
				});
			});

			break;
		case 'clear':
			if (isDEV) console.log('bg_clear');
			browser.storage.local.clear().then( () => {
				log_storage();
				sendBack({ msg: 'done'});
			});
			break;
	}

	return true;
});
