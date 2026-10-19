const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('C:/Users/19332/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const key = 'qingpeiban.profiles.v1';
(async () => {
  const server = http.createServer((request, response) => {
    const file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext();
    const errors = [];
    async function open() {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**', route => route.abort());
      await page.goto(`http://127.0.0.1:${server.address().port}/current_project.html`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.evaluate(() => AccountManager.ready), true);
      return page;
    }
    const first = await open();
    await first.evaluate(() => AccountManager.register('Alice', 'alice-secret'));
    const second = await open();
    await first.evaluate(async () => {
      await AccountManager.register('Bob', 'bob-secret');
      todayTasks = [{ name: 'Bob latest', done: false }]; persistTasks();
    });
    assert.equal(await second.evaluate(() => { todayTasks = [{ name: 'Alice stale', done: false }]; return AccountManager.persist(); }), false);
    let users = await first.evaluate(key => JSON.parse(localStorage.getItem(key)).users, key);
    assert.equal(users.length, 2, 'stale Alice page must preserve newly registered Bob');
    assert.deepEqual(users.find(user => user.username === 'Bob').snapshot.todayTasks, [{ name: 'Bob latest', done: false }]);
    assert.equal(await second.evaluate(() => AccountManager.activeUser.username), 'Alice', 'page identity remains fixed');
    assert.equal(await second.evaluate(() => todayTasks[0].name), 'Alice stale', 'unsaved page content remains available');
    assert.match(await second.locator('#account-card').innerText(), /其他页面|另一页面/);
    assert.match(await second.locator('#account-card').innerText(), /保留.*刷新/);
    await second.reload({waitUntil:'domcontentloaded'}); await second.evaluate(() => AccountManager.ready);
    await second.evaluate(() => AccountManager.login('Alice', 'alice-secret'));
    await first.evaluate(() => { todayTasks = [{ name: 'Bob stale', done: false }]; AccountManager.persist(); });
    assert.match(await first.locator('#account-card').innerText(), /其他页面|另一页面/);
    await second.evaluate(() => { todayTasks = [{ name: 'Alice newest', done: false }]; persistTasks(); });
    const third = await open();
    await second.evaluate(() => { todayTasks = [{ name: 'Alice even newer', done: false }]; persistTasks(); });
    assert.equal(await third.evaluate(() => { todayTasks = [{ name: 'overwrite', done: false }]; return AccountManager.persist(); }), false);
    users = await second.evaluate(key => JSON.parse(localStorage.getItem(key)).users, key);
    assert.equal(users.find(user => user.username === 'Alice').snapshot.todayTasks[0].name, 'Alice even newer');
    assert.equal(users.find(user => user.username === 'Bob').snapshot.todayTasks[0].name, 'Bob latest');
    // An Alice page opened before Charlie existed must authenticate against current storage.
    const freshAlice = await open();
    await second.evaluate(() => AccountManager.register('Charlie', 'charlie-secret'));
    const found = await freshAlice.evaluate(async () => {
      const store = new ProfileStore(); store.init(AppProfileBridge.getState());
      const oldName = store.user.username;
      const fourth = await store.credentials('Delta', 'delta-secret');
      // The cached store predates Delta's registration by the other store.
      window.cachedStore = new ProfileStore(); cachedStore.init(AppProfileBridge.getState());
      store.switchTo(fourth.id, store.snapshot, fourth, AppProfileBridge.createDefaultState());
      return { oldName, id: await cachedStore.authenticate('Delta', 'delta-secret'), expected: fourth.id, cachedName: cachedStore.user.username };
    });
    assert.equal(found.id, found.expected, 'authentication reads newly registered accounts');
    assert.equal(found.cachedName, found.oldName, 'authentication does not switch page identity');
    // Legacy version-1 databases have implicit revision zero and migrate on save.
    await freshAlice.evaluate(key => {
      const db = JSON.parse(localStorage.getItem(key)); delete db.guestRevision;
      db.users.forEach(user => delete user.snapshotRevision);
      localStorage.setItem(key, JSON.stringify(db));
      const store = new ProfileStore(); store.init(AppProfileBridge.getState());
      store.save(store.snapshot);
    }, key);
    assert.equal(await freshAlice.evaluate(key => { const db = JSON.parse(localStorage.getItem(key)); return db.users.find(user => user.id === db.activeId).snapshotRevision; }, key), 1);
    // A failed UI restore may revert the session, never the entire users database.
    await freshAlice.evaluate(async () => {
      let state = { tasks: ['rollback source'] }, fail = false;
      await AccountManager.init({ getState: () => state, createDefaultState: () => ({ tasks: [] }), setState: value => {
        if (fail) {
          fail = false;
          const db = JSON.parse(localStorage.getItem('qingpeiban.profiles.v1'));
          db.users.push({ ...db.users[0], id: 'during-restore', username: 'During restore', normalized: 'during restore', snapshot: { tasks: ['preserved'] }, snapshotRevision: 0 });
          localStorage.setItem('qingpeiban.profiles.v1', JSON.stringify(db));
          throw new Error('restore failed');
        }
        state = value;
      } });
      window.rollbackName = AccountManager.activeUser.username;
      fail = true;
      try { await AccountManager.login('Alice', 'alice-secret'); } catch {}
    });
    assert.equal(await freshAlice.evaluate(() => AccountManager.activeUser.username), await freshAlice.evaluate(() => rollbackName));
    assert.equal(await freshAlice.evaluate(key => JSON.parse(localStorage.getItem(key)).users.find(user => user.id === 'during-restore').snapshot.tasks[0], key), 'preserved');
    assert.equal(await freshAlice.evaluate(() => AccountManager.persist()), true, 'rolled-back session retains its saved revision');
    assert.deepEqual(errors, []);
    await context.close();
    // Visitor snapshots have the same conflict protection as registered accounts.
    const guests = await browser.newContext();
    const guestPages = [];
    for (let i = 0; i < 2; i++) {
      const page = await guests.newPage();
      await page.route('http://localhost/guest-test', route => route.fulfill({ contentType: 'text/html', body: '<div id="account-card"></div>' }));
      await page.goto('http://localhost/guest-test');
      for (const file of ['profile-store.js', 'account-ui.js']) await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'assets', file), 'utf8') });
      await page.evaluate(() => { window.state = { tasks: [] }; return AccountManager.init({ getState: () => state, setState: value => { state = value; }, createDefaultState: () => ({ tasks: [] }) }); });
      guestPages.push(page);
    }
    await guestPages[0].evaluate(() => { state.tasks = ['guest newest']; AccountManager.persist(); });
    assert.equal(await guestPages[1].evaluate(() => { state.tasks = ['guest stale']; return AccountManager.persist(); }), false);
    assert.deepEqual(await guestPages[1].evaluate(key => JSON.parse(localStorage.getItem(key)).guest.tasks, key), ['guest newest']);
    await guests.close();
    console.log('PASS: real Chrome multi-tab account preservation, fixed identity, revision conflicts, fresh authentication, legacy migration, session-only rollback and guest conflicts');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
