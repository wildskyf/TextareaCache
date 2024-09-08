# Textarea Cache M
Save automatically the content in Textarea.

This is a fork of the [origin textarea cache][tc].
TCM cache the textarea in shadow-root
and stop scan textarea intervally.

[tc]: https://github.com/wildskyf/TextareaCache

If a element match [css selector][ta sel] and has a shadow-root,
TCM will cache the textarea inside it.

[ta sel]: content-script.js#L15

This fork will not scan textarea intervally,
but listen to the focus event and cache its value.

## install

* Firefox Version: [AMO/textarea-cache-m](https://addons.mozilla.org/firefox/addon/textarea-cache-m)
* Chrome Version: not published

## develop

```
# install node.js
npm install web-ext -g
web-ext run
```
