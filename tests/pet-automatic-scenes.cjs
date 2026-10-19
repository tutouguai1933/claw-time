const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href);await page.evaluate(()=>AccountManager.ready);await page.evaluate(()=>artReady);
  await page.evaluate(()=>{go('home');focusing=true;curPet=9;homePicks=[9,10,11];renderHome();PetInteractions.reset();PetInteractions.configure({random:()=>0});window.emotionActors=crowdDogs.slice(0,2);for(let i=0;i<7;i++){const r=PetInteractions.pair(...emotionActors,$('pet-crowd'));if(r?.kind==='bicker')break;}});
  assert.equal(await page.locator('#pet-crowd .pet-emotion-lines').count(),2,'both home animals get sparse emotion lines');
  assert.equal(await page.locator('#pet-crowd .pet-emotion-lines i').count(),6);
  assert.equal(await page.locator('.pet-emotion-lines').first().getAttribute('aria-hidden'),'true');
  const proof=path.resolve(__dirname,'../docs/research/2026-10-19-home-emotion-lines.png');fs.mkdirSync(path.dirname(proof),{recursive:true});await page.screenshot({path:proof});
  await page.waitForTimeout(1520);assert.equal(await page.locator('#pet-crowd .pet-emotion-lines').count(),0);
  await page.waitForTimeout(850);assert.equal(await page.evaluate(()=>emotionActors.every(c=>c.el.dataset.petMood==='reconcile')),true);
  await page.evaluate(()=>{focusing=false;PetInteractions.reset();openBuddy('friends');renderFriends();});
  assert.equal(await page.locator('.pk-play').count(),0);assert.equal(await page.locator('#pk-pet-stage').getAttribute('data-scene'),'idle');
  await page.evaluate(()=>PetPK.interact('bicker'));assert.equal(await page.locator('#pk-pet-stage .pet-emotion-lines').count(),2);
  assert.equal(await page.evaluate(()=>PetPK.interact('eat')),false,'current scene cannot be interrupted');
  await page.screenshot({path:path.resolve(__dirname,'../docs/research/2026-10-19-pk-emotion-lines.png')});
  await page.waitForTimeout(2650);assert.equal(await page.locator('#pk-pet-stage').getAttribute('data-scene'),'reconcile');
  assert.equal(await page.locator('#pk-pet-stage .pet-emotion-lines').count(),0);
  await page.waitForTimeout(3450);assert.equal(await page.locator('#pk-pet-stage').getAttribute('data-scene'),'idle');assert.ok((await page.locator('.pk-bubble').allTextContents()).every(s=>!s));
  await page.waitForFunction(()=>['play','eat'].includes($('pk-pet-stage').dataset.scene),null,{timeout:12000});
  assert.equal(await page.locator('.pk-animal').count(),2,'automatic next scene keeps both animals');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{renderFriends();PetPK.interact('bicker');});
  assert.equal(await page.locator('.pet-emotion-lines').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('.pk-animal-art').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>go('home'));assert.equal(await page.evaluate(()=>PetPK.isAnimating()),false);assert.equal(await page.locator('#pk-pet-stage .pet-emotion-lines').count(),0);
  await page.waitForTimeout(2700);assert.equal(await page.locator('#pk-pet-stage').getAttribute('data-scene'),'idle','old PK callbacks cannot revive after page switch');
  assert.deepEqual(errors,[]);console.log('PASS home and PK emotion strokes, reconciliation, automatic scenes, busy guard, reduced motion and page cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
