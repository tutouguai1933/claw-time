/* Local-only storage adapter. A remote adapter can implement read/write later. */
(function (global) {
  'use strict';
  const KEY = 'qingpeiban.profiles.v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = name => String(name || '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
  const encode = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  const decode = hex => Uint8Array.from(hex.match(/../g) || [], byte => parseInt(byte, 16));
  async function derive(password, salt, iterations) {
    if (!global.crypto || !global.crypto.subtle) throw new Error('当前环境无法安全保存口令，请使用本机服务或安全浏览器页面。');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return encode(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: decode(salt), iterations }, key, 256));
  }
  class ProfileStore {
    constructor(adapter) {
      this.adapter = adapter || { read: () => localStorage.getItem(KEY), write: value => localStorage.setItem(KEY, value) };
      this.data = null;
      this.activeId = null;
      this.revision = 0;
    }
    readLatest() {
      const raw = this.adapter.read();
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.users) || !data.guest || (data.activeId && !data.users.some(user => user.id === data.activeId))) throw new Error('账号数据格式无法读取，请保留浏览器数据后重试。');
      // Older version-1 snapshots start at revision zero without changing their content.
      data.guestRevision ??= 0;
      data.users.forEach(user => { user.snapshotRevision ??= 0; });
      if (![data.guestRevision, ...data.users.map(user => user.snapshotRevision)].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('账号记录版本无法读取，请保留浏览器数据后重试。');
      return data;
    }
    init(guest) {
      this.data = this.readLatest();
      if (!this.data) this.commit({ version: 1, activeId: null, users: [], guest: clone(guest), guestRevision: 0 });
      this.activeId = this.data.activeId;
      this.revision = this.snapshotRevision(this.data, this.activeId);
      return this.snapshot;
    }
    commit(next) {
      const serialized = JSON.stringify(next);
      this.adapter.write(serialized);
      this.data = JSON.parse(serialized);
    }
    get user() { const user = this.data && this.data.users.find(item => item.id === this.activeId); return user ? { id: user.id, username: user.username } : null; }
    get snapshot() { const user = this.data.users.find(item => item.id === this.activeId); return clone(user ? user.snapshot : this.data.guest); }
    snapshotRevision(data, id) { const user = data.users.find(item => item.id === id); return id ? (user ? user.snapshotRevision : -1) : data.guestRevision; }
    latestForSave() {
      const next = this.readLatest();
      if (!next || this.snapshotRevision(next, this.activeId) !== this.revision) {
        const error = new Error('此账号记录已在其他页面更新，请保留当前页面内容，刷新后再操作。');
        error.code = 'PROFILE_CONFLICT';
        throw error;
      }
      return next;
    }
    save(snapshot) {
      const next = this.latestForSave();
      this.assignSnapshot(next, snapshot);
      this.commit(next);
      this.revision = this.snapshotRevision(next, this.activeId);
    }
    assignSnapshot(data, snapshot) {
      const user = data.users.find(item => item.id === this.activeId);
      if (user) { user.snapshot = clone(snapshot); user.snapshotRevision++; }
      else { data.guest = clone(snapshot); data.guestRevision++; }
    }
    restoreSession(id) {
      // A failed view restore must never write an old copy of the accounts database.
      // Reset the page identity even if persisting the session selection fails.
      this.activeId = id;
      this.revision = this.snapshotRevision(this.data, id);
      const next = this.readLatest();
      if (!next || this.snapshotRevision(next, id) < 0) throw new Error('账号记录已变化，请保留当前页面内容，刷新后再操作。');
      next.activeId = id;
      this.commit(next);
      this.revision = this.snapshotRevision(next, id);
    }
    async credentials(username, password) {
      const label = String(username || '').normalize('NFKC').trim();
      const normalized = normalize(label);
      if (label.length < 2 || label.length > 24 || /[\u0000-\u001f\u007f]/.test(label)) throw new Error('账号名请使用 2–24 个可见字符。');
      if (typeof password !== 'string' || password.length < 6 || password.length > 128) throw new Error('口令请使用 6–128 个字符。');
      const latest = this.readLatest();
      if (latest && latest.users.some(user => user.normalized === normalized)) throw new Error('这个账号名已存在，请直接登录。');
      const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
      const iterations = 210000;
      return { id: crypto.randomUUID(), username: label, normalized, credential: { algorithm: 'PBKDF2-SHA-256', iterations, salt, digest: await derive(password, salt, iterations) } };
    }
    async authenticate(username, password) {
      const latest = this.readLatest();
      const user = latest && latest.users.find(item => item.normalized === normalize(username));
      if (!user || typeof password !== 'string') throw new Error('账号名或口令不正确。');
      const digest = await derive(password, user.credential.salt, user.credential.iterations);
      let difference = digest.length ^ user.credential.digest.length;
      for (let i = 0; i < digest.length; i++) difference |= digest.charCodeAt(i) ^ user.credential.digest.charCodeAt(i);
      if (difference) throw new Error('账号名或口令不正确。');
      return user.id;
    }
    switchTo(id, oldSnapshot, newUser, defaults) {
      const next = this.latestForSave();
      this.assignSnapshot(next, oldSnapshot);
      if (newUser) {
        if (next.users.some(user => user.normalized === newUser.normalized)) throw new Error('这个账号名已存在，请直接登录。');
        next.users.push({ ...newUser, snapshot: clone(next.users.length === 0 && !this.activeId ? oldSnapshot : defaults), snapshotRevision: 0 });
      }
      if (id && !next.users.some(user => user.id === id)) throw new Error('账号不存在。');
      next.activeId = id;
      this.commit(next);
      this.activeId = id;
      this.revision = this.snapshotRevision(next, id);
      return this.snapshot;
    }
  }
  global.ProfileStore = ProfileStore;
})(window);
