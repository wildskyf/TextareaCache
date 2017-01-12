browser.browserAction.setPopup({
    popup: browser.extension.getURL('dashboard.html')
});
browser.runtime.onMessage.addListener( (req, sender, sendRes) => {
		sendRes({
			res: "This msg should from content page's localStorage"
		});
	}
);
