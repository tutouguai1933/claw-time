const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded'});await page.evaluate(()=>AccountManager.ready);
 const results=await page.evaluate(async()=>{
  const state=HouseEditor.getSaved();state.enabled=false;state.decor=[];
  const data=[];for(let t=0;t<3;t++)for(let w=0;w<3;w++)data.push((await HouseEditor.compose(state,t,w)).getContext('2d').getImageData(0,0,750,1400).data);
  const canonical=data[3],luma=(d,x,y)=>(d[(y*750+x)*4]*.2126+d[(y*750+x)*4+1]*.7152+d[(y*750+x)*4+2]*.0722);
  // Find material edges in each tiny neighbourhood, independently of brightness.
  const landmarks=[[170,360,'x'],[156,771,'x'],[297,956,'x'],[572,971,'x'],[100,1107,'y']];
  const edge=(d,[x,y,axis])=>{let best=-1,at=0;for(let o=-5;o<=5;o++){const xx=x+(axis==='x'?o:0),yy=y+(axis==='y'?o:0),v=Math.abs(luma(d,xx,yy)-luma(d,xx+(axis==='x'?1:0),yy+(axis==='y'?1:0)));if(v>best){best=v;at=o;}}return at;};
  const shifted=[];data.forEach((d,i)=>landmarks.forEach((p,j)=>{if(edge(d,p)!==edge(canonical,p))shifted.push([i,j,edge(d,p),edge(canonical,p)]);}));
  const mean=(d,x,y,w,h)=>{let n=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)n+=luma(d,xx,yy);return n/(w*h);};
  const night=data.slice(6).map(d=>{let cloudSeams=0;for(let y=645;y<710;y++)for(let x=420;x<565;x++)if(Math.abs(luma(d,x,y)-luma(d,x+1,y))>65)cloudSeams++;return {furniture:mean(d,125,250,100,120),warm:mean(d,330,890,140,120),warmth:d[(980*750+430)*4]-d[(980*750+430)*4+2],sky:mean(d,640,320,80,160),cloudSeams};});
  return {shifted,night,api:typeof HouseEditor.light,unique:new Set(data.map(d=>Array.from(d.filter((_,i)=>i%23011===0)).join(','))).size};
 });
 assert.deepEqual(results.shifted,[],'time/weather must not shift crown, doors, cushion, sofa or floor edges');
 assert.equal(results.unique,9);assert.equal(results.api,'function');
 results.night.forEach(n=>{assert.ok(n.furniture>65,'night furniture remains readable');assert.ok(n.warm>110,'night keeps a lit warm resting area');assert.ok(n.warmth>20,'night highlights remain warm');assert.ok(n.sky<85,'night sky remains dark');});
 // Clear weather isolates cloud edges; intentional rain/snow particles create their own bright edges.
 assert.ok(results.night[0].cloudSeams<5,'soft night cloud edges must not contain threshold speckles or pale seams: '+results.night[0].cloudSeams);
 console.log('PASS 九种光照共用家具/地板几何，夜间家具可见且保留暖光与暗窗');
 const sources=[0,1,2].map(v=>'data:image/png;base64,'+fs.readFileSync(path.resolve(__dirname,'../assets/house-art/left-'+v+'.png')).toString('base64'));
 const shelves=await page.evaluate(async sources=>{
  const out=[];for(let v=0;v<3;v++){
   const s=HouseEditor.getSaved();s.enabled=true;s.replaced=['left'];s.decor=[];s.slots.left=v;
   const expected=document.createElement('canvas');expected.width=750;expected.height=1400;expected.getContext('2d').drawImage(await HouseEditor.backdrop(s,1,0),0,0);const im=new Image();im.src=sources[v];await im.decode();expected.getContext('2d').drawImage(im,0,560,270,462);
   const a=(await HouseEditor.compose(s,1,0)).getContext('2d').getImageData(0,0,750,1400).data,b=expected.getContext('2d').getImageData(0,0,750,1400).data;
   let shelf=0,outside=0;for(let y=0;y<1400;y++)for(let x=0;x<750;x++){const i=(y*750+x)*4;if(a.slice(i,i+3).some((c,k)=>Math.abs(c-b[i+k])>3)){if(x>=4&&x<=221&&y>=914&&y<=944)shelf++;else outside++;}}
   out.push({shelf,outside});
  }return out;
 },sources);
 shelves.forEach(s=>{assert.ok(s.shelf>1500,'all left stand variants need a usable lower platform');assert.equal(s.outside,0,'lower platform keeps existing furniture silhouette and ground footprint');});
 console.log('PASS 三款左猫架均增加原材质下层台面，原轮廓和脚底范围不变');
 await page.evaluate(async()=>{const s=HouseEditor.getSaved();s.enabled=true;s.replaced=['left'];s.decor=[{id:9,name:'暖橘抱枕',x:35,y:78,w:18,h:10}];HouseEditor.restore(s);await HouseEditor.sync();});
 const before=await page.evaluate(()=>HouseEditor.getSaved());
 await page.evaluate(async()=>{setTime(2);setWeather(1);await HouseEditor.sync();});
 assert.deepEqual(await page.evaluate(()=>HouseEditor.getSaved()),before);
 assert.ok((await page.locator('#living-room-bg').getAttribute('src')).startsWith('data:image/png'));
 await page.evaluate(()=>openOverview());assert.equal(await page.locator('#overview-bg').getAttribute('src'),await page.locator('#living-room-bg').getAttribute('src'));
 assert.deepEqual(errors,[]);console.log('PASS 切换光照保持单处款式与小物位置，首页/总览使用同一合成图');
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
