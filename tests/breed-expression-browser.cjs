const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:1728,height:1100},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'load'});await page.evaluate(()=>AccountManager.ready);await page.evaluate(()=>BreedCreator.ready);
 const results=await page.evaluate(async()=>{
  const failures=[],safeBounds=[[49,58,208,159],[59,75,208,179],[56,82,206,177],[36,86,197,193],[42,83,208,188],[48,66,209,167]];
  const check=(condition,message)=>{if(!condition)failures.push(message);};
  async function pixels(p,expr=0){
   const svg=BreedCreator.render(p,144,true,expr),img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();
   const c=document.createElement('canvas');c.width=c.height=144;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,144,144);return ctx.getImageData(0,0,144,144).data;
  }
  let coatsChecked=0,dailyChecked=0,posesChecked=0;
  for(const b of BreedCreator.catalog){
   const group=BreedCreator.catalog.filter(c=>c.kind===b.kind),posePixels=[];
   const neutral={...BreedCreator.create(b.id,0,b.id,''),coatSource:null,breedSource:null,trait:null},line=await pixels(neutral);
   let colored=0,white=0;for(let i=0;i<line.length;i+=4)if(line[i+3]>245){if(Math.max(line[i],line[i+1],line[i+2])-Math.min(line[i],line[i+1],line[i+2])>35)colored++;if(Math.min(line[i],line[i+1],line[i+2])>240)white++;}
   check(colored===0,'uncolored shape '+b.id+' has no colored fur/features');check(white>1000,'uncolored shape '+b.id+' has white interiors');
   for(let trait=0;trait<6;trait++){
    const p=BreedCreator.create(b.id,trait,b.id,''),base=await pixels(p);posePixels.push(base);
    const holder=document.createElement('div');holder.innerHTML=BreedCreator.render(p,144,true);const view=holder.firstChild.viewBox.baseVal,w=view.width,h=view.height,scale=144/Math.max(w,h),ox=(144-w*scale)/2,oy=(144-h*scale)/2,safe=b.id<6?safeBounds[b.id]:[67,94,220,205];
    for(const coat of group){const changed=await pixels(BreedCreator.create(b.id,trait,coat.id,''));let alpha=0;for(let i=3;i<base.length;i+=4)if(base[i]!==changed[i])alpha++;check(alpha===0,'shape '+b.id+' trait '+trait+' coat '+coat.id+' keeps identical alpha');coatsChecked++;}
    for(const expr of [1,2]){const changed=await pixels(p,expr);let outside=0;for(let y=0;y<144;y++)for(let x=0;x<144;x++){const lx=(x+.5-ox)/scale,ly=(y+.5-oy)/scale;if(lx>=safe[0]-2&&lx<=safe[2]+2&&ly>=safe[1]-2&&ly<=safe[3]+2)continue;const i=(y*144+x)*4;if(base[i]!==changed[i]||base[i+1]!==changed[i+1]||base[i+2]!==changed[i+2]||base[i+3]!==changed[i+3])outside++;}check(outside===0,'daily expression keeps body/ear/tail pose for shape '+b.id+' trait '+trait);dailyChecked++;}
   }
   for(let a=0;a<6;a++)for(let z=a+1;z<6;z++){let alpha=0;for(let i=3;i<posePixels[a].length;i+=4)if(posePixels[a][i]!==posePixels[z][i])alpha++;check(alpha>5,'shape '+b.id+' trait '+a+'/'+z+' has different actual ear/tail outline pixels');posesChecked++;}
  }
  return {failures,coatsChecked,dailyChecked,posesChecked};
 });
 assert.deepEqual(results.failures,[]);assert.equal(results.coatsChecked,432);assert.equal(results.dailyChecked,144);assert.equal(results.posesChecked,180);
 const out=path.resolve(__dirname,'../docs/research/breed-creator');fs.mkdirSync(out,{recursive:true});
 await page.evaluate(()=>{const proof=document.createElement('div');proof.id='breed-proof';proof.style.cssText='position:absolute;left:0;top:0;z-index:2147483647;display:grid;grid-template-columns:repeat(12,144px);width:1728px;background:#fff9ee;line-height:0';proof.innerHTML=Array.from({length:6},(_,trait)=>BreedCreator.catalog.map(b=>'<div style="width:144px;height:144px">'+BreedCreator.render(BreedCreator.create(b.id,trait,b.id,''),144,true)+'</div>').join('')).join('');document.body.append(proof);});
 await page.locator('#breed-proof').screenshot({path:path.join(out,'72-shape-personality-poses.png'),animations:'disabled'});await page.evaluate(()=>document.getElementById('breed-proof').remove());
 for(const width of [320,390]){await page.setViewportSize({width,height:844});await page.evaluate(()=>openFace());for(let stage=1;stage<=3;stage++){assert.equal(await page.locator('#face-sheet .sheet').evaluate(e=>e.scrollWidth>e.clientWidth),false,'stage '+stage+' fits '+width+'px');await page.screenshot({path:path.join(out,'creator-'+width+'-step-'+stage+'.png')});if(stage===1)await page.evaluate(()=>BreedCreator.next());if(stage===2)await page.evaluate(()=>{faceSet('trait',1);BreedCreator.next();});}}
 assert.deepEqual(errors,[]);console.log('PASS three-stage creation: 432 coat choices preserve alpha; 180 personality pose pairs differ; 144 daily-expression pairs keep body/ears/tails fixed; uncolored linework and mobile fit');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
