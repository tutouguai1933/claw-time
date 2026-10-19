const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let browser;
(async () => {
 browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
 const page = await browser.newPage({viewport: {width: 390, height: 844}}), errors = [], failures = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(pathToFileURL(path.resolve(__dirname, '../current_project.html')).href, {waitUntil: 'domcontentloaded'});
 await page.evaluate(() => AccountManager.ready);
 const check = (value, message) => {if (!value) failures.push(message);};
 await page.evaluate(() => {go('mine'); renderMine(); TableShadow.select(1); go('focus'); layoutFocusWorld();});
 const girl = await page.evaluate(async () => {
  const layer = $('table-shadow'), shape = layer.querySelector('.table-shadow-shape'), icon = $('avatar-row').children[1].querySelector('svg path');
  const width = y => {let count = 0; for (let x = 400; x < 950; x++) {const point = layer.createSVGPoint(); point.x = x; point.y = y; if (shape.isPointInFill(point)) count++;} return count;};
  const blob = new Blob([new XMLSerializer().serializeToString(layer)], {type: 'image/svg+xml'}), url = URL.createObjectURL(blob), im = new Image();
  im.src = url; await im.decode(); const c = document.createElement('canvas'); c.width = 1344; c.height = 2912; const q = c.getContext('2d'); q.drawImage(im, 0, 0); URL.revokeObjectURL(url);
  let floorAlpha = 0; for (const [i, value] of q.getImageData(0, 2510, 1344, 402).data.entries()) if (i % 4 === 3) floorAlpha += value;
  return {head: width(2244), neck: width(2324), shoulder: width(2405), floorAlpha, matchingIcon: !!icon && icon.getAttribute('d') === shape.getAttribute('d')};
 });
 check(girl.head < 380, 'round short bob has no wide pigtail lobes');
 check(girl.neck < 70 && girl.shoulder > 210, 'short hair ends above a narrow visible neck and small shoulders');
 check(girl.matchingIcon, 'girl selection preview uses the same short-haired silhouette');
 check(girl.floorAlpha === 0, 'short-haired reflection remains clipped to the table');
 await page.evaluate(() => {go('focus'); layoutFocusWorld();});
 const display = () => page.locator('#focus-bubble').evaluate(el => getComputedStyle(el).display);
 check(await display() !== 'none', 'preparation keeps its greeting');
 await page.evaluate(() => toggleFocus());
 check(await display() === 'none', 'active focus hides the bottom speech bubble');
 await page.locator('#focus-stage').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))));
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 const controls=await page.locator('.focus-btns').evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.querySelector('.tabbar').getBoundingClientRect(),buttons=[...el.querySelectorAll('button')];return {bottom:r.bottom,navTop:nav.top,clickable:buttons.every(b=>{const q=b.getBoundingClientRect();return document.elementFromPoint(q.x+q.width/2,q.y+q.height/2)?.closest('button')===b;})};});
 check(controls.bottom<controls.navTop-8&&controls.clickable,'pause/end controls stay visible and clickable above the bottom navigation');
 await page.evaluate(() => togglePauseFocus());
 check(await display() === 'none', 'paused focus keeps the bottom speech bubble hidden');
 await page.evaluate(() => finishFocus());
 check(await display() !== 'none', 'ending focus restores the preparation/completion greeting');
 const nights = await page.evaluate(async () => {
  const state = HouseEditor.getSaved(); state.enabled = false; state.decor = [];
  const base = (await HouseEditor.compose(state, 1, 0)).getContext('2d').getImageData(0, 0, 750, 1400).data;
  const luma = (d, x, y) => {const i = (y * 750 + x) * 4; return d[i] * .2126 + d[i + 1] * .7152 + d[i + 2] * .0722;};
  const mean = (d, x, y, width, height, channel) => {let sum = 0; for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) sum += channel === undefined ? luma(d, xx, yy) : d[(yy * 750 + xx) * 4 + channel]; return sum / (width * height);};
  const edge = (d, x, y) => {let best = -1, at = 0; for (let o = -5; o <= 5; o++) {const v = Math.abs(luma(d, x + o, y) - luma(d, x + o + 1, y)); if (v > best) {best = v; at = o;}} return at;};
  const out = [];
  for (let weather = 0; weather < 3; weather++) {
   const canvas = await HouseEditor.compose(state, 2, weather), d = canvas.getContext('2d').getImageData(0, 0, 750, 1400).data;
   const beam = mean(d, 290, 1080, 230, 80), shade = mean(d, 55, 1190, 100, 80);
   const boundary = mean(d, 350, 1193, 100, 3) - mean(d, 350, 1201, 100, 3);
   // Pick actual green indoor material from the daylight raster, including the
   // three platform tips projecting into the window. Neither cool cloud paint
   // nor white rain/snow particles may be composited onto these solid surfaces.
   let materialPixels = 0, coolMaterialPixels = 0;
   for (const [left,top,width,height] of [[310,430,50,30],[305,580,60,20],[330,730,45,20]]) {
    for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) {
     const i = (y * 750 + x) * 4;
     if (base[i] > 180 && base[i + 1] > 170 && base[i + 1] - base[i + 2] > 20) {
      materialPixels++; if (d[i + 2] >= d[i + 1] - 10) coolMaterialPixels++;
     }
    }
   }
   let cloudMin = 255, cloudMax = 0;
   for (let y = 675; y < 705; y++) for (let x = 490; x < 540; x++) {
    const i = (y * 750 + x) * 4;
    if (base[i] > 249 && base[i + 1] > 249 && base[i + 2] > 247) {const value = luma(d, x, y); cloudMin = Math.min(cloudMin, value); cloudMax = Math.max(cloudMax, value);}
   }
   out.push({weather, beam, shade, boundary, materialPixels, coolMaterialPixels, cloudRange: cloudMax - cloudMin, warmth: mean(d, 290, 1080, 230, 80, 0) - mean(d, 290, 1080, 230, 80, 2), sky: mean(d, 640, 320, 80, 160), edges: [[170, 360], [156, 771], [297, 956], [572, 971]].every(([x,y]) => edge(base,x,y) === edge(d,x,y))});
  }
  return out;
 });
 const coveredLadder = await page.evaluate(async () => {
  const s = HouseEditor.getSaved(); s.enabled = true; s.replaced = ['back']; s.slots.back = 1; s.decor = [];
  const out = []; for (const time of [1, 2]) {
   const c = await HouseEditor.compose(s, time, 0), q = c.getContext('2d');
   out.push({time, ladder: [...q.getImageData(315, 904, 1, 1).data], seam: Math.abs(q.getImageData(523, 970, 1, 1).data[0] - q.getImageData(527, 970, 1, 1).data[0])});
  } return out;
 });
 for (const layer of coveredLadder) {
  check(layer.ladder[0] > (layer.time === 1 ? 210 : 120) && layer.ladder[1] > (layer.time === 1 ? 170 : 95), 'replacing the back stand removes old ladder fragments above the original cushion, time ' + layer.time);
  check(layer.seam < 10, 'back stand repair does not leave a rectangular color seam on the floor beside the cushion, time ' + layer.time);
 }
 for (const n of nights) {
  check(n.beam - n.shade > 38, `night ${n.weather} has directional indoor light (${(n.beam - n.shade).toFixed(1)})`);
  check(n.beam > 150 && n.warmth > 50 && n.boundary > 60, `night ${n.weather} keeps a warm floor beam with a crisp boundary (${n.beam.toFixed(1)}, boundary ${n.boundary.toFixed(1)})`);
  check(n.sky < 85 && n.edges, `night ${n.weather} preserves dark outdoor sky and furniture geometry`);
  check(n.materialPixels > 1000 && n.coolMaterialPixels === 0, `night ${n.weather} keeps clouds and weather particles off all three indoor platform tips (${n.coolMaterialPixels}/${n.materialPixels} polluted pixels)`);
  if (n.weather === 0) check(n.cloudRange < 10, 'original painted cloud interiors retain only subtle source texture: ' + n.cloudRange);
 }
 if (process.env.QA_ARTIFACTS === '1') {
  const matrix = await page.evaluate(async () => {const s = HouseEditor.getSaved(); s.enabled = false; s.decor = []; const c = document.createElement('canvas'); c.width = 2250; c.height = 1400; for (let w = 0; w < 3; w++) c.getContext('2d').drawImage(await HouseEditor.compose(s, 2, w), w * 750, 0); return c.toDataURL();});
  fs.writeFileSync(path.resolve(__dirname, '../docs/research/2026-10-18-local-night-beam.png'), Buffer.from(matrix.split(',')[1], 'base64'));
  await page.evaluate(() => {TableShadow.select(1); go('focus'); layoutFocusWorld(); document.querySelectorAll('.toast').forEach(el => el.remove());});
  await page.screenshot({path: path.resolve(__dirname, '../docs/research/2026-10-18-short-bob-table.png')});
 }
 console.log(JSON.stringify({girl, nights}));
 assert.deepEqual(errors, []); assert.deepEqual(failures, []);
 console.log('PASS 短发女孩与预览一致、影子只落在桌面，专注/暂停隐藏气泡，三种夜晚保留局部暖光与固定几何');
 await browser.close();
})().catch(async error => {console.error(error); if (browser) await browser.close(); process.exitCode = 1;});
