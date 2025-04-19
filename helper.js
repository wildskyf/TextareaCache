var stor = {
    db: browser.storage.local,
    load() {return this.db.get()},
    async get(id) {
        const c = await this.db.get(id)
        return c[id]
    },
    set(k, v) {
        return this.db.set({[k]: v})
    },
    saveTa(o) {
        var {title, val, type, id, url, sessionKey} = o;
        return this.set(`${sessionKey} ${url} ${id}`, {
            time: sessionKey,
            type: type,
            val: val,
            url: url,
            last_modified: String((new Date()).getTime())
        });
    },
    delete(id) {return this.db.remove(id)}
}

const xpath = {
    e2string(p, node = document.documentElement) {
        const ns = null
        const r = document.evaluate(p, node, ns, XPathResult.STRING_TYPE, null)
        return r.stringValue
    }
}
const i18nAuto = {
    NS: null,
    q: `*[data-i18n-xpath]`,
    withNode(e) {
        if (e.dataset.i18nXpath) {
            const id = xpath.e2string(e.dataset.i18nXpath, e)
            let k = id
            if (this.NS) k = this.NS + '__' + k
            e.textContent = browser.i18n.getMessage(k)
        }
        else {
            console.error(`i18n-unknown: ${e}`)
        }
    },
    run(ns) {
        this.NS = ns
        for (const e of $all(this.q)) {
            this.withNode(e)
        }
    }
}

function $(q, root = document) {
    return root.querySelector(q)
}
function $all(q, root = document) {
    return Array.from(root.querySelectorAll(q))
}
