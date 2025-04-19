# Textarea Cache

[![Join the chat at https://gitter.im/textarea-cache/community](https://badges.gitter.im/textarea-cache/community.svg)](https://gitter.im/textarea-cache/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Save automatically the content in Textarea.

## install

* Firefox Version: [AMO/textarea-cache](https://addons.mozilla.org/firefox/addon/textarea-cache)
* Chrome Version: [Chrome Web Store](https://chrome.google.com/webstore/detail/textarea-cache/chpphekfimlabghbdankokcohcmnbmab)

## Change Log and Previous Versions

Sometimes, you might wonder what's new in the updated version.
And sometime you might need to roll back to the previous version.

Now You could see them at [AMO/textarea-cache/versions/](https://addons.mozilla.org/en-US/firefox/addon/textarea-cache/versions/).

## buy me a coffee

[![bubble-tea]](https://buymeacoffee.com/gholk)

[bubble-tea]: https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png "buy me a bubble tea"

## develop
build:

```sh
npm i web-ext -g
npm run build
```

build chromium:

```sh
npm run build-chromium
cd chromium
zip ../ta-chromium.zip -r *
```
