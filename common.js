var { storage, runtime, action, pageAction, tabs, windows, menus, extension } = browser;
var browserAction = action
var { local } = storage;

var catchErr = e => console.error(e);

{
    let global = this
    if (!global && typeof window != 'undefined') global = window
    if (!global && typeof self != 'undefined') global = self
    var browserHas = (x) => {
        if (x == 'chromium') {
            return !browserHas('localStorage')
        }
        return x in global
    }
}

function ok(t, m) {
    if (t) return
    if (m) m = `assert fail: ${m}`
    else m = `assert fail`
    throw new Error(m)
}

let domPurify = {sanitize: s => s};
if (!browserHas('chromium')) {
    import('./vendor/dompurify.js').then(x => domPurify = x.default);
}
else domPurify = self.domPurify
