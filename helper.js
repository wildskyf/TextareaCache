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
