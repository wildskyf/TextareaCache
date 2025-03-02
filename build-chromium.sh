#!/bin/sh
mkdir -p chromium

(
for f in common.js ta_database.js ta_bg.js background.js
do 
cat $f
echo \;
done
) > chromium/background-script-all.js

node -e "
var o = $(cat manifest.json)
o.background = o.browser_specific_settings.chromium_background
delete o.browser_specific_settings
var exl = 'tabs activeTab menus'.split(' ')
o.permissions = o.permissions.filter(x => !exl.includes(x))
console.log(JSON.stringify(o, null, '  '))
" > chromium/manifest.json

ln -sr browser-polyfill.min.js* common.js helper.js \
   content-script.js service-worker.js vendor \
   options view css fonts icons _locales \
   chromium
