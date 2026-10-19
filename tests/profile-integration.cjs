const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('C:/Users/19332/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const bridgeSource = fs.readFileSync(path.join(root, 'assets/app-profile-bridge.js'), 'utf8');
(async () => {
  const server = http.createServer((request, response) => {
    const file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try { const bytes = fs.readFileSync(file); response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream'); response.end(bytes); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.abort());
    async function boot() {
      await page.goto(`http://127.0.0.1:${server.address().port}/current_project.html`, { waitUntil: 'domcontentloaded' });
      if (!await page.evaluate(() => !!window.AccountManager)) {
        for (const file of ['profile-store.js', 'account-ui.js']) await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'assets', file), 'utf8') });
      }
      if (!await page.evaluate(() => !!window.AppProfileBridge)) await page.addScriptTag({ content: bridgeSource });
      assert.equal(await page.evaluate(() => AccountManager.ready), true);
    }
    await boot();
    assert.equal(await page.evaluate(() => totalH), 0);
    assert.equal(await page.evaluate(() => genDaily(2026, 10).reduce((a,b) => a+b, 0)), 0);
    await page.evaluate(() => { todayTasks = [{ name: '游客任务', done: false }]; persistTasks(); });
    await page.evaluate(() => AccountManager.register('家人甲', 'family-a-123'));
    assert.equal(await page.locator('#my-login-days').textContent(), '1/30天');
    await page.evaluate(() => {
      todayTasks.push({ name: '甲任务', done: false }); persistTasks();
      plateFoodIdx = [1,2,0]; petOutfits = { 0: ['胡砸'] }; coins = 333; ROLE_AFF[0] = 99;
      CUSTOM_PETS.push({name:'甲角色',kind:'cat',custom:true,color:'#fff',face:0,acc:0,trait:0,breed:'测试'});
      homePicks = [0]; curTime = 2; curWeather = 1; AppProfileBridge.persist();
      $('task-input').value = '真实学习'; toggleFocus(); focusSec = focusLen * 60 - 179; finishFocus();
    });
    assert.equal(await page.evaluate(() => AppProfileBridge.getState().focusRecords.length), 0);
    await page.evaluate(() => { toggleFocus(); focusSec = focusLen * 60 - 181; finishFocus(); });
    assert.equal(await page.evaluate(() => AppProfileBridge.getState().focusRecords.length), 1);
    assert.equal(await page.evaluate(() => totalH), .05);
    await page.evaluate(() => {
      openDraw(); layers[0].ctx.fillStyle = '#ff0000'; layers[0].ctx.fillRect(0, 0, 10, 10); saveDrawState();
      $('draw-sheet').classList.remove('show');
    });
    await page.evaluate(() => AccountManager.register('家人乙', 'family-b-123'));
    assert.deepEqual(await page.evaluate(() => todayTasks), []);
    assert.deepEqual(await page.evaluate(() => plateFoodIdx), [0,0,0]);
    assert.equal(await page.evaluate(() => CUSTOM_PETS.length), 0);
    assert.equal(await page.evaluate(() => ROLE_AFF[0]), 0);
    assert.equal(await page.evaluate(() => totalH), 0);
    assert.equal(await page.evaluate(() => AppProfileBridge.getState().drawDraft), null);
    await page.evaluate(() => { todayTasks.push({name:'乙任务',done:false}); persistTasks(); });
    await page.evaluate(() => AccountManager.login('家人甲', 'family-a-123'));
    assert.equal(await page.evaluate(() => todayTasks[1].name), '甲任务');
    assert.deepEqual(await page.evaluate(() => plateFoodIdx), [1,2,0]);
    assert.deepEqual(await page.evaluate(() => petOutfits[0]), ['胡砸']);
    assert.equal(await page.evaluate(() => coins), 333);
    assert.equal(await page.evaluate(() => CUSTOM_PETS[0].name), '甲角色');
    assert.equal(await page.evaluate(() => curTime), 2);
    await page.evaluate(() => openDraw());
    await page.waitForFunction(() => layers[0].ctx.getImageData(2,2,1,1).data[0] === 255);
    await page.evaluate(() => $('draw-sheet').classList.remove('show'));
    await boot();
    assert.equal(await page.evaluate(() => AccountManager.activeUser.username), '家人甲');
    assert.equal(await page.locator('#my-login-days').textContent(), '1/30天');
    assert.equal(await page.evaluate(() => AppProfileBridge.getState().focusRecords[0].taskName), '真实学习');
    assert.equal(await page.evaluate(() => AppProfileBridge.getState().drawDraft.d.length), 3);
    assert.equal(await page.evaluate(() => genDaily(new Date().getFullYear(), new Date().getMonth()+1).reduce((a,b) => a+b, 0)), 3);
    await page.evaluate(() => AccountManager.logout());
    assert.equal(await page.evaluate(() => todayTasks[0].name), '游客任务');
    assert.equal(await page.evaluate(() => todayTasks.length), 1);
    assert.equal(await page.evaluate(() => AppProfileBridge.getState().focusRecords.length), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: real application snapshots isolate tasks, meals, outfits, characters, coins, affinity, preferences and real focus records; refresh and guest restore');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
