// content script

var textAreas = Array.from(document.querySelectorAll('textarea'));

if (textAreas.length) {

	console.log('init');
	browser.runtime.sendMessage({
		behavior: 'init',
		url: location.href,
		ta_num: textAreas.length
	});

	textAreas.forEach( (ta, i) => {
		ta.addEventListener( 'input', e => {
			// console.log('save');
			browser.runtime.sendMessage({
				behavior: 'save',
				url: location.href,
				id: i,
				val: ta.value
			});
		});
	});

	browser.runtime.onMessage.addListener( (request, sender, sendBack) => {
		sendBack({ url: location.href });
	});


	// for debugging
	if (!document.querySelector('button#clearBtn')) {
		/*
		// Dont know why it remove the listener from textarea
		document.querySelector('body').innerHTML += '<button id="clearBtn">clear</button>';
		document.querySelector('button#clearBtn').addEventListener('click', () => {
			console.log('clear');
			browser.runtime.sendMessage({
				behavior: 'clear'
			});
		});
		*/
	}

}
