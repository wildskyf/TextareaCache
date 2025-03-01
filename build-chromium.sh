#!/bin/sh
mkdir -p chromium

(
for f in browser-polyfill.min.js vendor/dompurify-global.js helper.js common.js ta_database.js ta_bg.js background.js 
do 
cat $f
echo \;
done
) > chromium/service-worker.js

node -e "
var o = $(cat manifest.json)
delete o.background.scripts
o.background.service_worker = 'service-worker.js'
o.background.type = 'module'
console.log(JSON.stringify(o, null, '  '))
" > chromium/manifest.json

cp -rvu browser-polyfill.min.js* common.js helper.js \
   content-script.js vendor \
   options view css fonts icons _locales \
   chromium
