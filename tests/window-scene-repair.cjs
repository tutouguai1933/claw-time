const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let browser;
(async()=>{
 const root=path.resolve(__dirname,'..');
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'current_project.html')).href,{waitUntil:'domcontentloaded'});await page.evaluate(()=>AccountManager.ready);
 const source='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/scene-clean/room.png')).toString('base64');
 const result=await page.evaluate(async source=>{
  const state=HouseEditor.getSaved();state.enabled=false;state.replaced=[];state.decor=[];
  const im=new Image();im.src=source;await im.decode();const old=document.createElement('canvas');old.width=750;old.height=1400;old.getContext('2d').drawImage(im,0,0,750,1400);
  const before=old.getContext('2d').getImageData(0,0,750,1400).data,out=[];
  const boxes=[[384,390,45,100],[384,545,146,77],[384,693,146,80],[565,597,15,56]];
  for(let t=0;t<3;t++)for(let w=0;w<3;w++){
   const c=await HouseEditor.compose(state,t,w),q=c.getContext('2d'),d=q.getImageData(0,0,750,1400).data;
   const rgb=(x,y)=>[...q.getImageData(x,y,1,1).data].slice(0,3);
   const bars=[[400,450,435],[450,595,535],[450,746,535]].map(([x,y,sampleX])=>({actual:rgb(x,y),nearby:rgb(sampleX,y)}));
   const median=(x,y)=>[0,1,2].map(k=>{const v=[];for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-2;xx<=x+2;xx++)v.push(d[(yy*750+xx)*4+k]);v.sort((a,b)=>a-b);return v[12];});
   const cloud={edge:median(572,630),inside:median(558,660)};
   let shelfFragments=0;for(const [x,y,width,height]of boxes.slice(0,3))for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++){const i=(yy*750+xx)*4;if(d[i]-d[i+2]>18&&d[i+1]-d[i+2]>10)shelfFragments++;}
   let outside=0,inside=0;if(t===1&&w===0)for(let i=0;i<d.length;i+=4){if(d[i]===before[i]&&d[i+1]===before[i+1]&&d[i+2]===before[i+2]&&d[i+3]===before[i+3])continue;const x=i/4%750,y=Math.floor(i/3000);if(boxes.some(([a,b,width,height])=>x>=a&&x<a+width&&y>=b&&y<b+height))inside++;else outside++;}
   out.push({t,w,bars,cloud,outside,inside,shelfFragments});
  }
  return out;
 },source);
 for(const row of result){
  assert.equal(row.shelfFragments,0,`window ${row.t}/${row.w} must remove every material edge and snow-cap footprint of all three shelves`);
  assert.ok(row.cloud.edge.every((v,k)=>Math.abs(v-row.cloud.inside[k])<30),`window ${row.t}/${row.w} lower cloud corner has a continuous painted interior`);
 }
 const noon=result.find(r=>r.t===1&&r.w===0);assert.equal(noon.outside,0,'all source pixels outside the four glass repairs remain exact');assert.ok(noon.inside>2500,'the reported glass defects are actually repaired');
 const sofaGhosts=await page.evaluate(async()=>{const values=[];for(let t=0;t<3;t++)for(let w=0;w<3;w++){const s=HouseEditor.getSaved();s.enabled=true;s.replaced=['back','sofa'];s.decor=[];const c=await HouseEditor.backdrop(s,t,w),d=c.getContext('2d').getImageData(0,0,750,1400).data;let n=0;for(let y=735;y<815;y++)for(let x=606;x<730;x++){const i=(y*750+x)*4;if(d[i]-d[i+2]>20&&d[i+1]-d[i+2]>15)n++;}values.push({t,w,n});}return values;});for(const v of sofaGhosts)assert.equal(v.n,0,`window ${v.t}/${v.w} cannot restore the old green sofa into the cloud after replacement`);
 await page.evaluate(async()=>{go('home');setTime(1);setWeather(0);await HouseEditor.sync();openOverview();});
 assert.equal(await page.locator('#overview-bg').getAttribute('src'),await page.locator('#living-room-bg').getAttribute('src'),'overview uses the same repaired home scene');
 assert.deepEqual(errors,[]);
 if(process.env.QA_ARTIFACTS==='1'){
  await page.evaluate(()=>{dismissSheet($('overview'));go('home');});await page.waitForTimeout(220);await page.screenshot({path:path.join(root,'docs/research/2026-10-18-window-after-home.png')});
  const data=await page.evaluate(async()=>{const s=HouseEditor.getSaved();s.enabled=false;s.replaced=[];s.decor=[];const c=document.createElement('canvas');c.width=1125;c.height=2100;for(let t=0;t<3;t++)for(let w=0;w<3;w++)c.getContext('2d').drawImage(await HouseEditor.compose(s,t,w),w*375,t*700,375,700);return c.toDataURL();});fs.writeFileSync(path.join(root,'docs/research/2026-10-18-window-after-matrix.png'),Buffer.from(data.split(',')[1],'base64'));
 }
 await browser.close();console.log('PASS 九窗景清除三条玻璃内横杠、补齐云角，四处修复范围外像素零变化，首页与总览一致');
})().catch(async error=>{console.error(error);if(browser)await browser.close();process.exitCode=1;});
