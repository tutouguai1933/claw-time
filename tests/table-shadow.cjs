const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'assets/table-shadow.js')), 'table reflection module exists');
assert.ok(fs.existsSync(path.join(root, 'assets/table-shadow.css')), 'table reflection styles exist');
(async () => {
 const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) {response.writeHead(403).end(); return;}
  try {response.setHeader('Content-Type', ({'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png'})[path.extname(file)] || 'application/octet-stream'); response.end(fs.readFileSync(file));}
  catch {response.writeHead(404).end();}
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
 try {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**', route => route.abort());
  async function boot() {
   await page.goto(`http://127.0.0.1:${server.address().port}/current_project.html`, {waitUntil: 'domcontentloaded'});
   await page.waitForFunction(() => window.AccountManager && AccountManager.ready);
   if (!await page.evaluate(() => !!window.TableShadow)) await page.addScriptTag({path: path.join(root, 'assets/table-shadow.js')});
   await page.addStyleTag({path: path.join(root, 'assets/table-shadow.css')});
   await page.evaluate(() => {$('focus-world').querySelector('.table-bg').src = 'assets/scene-clean/focus-table.png';});
  }
  await boot();
  await page.evaluate(() => {go('mine'); renderMine();});
  assert.equal(await page.locator('#avatar-row [role="button"]').count(), 6, 'all six base reflections can be selected');
  assert.equal(await page.locator('#avatar-row .locked').count(), 0, 'base reflection choices have no false locked state');
  const inventory = await page.evaluate(() => ({coins, role: [...ROLE_UNLOCK], extra: [...EXTRA_UNLOCK], owned: [...ownedOutfits]}));
  const silhouettes = new Set();
  for (let index = 0; index < 6; index++) {
   await page.locator('#avatar-row [role="button"]').nth(index).click();
   const selected = await page.evaluate(() => ({index: curShadow, layer: document.querySelector('#table-shadow').dataset.shadow, path: document.querySelector('#table-shadow .table-shadow-shape').getAttribute('d'), active: document.querySelector('#avatar-row .active').dataset.shadow, saved: JSON.parse(localStorage.getItem('qingpeiban.profiles.v1')).guest.curShadow}));
   assert.equal(selected.index, index); assert.equal(selected.layer, String(index)); assert.equal(selected.active, String(index)); assert.equal(selected.saved, index, 'reflection selection persists immediately');
   silhouettes.add(selected.path);
  }
  assert.equal(silhouettes.size, 6, 'six selections produce distinct silhouettes');
  await page.locator('#avatar-row [role="button"]').nth(0).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#table-shadow').getAttribute('data-shadow'), '0', 'base identities also support keyboard selection');
  assert.deepEqual(await page.evaluate(() => ({coins, role: [...ROLE_UNLOCK], extra: [...EXTRA_UNLOCK], owned: [...ownedOutfits]})), inventory, 'reflection choices leave coins, clothing and character rewards untouched');
  assert.equal(await page.evaluate(() => {const before = curShadow; return TableShadow.select(-1) === false && TableShadow.select(6) === false && curShadow === before;}), true, 'invalid choices are rejected');
  await page.evaluate(() => {curShadow = 2; renderFocusPet();});
  assert.equal(await page.locator('#table-shadow').getAttribute('data-shadow'), '2', 'companion rerender also synchronizes the current reflection');
  await page.evaluate(() => {const state = AppProfileBridge.getState(); state.curShadow = 3; AppProfileBridge.setState(state);});
  assert.equal(await page.locator('#table-shadow').getAttribute('data-shadow'), '3', 'profile snapshots redraw the reflection');
  await page.evaluate(() => {go('focus'); layoutFocusWorld();});
  const geometry = await page.evaluate(async () => {
   const layer = $('table-shadow'), world = $('focus-world'), shape = layer.querySelector('.table-shadow-shape');
   const css = getComputedStyle(layer), box = shape.getBBox();
   const clip = layer.querySelector('clipPath path');
   const inside = point => {const p = layer.createSVGPoint(); p.x = point[0]; p.y = point[1]; return clip.isPointInFill(p);};
   const image = new Image(), url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(layer)], {type: 'image/svg+xml'}));
   try {
    image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1344; canvas.height = 2912;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    let floorAlpha = 0; const pixels = ctx.getImageData(0, 2510, 1344, 402).data;
    for (let offset = 3; offset < pixels.length; offset += 4) floorAlpha += pixels[offset];
    return {count: world.querySelectorAll('#table-shadow').length, z: +css.zIndex, petZ: +getComputedStyle($('focus-pet')).zIndex, foodZ: +getComputedStyle($('food-plates')).zIndex, opacity: +css.opacity, blend: css.mixBlendMode, pointer: css.pointerEvents, box: {x: box.x, y: box.y, height: box.height}, headInTable: inside([690, 2100]), floorOutside: !inside([690, 2700]), floorAlpha, ratio: layer.getBoundingClientRect().height / world.getBoundingClientRect().height};
   } finally {URL.revokeObjectURL(url);}
  });
  assert.equal(geometry.count, 1); assert.equal(geometry.z, 1); assert.ok(geometry.petZ > geometry.z && geometry.foodZ > geometry.z, 'pets and meals remain above the reflection');
  assert.ok(geometry.opacity >= .14 && geometry.opacity <= .23); assert.equal(geometry.blend, 'multiply'); assert.equal(geometry.pointer, 'none');
  assert.ok(geometry.box.y >= 1960 && geometry.box.y + geometry.box.height > 2500, 'head stays below the three plates while the body enters from the near edge');
  assert.ok(geometry.headInTable && geometry.floorOutside); assert.equal(geometry.floorAlpha, 0, 'the rendered reflection has no pixels on the floor'); assert.equal(geometry.ratio, 1);
  await page.evaluate(() => {toggleFoodPick(); layoutFocusWorld();});
  assert.equal(await page.evaluate(() => {const a = $('table-shadow').getBoundingClientRect(), b = $('focus-world').getBoundingClientRect(); return Math.abs(a.width - b.width) < .1 && Math.abs(a.height - b.height) < .1;}), true, 'food-selection zoom keeps the reflection in the same world');
  await page.evaluate(() => {cancelFoodPick(); toggleFocus(); layoutFocusWorld();});
  assert.equal(await page.evaluate(() => {const a = $('table-shadow').getBoundingClientRect(), b = $('focus-world').getBoundingClientRect(); return focusing && Math.abs(a.width - b.width) < .1 && Math.abs(a.height - b.height) < .1 && $('table-shadow').dataset.shadow === String(curShadow);}), true, 'starting focus preserves the same table projection and scale');
  await page.evaluate(() => {finishFocus(); TableShadow.select(1);});
  await page.evaluate(() => AccountManager.register('影子甲', 'shadow-a-123'));
  await page.evaluate(() => TableShadow.select(4));
  await page.evaluate(() => AccountManager.register('影子乙', 'shadow-b-123'));
  await page.evaluate(() => TableShadow.select(5));
  await page.evaluate(() => AccountManager.login('影子甲', 'shadow-a-123'));
  assert.equal(await page.locator('#table-shadow').getAttribute('data-shadow'), '4', 'switching accounts restores its own shadow');
  await boot();
  assert.equal(await page.locator('#table-shadow').getAttribute('data-shadow'), '4', 'refresh restores the saved account shadow');
  await page.evaluate(() => AccountManager.login('影子乙', 'shadow-b-123'));
  assert.equal(await page.locator('#table-shadow').getAttribute('data-shadow'), '5');
  assert.deepEqual(errors, []);
  console.log('PASS table reflection: six distinct selectable shadows, soft table-only SVG, food/pet layering, zoom, immediate persistence and account/refresh synchronization');
 } finally {await browser.close(); await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
