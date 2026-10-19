const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let browser;
(async()=>{
 const root=path.resolve(__dirname,'..'),checksums=JSON.parse(fs.readFileSync(path.join(root,'assets/scenes/original-checksums.json'),'utf8').replace(/^\uFEFF/,''));
 for(const [name,expected] of Object.entries(checksums))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/scenes',name))).digest('hex'),expected,name+' 原图被修改');
 console.log('PASS 十张原始场景保留，SHA256全部一致');
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));
 const check=async(name,fn)=>{try{await fn();console.log('PASS '+name);}catch(e){failures.push(name);console.log('FAIL '+name+': '+e.message);}};
 await page.goto(pathToFileURL(path.join(root,'current_project.html')).href,{waitUntil:'domcontentloaded'});await page.evaluate(()=>AccountManager.ready);await page.evaluate(()=>artReady);
 await page.evaluate(()=>{go('dress');setDressMode(0);});
 await check('进入小屋保留原型画面，不自动替换家具',async()=>assert.equal(await page.evaluate(()=>HouseEditor.getDraft().enabled),false));
 await check('小猫架与右侧沙发使用原图范围',async()=>{
  assert.equal(await page.getByRole('button',{name:'更换左侧猫爬架'}).evaluate(e=>e.style.width),'36%');
  assert.equal(await page.getByRole('button',{name:'更换右侧沙发'}).evaluate(e=>e.style.left),'73%');
  assert.equal(await page.getByRole('button',{name:'更换右侧沙发'}).evaluate(e=>e.style.width),'27%');
 });
 await check('中午晴天完整场景仅四处玻璃修复，保留无水印原图与固定原软垫',async()=>{
  const src='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/scene-clean/room.png')).toString('base64');
  assert.equal(await page.evaluate(async src=>{
   const s=HouseEditor.getSaved();s.enabled=false;s.decor=[];const actual=await HouseEditor.compose(s,1,0),expected=document.createElement('canvas');expected.width=750;expected.height=1400;
   const original=new Image();original.src=src;await original.decode();expected.getContext('2d').drawImage(original,0,0,750,1400);
   const a=actual.getContext('2d').getImageData(0,0,750,1400).data,b=expected.getContext('2d').getImageData(0,0,750,1400).data;return a.every((v,i)=>v===b[i]||[[384,390,45,100],[384,545,146,77],[384,693,146,80],[565,597,15,56]].some(([x,y,w,h])=>Math.floor(i/4)%750>=x&&Math.floor(i/4)%750<x+w&&Math.floor(i/3000)>=y&&Math.floor(i/3000)<y+h));
  },src),true);
 });
 await check('沙发只在右侧框内裁出侧面，不展示完整正面',async()=>{
  await page.getByRole('button',{name:'更换右侧沙发'}).click();await page.locator('.house-variant').first().click();
  assert.deepEqual(await page.evaluate(()=>HouseEditor.getDraft().replaced),['sofa']);
  const fit=await page.evaluate(()=>HouseEditor.getLayout('sofa'));
  assert.equal(fit.fit,'cover');assert.equal(fit.position,'0% 100%');
 });
 await check('仅换沙发保留其他三处原图，并可单独恢复',async()=>{
  const src='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/scene-clean/room.png')).toString('base64');
  const intact=await page.evaluate(async src=>{const s=HouseEditor.getDraft(),c=await HouseEditor.compose(s,1,0),im=new Image();im.src=src;await im.decode();const e=document.createElement('canvas');e.width=750;e.height=1400;e.getContext('2d').drawImage(im,0,0,750,1400);const a=c.getContext('2d').getImageData(0,0,500,1200).data,b=e.getContext('2d').getImageData(0,0,500,1200).data;return a.every((v,i)=>v===b[i]||[[384,390,45,100],[384,545,146,77],[384,693,146,80],[565,597,15,56]].some(([x,y,w,h])=>Math.floor(i/4)%500>=x&&Math.floor(i/4)%500<x+w&&Math.floor(i/2000)>=y&&Math.floor(i/2000)<y+h));},src);
  assert.equal(intact,true);
  const floor=await page.evaluate(async src=>{const s=HouseEditor.getDraft(),c=await HouseEditor.backdrop(s,1,0),im=new Image();im.src=src;await im.decode();const e=document.createElement('canvas');e.width=750;e.height=1400;e.getContext('2d').drawImage(im,0,0,750,1400);return [[560,1150],[600,1220],[720,1360]].map(([x,y])=>[...c.getContext('2d').getImageData(x,y,1,1).data].every((v,i)=>v===e.getContext('2d').getImageData(x,y,1,1).data[i]));},src);
  assert.deepEqual(floor,[true,true,true],'统一原型地毯斜边应完整延伸到沙发下面');
  await page.locator('#house-original-slot').click();assert.equal(await page.evaluate(()=>HouseEditor.getDraft().enabled),false);
  await page.locator('.house-variant').first().click();
 });
 await check('还原原型为草稿，确认后首页使用统一合成图并可刷新恢复',async()=>{
  await page.evaluate(()=>HouseEditor.confirm());const old=await page.locator('#living-room-bg').getAttribute('src');
  await page.locator('#house-original').click();assert.equal(await page.locator('#living-room-bg').getAttribute('src'),old);assert.equal(await page.evaluate(()=>HouseEditor.getDraft().enabled),false);
  await page.evaluate(()=>HouseEditor.confirm());assert.equal(await page.evaluate(()=>HouseEditor.getSaved().enabled),false);
  assert.equal(await page.locator('#living-room-bg').getAttribute('src'),await page.evaluate(async()=>(await HouseEditor.compose(HouseEditor.getSaved(),1,0)).toDataURL()));
  await page.reload({waitUntil:'domcontentloaded'});await page.evaluate(()=>AccountManager.ready);assert.equal(await page.evaluate(()=>HouseEditor.getSaved().enabled),false);
 });
 await check('无浏览器运行异常',async()=>assert.deepEqual(errors,[]));
 await browser.close();if(failures.length)throw new Error(failures.length+' 项原图一致性检查失败');console.log('RESULT original scene fidelity passed');
})().catch(async e=>{console.error(e.message);if(browser)await browser.close();process.exitCode=1;});
