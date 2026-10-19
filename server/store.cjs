const {DatabaseSync} = require('node:sqlite');
const {randomBytes, randomUUID, createHash, scrypt, timingSafeEqual} = require('node:crypto');
const {promisify} = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const derive = promisify(scrypt);
const SESSION_AGE = 30 * 24 * 60 * 60 * 1000;
const tokenHash = token => createHash('sha256').update(token).digest('hex');

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function openStore(databasePath) {
  if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(databasePath), {recursive: true, mode: 0o700});
  const db = new DatabaseSync(databasePath);
  if (databasePath !== ':memory:') fs.chmodSync(databasePath, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL, digest TEXT NOT NULL, snapshot TEXT, revision INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);`);
  let hashing = false;
  async function passwordHash(password, salt) {
    if (hashing) throw new ApiError(503, 'AUTH_BUSY', '正在处理登录请求，请稍后再试。');
    hashing = true;
    try { return await derive(password, salt, 64, {N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024}); }
    finally { hashing = false; }
  }
  function credentials(username, password) {
    const label = typeof username === 'string' ? username.normalize('NFKC').trim() : '';
    if (label.length < 2 || label.length > 24 || /[\u0000-\u001f\u007f]/.test(label)) throw new ApiError(400, 'INVALID_USERNAME', '账号名请使用 2–24 个可见字符。');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new ApiError(400, 'INVALID_PASSWORD', '密码请使用 8–128 个字符。');
    return {label, normalized: label.toLocaleLowerCase('en-US')};
  }
  function envelope(row) { return {user: {id: row.id, username: row.username}, snapshot: row.snapshot ? JSON.parse(row.snapshot) : null, revision: row.revision}; }
  function issue(row) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(tokenHash(token), row.id, Date.now() + SESSION_AGE);
    return {token, ...envelope(row)};
  }
  return {
    db,
    async register(username, password, snapshot) {
      const {label, normalized} = credentials(username, password);
      if (db.prepare('SELECT id FROM users WHERE normalized=?').get(normalized)) throw new ApiError(409, 'USERNAME_TAKEN', '这个账号名已存在，请直接登录。');
      const salt = randomBytes(16).toString('hex');
      const digest = (await passwordHash(password, salt)).toString('hex');
      const id = randomUUID();
      try { db.prepare('INSERT INTO users (id,username,normalized,salt,digest,snapshot) VALUES (?,?,?,?,?,?)').run(id, label, normalized, salt, digest, snapshot == null ? null : JSON.stringify(snapshot)); }
      catch (error) { if (db.prepare('SELECT id FROM users WHERE normalized=?').get(normalized)) throw new ApiError(409, 'USERNAME_TAKEN', '这个账号名已存在，请直接登录。'); throw error; }
      return issue(db.prepare('SELECT * FROM users WHERE id=?').get(id));
    },
    async login(username, password) {
      const {normalized} = credentials(username, password);
      const row = db.prepare('SELECT * FROM users WHERE normalized=?').get(normalized);
      const digest = await passwordHash(password, row?.salt || '00000000000000000000000000000000');
      if (!row || !timingSafeEqual(digest, Buffer.from(row.digest, 'hex'))) throw new ApiError(401, 'INVALID_CREDENTIALS', '账号名或密码不正确。');
      return issue(row);
    },
    session(token) {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      const row = db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.hash=? AND s.expires>?').get(tokenHash(token), Date.now());
      return row ? envelope(row) : null;
    },
    revoke(token) { if (token) db.prepare('DELETE FROM sessions WHERE hash=?').run(tokenHash(token)); },
    save(userId, revision, snapshot) {
      const result = db.prepare('UPDATE users SET snapshot=?, revision=revision+1 WHERE id=? AND revision=?').run(JSON.stringify(snapshot), userId, revision);
      if (!result.changes) throw new ApiError(409, 'PROFILE_CONFLICT', '存档已在其他页面或设备更新。本机副本已保留，请重新载入云端存档。');
      return {revision: revision + 1};
    },
    close() { db.close(); }
  };
}
module.exports = {openStore, ApiError, SESSION_AGE};
