const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(4000);
 const failures=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const check=async(name,fn)=>{try{await fn();console.log('PASS '+name);}catch(e){failures.push(name);console.log('FAIL '+name+': '+e.message);}};
 await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded',timeout:20000});await page.evaluate(()=>artReady);await page.waitForTimeout(400);
 await check('初始背景与默认中午晴天原图仅四处玻璃修复，其他像素一致',async()=>{
  const expected='data:image/png;base64,'+fs.readFileSync(path.resolve(__dirname,'../assets/scene-clean/room.png')).toString('base64');
  const matches=await page.evaluate(async source=>{await HouseEditor.sync();const im=new Image();im.src=source;await im.decode();await $('living-room-bg').decode();const c=document.createElement('canvas');c.width=750;c.height=1400;const x=c.getContext('2d');x.drawImage(im,0,0,750,1400);const a=x.getImageData(0,0,750,1400).data;x.clearRect(0,0,750,1400);x.drawImage($('living-room-bg'),0,0,750,1400);const b=x.getImageData(0,0,750,1400).data;return curTime===1&&curWeather===0&&a.every((v,i)=>v===b[i]||[[384,390,45,100],[384,545,146,77],[384,693,146,80],[565,597,15,56]].some(([x,y,w,h])=>Math.floor(i/4)%750>=x&&Math.floor(i/4)%750<x+w&&Math.floor(i/3000)>=y&&Math.floor(i/3000)<y+h));},expected);
  assert.equal(matches,true);
 });
 await check('场景总览使用首页当前客厅背景',async()=>{
  await page.evaluate(()=>{go('buddies');openOverview();});
  assert.equal(await page.locator('#overview-bg').getAttribute('src'),await page.locator('#living-room-bg').getAttribute('src'));
 });
 await check('选场景与天气时间变化同步到总览',async()=>{
  for(const [scene,time,weather]of [[0,2,1],[0,0,2],[1,2,0]]){
   await page.evaluate(({scene,time,weather})=>{setTime(time);setWeather(weather);goScene(scene);openOverview();},{scene,time,weather});
   const result=await page.evaluate(()=>({src:$('overview-bg').getAttribute('src'),home:document.querySelectorAll('.scene-page img')[curScene].getAttribute('src'),filter:$('overview-bg').style.filter,homeFilter:document.querySelectorAll('.scene-page')[curScene].style.filter}));
   assert.equal(result.src,result.home);assert.equal(result.filter,result.homeFilter||'none');
  }
 });
 await check('关闭总览清理互动，不替换首页配角',async()=>{
  await page.evaluate(()=>{go('home');renderHome();});const ids=await page.evaluate(()=>crowdDogs.map(c=>c.el.parentElement.id));
  await page.evaluate(()=>{openOverview();dismissSheet($('overview'));});await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate(()=>crowdDogs.map(c=>c.el.parentElement.id)),ids);assert.equal(await page.evaluate(()=>ovTimer),null);
 });
 await check('首页实际滑动后，总览读取滑动选中的场景',async()=>{
  await page.evaluate(()=>{go('home');});await page.waitForTimeout(350);
  await page.locator('#scene-track').evaluate(el=>{el.scrollLeft=0;});await page.waitForTimeout(100);
  await page.locator('#scene-track').evaluate(el=>{el.scrollLeft=el.querySelector('.scene-page').offsetWidth;});await page.waitForFunction(()=>curScene===1);
  await page.evaluate(()=>{go('buddies');openOverview();});
  assert.ok((await page.locator('#overview-caption').textContent()).includes('过年门外'));
  await page.evaluate(()=>dismissSheet($('overview')));await page.waitForTimeout(250);
 });
 await page.evaluate(()=>document.querySelectorAll('.role-detail.show').forEach(e=>e.classList.remove('show')));
 await check('十二位伙伴顶部大头头像、下方全身原稿',async()=>{
  await page.evaluate(()=>{go('buddies');renderRoles();});
  assert.equal(await page.locator('#collect-faces .dog-portrait').count(),6);assert.equal(await page.locator('#role-grid .dog-art').count(),6);
  assert.equal(await page.locator('.collect-banner img').count(),0);
   assert.equal((await page.locator('.collect-banner').textContent()).includes('12'),true);assert.equal(await page.locator('#cat-grid .catalog-cat').count(),6);
  await page.locator('#role-grid .role-card').first().click();assert.equal(await page.locator('#role-sheet .dog-portrait').count(),1);
  await page.evaluate(()=>dismissSheet($('role-detail')));await page.waitForTimeout(250);
 });
 await check('胡子再下移一点，保持左右和大小参数',async()=>assert.deepEqual(await page.evaluate(()=>OUTFIT_POS['胡砸']),{h:{t:60,l:50,f:.55},b:{t:58,l:50,f:.52}}));
 await check('酷盖大头保留脸部，下缘不残留尾巴和身体',async()=>{
  let svg=await page.evaluate(()=>renderDogPortrait(4,200));
  const source=fs.readFileSync(path.resolve(__dirname,'../assets/pets-v2/dog-4-0.svg'),'utf8');
  svg=svg.replace('width="200" height="200"','width="252" height="201"').replace('href="assets/pets-v2/dog-4-0.svg"','href="data:image/svg+xml;base64,'+Buffer.from(source).toString('base64')+'"');
  const points=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=252;c.height=201;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return [[175,195],[220,190],[125,120]].map(([x,y])=>ctx.getImageData(x,y,1,1).data[3]);},'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'));
  assert.deepEqual(points.slice(0,2),[0,0]);assert.ok(points[2]>200);
 });
 await check('底栏使用有完整边距的圆润本地 SVG',async()=>{
  const sources=await page.locator('.tabbar img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));assert.equal(sources.length,5);
  for(const src of sources){
   assert.ok(src.startsWith('assets/nav/')&&src.endsWith('.svg'));const svg=fs.readFileSync(path.resolve(__dirname,'..',src),'utf8');assert.ok(svg.includes('stroke-linecap="round"')&&svg.includes('stroke-linejoin="round"'));assert.ok(!svg.includes('<image'));
   const bounds=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,32,32).data;let left=32,right=0,top=32,bottom=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(data[(y*32+x)*4+3]>5){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return {left,right,top,bottom};},'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'));
   assert.ok(bounds.left>=2&&bounds.top>=2&&bounds.right<=29&&bounds.bottom<=29,src+' needs paint padding');
  }
  for(const size of [{width:320,height:568},{width:390,height:844},{width:430,height:932}]){
   await page.setViewportSize(size);await page.waitForTimeout(100);const nav=await page.locator('.tabbar').boundingBox(),center=await page.locator('.main-btn').boundingBox();assert.ok(center.y<nav.y&&nav.y-center.y<24);
   for(const image of await page.locator('.tabbar img').all()){const box=await image.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=size.width&&box.y>=0&&box.y+box.height<=size.height);}
  }
 });
 await check('没有操作异常',async()=>assert.deepEqual(errors,[]));
 await browser.close();console.log('RESULT '+(failures.length?failures.length+' failed':'all passed'));if(failures.length)process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
