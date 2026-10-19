const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || runtime);
let browser;

(async () => {
 browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page = await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(5000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded',timeout:20000});
 await page.evaluate(()=>artReady);
 await page.waitForTimeout(400);
 const failures=[];
 async function check(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failures.push(name);console.log('FAIL '+name+': '+e.message);}}
 await check('所有元素 ID 唯一',async()=>assert.deepEqual(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);}),[]));
 await check('HTML 结束标签之后无按钮',()=>assert.ok(!fs.readFileSync(path.resolve(__dirname,'../current_project.html'),'utf8').split('</html>')[1].trim()));
 await page.evaluate(()=>go('focus'));
 await check('切换时长同步准备页倒计时与两处按钮',async()=>{
  try{await page.evaluate(()=>setFocusLen(15));assert.equal(await page.locator('#timer-num').textContent(),'15:00');assert.equal(await page.locator('#view-focus .chip[data-l="15"]').evaluate(e=>e.classList.contains('active')),true);}
  finally{await page.evaluate(()=>setFocusLen(25));}
 });
 await check('打开主角选择面板',async()=>{await page.locator('#btn-pet-pick').click();assert.equal(await page.locator('#companion-picker').isVisible(),true);});
 await check('主角面板从左侧展开，遮罩覆盖原场景按钮',async()=>{
  await page.waitForTimeout(300);const box=await page.locator('#companion-picker .sheet').boundingBox();
  assert.ok(Math.abs(box.x)<1&&box.width<390);
  const button=await page.locator('#btn-pet-pick').boundingBox();
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y).closest('#companion-picker')!==null,{x:button.x+button.width/2,y:button.y+button.height/2}),true);
 });
 await check('主角列表包含全部已拥有伙伴',async()=>assert.equal(await page.locator('#pick-grid .pick-item').count(),await page.evaluate(()=>allPets().filter((_,i)=>petUnlocked(i)).length)));
 await check('新增伙伴自动出现在主角列表并可切换',async()=>{
  await page.evaluate(()=>{CUSTOM_PETS.push({name:'测试新伙伴',kind:'cat',custom:true,breed:'捏脸宠物',trait:0,color:'#f0ce96',face:0,acc:0});openPetPick();});
  await page.locator('#pick-grid button').filter({hasText:'测试新伙伴'}).click();
  assert.equal(await page.evaluate(()=>getPet(curPet).name),'测试新伙伴');
  assert.equal(await page.locator('#focus-pet svg').count()>0,true);
  await page.waitForTimeout(250);
 });
 await check('新增画作保留已选捏脸伙伴、装扮及出场名单',async()=>{
  try{
   await page.evaluate(()=>{dressPet=curPet;petOutfits[dressPet]=['胡砸'];homePicks=[curPet];appliedPK=curPet;pendingDraw={name:'测试新画作',step:3,dataURL:ART_SOURCES.beard,parts:null};skipMoe();});
   assert.equal(await page.evaluate(()=>getPet(curPet).name),'测试新伙伴');
   assert.deepEqual(await page.evaluate(()=>petOutfits[dressPet]),['胡砸']);
   assert.equal(await page.evaluate(()=>getPet(homePicks[0]).name),'测试新伙伴');
   assert.equal(await page.evaluate(()=>getPet(appliedPK).name),'测试新伙伴');
   assert.equal(await page.evaluate(()=>petOutfits[PETS.length+EXTRA_PETS.length]),undefined);
  }finally{await page.evaluate(()=>{dressPet=0;tempDress=null;homePicks=null;appliedPK=0;});}
 });
 await check('选择已有主角同步到饭桌和首页',async()=>{
  await page.locator('#btn-pet-pick').click();await page.locator('#pick-grid button').filter({hasText:'奶糖'}).click();
  assert.equal(await page.evaluate(()=>curPet),1);
  assert.ok((await page.locator('#focus-pet img').first().getAttribute('src')).includes('dog-1-0.svg'));
  assert.ok((await page.locator('#home-petname').textContent()).includes('奶糖'));
  await page.waitForTimeout(250);
 });
 await page.evaluate(()=>document.querySelectorAll('.role-detail.show').forEach(e=>e.classList.remove('show')));
 await check('选菜弹层包含九种选项',async()=>{await page.locator('#btn-food-pick').click();await page.locator('#btn-food-0').click();assert.equal(await page.locator('#food-sheet .food-option').count(),9);});
 await check('灰色未拥有菜品只提示，不能选中',async()=>{
  const before=await page.evaluate(()=>tempPickIdx);
  // aria-disabled 表示不能选择，但仍须响应真实点击给出未拥有提示。
  const locked=await page.locator('.food-option[data-food="4"]').boundingBox();await page.mouse.click(locked.x+locked.width/2,locked.y+locked.height/2);
  assert.equal(await page.evaluate(()=>tempPickIdx),before);assert.ok((await page.locator('#toast').textContent()).includes('您暂时没有拥有'));
 });
 await check('选择菜品并确认会写入对应盘子',async()=>{await page.evaluate(()=>{pickFoodFromSheet(1);confirmSheetPick();});assert.equal(await page.evaluate(()=>document.getElementById('food-0').getAttribute('data-food')), '1');});
 await check('逐盘确认后指向下一个空盘，最终保存前不写正式数据',async()=>{
  assert.equal(await page.evaluate(()=>pickPlateIdx),1);assert.deepEqual(await page.evaluate(()=>plateFoodIdx),[0,0,0]);
  assert.equal(await page.locator('#save-food-btn').isEnabled(),true);
 });
 await check('取消菜单不会把临时选择写进盘子',async()=>{
  await page.locator('#btn-food-1').click();await page.locator('.food-option[data-food="2"]').click();await page.locator('#food-sheet header button').click();
  assert.equal(await page.evaluate(()=>draftFoodIdx[1]),0);
 });
 await check('每个盘子单独保存，三盘确认后允许最终保存',async()=>{
  for(const [plate,food]of [[1,2],[2,3]]){await page.locator('#btn-food-'+plate).click();await page.locator('.food-option[data-food="'+food+'"]').click();await page.locator('#food-sheet>.food-sheet>.btn').click();}
  assert.deepEqual(await page.evaluate(()=>draftFoodIdx),[1,2,3]);assert.equal(await page.locator('#save-food-btn').isEnabled(),true);
  await page.locator('#save-food-btn').click();assert.deepEqual(await page.evaluate(()=>plateFoodIdx),[1,2,3]);
  assert.equal(await page.evaluate(()=>foodPickOpen),false);
  assert.equal(await page.locator('.plate-food:visible').count(),3);
 });
 await check('缩小和放大使用同一饭桌坐标系',async()=>{
  for(const size of [{width:320,height:568},{width:430,height:932},{width:1280,height:800}]){
   await page.setViewportSize(size);await page.waitForTimeout(350);
   await page.evaluate(()=>toggleFoodPick());await page.waitForTimeout(100);
   const result=await page.evaluate(()=>{
    const world=$('focus-world').getBoundingClientRect();
    return [0,1,2].map(i=>{const image=$('food-'+i).getBoundingClientRect();return {x:(image.x+image.width/2-world.x)/world.width,y:(image.y+image.height/2-world.y)/world.height};});
   });
   const expected=[[.405,.533],[.25,.635],[.71,.616]];
   result.forEach((p,i)=>{assert.ok(Math.abs(p.x-expected[i][0])<.003);assert.ok(Math.abs(p.y-expected[i][1])<.003);});
   for(let i=0;i<3;i++){const button=await page.locator('#btn-food-'+i).boundingBox();assert.ok(button.y>=0&&button.y+button.height<=size.height);}
   await page.evaluate(()=>cancelFoodPick());
  }
  await page.setViewportSize({width:390,height:844});
 });
 await check('取消整次选菜恢复原菜品，空盘子可清空',async()=>{
  await page.evaluate(()=>{toggleFoodPick();cycleFood(0);pickFoodFromSheet(0);confirmSheetPick();cancelFoodPick();});
  assert.deepEqual(await page.evaluate(()=>plateFoodIdx),[1,2,3]);
  await page.evaluate(()=>{toggleFoodPick();cycleFood(0);pickFoodFromSheet(0);confirmSheetPick();cycleFood(1);confirmSheetPick();cycleFood(2);confirmSheetPick();saveFoodPick();});
  assert.deepEqual(await page.evaluate(()=>plateFoodIdx),[0,2,3]);assert.equal(await page.locator('#food-0').isVisible(),false);
 });
 await check('刷新保留已经最终确认的菜品',async()=>{
  await page.reload({waitUntil:'domcontentloaded',timeout:20000});await page.evaluate(()=>artReady);await page.evaluate(()=>go('focus'));await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(()=>plateFoodIdx),[0,2,3]);
 });
 await check('专注开始不偷走一秒，保留菜品并隐藏选择按钮',async()=>{
  await page.evaluate(()=>toggleFocus());assert.equal(await page.locator('#float-timer').textContent(),'25:00');
  assert.equal(await page.locator('#btn-pet-pick').isVisible(),false);assert.equal(await page.locator('.plate-food:visible').count(),2);
  await page.evaluate(()=>goBack());assert.equal(await page.evaluate(()=>focusing),true);assert.equal(await page.locator('#view-focus').isVisible(),true);
 });
 await check('暂停、结束后没有残留定时器，重启可正常计时',async()=>{
  await page.evaluate(()=>{togglePauseFocus();toggleFocus();});
  assert.deepEqual(await page.evaluate(()=>({paused,pauseTimer,focusTick})),{paused:false,pauseTimer:null,focusTick:null});
  await page.evaluate(()=>{toggleFocus();tick();});assert.equal(await page.locator('#float-timer').textContent(),'24:59');
  await page.evaluate(()=>{simulateLeave();returnHome();});
 });
 await check('自然结束会清理全屏并按实际分钟记入 PK',async()=>{
  await page.evaluate(()=>{pkState=1;pkMyMin=0;focusSec=1;tick();});
  assert.equal(await page.evaluate(()=>focusing),false);assert.equal(await page.evaluate(()=>pkMyMin),25);
  assert.equal(await page.locator('#focus-stage').evaluate(e=>e.classList.contains('focusing')),false);
  assert.equal(await page.locator('#btn-pet-pick').isVisible(),true);
 });
 await check('提前结束只累计实际专注分钟，不能记成计划时长',async()=>{
  await page.evaluate(()=>{toggleFocus();focusSec=25*60-4*60;toggleFocus();});
  assert.equal(await page.evaluate(()=>pkMyMin),29);
 });
 await check('设置音乐开关可反复切换',async()=>{
  await page.evaluate(()=>{openSettings();toggleMusic(false);toggleSound(false);toggleMusic(true);toggleMusic(false);});
  assert.equal(await page.locator('#set-music').isChecked(),false);assert.equal(await page.evaluate(()=>bgmAudio.paused),true);
    await page.getByRole('button',{name:'关闭设置',exact:true}).click();
 });
 await check('装扮确认两次不会清空穿戴',async()=>{
  await page.evaluate(()=>{go('dress');setDressMode(1);toggleWear(0);saveDress();saveDress();});
  assert.deepEqual(await page.evaluate(()=>petOutfits[dressPet]),['胡砸']);
 });
 await check('食物透明背景，胡子和口水巾保留内白，外部透明',async()=>{
  const stats=await page.evaluate(async()=>{
   const out={};for(const [key,src]of Object.entries(preparedArt)){
    const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;
    let white=0,transparent=0;for(let i=0;i<d.length;i+=4){if(d[i+3]===0)transparent++;if(d[i]>245&&d[i+1]>245&&d[i+2]>245&&d[i+3]>245)white++;}out[key]={corner:d[3],transparent,white};
   }return out;
  });
  for(const info of Object.values(stats)){assert.equal(info.corner,0);assert.ok(info.transparent>100);}
  for(const key of ['beard','bib'])assert.ok(stats[key].white>300,key+' should preserve white fill');
 });
 await check('首页恢复原排布与双击互动，没有新增互动按钮',async()=>{
  await page.evaluate(()=>go('home'));await page.waitForTimeout(400);
  assert.equal(await page.locator('.hero-zone .pet-actions').count(),0);
  assert.deepEqual(await page.evaluate(()=>SPOTS),[{x:16,y:50},{x:64,y:64},{x:32,y:84}]);
  await page.locator('#home-sprite-wrap').dblclick();await page.waitForTimeout(100);
  assert.ok(await page.locator('#home-bubble').evaluate(e=>e.classList.contains('show')));
  assert.equal(await page.locator('.pet-spark').count(),0);
 });
 await check('底部导航完整显示图标且中央闹钟略微突出',async()=>{
  const nav=await page.locator('.tabbar').boundingBox();const center=await page.locator('.main-btn').boundingBox();
  assert.ok(center.y<nav.y&&nav.y-center.y<24);
  for(const image of await page.locator('.tabbar img').all()){const box=await image.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390&&box.y>=0&&box.y+box.height<=844);}
 });
 await check('操作没有 JavaScript 异常',()=>assert.deepEqual(errors,[]));
 await browser.close();
 console.log('RESULT '+(failures.length?failures.length+' failed':'all passed'));
 if(failures.length)process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
