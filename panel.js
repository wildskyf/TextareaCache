// popup script

window.onload = () => {
	browser.runtime.sendMessage({
		behavior: 'load'
	}).then( ( resObj => {
		if (!(resObj && resObj.data)) return false;
		var selector   = document.querySelector('#cache_seletor');
		var show_cache = document.querySelector('#show_cache');
		var copy_btn   = document.querySelector('#copy_btn');

		var escapeHTML = str => str.toString().replace(/[&"'<>]/g, m => ({
			"&": "&amp;",
			'"': "&quot;",
			"'": "&#39;",
			"<": "&lt;",
			">": "&gt;"
		})[m]);

		var selectText = dom  => {
			if (document.selection) {
				var range = document.body.createTextRange();
				range.moveToElementText(dom);
				range.select();
			}
			else if (window.getSelection) {
				var range = document.createRange();
				range.selectNode(dom);
				window.getSelection().addRange(range);
			}
		};

		var showPreview = (isWYSIWYG, val) => {
			// val is used to show preview of WYSIWYG,
			// so it should not be escaped.

			if (isWYSIWYG) {
				show_cache.type = 'WYSIWYG';
				show_cache.innerHTML = val;
			}
			else {
				show_cache.type = 'txt';
				show_cache.innerHTML = `<textarea>${escapeHTML(val)}</textarea>`;
			}
		};

		for (var key in resObj.data) {

            if (!resObj.data[key] || key == 'version') continue;
            var type = resObj.data[key].type;
            var cache = resObj.data[key].val;

            var select_title = escapeHTML(key).substr(0,50) + '...';
            selector.innerHTML += `<option value="${escapeHTML(key)}">${select_title}</option>`;

            if (show_cache.innerHTML == '')
                showPreview(type == 'WYSIWYG', cache);

		}

		if (!document.querySelector('option')) {
			document.querySelector('body').innerHTML = '<p>You don\'t have any cache yet!</p>';
		}

		selector.addEventListener('change', e => {
			var key = e.target.value;
			var cache = resObj.data[key].val;
			var isWYSIWYG = resObj.data[key].type == 'WYSIWYG';

			showPreview(isWYSIWYG, cache);
		});

		copy_btn.addEventListener('click', () => {
			if (show_cache.type == 'WYSIWYG') {
				selectText(show_cache);
			}
			else {
				document.querySelector("textarea").select();
			}
			document.execCommand("Copy");
			// alert('You got it, now put your cache anyway!');
		});
	}));
}
