/* Server accounts with a per-user durable outbox. No credentials are cached. */
(function (global) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const guestKey = 'claw-time.cloud.guest.v1';
  const key = id => 'claw-time.cloud.pending:' + id;
  const clientKey = 'claw-time.cloud.client.v1';
  const ackKey = name => 'claw-time.cloud.ack:' + name;
  const ackValue = entry => entry.changeId ? 'id:' + entry.changeId : 'raw:' + JSON.stringify(entry);
  const randomId = () => Array.from(global.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  function clientId() {
    const navigation = global.performance?.getEntriesByType('navigation')[0]?.type;
    const previous = global.sessionStorage.getItem(clientKey);
    if (previous && ['reload', 'back_forward'].includes(navigation)) return previous;
    // sessionStorage is copied by window.open; a fresh navigation must use a fresh identity.
    // getRandomValues also works when the prototype is served over HTTP on an IP address.
    const id = randomId();
    global.sessionStorage.setItem(clientKey, id);
    return id;
  }
  const blocked = status => ['conflict', 'expired'].includes(status);
  class CloudProfileStore {
    constructor(onChange) {
      this.onChange = onChange || (() => {}); this.user = null; this.revision = 0;
      this.status = 'guest'; this.dirty = false; this.sequence = 0; this.epoch = 0;
      this.timer = null; this.flight = null; this.error = '';
      this.clientId = clientId(); this.recoveredFrom = null;
      global.addEventListener('online', () => { if (this.dirty && !blocked(this.status)) this.schedule(0); });
      global.addEventListener('beforeunload', event => { if (this.dirty) { event.preventDefault(); event.returnValue = ''; } });
    }
    get activeId() { return this.user?.id || null; }
    get snapshot() { return clone(this.current); }
    get outboxKey() { return key(this.user.id) + ':' + this.clientId; }
    get recoverableOutboxes() {
      if (!this.user) return [];
      const prefix = key(this.user.id), entries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if (name !== prefix && !name?.startsWith(prefix + ':')) continue;
        const entry = this.read(name);
        if (entry?.dirty && localStorage.getItem(ackKey(name)) !== ackValue(entry)) entries.push({...entry, key: name});
      }
      return entries;
    }
    setStatus(value, error = '') { this.status = value; this.error = error; this.onChange(); }
    read(name) {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try { return JSON.parse(raw); }
      catch { throw new Error('本机待同步副本无法读取，请保留浏览器数据后重试。'); }
    }
    async request(route, method = 'GET', data, expectedUser) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch((global.CLAW_CONFIG.apiBase || '/api') + route, {
          method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          headers: method === 'GET' ? {} : {'Content-Type': 'application/json', 'X-Claw-Request': '1', ...(expectedUser ? {'X-Claw-User': expectedUser} : {})},
          body: data === undefined ? undefined : JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) { const error = new Error(result.error || '服务器暂时无法处理请求。'); error.code = result.code; error.status = response.status; throw error; }
        return result;
      } catch (error) {
        if (!error.code) { const reason = new Error('网络连接失败，修改已保留在本机，恢复连接后会重试。'); reason.code = 'NETWORK_ERROR'; throw reason; }
        throw error;
      } finally { clearTimeout(timeout); }
    }
    async init(guest, defaults) {
      this.defaults = clone(defaults);
      const storedGuest = this.read(guestKey);
      this.guest = storedGuest || clone(guest);
      this.adopt(await this.request('/session'));
      return this.snapshot;
    }
    adopt(result, recoverOthers = true) {
      // Validate the incoming account's local copy before committing the identity switch.
      const ownKey = result.user && key(result.user.id) + ':' + this.clientId;
      let cached = ownKey && this.read(ownKey), recoveredFrom = null;
      if (cached?.dirty && localStorage.getItem(ackKey(ownKey)) === ackValue(cached)) cached = null;
      if (result.user && !cached?.dirty && recoverOthers) {
        const prefix = key(result.user.id), candidates = [];
        for (let i = 0; i < localStorage.length; i++) {
          const name = localStorage.key(i);
          if (name !== prefix && !name?.startsWith(prefix + ':')) continue;
          const entry = this.read(name);
          if (entry?.dirty && localStorage.getItem(ackKey(name)) !== ackValue(entry)) candidates.push({name, entry});
        }
        if (candidates.length === 1) {
          cached = candidates[0].entry;
          recoveredFrom = {key: candidates[0].name, acknowledgement: ackValue(cached), snapshot: JSON.stringify(cached.snapshot)};
        }
      }
      if (cached?.dirty && (!cached.snapshot || typeof cached.snapshot !== 'object' || Array.isArray(cached.snapshot) || !Number.isSafeInteger(cached.revision) || cached.revision < 0)) throw new Error('本机待同步副本格式不正确，请导出备份后重试。');
      const nextSnapshot = clone(result.user ? cached?.dirty ? cached.snapshot : result.snapshot || this.defaults : this.guest);
      clearTimeout(this.timer); this.timer = null; this.epoch++;
      this.recoveredFrom = recoveredFrom;
      this.user = result.user; this.revision = result.revision ?? 0; this.dirty = false;
      this.current = nextSnapshot;
      if (this.user) {
        if (cached?.dirty) {
          this.dirty = true;
          this.setStatus(cached.revision === this.revision ? 'pending' : 'conflict', cached.revision === this.revision ? '' : '云端已在其他设备更新，本机待同步副本已保留。');
          // Keep the old base revision until the user explicitly resolves a conflict.
          if (this.status === 'conflict') this.revision = cached.revision;
        } else this.setStatus('synced');
      } else this.setStatus('guest');
      this.serialized = JSON.stringify(this.current);
    }
    cache() {
      if (this.user) {
        if (this.dirty) localStorage.setItem(this.outboxKey, JSON.stringify({revision: this.revision, snapshot: this.current, dirty: true, changeId: this.changeId}));
        else localStorage.removeItem(this.outboxKey);
      }
      else localStorage.setItem(guestKey, JSON.stringify(this.current));
    }
    save(snapshot) {
      if (blocked(this.status)) { const error = new Error(this.error || '请先处理账号或存档冲突，本机副本已保留。'); error.code = this.status === 'conflict' ? 'PROFILE_CONFLICT' : 'AUTH_REQUIRED'; throw error; }
      const serialized = JSON.stringify(snapshot);
      if (serialized === this.serialized) return;
      // Write before acknowledging a save, so quota failures can roll back callers.
      const changeId = randomId();
      if (this.user) localStorage.setItem(this.outboxKey, JSON.stringify({revision: this.revision, snapshot, dirty: true, changeId}));
      else localStorage.setItem(guestKey, serialized);
      this.current = JSON.parse(serialized); this.serialized = serialized; this.sequence++; this.changeId = changeId;
      if (!this.user) { this.guest = clone(this.current); return; }
      this.dirty = true; this.setStatus('pending'); this.schedule(400);
    }
    schedule(delay) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.timer = null; this.flush().catch(() => {}); }, delay);
    }
    resume() { if (this.dirty && !blocked(this.status)) this.schedule(0); }
    async flush() {
      if (blocked(this.status)) { const error = new Error(this.error); error.code = this.status === 'conflict' ? 'PROFILE_CONFLICT' : 'AUTH_REQUIRED'; throw error; }
      if (this.flight) { await this.flight; return this.dirty ? this.flush() : true; }
      if (!this.user || !this.dirty) return true;
      clearTimeout(this.timer); this.timer = null;
      const epoch = this.epoch;
      this.flight = (async () => {
        while (this.dirty && epoch === this.epoch) {
          const sequence = this.sequence, userId = this.user.id, snapshot = this.snapshot;
          this.setStatus('syncing');
          try {
            const result = await this.request('/snapshot', 'PUT', {snapshot, revision: this.revision}, userId);
            if (epoch !== this.epoch) return;
            this.revision = result.revision; this.dirty = this.sequence !== sequence;
            this.cache();
            const recovered = this.recoveredFrom;
            if (recovered && recovered.snapshot === JSON.stringify(snapshot)) {
              // A separate acknowledgement never deletes another window's concurrent edits.
              localStorage.setItem(ackKey(recovered.key), recovered.acknowledgement); this.recoveredFrom = null;
            }
            this.setStatus(this.dirty ? 'pending' : 'synced');
          } catch (error) {
            if (epoch !== this.epoch) return;
            const status = error.code === 'PROFILE_CONFLICT' ? 'conflict' : ['AUTH_REQUIRED', 'SESSION_CHANGED'].includes(error.code) ? 'expired' : 'offline';
            this.setStatus(status, error.message);
            if (status === 'offline') this.schedule(4000);
            throw error;
          }
        }
      })();
      try { await this.flight; return true; }
      finally { this.flight = null; }
    }
    async authenticate(action, username, password, importGuest) {
      if (!blocked(this.status)) await this.flush();
      const result = await this.request('/' + action, 'POST', {username, password, ...(action === 'register' && importGuest && !this.user ? {snapshot: this.snapshot} : {})});
      this.adopt(result); return this.snapshot;
    }
    async logout() {
      if (!blocked(this.status)) await this.flush();
      await this.request('/logout', 'POST', {}, this.user?.id);
      this.adopt({user: null}); return this.snapshot;
    }
    async reload() {
      if (!this.user) throw new Error('请先登录账号。');
      if (this.flight) { try { await this.flight; } catch {} }
      const result = await this.request('/session');
      if (result.user?.id !== this.user.id) { this.setStatus('expired', '账号已在其他页面切换，请重新登录。'); throw new Error(this.error); }
      localStorage.setItem('claw-time.cloud.backup:' + this.user.id, JSON.stringify({snapshot: this.current, revision: this.revision, savedAt: new Date().toISOString()}));
      localStorage.removeItem(this.outboxKey);
      this.adopt(result, false); return this.snapshot;
    }
  }
  global.CloudProfileStore = CloudProfileStore;
})(window);
