const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],padRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/house-art(?:\/|--)pad-/.test(r.url()))padRequests.push(r.url());});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded'});await page.evaluate(()=>AccountManager.ready);await page.evaluate(()=>artReady);
 const source='data:image/png;base64,'+fs.readFileSync(path.resolve(__dirname,'../assets/scene-clean/room.png')).toString('base64');
 assert.equal(await page.evaluate(async source=>{const im=new Image();im.src=source;await im.decode();const c=document.createElement('canvas');c.width=750;c.height=1400;c.getContext('2d').drawImage(im,0,0,750,1400);const actual=await HouseEditor.compose({enabled:false,replaced:[],slots:{back:1,left:1,sofa:0},decor:[]},1,0);const a=c.getContext('2d').getImageData(0,0,750,1400).data,b=actual.getContext('2d').getImageData(0,0,750,1400).data;return a.every((v,i)=>v===b[i]||[[384,390,45,100],[384,545,146,77],[384,693,146,80],[565,597,15,56]].some(([x,y,w,h])=>Math.floor(i/4)%750>=x&&Math.floor(i/4)%750<x+w&&Math.floor(i/3000)>=y&&Math.floor(i/3000)<y+h));},source),true,'default room must exactly preserve the original cushion and its position');
 await page.evaluate(()=>HouseEditor.restore({enabled:true,replaced:['pad'],slots:{back:2,left:0,sofa:1,pad:2},decor:[]}));const padOnly=await page.evaluate(()=>HouseEditor.getSaved());assert.equal(padOnly.enabled,false);assert.deepEqual(padOnly.replaced,[]);assert.deepEqual(Object.keys(padOnly.slots),['back','left','sofa']);
 await page.evaluate(()=>HouseEditor.restore({enabled:true,replaced:['left','pad'],slots:{back:2,left:0,sofa:1,pad:1},decor:[{name:'暖橘抱枕',x:82,y:90,w:18,h:10}]}));const mixed=await page.evaluate(()=>HouseEditor.getSaved());assert.deepEqual(mixed.replaced,['left']);assert.equal(mixed.slots.left,0);assert.equal(mixed.decor[0].name,'暖橘抱枕');
 await page.evaluate(()=>HouseEditor.restore({enabled:true,slots:{back:1,left:1,sofa:0,pad:1},decor:[]}));assert.deepEqual(await page.evaluate(()=>HouseEditor.getSaved().replaced),['back','left','sofa']);console.log('PASS 原场景逐像素保留；旧存档仅删除软垫替换，其他家具和装饰正常迁移');
 const result=await page.evaluate(async()=>{
  const state={enabled:false,replaced:[],slots:{back:1,left:1,sofa:0},decor:[]};let forbiddenDifferences=0,padDifferences=0;
  for(const [t,w] of [[0,1],[1,0],[2,2]]){
   const base=await HouseEditor.compose(state,t,w),expected=base.toDataURL();
   for(let v=0;v<3;v++){const c=await HouseEditor.compose({...state,enabled:true,replaced:['pad'],slots:{...state.slots,pad:v}},t,w);if(c.toDataURL()!==expected)forbiddenDifferences++;}
   const original=base.getContext('2d').getImageData(0,0,750,1400).data;
   for(let v=0;v<3;v++){
    const c=await HouseEditor.compose({...state,enabled:true,replaced:['back','left','sofa','pad'],slots:{back:v,left:v,sofa:v,pad:v}},t,w),actual=c.getContext('2d').getImageData(0,0,750,1400).data;
    for(const [x,y,width,height] of [[310,930,170,75],[365,908,50,20],[320,1025,130,20]])for(let py=y;py<y+height;py++)for(let px=x;px<x+width;px++){const i=(py*750+px)*4;for(let k=0;k<4;k++)if(actual[i+k]!==original[i+k])padDifferences++;}
   }
  }
  return {forbiddenDifferences,padDifferences};
 });assert.deepEqual(result,{forbiddenDifferences:0,padDifferences:0},'three weather conditions and all furniture variants keep the native cushion');
 await page.evaluate(()=>{setTime(1);setWeather(0);go('dress');setDressMode(0);});assert.equal(await page.locator('.house-zone').count(),3);assert.equal(await page.getByRole('button',{name:'更换前方软垫'}).count(),0);assert.equal(await page.evaluate(()=>HouseEditor.getLayout('pad')),null);
 await page.evaluate(()=>HouseEditor.restore({enabled:true,replaced:['pad'],slots:{pad:1},decor:[]}));await page.evaluate(()=>HouseEditor.confirm());assert.equal(await page.evaluate(()=>HouseEditor.getSaved().enabled),false);
 const exported=await page.evaluate(async()=>{const blob=await exportWallpaper(),bytes=new Uint8Array(await blob.arrayBuffer()),d=new DataView(bytes.buffer);return {width:d.getUint32(16),height:d.getUint32(20)};});assert.deepEqual(exported,{width:750,height:1400});assert.deepEqual(padRequests,[]);assert.deepEqual(errors,[]);console.log('PASS 仅三处家具可替换，软垫无入口/素材请求；天气、首页与PNG导出固定原垫');
 if(process.env.CUSHION_PREVIEW_DIR){fs.mkdirSync(process.env.CUSHION_PREVIEW_DIR,{recursive:true});await page.evaluate(()=>go('home'));await page.evaluate(()=>HouseEditor.sync());await page.screenshot({path:path.join(process.env.CUSHION_PREVIEW_DIR,'cushion-original-fixed-home.png')});}
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
