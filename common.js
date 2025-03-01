var { storage, runtime, action, pageAction, tabs, windows, menus, extension } = browser;
var browserAction = action
var { local } = storage;
let domPurify = {sanitize: s => s};
if (!browserHas('chromium')) {
    import('./vendor/dompurify.js').then(x => domPurify = x.default);
}
else domPurify = self.dompurify

var catchErr = e => console.error(e);


