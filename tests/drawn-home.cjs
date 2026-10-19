const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(path.join(runtime,'playwright'));
const {PNG}=require(path.join(runtime,'pngjs'));
function inkPixels(buffer){const p=PNG.sync.read(buffer);let n=0;for(let i=0;i<p.data.length;i+=4)if(p.data[i]>170&&p.data[i+1]<110&&p.data[i+2]>120)n++;return n;}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await artReady;await AccountManager.ready;});
  await page.evaluate(()=>{
   openDraw();clearDraw();const c=layers[0].ctx;
   // A valid freehand character can occupy a small corner of the drawing paper.
   c.fillStyle='#ee39c9';c.fillRect(12,18,32,40);c.fillStyle='#222';c.fillRect(20,27,3,3);c.fillRect(34,27,3,3);
   pendingParts={eye:{x:18,y:25,w:23,h:8}};$('draw-name').value='角落伙伴';saveDraw();
   layers[0].ctx.fillStyle='#222';layers[0].ctx.fillRect(20,29,4,2);layers[0].ctx.fillRect(34,29,4,2);saveDraw();
   layers[0].ctx.fillStyle='#222';layers[0].ctx.fillRect(20,27,4,2);layers[0].ctx.fillRect(34,27,4,2);saveDraw();
   go('home');focusing=true;setMadeHero(PETS.length+EXTRA_PETS.length);
  });
  await page.locator('#draw-sheet').waitFor({state:'hidden'});
  await page.waitForFunction(()=>{const frames=[...document.querySelectorAll('#home-sprite-wrap .da-frame')];return frames.length===3&&frames.every(i=>i.complete&&i.naturalWidth);});
  async function sample(selector,ms){
   await page.evaluate(({selector,ms})=>{const host=document.querySelector(selector);for(const a of host.getAnimations({subtree:true})){a.pause();a.currentTime=ms;}},{selector,ms});
   const clip=await page.locator(selector).boundingBox();
   return inkPixels(await page.screenshot({clip,animations:'allow'}));
  }
  const hero=await sample('#home-sprite-wrap .dressed',0);
  assert.ok(hero>3000,'a small off-centre drawing must remain clearly visible as a 110px home hero; coloured pixels='+hero);
  for(const ms of [3300,8300])assert.ok(await sample('#home-sprite-wrap .dressed',ms)>hero*.85,'blink/cute preserve the same visible body and placement');
  const idle=await page.evaluate(()=>{const el=document.querySelector('#home-sprite-wrap .da-drawing');const a=el.getAnimations()[0];a.pause();a.currentTime=1900;const m=new DOMMatrix(getComputedStyle(el).transform);return {angle:Math.atan2(m.b,m.a)*180/Math.PI,y:m.f};});
  assert.ok(Math.abs(idle.angle)>.1&&Math.abs(idle.angle)<1&&idle.y>=-1.2&&idle.y<0,'drawn idle is a slow, subtle body movement');
  await page.evaluate(()=>{delete DRAWN_PETS[0].frameBounds;AccountManager.persist();});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>DRAWN_PETS.length===1);
  await page.evaluate(()=>{go('home');focusing=true;PetInteractions.reset();curPet=0;homePicks=[PETS.length+EXTRA_PETS.length,1];renderHome();});
  // Use the runtime id so future built-in pet additions do not change this test.
  const selector=await page.evaluate(()=>'.cr[data-dog="'+(PETS.length+EXTRA_PETS.length)+'"] .dressed');
  await page.waitForFunction(selector=>!document.querySelector(selector+' [data-drawn-key]'),selector);
  await page.waitForFunction(selector=>{const frames=[...document.querySelectorAll(selector+' .da-frame')];return frames.length===3&&frames.every(i=>i.complete&&i.naturalWidth);},selector);
  const small=await sample(selector,0);assert.ok(small>750,'restored drawing remains visible as a 60px home companion; coloured pixels='+small);
  await page.evaluate(()=>{const drawn=crowdDogs.find(c=>getPet(c.dogIdx).kind==='drawn'),other=crowdDogs.find(c=>c!==drawn);window.drawnPair=[drawn,other];PetInteractions.configure({random:()=>.8});PetInteractions.encounter(drawn,other,$('pet-crowd'));});
  await page.waitForTimeout(350);
  assert.ok(await sample(selector,300)>small*.75,'drawing stays visible while approaching its companion');
  assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).animationName),'pet-meeting-step','drawings use the shared gentle walking animation');
  const proof=path.resolve(__dirname,'../docs/research/2026-10-18-drawn-home.png');fs.mkdirSync(path.dirname(proof),{recursive:true});await page.screenshot({path:proof});
  assert.deepEqual(errors,[]);
  console.log('PASS drawn home: small/off-centre art, 110px hero, full expression frames, refresh, 60px companion and shared gentle walking');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
