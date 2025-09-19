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
var o = JSON.parse(fs.readFileSync('manifest.json', 'utf8'))
o.background = o.browser_specific_settings.chromium_background
delete o.browser_specific_settings
var exl = 'tabs menus'.split(' ')
o.permissions = o.permissions.filter(x => !exl.includes(x))

fs.writeFileSync(
  'chromium/manifest.json', JSON.stringify(o, null, '  '), 'utf8')

o.name += ' BETA'
o.description = 'THIS EXTENSION IS FOR BETA TESTING\n\n' + o.description

fs.writeFileSync(
  'chromium/manifest-test.json', JSON.stringify(o, null, '  '), 'utf8')
"

ln -sr browser-polyfill.min.js* common.js helper.js \
   content-script.js service-worker.js vendor \
   options view css fonts icons _locales \
   chromium

(
    cd chromium
    zip -r ../chromium.zip * -x manifest-test.json

    mv manifest-test.json manifest.json
    zip -r ../chromium-test.zip *
)
