var { storage, runtime, browserAction, pageAction, tabs, windows, menus, extension } = browser;
var { local } = storage;
let domPurify = {sanitize: s => s};
import('./vendor/dompurify.js').then(x => domPurify = x.default);

var catchErr = e => console.error(e);


