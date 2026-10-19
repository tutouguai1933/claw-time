const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(3500);
 const errors=[];const failures=[];page.on('pageerror',e=>errors.push(e.message));
 const check=async(name,fn)=>{try{await fn();console.log('PASS '+name);}catch(e){failures.push(name);console.log('FAIL '+name+': '+e.message);}};
 await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded',timeout:20000});await page.evaluate(()=>artReady);
 await check('只确认一个盘子就能保存，并保留其他盘子',async()=>{
  await page.evaluate(()=>{go('focus');toggleFoodPick();cycleFood(1);pickFoodFromSheet(2);confirmSheetPick();});
  assert.equal(await page.locator('#save-food-btn').isEnabled(),true);
  await page.locator('#save-food-btn').click();assert.deepEqual(await page.evaluate(()=>plateFoodIdx),[0,2,0]);
  await page.evaluate(()=>{toggleFoodPick();cycleFood(2);pickFoodFromSheet(3);confirmSheetPick();saveFoodPick();});
  assert.deepEqual(await page.evaluate(()=>plateFoodIdx),[0,2,3]);
 });
 await page.evaluate(()=>{if(foodPickOpen)cancelFoodPick();go('mine');});
 await page.locator('#new-task-input').fill('阅读第七章');await page.evaluate(()=>addTask());
 await check('点击专注任务框能选择我的自定义任务',async()=>{
  await page.evaluate(()=>go('focus'));await page.locator('#task-input').click();
  const menu=await page.locator('#focus-task-menu').boundingBox();const nav=await page.locator('.tabbar').boundingBox();assert.ok(menu.y>=0&&menu.y+menu.height<nav.y,JSON.stringify({menu,nav,input:await page.locator('#task-input').boundingBox()}));
  const option=page.locator('#focus-task-menu button').filter({hasText:'阅读第七章'});await option.click();
  assert.equal(await page.locator('#task-input').inputValue(),'阅读第七章');
  await page.locator('#focus-main-btn').click();assert.equal(await page.locator('#float-task').textContent(),'阅读第七章');await page.evaluate(()=>finishFocus());
 });
 await check('自定义任务刷新后仍可选择，输入也保留自由编辑',async()=>{
  await page.reload({waitUntil:'domcontentloaded',timeout:20000});await page.evaluate(()=>artReady);await page.evaluate(()=>go('focus'));await page.locator('#task-input').click();
  assert.equal(await page.locator('#focus-task-menu button').filter({hasText:'阅读第七章'}).count(),1);
  await page.locator('#task-input').fill('临时写报告');await page.locator('#focus-main-btn').click();
  assert.equal(await page.locator('#float-task').textContent(),'临时写报告');await page.evaluate(()=>finishFocus());
 });
 await check('胡子下移且图标大小保持',async()=>{assert.equal(await page.evaluate(()=>OUTFIT_POS['胡砸'].b.t>50&&OUTFIT_POS['胡砸'].h.t>52),true);});
 await check('修复后的十八个表情无裁耳，辣椒头尾间白底透明',async()=>{
  const fs=require('node:fs');const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/pets-v2/manifest.json'),'utf8'));assert.equal(manifest.length,18);
  for(const frame of manifest){
   const svg=fs.readFileSync(path.resolve(__dirname,'../assets/pets-v2/dog-'+frame.pet+'-'+frame.expr+'.svg'),'utf8');
   const stats=await page.evaluate(async({src,holes})=>{
    const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let minY=c.height;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>80)minY=Math.min(minY,y);
    return {minY,holes:holes.map(h=>{let count=0,total=0;for(let y=h.top;y<=h.bottom;y++)for(let x=h.left;x<=h.right;x++){const i=(y*c.width+x)*4;total++;if(data[i+3]<10)count++;}return count/total;})};
   },{src:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),holes:frame.holes});
   assert.ok(stats.minY>=6,'sprite '+frame.pet+'-'+frame.expr+' needs ear padding');
   if(frame.pet===3){assert.ok(frame.holes.length===1);assert.ok(stats.holes[0]>.30);}
  }
 });
 await check('没有操作异常',async()=>assert.deepEqual(errors,[]));
 await browser.close();console.log('RESULT '+(failures.length?failures.length+' failed':'all passed'));if(failures.length)process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
