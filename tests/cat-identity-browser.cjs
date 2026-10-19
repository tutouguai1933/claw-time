const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),dest=path.join(root,'assets/cats-v4');
const manifest=JSON.parse(fs.readFileSync(path.join(dest,'manifest.json')));
const sprites=manifest.map(v=>({...v,svgData:'data:image/svg+xml;base64,'+fs.readFileSync(path.join(dest,v.svg)).toString('base64'),pngData:'data:image/png;base64,'+fs.readFileSync(path.join(dest,v.png)).toString('base64')}));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--enable-gpu','--disable-software-rasterizer']});
 try{
  const cdp=await browser.newBrowserCDPSession();
  const info=await cdp.send('SystemInfo.getInfo');
  assert.ok(!/swiftshader|llvmpipe|software/i.test(info.gpu.auxAttributes.glRenderer||''),'real hardware renderer is required for this visual check');
  const page=await browser.newPage({viewport:{width:1728,height:936},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#fff9ee;font:16px sans-serif;color:#5b493c}header{height:48px;padding:14px 24px}main{display:grid;grid-template-columns:repeat(6,288px)}figure{margin:0;width:288px;height:296px;text-align:center;position:relative}img{display:block;width:288px;height:288px}figcaption{position:absolute;bottom:0;left:0;right:0;font-size:13px}</style><header>已确认第二版 · 六种固定轮廓 · 只切换内部表情</header><main></main>');
  const result=await page.evaluate(async sprites=>{
   const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
   const canvas=document.createElement('canvas');canvas.width=canvas.height=288;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const raster=img=>{ctx.clearRect(0,0,288,288);ctx.drawImage(img,0,0);return ctx.getImageData(0,0,288,288).data;};
   const bases=new Map(),report=[];
   for(const s of [...sprites].sort((a,b)=>a.expr-b.expr||a.pet-b.pet)){
    const [svg,png]=await Promise.all([load(s.svgData),load(s.pngData)]);
    const a=raster(svg),b=raster(png);
    if(!s.expr)bases.set(s.pet,a);
    const base=bases.get(s.pet);let outsideChanges=0,alphaChanges=0,rasterMismatch=0;
    for(let y=0;y<288;y++)for(let x=0;x<288;x++){
     const i=(y*288+x)*4;
     if(a[i+3]!==base[i+3])alphaChanges++;
     const outside=x<s.faceBounds[0]||x>=s.faceBounds[2]||y<s.faceBounds[1]||y>=s.faceBounds[3]||y>=s.bodyTop;
     for(let c=0;c<4;c++){
      if(outside&&a[i+c]!==base[i+c])outsideChanges++;
      if(Math.abs(a[i+c]-b[i+c])>2)rasterMismatch++;
     }
    }
    const figure=document.createElement('figure');
    figure.append(svg);const caption=document.createElement('figcaption');caption.textContent=s.name+' · 表情 '+(s.expr+1);figure.append(caption);document.querySelector('main').append(figure);
    report.push({pet:s.pet,expr:s.expr,outsideChanges,alphaChanges,rasterMismatch,width:svg.naturalWidth,height:svg.naturalHeight});
   }
   return report;
  },sprites);
  for(const row of result){
   assert.equal(row.width,288);assert.equal(row.height,288);
   assert.equal(row.outsideChanges,0,`cat-${row.pet}-${row.expr}: SVG keeps outer face/body pixels`);
   assert.equal(row.alphaChanges,0,`cat-${row.pet}-${row.expr}: SVG keeps exact silhouette`);
   assert.equal(row.rasterMismatch,0,`cat-${row.pet}-${row.expr}: real SVG render matches packed PNG`);
  }
  assert.deepEqual(errors,[]);
  const proof=path.join(root,'docs/research/2026-10-19-cat-v4-identity.png');
  fs.mkdirSync(path.dirname(proof),{recursive:true});await page.screenshot({path:proof,fullPage:true});
  console.log('PASS: 18 native SVGs on hardware Chrome; invariant outline/body; PNG composition matches SVG; screenshot '+proof);
  console.log('GPU: '+info.gpu.auxAttributes.glRenderer);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
