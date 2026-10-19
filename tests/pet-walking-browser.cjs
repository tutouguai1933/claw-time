const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
 const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
 try {
  const page = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'no-preference'});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../current_project.html')).href, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => artReady);
  assert.equal(await page.evaluate(() => typeof PetInteractions.encounter), 'function');
  const start = await page.evaluate(() => {
   go('home'); focusing = true; PetInteractions.reset(); curPet = 0; homePicks = [0, 6, 7, 8]; renderHome();
   if (!crowdDogs.every(c => c.dogIdx >= 6)) throw new Error('future species must participate as companions');
   const outfit = OUTFITS.find(o => OUTFIT_POS[o.name]).name;
   crowdDogs.slice(0, 2).forEach(c => {petOutfits[c.dogIdx] = [outfit]; c.el.querySelector('.dressed').outerHTML = petDressedExpr(c.dogIdx, 60, false, c.expr);});
   window.walkPair = crowdDogs.slice(0, 2);
   const before = walkPair.map(c => ({left: parseFloat(getComputedStyle(c.el).left), top: parseFloat(getComputedStyle(c.el).top), home: {...c.home}, outfits: c.el.querySelector('.dressed').children.length}));
   window.encounterEvents = [];
   PetInteractions.configure({random: () => .8, onEncounter: (a, b, session) => encounterEvents.push({ids: [a.dogIdx, b.dogIdx], destinations: session.destinations})});
   PetInteractions.encounter(...walkPair, $('pet-crowd'));
   return {before, destinations: walkPair.map(c => ({x: parseFloat(c.el.style.left), y: parseFloat(c.el.style.top)}))};
  });
  start.destinations.forEach((point, i) => {
   assert.ok(Math.abs(point.x - start.before[i].home.x) <= 12, 'approach stays close to its own home instead of exchanging sides');
   assert.ok(Math.abs(point.y - start.before[i].home.y) <= 6, 'approach has only a small vertical drift');
  });
  assert.ok(start.destinations[0].x < start.destinations[1].x, 'pets keep their horizontal order');
  assert.equal(await page.evaluate(() => encounterEvents.length), 1, 'toy integration receives one encounter event');
  await page.waitForTimeout(450);
  const during = await page.evaluate(() => walkPair.map(c => ({left: parseFloat(getComputedStyle(c.el).left), top: parseFloat(getComputedStyle(c.el).top), scale: getComputedStyle(c.el.querySelector('.dressed')).scale, bubble: getComputedStyle(c.el.querySelector('.cb')).scale, bob: parseFloat(getComputedStyle(c.el.querySelector('.dressed')).translate.split(' ')[1]), animation: getComputedStyle(c.el.querySelector('.dressed')).animationName})));
  assert.ok(during.every((p, i) => Math.abs(p.left - start.before[i].left) > 1 || Math.abs(p.top - start.before[i].top) > 1), 'both actually move in browser layout');
  assert.ok(during.every(p => !p.scale.includes('-1')), 'either walking direction can preserve the original image');
  assert.ok(during.every(p => !p.bubble.includes('-1')), 'text is never mirrored');
  assert.ok(during.every(p => p.animation === 'pet-meeting-step' && p.bob <= 0 && p.bob >= -3), 'walking has a slight vertical bob on the dressed sprite');
  await page.waitForTimeout(260);
  const nextBob = await page.evaluate(() => walkPair.map(c => parseFloat(getComputedStyle(c.el.querySelector('.dressed')).translate.split(' ')[1])));
  assert.ok(nextBob.some((value, i) => Math.abs(value - during[i].bob) > .15), 'vertical bob changes over time');
  await page.waitForTimeout(1660);
  const arrived = await page.evaluate(() => walkPair.map(c => ({talk: c.el.classList.contains('talk'), text: c.el.querySelector('.cb').textContent, outfits: c.el.querySelector('.dressed').children.length})));
  assert.ok(arrived.every(p => p.talk && p.text && Array.from(p.text).length <= 12), 'both pets exchange short lines after approaching');
  assert.notEqual(arrived[0].text, arrived[1].text);
  assert.deepEqual(arrived.map(p => p.outfits), start.before.map(p => p.outfits), 'costumes survive animation and expressions');
  const proof = path.resolve(__dirname, '../docs/research/2026-10-18-pet-meeting.png');
  fs.mkdirSync(path.dirname(proof), {recursive: true}); await page.screenshot({path: proof});
  await page.waitForTimeout(4400);
  const back = await page.evaluate(() => walkPair.map(c => ({left: c.el.style.left, top: c.el.style.top, busy: c.el.dataset.petEncounter, facing: c.el.dataset.petFacing, walking: c.el.dataset.petWalking, home: c.home})));
  back.forEach(p => {assert.equal(p.left, p.home.x + '%'); assert.equal(p.top, p.home.y + '%'); assert.equal(p.busy, undefined); assert.equal(p.facing, undefined); assert.equal(p.walking, undefined);});
  const orientations = await page.evaluate(() => {
   const results = [];
   for (let index = 0; index < 20; index++) {
    PetInteractions.reset(); PetInteractions.configure({random: () => index / 20});
    PetInteractions.encounter(...walkPair, $('pet-crowd'));
    results.push(walkPair.map(c => getComputedStyle(c.el.querySelector('.dressed')).scale));
   }
   PetInteractions.reset(); return results;
  });
  for (let index = 0; index < 2; index++) {
   const mirrored = orientations.filter(scales => scales[index].includes('-1')).length / orientations.length;
   assert.ok(mirrored >= .3 && mirrored <= .45, 'both leftward and rightward walks flip only occasionally');
  }
  await page.evaluate(() => {
   PetInteractions.configure({random: () => 0}); PetInteractions.encounter(...walkPair, $('pet-crowd')); PetInteractions.reset();
   window.resetMarkup = walkPair.map(c => ({left: c.el.style.left, top: c.el.style.top, text: c.el.querySelector('.cb').textContent, busy: c.el.dataset.petEncounter}));
  });
  await page.waitForTimeout(2200);
  assert.deepEqual(await page.evaluate(() => walkPair.map(c => ({left: c.el.style.left, top: c.el.style.top, text: c.el.querySelector('.cb').textContent, busy: c.el.dataset.petEncounter}))), await page.evaluate(() => resetMarkup), 'reset cancels pending arrival callbacks');
  await page.evaluate(() => {
   PetInteractions.reset(); PetInteractions.encounter(...walkPair, $('pet-crowd')); PetInteractions.reset();
   window.previousAccountPets = walkPair;
   curPet = 1; homePicks = [0, 1, 2, 3]; renderHome();
   crowdDogs.forEach(c => {c.el.querySelector('.cb').textContent = '新账号'; c.el.dataset.accountMarker = 'new';});
   window.newAccountMarkup = crowdDogs.map(c => c.el.outerHTML);
  });
  await page.waitForTimeout(6700);
  assert.deepEqual(await page.evaluate(() => crowdDogs.map(c => c.el.outerHTML)), await page.evaluate(() => newAccountMarkup), 'previous-account callbacks cannot change a newly rendered scene');
  assert.equal(await page.evaluate(() => previousAccountPets.every(c => !c.el.isConnected)), true);
  await page.emulateMedia({reducedMotion: 'reduce'});
  assert.equal(await page.evaluate(() => {PetInteractions.encounter(...crowdDogs.slice(0, 2), $('pet-crowd')); return crowdDogs.slice(0, 2).every(c => c.el.classList.contains('talk') && !c.el.dataset.petEncounter);}), true, 'reduced motion keeps two-person dialogue without walking');
  assert.ok(await page.evaluate(() => {PetInteractions.reset(); crowdDogs.forEach(c => {c.el.dataset.petMood = 'idle';}); crowdStep($('pet-crowd')); const count=crowdDogs.filter(c => c.el.classList.contains('talk')).length+($('home-sprite-wrap').dataset.petRoomPhase==='meeting'?1:0);return count>=2&&count<=3;}), 'periodic small-group selection, including hero visits, is not blocked by idle moods');
  assert.deepEqual(errors, []);
  console.log('PASS gentle walking encounter: local approach, occasional mirroring in both directions, live vertical bob, short voices, outfits, 6.5s return, reset/account isolation, future species and reduced motion');
 } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
