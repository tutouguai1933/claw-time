const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
 const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
 try {
  const page = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../current_project.html')).href, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => artReady);
  if (!await page.evaluate(() => !!window.PetInteractions)) await page.addScriptTag({path: path.resolve(__dirname, '../assets/pet-interactions.js')});
  await page.evaluate(() => {go('home'); renderHome(); todayTasks[1].done = false;});
  await page.locator('#home-sprite-wrap').dblclick();
  assert.equal(await page.evaluate(() => todayTasks[1].done), true, 'double click completes interaction task');
   const speech=await page.locator('#home-bubble').textContent();assert.ok(speech.length>0&&speech.length<=12,'main pet uses short original-style dialogue');
  const result = await page.evaluate(() => {
   todayTasks[1].done = false;
   const before = {pid: curPet, spots: crowdDogs.map(c => [c.el.style.left, c.el.style.top])};
   crowdStep($('pet-crowd'));
   return {before, after: {pid: curPet, spots: crowdDogs.map(c => [c.el.style.left, c.el.style.top])},
    lines: [...crowdDogs.filter(c => c.el.classList.contains('talk')).map(c => c.el.querySelector('.cb').textContent),...($('home-sprite-wrap').dataset.petRoomPhase==='meeting'?[$('home-bubble').textContent]:[])], task: todayTasks[1].done};
  });
  assert.deepEqual(result.before, result.after, 'pair keeps original slots and protagonist');
  assert.ok(result.lines.length>=2&&result.lines.length<=3, 'two or three nearby companions receive dialogue');
  assert.equal(result.task, false, 'ambient pair does not complete touch task');
  assert.notEqual(result.lines[0], result.lines[1]);
  const nav = await page.evaluate(() => ({border: getComputedStyle(document.querySelector('.tabbar')).borderTopWidth,
   shadow: getComputedStyle(document.querySelector('.main-btn')).boxShadow}));
  assert.equal(nav.border, '0px'); assert.equal(nav.shadow, 'none');
  assert.deepEqual(errors, []);
  console.log('PASS browser interaction: double click/task, two voices, fixed slots, clean nav, no errors');
 } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
