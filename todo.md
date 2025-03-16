* remove page action
* rewrite in mv3
* access local.storage in content-script directly
* publish chrome
* remove tabs permission
* upgrade from async storage.local
* reload after setting change
* check min version
* use activeTab instead of <all_urls>
  * maybe impossible
* context menu
  * google chromium does not support menus.onShown event
  * remove confirm since we cache content before paste now
