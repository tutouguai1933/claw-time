const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createApp} = require('../server/app.cjs');
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

(async () => {
  const root = path.resolve(__dirname, '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-browser-'));
  const app = createApp({root, databasePath: path.join(dir, 'test.sqlite'), authLimit: 100});
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  const errors = [];
  async function boot(context) {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + '/current_project.html', {waitUntil: 'domcontentloaded'});
    assert.equal(await page.evaluate(() => AccountManager.ready), true);
    return page;
  }
  async function addTask(page, name) {
    assert.equal(await page.evaluate(name => {todayTasks.push({name, done: false}); return AccountManager.persist();}, name), true);
  }
  try {
    const first = await browser.newContext();
    const second = await browser.newContext();
    await first.route('https://**', route => route.abort());
    await second.route('https://**', route => route.abort());
    const a = await boot(first);
    assert.equal(await a.evaluate(() => AccountManager.cloud), true, 'HTTP service must activate real server accounts');
    await addTask(a, 'guest-private');
    const guestTasks = await a.evaluate(() => todayTasks.map(t => t.name));
    await a.evaluate(() => AccountManager.register('cloud-alice', 'cloud-password-123', false));
    assert.deepEqual(await a.evaluate(() => todayTasks), [], 'guest import must require explicit opt-in');
    await addTask(a, 'server-task');
    await a.evaluate(() => AccountManager.flush());
    console.log('PASS cloud registration, explicit guest import and successful snapshot upload');
    const b = await boot(second);
    await b.evaluate(() => AccountManager.login('cloud-alice', 'cloud-password-123'));
    assert.deepEqual(await b.evaluate(() => todayTasks.map(t => t.name)), ['server-task']);
    await b.reload({waitUntil: 'domcontentloaded'}); await b.evaluate(() => AccountManager.ready);
    assert.equal(await b.evaluate(() => AccountManager.activeUser.username), 'cloud-alice');
    console.log('PASS another browser loads the same account, refresh restores server session');

    await first.setOffline(true);
    await addTask(a, 'offline-task');
    await assert.rejects(() => a.evaluate(() => AccountManager.flush()));
    await first.setOffline(false);
    await a.reload({waitUntil: 'domcontentloaded'}); await a.evaluate(() => AccountManager.ready);
    await a.evaluate(() => AccountManager.flush());
    assert.deepEqual(await a.evaluate(() => todayTasks.map(t => t.name)), ['server-task', 'offline-task']);
    console.log('PASS offline changes survive reload and synchronize after reconnection');

    await addTask(b, 'stale-device');
    await assert.rejects(() => b.evaluate(() => AccountManager.flush()));
    assert.equal(await b.evaluate(() => AccountManager.syncStatus), 'conflict');
    assert.equal(await b.evaluate(() => AccountManager.persist()), false, 'blocked conflict must not report a successful save');
    await b.evaluate(() => AccountManager.reloadCloud());
    assert.deepEqual(await b.evaluate(() => todayTasks.map(t => t.name)), ['server-task', 'offline-task']);
    assert.ok(await b.evaluate(() => localStorage.getItem('claw-time.cloud.backup:' + AccountManager.activeUser.id)));
    console.log('PASS stale device cannot overwrite cloud data; reload retains a local backup');

    const tab = await boot(first);
    await tab.evaluate(() => AccountManager.register('cloud-bob', 'cloud-password-456', false));
    await addTask(a, 'must-not-leak-to-bob');
    await assert.rejects(() => a.evaluate(() => AccountManager.flush()));
    assert.equal(await a.evaluate(() => AccountManager.syncStatus), 'expired');
    assert.deepEqual(await tab.evaluate(() => todayTasks), []);
    console.log('PASS account switch in another tab cannot leak Alice state into Bob');
    await tab.evaluate(() => AccountManager.logout());
    await a.evaluate(() => AccountManager.login('cloud-alice', 'cloud-password-123'));
    await a.evaluate(() => AccountManager.flush());
    assert.equal(await a.evaluate(() => AccountManager.activeUser.username), 'cloud-alice');
    console.log('PASS expired sessions can log in again and recover pending edits');

    await a.evaluate(() => AccountManager.logout());
    assert.equal(await a.evaluate(() => AccountManager.activeUser), null);
    assert.deepEqual(await a.evaluate(() => todayTasks.map(t => t.name)), guestTasks);
    await a.evaluate(() => AccountManager.register('import-guest', 'cloud-password-789', true));
    assert.deepEqual(await a.evaluate(() => todayTasks.map(t => t.name)), guestTasks);
    console.log('PASS logout restores private guest state, opted-in registration imports it');
    await b.evaluate(() => { AppProfileBridge.setState = () => { throw new Error('simulated restore failure'); }; });
    await assert.rejects(() => b.evaluate(() => AccountManager.login('import-guest', 'cloud-password-789')));
    assert.equal(await b.evaluate(() => AccountManager.persist()), false, 'failed state restoration must block writes into the newly authenticated user');
    await b.reload({waitUntil: 'domcontentloaded'}); await b.evaluate(() => AccountManager.ready);
    assert.deepEqual(await b.evaluate(() => todayTasks.map(t => t.name)), guestTasks);
    console.log('PASS failed view restoration cannot save old account state into the new account');
    assert.deepEqual(errors, []);
    console.log('RESULT all cloud account browser checks passed');
  } finally {
    await browser.close(); await app.close();
    assert.ok(dir.startsWith(path.join(os.tmpdir(), 'claw-browser-')));
    fs.rmSync(dir, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
