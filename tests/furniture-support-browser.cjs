const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href);await page.evaluate(()=>AccountManager.ready);await page.evaluate(()=>artReady);
  await page.evaluate(()=>{go('home');focusing=true;curPet=0;homeFixed=true;homePicks=[0,9,10,11];renderHome();});
  for(const variant of ['original',0,1,2]){
   await page.evaluate(async variant=>{HouseEditor.restore({enabled:variant!=='original',replaced:variant==='original'?[]:['left','sofa'],slots:{back:1,left:variant==='original'?1:variant,sofa:variant==='original'?0:variant},decor:[]});await HouseEditor.sync();renderHome();PetInteractions.reset();},variant);
   const positions=await page.evaluate(()=>crowdDogs.slice(0,2).map(c=>{
    const cr=$('pet-crowd').getBoundingClientRect(),r=c.el.querySelector('.dressed').getBoundingClientRect(),anchor=HouseEditor.getAnchors(c.homeSlot),expected=PetRoom.worldPoint($('pet-crowd'),{x:anchor.home.x/100,y:anchor.home.y/100},60,PetRoom.footOffset(c.dogIdx));
    return {slot:c.homeSlot,variant:anchor.variant,dx:Math.abs(r.left-cr.left-expected.x/100*cr.width),dy:Math.abs(r.top-cr.top-expected.y/100*cr.height),home:c.home,support:c.support};
   }));
   assert.deepEqual(positions.map(p=>p.slot),['left','sofa']);assert.ok(positions.every(p=>p.variant===variant));assert.ok(positions.every(p=>p.dx<1&&p.dy<1),'real sprite feet match each furniture support plane');
   await page.evaluate(()=>{focusing=false;PetRoom.configure({random:()=>.1});PetRoom.idle(crowdDogs[1]);});
   const step=await page.evaluate(()=>{const c=crowdDogs[1];return {dx:Number(c.el.style.transform.match(/translateX\(([-.\d]+)/)?.[1]||0),...c.support};});
   assert.ok(step.dx>=step.minDx-.01&&step.dx<=step.maxDx+.01,'seat walking stays inside the supporting surface');
   await page.evaluate(()=>{PetRoom.stopIdle(crowdDogs[1].el);focusing=true;});
   if(variant===2){await page.waitForFunction(()=>crowdDogs[1].el.querySelector('.dressed').style.maskImage.includes('data:image/png'));const proof=path.resolve(__dirname,'../docs/research/2026-10-19-furniture-support.png');fs.mkdirSync(path.dirname(proof),{recursive:true});await page.screenshot({path:proof});}
  }
  await page.evaluate(async()=>{const state=HouseEditor.getSaved();state.enabled=true;state.replaced=['back','left','sofa'];state.slots={back:2,left:1,sofa:2};state.decor=[{id:0,name:'毛线球',x:45,y:80,w:12,h:8}];HouseEditor.restore(state);await HouseEditor.sync();focusing=false;go('dress');setDressMode(0);});
  assert.equal(await page.locator('#house-expand').count(),0);assert.equal(await page.locator('.house-variant').count(),4);
  await page.getByRole('button',{name:'更换左侧猫爬架'}).click();const previous=await page.evaluate(()=>({saved:HouseEditor.getSaved(),time:curTime,weather:curWeather}));
  await page.locator('#house-original-slot').click();assert.ok(await page.evaluate(()=>HouseEditor.getSaved().replaced.includes('left')));assert.equal(await page.evaluate(()=>HouseEditor.getDraft().replaced.includes('left')),false);
  await page.evaluate(()=>HouseEditor.confirm());const confirmed=await page.evaluate(()=>({saved:HouseEditor.getSaved(),time:curTime,weather:curWeather}));
  assert.deepEqual(confirmed.saved.replaced,['back','sofa']);assert.deepEqual(confirmed.saved.decor,previous.saved.decor);assert.deepEqual(confirmed.saved.slots,previous.saved.slots);assert.equal(confirmed.time,previous.time);assert.equal(confirmed.weather,previous.weather);
  await page.evaluate(()=>{go('home');focusing=true;renderHome();PetInteractions.reset();});
  assert.equal(await page.evaluate(()=>HouseEditor.getAnchors('left').variant),'original');assert.equal(await page.evaluate(()=>HouseEditor.getAnchors('sofa').variant),2);
  assert.deepEqual(errors,[]);console.log('PASS real furniture supports for prototype and three variants, bounded seat steps, inline full scene and isolated prototype draft/confirmation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
