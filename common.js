var { storage, runtime, browserAction, pageAction, tabs, windows, menus, extension } = browser;
var { sync } = storage;

var catchErr = e => console.error(e);
