const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {createApp} = require('../server/app.cjs');
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

test('focus entry and emperor outfit render without temporary image hosts', async t => {
  const app = createApp({root: path.resolve(__dirname, '..'), databasePath: ':memory:'});
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = process.env.CLAW_IMAGE_TEST_ORIGIN || 'http://127.0.0.1:' + app.server.address().port;
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-proxy-server']});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    await page.route('https://**', route => route.abort());
    await page.goto(origin + '/current_project.html', {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => AccountManager.ready);
    await page.evaluate(() => artReady);
    const proof = path.resolve(__dirname, '../docs/research');
    if (process.env.CLAW_IMAGE_CAPTURE) fs.mkdirSync(proof, {recursive: true});
    async function loaded(locator, description) {
      const image = await locator.evaluate(async img => { await img.decode().catch(() => {}); return {src: img.src, width: img.naturalWidth}; });
      assert.ok(image.src.startsWith(origin + '/assets/'), description + ' must use a bundled image');
      assert.ok(image.width > 0, description + ' must decode successfully');
    }
    await t.test('home focus entry uses a working local image', async () => {
      await loaded(page.locator('.clock-btn img'), 'focus entry');
      const welcome = page.getByRole('button', {name: '收起签到栏', exact: true});
      if (await welcome.count()) await welcome.click();
      if (process.env.CLAW_IMAGE_CAPTURE) await page.locator('.clock-btn').screenshot({path: path.join(proof, '2026-10-23-focus-icon.png'), animations: 'disabled'});
      await page.locator('.clock-btn').click({force: true});
      assert.ok(await page.locator('#focus-set').evaluate(node => node.classList.contains('show')));
      await page.locator('#focus-set').evaluate(node => node.classList.remove('show'));
    });
    for (const name of ['俺是外星人', '圣诞袜', '左眼是为了…']) {
      await t.test(name + ' is bundled in both catalog and pet preview', async () => {
        await page.evaluate(name => {tempDress = [name]; renderPetDress();}, name);
        await loaded(page.locator('#outfit-wear .outfit-item').filter({has: page.locator('.of-name', {hasText: name})}).locator('img'), name);
        await loaded(page.locator('#pet-show [data-outfit-name="' + name + '"] img'), name + ' preview');
      });
    }
    await t.test('shop, wardrobe and worn emperor hat all resolve locally', async () => {
      await page.evaluate(() => {go('dress'); setDressMode(1);});
      const item = page.locator('#outfit-wear .outfit-item').filter({has: page.locator('.of-name', {hasText: '321跪'})});
      await loaded(item.locator('img'), 'wardrobe emperor hat');
      await page.evaluate(() => {tempDress = ['321跪']; renderPetDress();});
      await loaded(page.locator('#pet-show [data-outfit-name="321跪"] img'), 'worn emperor hat');
      if (process.env.CLAW_IMAGE_CAPTURE) await page.locator('#pet-show').screenshot({path: path.join(proof, '2026-10-23-emperor-preview.png')});
      await page.evaluate(() => renderFriends());
      await loaded(page.locator('#outfit-grid .outfit-item').filter({has: page.locator('.of-name', {hasText: '321跪'})}).locator('img'), 'shop emperor hat');
      assert.ok((await page.evaluate(() => OUTFITS.slice(0, 6).map(o => o.img))).every(src => src.startsWith('assets/') || src.startsWith('data:image/')), 'all legacy fallback sources must also be local');
    });
  } finally {await browser.close(); await app.close();}
});
