# Textarea Cache

[![Join the chat at https://gitter.im/textarea-cache/community](https://badges.gitter.im/textarea-cache/community.svg)](https://gitter.im/textarea-cache/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Save automatically the content in Textarea.

## Textarea Cache M
This is a fork of textarea cache, which cache the textarea in shadow-root
and stop scan textarea node intervally in background tab.

If a element match [css selector][ta sel] and has a shadow-root,
TCM will cache the textarea inside it.

[ta sel]: content-script.js#L45

## install

* Firefox Version: [AMO/textarea-cache](https://addons.mozilla.org/firefox/addon/textarea-cache)
* Chrome Version: [Chrome Web Store](https://chrome.google.com/webstore/detail/textarea-cache/chpphekfimlabghbdankokcohcmnbmab)

## Change Log and Previous Versions

Sometimes, you might wonder what's new in the updated version.
And sometime you might need to roll back to the previous version.

Now You could see them at [AMO/textarea-cache/versions/](https://addons.mozilla.org/en-US/firefox/addon/textarea-cache/versions/).

## develop

```
# install node.js
npm install web-ext -g
web-ext run
```
