// popup script

var setBodyEmpty = () => {
    var textnode = document.createTextNode('There is no cache here!');
    document.body.textContent = '';
    document.body.style.padding = '20px';
    document.body.appendChild(textnode);
};

window.onload = () => {
    var whole_data = null;
	browser.runtime.sendMessage({
		behavior: 'load'
	}).then( ( resObj => {
		if (!(resObj && resObj.data)) return false;
        whole_data = resObj.data;
        if (Object.keys(whole_data).length <= 1) {
            setBodyEmpty();
            return false;
        }

		var selector   = document.querySelector('#cache_seletor');
		var show_cache = document.querySelector('#show_cache');
		var copy_btn   = document.querySelector('#copy_btn');
		var delete_btn = document.querySelector('#delete_btn');

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

        var tmp_array = [];
		for (var key in whole_data) {
            if (!whole_data[key] || key == 'version') continue;
		    var tmp_data = whole_data[key];
		    tmp_data.key = key;
		    tmp_array.push(tmp_data);
		}

        tmp_array.forEach(one_data => {
            var type = one_data.type;
            var cache = one_data.val;

            var select_title = escapeHTML(one_data.key);
            selector.innerHTML += `<option value="${escapeHTML(one_data.key)}">${select_title}</option>`;

            if (show_cache.innerHTML == '')
                showPreview(type == 'WYSIWYG', cache);

            if (!document.querySelector('option')) {
                document.querySelector('body').innerHTML = '<p>You don\'t have any cache yet!</p>';
            }
        });

		selector.addEventListener('change', e => {
			var key = e.target.value;
			var cache = whole_data[key].val;
			var isWYSIWYG = whole_data[key].type == 'WYSIWYG';

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


        delete_all_btn.addEventListener('click', () => {
            browser.runtime.sendMessage({
                behavior: 'clear'
            }).then(res => {
                if (res.msg == 'done') {
                    setBodyEmpty();
                }
            });
        });

        delete_btn.addEventListener('click', () => {
            browser.runtime.sendMessage({
                behavior: 'delete',
                id: selector.value
            }).then( res => {
                whole_data = res.data;
                selector.querySelector(`[value="${res.deleted}"]`).remove();

                var key = selector.value;

                if (!whole_data[key]) {
                    setBodyEmpty();
                    return false;
                }

                var cache = whole_data[key].val;
                var isWYSIWYG = whole_data[key].type == 'WYSIWYG';

                showPreview(isWYSIWYG, cache);
            });
        });
	}));
}
