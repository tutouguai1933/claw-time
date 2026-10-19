const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('server accounts: authentication, private snapshots, sessions, conflict protection and static boundary', async t => {
  const modulePath = path.resolve(__dirname, '../server/app.cjs');
  assert.ok(fs.existsSync(modulePath), 'server account implementation must exist');
  const {createApp} = require(modulePath);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-api-'));
  let app;
  let base;
  async function start() {
    app = createApp({root: path.resolve(__dirname, '..'), databasePath: path.join(dir, 'test.sqlite'), authLimit: 100});
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    base = 'http://127.0.0.1:' + app.server.address().port;
  }
  async function request(url, {method = 'GET', cookie = '', userId, body, headers = {}} = {}) {
    const response = await fetch(base + url, {
      method,
      headers: {Cookie: cookie, ...(method !== 'GET' ? {'Content-Type': 'application/json', 'X-Claw-Request': '1', Origin: base} : {}), ...(userId ? {'X-Claw-User': userId} : {}), ...headers},
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    return {status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], data: text ? JSON.parse(text) : null, headers: response.headers};
  }
  try {
    await start();
    let alice, bob;
    await t.test('anonymous and unauthorized requests', async () => {
      assert.equal((await request('/api/health')).data.ok, true);
      assert.equal((await request('/api/session')).data.user, null);
      assert.equal((await request('/api/snapshot', {method: 'PUT', body: {snapshot: {}, revision: 0}})).status, 401);
    });
    await t.test('registration validates names and password and never returns credentials', async () => {
      assert.equal((await request('/api/register', {method: 'POST', body: {username: 'a', password: '123'}})).status, 400);
      alice = await request('/api/register', {method: 'POST', body: {username: ' Alice ', password: 'test-password-123', snapshot: {version: 1, tasks: ['Alice only']}}});
      assert.equal(alice.status, 201);
      assert.equal(alice.data.user.username, 'Alice');
      assert.equal(alice.data.revision, 0);
      assert.match(alice.headers.get('set-cookie'), /HttpOnly/i);
      assert.match(alice.headers.get('set-cookie'), /SameSite=Lax/i);
      assert.ok(!JSON.stringify(alice.data).includes('password'));
      assert.equal((await request('/api/register', {method: 'POST', body: {username: 'ＡＬＩＣＥ', password: 'different-password'}})).status, 409);
      assert.equal((await request('/api/login', {method: 'POST', body: {username: 'Alice', password: 'wrong-password'}})).status, 401);
      assert.equal((await request('/api/login', {method: 'POST', body: {username: 'does-not-exist', password: 'wrong-password'}})).status, 401);
    });
    await t.test('login normalizes usernames and persists the saved snapshot', async () => {
      const login = await request('/api/login', {method: 'POST', body: {username: 'ALICE', password: 'test-password-123'}});
      assert.equal(login.status, 200);
      assert.deepEqual(login.data.snapshot.tasks, ['Alice only']);
      alice.cookie = login.cookie;
      assert.equal((await request('/api/session', {cookie: alice.cookie})).data.user.id, alice.data.user.id);
    });
    await t.test('independent users and compare-and-swap prevent lost updates', async () => {
      bob = await request('/api/register', {method: 'POST', body: {username: 'Bob', password: 'test-password-456'}});
      assert.equal(bob.data.snapshot, null);
      const saved = await request('/api/snapshot', {method: 'PUT', cookie: alice.cookie, userId: alice.data.user.id, body: {revision: 0, snapshot: {version: 1, tasks: ['new Alice']}}});
      assert.equal(saved.data.revision, 1);
      const stale = await request('/api/snapshot', {method: 'PUT', cookie: alice.cookie, userId: alice.data.user.id, body: {revision: 0, snapshot: {tasks: ['stale']}}});
      assert.equal(stale.status, 409);
      assert.equal(stale.data.code, 'PROFILE_CONFLICT');
      const wrongTab = await request('/api/snapshot', {method: 'PUT', cookie: bob.cookie, userId: alice.data.user.id, body: {revision: 0, snapshot: {tasks: ['Alice leaked']}}});
      assert.equal(wrongTab.status, 409);
      assert.equal(wrongTab.data.code, 'SESSION_CHANGED');
      assert.equal((await request('/api/session', {cookie: bob.cookie})).data.snapshot, null);
    });
    await t.test('cross-site and malformed writes are rejected', async () => {
      assert.equal((await request('/api/logout', {method: 'POST', cookie: alice.cookie, userId: alice.data.user.id, body: {}, headers: {Origin: 'https://evil.example'}})).status, 403);
      assert.equal((await request('/api/logout', {method: 'POST', body: {}, headers: {'X-Claw-Request': ''}})).status, 403);
      const invalid = await fetch(base + '/api/register', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Claw-Request': '1'}, body: '{broken'});
      assert.equal(invalid.status, 400);
      assert.equal((await request('/api/snapshot', {method: 'PUT', cookie: alice.cookie, userId: alice.data.user.id, body: {revision: 1, snapshot: []}})).status, 400);
    });
    await t.test('static service exposes only pages and public assets', async () => {
      for (const name of ['/.git/config', '/server/app.cjs', '/data/test.sqlite', '/docs/PROJECT_HANDOVER.md', '/assets/%2e%2e/server/app.cjs', '/assets/..%2fdocs/images/home.png', '/assets/..%2ftests/weather-time-baseline.json']) {
        const response = await fetch(base + name);
        assert.equal(response.status, 404, name);
      }
      assert.equal((await fetch(base + '/')).status, 200);
      assert.match(await (await fetch(base + '/assets/runtime-config.js')).text(), /cloud.*true/);
    });
    await t.test('database and hashed sessions survive process restart', async () => {
      await app.close();
      await start();
      const restored = await request('/api/session', {cookie: alice.cookie});
      assert.deepEqual(restored.data.snapshot.tasks, ['new Alice']);
      assert.equal(restored.data.revision, 1);
      assert.ok(!fs.readFileSync(path.join(dir, 'test.sqlite')).includes(Buffer.from('test-password-123')));
    });
    await t.test('logout revokes only the expected user session', async () => {
      const wrong = await request('/api/logout', {method: 'POST', cookie: bob.cookie, userId: alice.data.user.id, body: {}});
      assert.equal(wrong.status, 409);
      assert.equal((await request('/api/logout', {method: 'POST', cookie: alice.cookie, userId: alice.data.user.id, body: {}})).status, 200);
      assert.equal((await request('/api/session', {cookie: alice.cookie})).data.user, null);
      assert.equal((await request('/api/session', {cookie: bob.cookie})).data.user.username, 'Bob');
    });
  } finally {
    if (app) await app.close();
    assert.ok(dir.startsWith(path.join(os.tmpdir(), 'claw-api-')));
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
