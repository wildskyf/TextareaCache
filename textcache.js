var textArea = document.querySelector('textarea');
textArea.addEventListener( 'input', e => {
    var rect = textArea.getBoundingClientRect();
    var pos = `${rect.x},${rect.y}`;
    localStorage[pos] = textArea.value;
});

// browser.runtime.
