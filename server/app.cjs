const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {openStore, ApiError, SESSION_AGE} = require('./store.cjs');
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.json': 'application/json'};
const MAX_BODY = 12 * 1024 * 1024;

function createApp(options = {}) {
  const root = fs.realpathSync(options.root || path.resolve(__dirname, '..'));
  const store = openStore(options.databasePath || path.join(root, 'data', 'claw-time.sqlite'));
  const publicOrigin = options.publicOrigin ? new URL(options.publicOrigin).origin : null;
  const secureCookies = options.secureCookies ?? publicOrigin?.startsWith('https:') ?? false;
  const attempts = new Map();
  function json(res, status, value) {
    res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
    res.end(JSON.stringify(value));
  }
  function cookie(res, token = '') {
    res.setHeader('Set-Cookie', `claw_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? Math.floor(SESSION_AGE / 1000) : 0}${secureCookies ? '; Secure' : ''}`);
  }
  function token(req) { return /(?:^|;\s*)claw_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1]; }
  function expectedUser(req, session) {
    if (!session?.user) throw new ApiError(401, 'AUTH_REQUIRED', '登录已过期，请重新登录。本机待同步数据仍会保留。');
    if (req.headers['x-claw-user'] !== session.user.id) throw new ApiError(409, 'SESSION_CHANGED', '其他页面已切换账号，请重新登录。本机副本已保留。');
    return session.user.id;
  }
  function limit(req) {
    const key = req.socket.remoteAddress;
    const now = Date.now();
    let entry = attempts.get(key);
    if (!entry || entry.until < now) {
      if (attempts.size >= 2000) attempts.delete(attempts.keys().next().value);
      entry = {count: 0, until: now + 10 * 60 * 1000}; attempts.set(key, entry);
    }
    if (++entry.count > (options.authLimit || 20)) throw new ApiError(429, 'RATE_LIMITED', '登录尝试过于频繁，请十分钟后再试。');
  }
  async function body(req) {
    if (req.headers['x-claw-request'] !== '1' || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new ApiError(403, 'CSRF_REJECTED', '请求未通过来源校验。');
    const expectedOrigin = publicOrigin || `http://${req.headers.host}`;
    if (req.headers.origin && req.headers.origin !== expectedOrigin || req.headers['sec-fetch-site'] === 'cross-site') throw new ApiError(403, 'CSRF_REJECTED', '请求来源不受支持。');
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '存档超过 12 MB，请减少绘画图层或图片大小后重试。');
      chunks.push(chunk);
    }
    let parsed;
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'), (key, value) => {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('unsafe object key');
        return value;
      });
    } catch { throw new ApiError(400, 'INVALID_JSON', '提交的数据无法读取。'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ApiError(400, 'INVALID_JSON', '提交的数据格式不正确。');
    return parsed;
  }
  function validSnapshot(snapshot, required) {
    if (snapshot == null && !required) return;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new ApiError(400, 'INVALID_SNAPSHOT', '个人存档格式不正确。');
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store');
        if (req.method === 'GET' && pathname === '/api/health') { json(res, 200, {ok: true, version: options.version || 'development'}); return; }
        const session = store.session(token(req));
        if (req.method === 'GET' && pathname === '/api/session') { json(res, 200, session || {user: null, snapshot: null, revision: null}); return; }
        if (['POST', 'PUT'].includes(req.method)) {
          const input = await body(req);
          if (req.method === 'POST' && ['/api/register', '/api/login'].includes(pathname)) {
            limit(req);
            validSnapshot(input.snapshot, false);
            const result = pathname === '/api/register' ? await store.register(input.username, input.password, input.snapshot) : await store.login(input.username, input.password);
            store.revoke(token(req));
            cookie(res, result.token);
            const {token: unused, ...data} = result;
            json(res, pathname === '/api/register' ? 201 : 200, data); return;
          }
          if (pathname === '/api/logout' && req.method === 'POST') {
            if (session) expectedUser(req, session);
            store.revoke(token(req)); cookie(res); json(res, 200, {ok: true}); return;
          }
          if (pathname === '/api/snapshot' && req.method === 'PUT') {
            const userId = expectedUser(req, session);
            validSnapshot(input.snapshot, true);
            if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw new ApiError(400, 'INVALID_REVISION', '存档版本不正确，请重新载入。');
            json(res, 200, store.save(userId, input.revision, input.snapshot)); return;
          }
        }
        json(res, 404, {error: '接口不存在。', code: 'NOT_FOUND'}); return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      if (pathname === '/assets/runtime-config.js') {
        res.writeHead(200, {'Content-Type': MIME['.js'], 'Cache-Control': 'no-store'});
        res.end('window.CLAW_CONFIG = {cloud: true, apiBase: "/api"};'); return;
      }
      const local = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!['index.html', 'current_project.html'].includes(local) && !/^assets\//.test(local) || local.includes('\\') || local.includes('\0')) { res.writeHead(404); res.end(); return; }
      const file = path.resolve(root, local);
      const ext = path.extname(file).toLowerCase();
      const isEntry = [path.join(root, 'index.html'), path.join(root, 'current_project.html')].includes(file);
      if (!MIME[ext] || !isEntry && !file.startsWith(path.join(root, 'assets') + path.sep)) { res.writeHead(404); res.end(); return; }
      let real, stat;
      try { real = fs.realpathSync(file); stat = fs.statSync(real); }
      catch { res.writeHead(404); res.end(); return; }
      if (real !== file || !real.startsWith(root + path.sep) || !stat.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {'Content-Type': MIME[ext], 'Content-Length': stat.size, 'Cache-Control': ['.html', '.js', '.css'].includes(ext) ? 'no-cache' : 'public, max-age=86400'});
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(real).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      if (!(error instanceof ApiError)) console.error('Request failed:', error.code || error.name);
      json(res, error.status || 500, {error: error instanceof ApiError ? error.message : '服务器暂时无法处理请求，请稍后再试。', code: error.code && error instanceof ApiError ? error.code : 'SERVER_ERROR'});
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  let closed = false;
  return {server, store, async close() {
    if (closed) return;
    closed = true;
    if (server.listening) await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); });
    store.close();
  }};
}
module.exports = {createApp};
