const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
   openDraw();clearDraw();
   const c=layers[0].ctx;c.fillStyle='#fff';c.fillRect(0,0,280,280);
   c.fillStyle='#f5d9b2';c.strokeStyle='#5a3829';c.lineWidth=5;
   c.beginPath();c.ellipse(140,135,90,100,0,0,Math.PI*2);c.fill();c.stroke();
   c.fillStyle='#fff';c.fillRect(120,160,40,20);
   c.fillStyle='#28201a';for(const x of [100,170]){c.beginPath();c.arc(x,108,5,0,Math.PI*2);c.fill();}
   $('draw-name').value='坐标小狗';saveDraw();
  });
  const reference=await page.evaluate(()=>({width:$('draw-ref').width,height:$('draw-ref').height,dimmed:getComputedStyle(layers[0].el).opacity}));
  assert.deepEqual([reference.width,reference.height],[280,280],'reference uses the drawing coordinate space without default 300x150 distortion');
  assert.equal(reference.dimmed,'1','new expression strokes remain fully visible over the faint reference');
  await page.waitForFunction(()=>$('draw-ref').getContext('2d').getImageData(100,108,1,1).data[3]>0);
  await page.evaluate(()=>{
   const c=layers[0].ctx;c.strokeStyle='#28201a';c.lineWidth=3;
   for(const x of [100,170]){c.beginPath();c.moveTo(x-7,113);c.lineTo(x+7,113);c.stroke();}
   saveDraw();saveDrawState();
  });
  const frame=await page.evaluate(async()=>{
   const image=new Image();image.src=pendingDraw.blinkURL;await image.decode();
   const c=document.createElement('canvas');c.width=c.height=280;const x=c.getContext('2d');x.drawImage(image,0,0);
   const pixel=(a,b)=>Array.from(x.getImageData(a,b,1,1).data);
   return {oldPupil:pixel(100,105),closedEye:pixel(100,113),outside:pixel(0,0),whitePatch:pixel(140,170)};
  });
  assert.ok(frame.oldPupil[0]>180&&frame.oldPupil[3]===255,'closed frame replaces original pupils with the surrounding face');
  assert.ok(frame.closedEye[0]<80&&frame.closedEye[3]===255,'closed eye stays at the original 280-space coordinates');
  assert.equal(frame.outside[3],0,'only the exterior white paper is removed');
  assert.deepEqual(frame.whitePatch,[255,255,255,255],'enclosed white fur and highlights survive transparency cleanup');
  await page.evaluate(()=>{pendingDraw=null;initDraw();restoreDrawState();});
  await page.waitForFunction(()=>pendingDraw&&pendingDraw.step===3&&pendingDraw.out.getContext('2d').getImageData(140,135,1,1).data[3]>0);
  assert.ok(await page.evaluate(()=>!!pendingDraw.blinkURL),'step-three draft retains its already drawn blink frame');
  await page.evaluate(()=>{
   clearDraw();const c=layers[0].ctx;c.strokeStyle='#28201a';c.lineWidth=3;
   for(const x of [100,170]){c.beginPath();c.moveTo(x-6,106);c.lineTo(x,111);c.lineTo(x+6,106);c.stroke();}
   saveDraw();
  });
  const rendered=await page.evaluate(()=>{
   const pid=PETS.length+EXTRA_PETS.length;const root=document.createElement('div');root.innerHTML=renderPetArt(pid,140,true);
   const pet=DRAWN_PETS[0];return {html:root.innerHTML,frames:root.querySelectorAll('[data-drawn-frame]').length,parts:root.querySelectorAll('.da-part,.da-head').length,blink:pet.blinkURL,moe:pet.moeURL};
  });
  assert.equal(rendered.frames,3,'normal/blink/cute are synchronized full-frame replacements');
  assert.equal(rendered.parts,0,'original head is not painted a second time on top of expressions');
  assert.ok(rendered.blink&&rendered.moe);
  const cycle=await page.evaluate(()=>{
   const holder=document.createElement('div');holder.innerHTML=renderPetArt(PETS.length+EXTRA_PETS.length,140,true);document.body.appendChild(holder);
   const sample=ms=>{for(const animation of holder.getAnimations({subtree:true})){animation.pause();animation.currentTime=ms;}return {normal:getComputedStyle(holder.querySelector('.da-open')).visibility,blink:getComputedStyle(holder.querySelector('.da-closed')).visibility,rest:getComputedStyle(holder.querySelector('.da-rest')).opacity,cute:getComputedStyle(holder.querySelector('.da-cute')).visibility};};
   const result={blink:sample(3300),cute:sample(8300)};holder.remove();return result;
  });
  assert.deepEqual(cycle.blink,{normal:'hidden',blink:'visible',rest:'1',cute:'hidden'},'blink switches frames without a crossfade or doubled pupils');
  assert.equal(cycle.cute.rest,'0','cute frame hides the entire normal/blink group');
  assert.equal(cycle.cute.cute,'visible');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>DRAWN_PETS.length===1);
  assert.ok(await page.evaluate(()=>DRAWN_PETS[0].blinkURL&&DRAWN_PETS[0].moeURL),'completed expression frames survive an actual page refresh');
  await page.evaluate(()=>{
   const ink=document.createElement('canvas');ink.width=ink.height=280;const c=ink.getContext('2d');c.strokeStyle='#28201a';c.lineWidth=3;c.beginPath();c.moveTo(93,113);c.lineTo(107,113);c.stroke();
   const old={...DRAWN_PETS[0],expressionVersion:undefined,blinkURL:ink.toDataURL(),moeURL:null};
   const holder=document.createElement('div');holder.id='legacy-drawing';holder.innerHTML=DrawnExpressions.render(old,140);document.body.appendChild(holder);
  });
  const legacyBody=await page.evaluate(async()=>{
   for(let i=0;i<50;i++){
    const img=document.querySelector('#legacy-drawing [data-drawn-frame="blink"]');
    if(img){await img.decode();const c=document.createElement('canvas');c.width=c.height=280;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(140,135,1,1).data[3];}
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   return -1;
  });
  assert.equal(legacyBody,255,'legacy eye-only PNG is upgraded to a full replacement frame without making the body disappear');
  await page.evaluate(()=>openFace());
  assert.deepEqual(await page.locator('#face-kind button').allTextContents(),['猫','狗'],'new molded pets offer only cats and dogs');
  const molded=await page.evaluate(()=>{
   const host=document.createElement('div');host.innerHTML=customSVG({kind:'dog',color:'#F0B45A',face:1},96);
   const svg=host.querySelector('svg');return {outline:svg.querySelector('[stroke="#68432E"]')?.getAttribute('stroke-width'),highlights:svg.querySelectorAll('[fill="#fff"]').length,body:svg.querySelector('[data-custom-body]')?.getAttribute('ry'),head:svg.querySelector('[data-custom-head]')?.getAttribute('ry')};
  });
  assert.ok(Number(molded.outline)>=2.8,'molded pet uses the existing cartoon family thick brown outline');
  assert.ok(molded.highlights>=3,'molded eyes and fur include white highlights');
  assert.ok(Number(molded.head)>Number(molded.body),'molded pets have a round head and short body');
  assert.equal(await page.evaluate(()=>customSVG({kind:'fish',color:'#f0b45a',face:0},96)),'','retired fish are not rendered by legacy creation paths');
  assert.deepEqual(errors,[]);
  console.log('PASS drawn expression: undistorted reference, aligned replacement eyes, exterior transparency, internal white, draft restore, cat/dog creation and legacy rendering');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
