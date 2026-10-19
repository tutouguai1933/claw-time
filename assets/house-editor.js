/* Scene composition is shared by editor, home, overview and PNG export. */
(()=>{
 'use strict';
 const clone=o=>JSON.parse(JSON.stringify(o));
 const slots={back:{name:'后方猫爬架',box:[5,9,65,62]},left:{name:'左侧猫爬架',box:[0,40,36,33]},sofa:{name:'右侧沙发',box:[73,52,27,33]}};
 // Only these original furniture footprints may use the clean repair layer.
 // Everything outside them, including the lower-right rug, remains original.
 const repairBoxes=[[7,12,63,55],[0,40,36,33],[73,51,27,34]];
 const slotOrder=Object.keys(slots);
 const furnitureOrder=[...slotOrder,'pad'];
 const originalGroups={back:[[12,12,29,9],[18,20,24,47],[8,30,49,5.5],[39,41,31,4.5],[40,52,30,4.5],[26,39,18,33]],left:[[0,40.5,18,1.5],[2,42,3,10],[14,42,3,10],[0,50,25,12],[0,61,19,10],[20,60,16,13]],sofa:[[73,52,27,33]],pad:[[39,64,26,11]]};
 const changed=state=>state.enabled?(Array.isArray(state.replaced)&&state.replaced.length?slotOrder.filter(k=>state.replaced.includes(k)):slotOrder):[];
 const backdropCache=new Map();
 let floorMaskPromise;
 const names={back:['皇冠高台','拱桥双塔','叶片猫树'],left:['原木方屋','拱门小窝','尖顶小屋'],sofa:['懒人豆袋','云朵软垫','环抱软座']};
 const defaults=()=>({version:1,enabled:false,replaced:[],slots:{back:1,left:1,sofa:0},decor:[]});
 let saved=defaults(),draft=null,selected='back',revision=0,dirty=false,previewRevision=0,previewQueued=false;
 // Kept for older profile callers; the editor always uses its complete inline scene.
 function fullscreen(){document.body.classList.remove('house-fullscreen');return false;}
 const cache=new Map(),payloads=new Map();
 function rasterSource(src){if(location.protocol!=='file:'||!src.startsWith('assets/'))return Promise.resolve(src);if(!payloads.has(src))payloads.set(src,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/scene-cache/'+src.slice(7).replace('/','--')+'.js';script.onload=()=>{const data=window.HouseRasterSources?.[src];script.remove();data?resolve(data):reject(new Error('本地素材未准备好'));};script.onerror=()=>{payloads.delete(src);script.remove();reject(new Error('本地素材无法读取：'+src));};document.head.append(script);}));return payloads.get(src);}
 const image=src=>{if(!cache.has(src))cache.set(src,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{cache.delete(src);reject(new Error('素材暂时无法读取，请重试：'+src));};rasterSource(src).then(value=>im.src=value).catch(error=>{cache.delete(src);reject(error);});}));return cache.get(src);};
 const catalog=()=>DECOR.filter(d=>d.cat!==0&&d.name!=='小书架');
 const art=(key,v)=>'assets/house-art/'+key+'-'+v+'.png';
 // Furniture, frames and flooring always come from one canonical geometry.
 const background=()=> 'assets/scene-clean/room.png';
 // Exchange the rainy/snowy morning and noon artwork without changing the selected time.
 const visualTime=(t,w)=>w>0&&t<2?1-t:t;
 const light=(t,w)=>{t=visualTime(t,w);return t===2?'brightness(.73) saturate(.9) sepia(.12)':w===1?'brightness(.93) saturate(.9)':t===0?'brightness(.98) saturate(.95)':'none';};
 const lightingCache=new Map();
 // Only the three old shelf tips inside glass and the small cloud notch change.
 // Every weather reference and every furniture layout uses the same repair.
 const windowRepairBounds=[[384,390,45,100],[384,545,146,77],[384,693,146,80],[565,597,15,56]];
 let windowTemplate;
 async function repairWindows(c){
  if(!windowTemplate)windowTemplate=image('assets/window-repair/afternoon-source.png').then(im=>{const q=canvas();q.getContext('2d').drawImage(im,0,0,750,1400);return q.getContext('2d').getImageData(0,0,750,1400).data;});
  const template=await windowTemplate,ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,750,1400),d=pixels.data,original=new Uint8ClampedArray(d);
  windowRepairBounds.forEach(([x,y,w,h],box)=>{
   for(let yy=y;yy<y+h;yy++){
    // Median sky/cloud paint excludes rain streaks and single snowflakes;
    // copying one bright weather particle across a row creates another bar.
    const sampleX=box===0?438:544,median=[0,1,2].map(k=>{const values=[];for(let sx=sampleX-9;sx<=sampleX+19;sx++)values.push(original[(yy*750+sx)*4+k]);values.sort((a,b)=>a-b);return values[14];});
    for(let xx=x;xx<x+w;xx++){
    const i=(yy*750+xx)*4;
    if(box===3){
     // The generated repair supplies the rounded cloud edge, with the current
     // weather's original cloud colour instead of the sunny image's lighting.
     const progress=(yy-y)/h;if(xx<580-15*(1-Math.pow(1-progress,1.6)))continue;
     const sample=(680*750+560)*4;for(let k=0;k<3;k++)d[i+k]=original[sample+k];
    }else{
     const j=(yy*750+sampleX)*4;
     for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,median[k]+Math.max(-3,Math.min(3,template[i+k]-template[j+k]))));
    }
   }}
  });ctx.putImageData(pixels,0,0);return c;
 }
 let canonicalSky;
 async function paintWeatherWindows(target,t,w){
  if(!canonicalSky)canonicalSky=(async()=>{const c=canvas();c.getContext('2d').drawImage(await image(background()),0,0,750,1400);await repairWindows(c);return c.getContext('2d').getImageData(0,0,750,1400).data;})();
  const source=await canonicalSky,ctx=target.getContext('2d'),pixels=ctx.getImageData(0,0,750,1400),d=pixels.data;
  const sky=t===2?(w===1?[27,44,62]:[15,28,45]):w===1?[132,159,176]:w===2?[162,188,208]:[172,210,225];
  const cloud=t===2?(w===2?[142,157,174]:w===1?[88,106,123]:[49,65,83]):w===1?[187,203,212]:w===2?[239,243,245]:[255,252,242];
  // One fixed cloud drawing: only its paint and weather change across nine scenes.
  for(let y=75;y<816;y++)for(let x=384;x<738;x++){
   if(x>=580&&x<601)continue;const i=(y*750+x)*4,a=source[i]>242&&source[i+1]>242&&source[i+2]>242?1:0;
   for(let k=0;k<3;k++)d[i+k]=sky[k]*(1-a)+cloud[k]*a;
  }ctx.putImageData(pixels,0,0);ctx.save();ctx.beginPath();ctx.rect(384,75,196,741);ctx.rect(601,75,137,741);ctx.clip();
  let seed=9417;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(w===1){ctx.strokeStyle=t===2?'rgba(218,235,245,.38)':'rgba(240,249,255,.48)';ctx.lineWidth=1;ctx.lineCap='round';for(let i=0;i<145;i++){const x=380+random()*365,y=60+random()*770,len=20+random()*38;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-len*.48,y+len);ctx.stroke();}}
  if(w===2){ctx.fillStyle=t===2?'#ECF2F7':'#FFFFFF';for(let i=0;i<100;i++){const x=380+random()*365,y=70+random()*740;ctx.beginPath();ctx.ellipse(x,y,1.5+random()*3.5,1.2+random()*1.8,0,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.moveTo(380,791);ctx.bezierCurveTo(445,770,503,804,581,782);ctx.lineTo(581,820);ctx.lineTo(380,820);ctx.fill();ctx.beginPath();ctx.moveTo(600,797);ctx.bezierCurveTo(646,778,693,799,740,783);ctx.lineTo(740,820);ctx.lineTo(600,820);ctx.fill();}
  ctx.restore();
 }
 async function lighting(t,w){
  t=visualTime(t,w);
  const key=t+'-'+w;if(t===1&&w===0)return null;
  if(!lightingCache.has(key))lightingCache.set(key,(async()=>{
   const reference=canvas(),r=reference.getContext('2d');r.drawImage(await image('assets/scenes/original-room-'+t+'-'+w+'.png'),0,0,750,1400);
   if(w===2&&t!==1){
    // Some original snow variants put snow on the indoor climbing shelves.
    // Restore only the glass immediately above those three shelf tops; the
    // outdoor snow bank at the bottom of the window stays fully visible.
    const clean=r.getImageData(0,0,750,1400),p=clean.data;
    for(const [x,y,width,height,sampleX] of [[381,392,43,64,440],[382,548,143,58,535],[382,697,143,53,535]]){
     for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++){
      const i=(yy*750+xx)*4,j=(yy*750+sampleX)*4;
      // Clone neighbouring glass within the very same painted sky. This also
      // removes each cap's dark outline; another exposure would leave a seam.
      for(let k=0;k<3;k++)p[i+k]=p[j+k];
     }
    }
    r.putImageData(clean,0,0);
   }
   await paintWeatherWindows(reference,t,w);
   // The prototype uses sharply bounded warm planes, not blurry circles.
   // A floor beam follows that direction without copying its shifted furniture.
   const beam=canvas(),b=beam.getContext('2d');b.fillStyle='white';
   b.fill(new Path2D('M0 1080 L257 969 L552 969 L657 1198 L186 1198 L143 1168 L0 1168 Z'));
   const floor=b.getImageData(0,0,750,1400).data;b.clearRect(0,0,750,1400);
   // These planes follow the canonical platform tops and the right-facing
   // surfaces seen in the first night prototype. No color thresholds: texture
   // noise must never become a constellation of little light speckles.
   b.fill(new Path2D('M202 184 L241 225 L301 188 L301 246 L253 246 Z M246 296 L257 293 L257 420 L246 420 Z M380 420 L406 420 L420 453 L395 453 Z M246 506 L257 502 L257 898 L246 884 Z M359 505 L382 505 L382 579 L359 579 Z M315 579 L502 579 Q516 579 519 594 L303 594 Z M330 729 L502 729 Q517 729 519 744 L326 744 Z M552 837 Q569 830 587 837 L654 877 L654 918 L553 885 Z'));
   b.fill(new Path2D('M301 945 C298 920 342 904 391 904 C443 904 486 919 487 945 C487 963 443 975 391 975 C339 975 303 961 301 945 Z'));
   const base=canvas(),a=base.getContext('2d');a.drawImage(await image(background()),0,0,750,1400);
   return {reference:r.getImageData(0,0,750,1400).data,beam:floor,planes:b.getImageData(0,0,750,1400).data,base:a.getImageData(0,0,750,1400).data,time:t,weather:w};
  })().catch(error=>{lightingCache.delete(key);throw error;}));
  return lightingCache.get(key);
 }
 function illuminate(source,field,windowSky=false){
  if(!field)return source;
  const c=canvas(),ctx=c.getContext('2d');ctx.drawImage(source,0,0,750,1400);const pixels=ctx.getImageData(0,0,750,1400),d=pixels.data,night=field.time===2;
  const hasLampSurface=windowSky&&d[(65*750+500)*4+3]>0;
  const ambient=night?[.58,.57,.54]:field.time===0?[.98,.95,.9]:field.weather===1?[.91,.92,.91]:[.97,.97,.93],lit=[1.04,.99,.66];
  for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const x=(i/4)%750,y=Math.floor(i/3000),r=d[i],green=d[i+1],b=d[i+2];
   const pane=y>=75&&y<816&&((x>=384&&x<580)||(x>=601&&x<737));
   // Only blue glass and neutral-white clouds expose the original outdoor
   // painting. Yellow/green platform tips and the existing frame stay indoors.
   // Treat the painted glass as a complete flat layer. A fractional colour
   // threshold mixed daylight paper grain into the night sky like pale fog.
   const skyWeight=windowSky&&pane&&b>=r-25&&b>=green-22?1:0;
   // Original surface highlights apply only while those original pixels exist.
   // Replacing a stand must never leave its old bright platform shape on a wall.
   const original=Math.abs(r-field.base[i])+Math.abs(green-field.base[i+1])+Math.abs(b-field.base[i+2])<6;
   const beam=night?Math.max(field.beam[i+3],original?field.planes[i+3]:0)/255:0;
   for(let k=0;k<3;k++)d[i+k]=d[i+k]*(ambient[k]+(lit[k]-ambient[k])*beam)*(1-skyWeight)+field.reference[i+k]*skyWeight;
  }
  ctx.putImageData(pixels,0,0);
  if(night&&hasLampSurface){
   // A small light recessed in the existing upper frame makes the source
   // visible. Its crisp warm strip shares the prototype's painted edge style.
   ctx.fillStyle='#6d593d';ctx.fillRect(390,61,183,9);
   ctx.fillStyle='#ffe5a0';ctx.fillRect(393,64,177,4);
   ctx.fillStyle='#fff2c7';ctx.fillRect(394,64,175,1);
  }
  return c;
 }
 function normalize(state){const s=defaults();if(!state||typeof state!=='object')return s;s.replaced=changed(state);s.enabled=s.replaced.length>0;for(const k in slots)if(Number.isInteger(state.slots?.[k])&&state.slots[k]>=0&&state.slots[k]<3)s.slots[k]=state.slots[k];s.decor=(Array.isArray(state.decor)?state.decor:[]).slice(0,50).filter(p=>catalog().some(d=>d.name===p.name)).map((p,i)=>RoomDecor.normalize({...p,id:i}));return s;}
 function contain(ctx,im,box,W,H,anchor="center"){const [x,y,w,h]=box.map((v,i)=>v/100*(i%2?H:W));const scale=Math.min(w/im.width,h/im.height);ctx.drawImage(im,x+(w-im.width*scale)/2,y+(h-im.height*scale)*(anchor==="bottom"?1:.5),im.width*scale,im.height*scale);}
 const svgSrc=d=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'+d.svg+'</svg>');
 function canvas(){const c=document.createElement('canvas');c.width=750;c.height=1400;return c;}
 function originalFloorMask(){
  if(!floorMaskPromise)floorMaskPromise=(async()=>{
   const sample=canvas(),s=sample.getContext('2d');s.drawImage(await image(background()),0,0,750,1400);
   const data=s.getImageData(0,0,750,1400).data,seen=new Uint8Array(750*1400),queue=new Int32Array(750*1400),mask=canvas(),m=mask.getContext('2d'),out=m.createImageData(750,1400);
   let head=0,tail=0;const add=i=>{if(i<0||i>=seen.length||seen[i])return;seen[i]=1;const x=i%750,y=Math.floor(i/750),p=i*4;if(x<525||y<896||data[p]>=238||data[p+1]-data[p]<=6||data[p+1]-data[p+2]<=18)return;queue[tail++]=i;out.data[p]=out.data[p+1]=out.data[p+2]=out.data[p+3]=255;};
   add(750*1400-1);while(head<tail){const i=queue[head++],x=i%750;add(i-750);add(i+750);if(x)add(i-1);if(x<749)add(i+1);}m.putImageData(out,0,0);m.fillStyle='white';m.beginPath();m.moveTo(73*7.5,71*14);m.lineTo(88.5*7.5,84.5*14);m.lineTo(750,84.5*14);m.lineTo(750,1400);m.lineTo(73*7.5,1400);m.closePath();m.fill();return mask;
  })().catch(error=>{floorMaskPromise=null;throw error;});
  return floorMaskPromise;
 }
 function originalMask(key,selected){
  const c=canvas(),ctx=c.getContext('2d');ctx.fillStyle='white';
  if(key==='pad'){
   // The original cushion is fixed scenery; protect it from every replacement.
   ctx.strokeStyle='white';ctx.lineWidth=3;ctx.lineJoin='round';
   for(const d of ['M300 946 C296 920 340 903 391 903 C445 903 487 919 488 945 L490 981 C488 1008 442 1020 390 1020 C338 1020 298 1006 298 980 Z','M300 981 C280 1005 288 1033 322 1044 C370 1066 447 1070 486 1047 C505 1035 500 1008 481 995 L390 1018 Z']){const p=new Path2D(d);ctx.fill(p);ctx.stroke(p);}
  }else if(key==='left'){
   // The old broad ladder box also brought back a vertical strip of stale wall.
   for(const [x,y,w,h] of originalGroups.left.slice(0,5))ctx.fillRect(x*7.5,y*14,w*7.5,h*14);
   ctx.fill(new Path2D('M157 844 L166 838 L263 976 L253 983 Z M182 834 L193 830 L282 971 L272 978 Z M170 858 L201 850 L209 861 L178 870 Z M188 886 L220 877 L228 889 L196 899 Z M208 916 L240 906 L248 919 L216 929 Z M229 947 L260 936 L269 948 L237 960 Z'));
  }else if(key==='sofa'){
   // A rectangle also restored old sky/sofa pixels into the lower cloud.
   ctx.fill(new Path2D('M750 728 Q737 727 730 751 L660 729 Q651 725 648 737 L616 781 H572 Q550 781 550 802 V881 L648 1190 H750Z'));
  }else for(const [x,y,w,h] of originalGroups[key])ctx.fillRect(x*7.5,y*14,w*7.5,h*14);
  ctx.globalCompositeOperation='destination-out';
  if(key==='back')for(const [x,y,w,h]of windowRepairBounds.slice(0,3))ctx.fillRect(x,y,w,h);
  for(const front of selected.filter(k=>furnitureOrder.indexOf(k)>furnitureOrder.indexOf(key)))for(const [x,y,w,h] of originalGroups[front])ctx.fillRect(x*7.5,y*14,w*7.5,h*14);
  return c;
 }
 async function rawBackdrop(state){
  const selected=changed(state),key=selected.join(',');
  if(!selected.length){const c=canvas();c.getContext('2d').drawImage(await image(background()),0,0,750,1400);return repairWindows(c);}
  if(!backdropCache.has(key))backdropCache.set(key,(async()=>{
   const [original,clean]=await Promise.all([image(background()),image('assets/house-art/room-1-0.png')]);
   const c=canvas(),ctx=c.getContext('2d');ctx.drawImage(original,0,0,750,1400);
   const mask=canvas(),m=mask.getContext('2d');
   const path=()=>{m.beginPath();selected.forEach(k=>{const [x,y,width,height]=repairBoxes[slotOrder.indexOf(k)];m.rect(x*7.5,y*14,width*7.5,height*14);});};
   path();m.fillStyle='white';m.fill();
   const soft=canvas(),s=soft.getContext('2d');s.filter='blur(3px)';s.drawImage(mask,0,0);s.filter='none';s.globalCompositeOperation='destination-in';s.drawImage(mask,0,0);
   // The frame-edge portions of the old furniture must be removed completely.
   s.globalCompositeOperation='source-over';s.fillStyle='white';if(selected.includes('left'))s.fillRect(0,560,7,462);if(selected.includes('sofa'))s.fillRect(743,714,7,476);
   s.globalCompositeOperation='destination-out';for(const k of furnitureOrder.filter(k=>!selected.includes(k)))s.drawImage(originalMask(k,selected),0,0);
   // Preserve the original rug's full diagonal extension below the sofa, not a rectangle.
   s.drawImage(await originalFloorMask(),0,0);
   const repair=canvas(),r=repair.getContext('2d');r.drawImage(clean,0,0,750,1400);r.globalCompositeOperation='destination-in';r.drawImage(soft,0,0);ctx.drawImage(repair,0,0);
   return repairWindows(c);
  })().catch(error=>{backdropCache.delete(key);throw error;}));
  if(backdropCache.size>18)backdropCache.delete(backdropCache.keys().next().value);
  return backdropCache.get(key);
 }
 async function backdrop(state,t,w){return illuminate(await rawBackdrop(state),await lighting(t,w),true);}
 async function occlusion(key,rect,size){
  if(!slots[key])return null;
  const layer=canvas(),ctx=layer.getContext('2d'),layout=getLayout(key);
  const frontMask=()=>{const mask=canvas(),m=mask.getContext('2d');m.fillStyle='white';for(const [x,y,w,h] of layout.occluders||[])m.fillRect(x*7.5,y*14,w*7.5,h*14);m.save();m.scale(7.5,14);for(const path of layout.frontPaths||[])m.fill(new Path2D(path));m.restore();return mask;};
  if(changed(saved).includes(key)){drawSlot(ctx,await image(art(key,saved.slots[key])),key,saved.slots[key]);if(key==='sofa'){ctx.globalCompositeOperation='destination-in';ctx.drawImage(frontMask(),0,0);}}
  else{
   ctx.drawImage(await image(background()),0,0,750,1400);ctx.globalCompositeOperation='destination-in';
   ctx.drawImage(frontMask(),0,0);
  }
  const out=document.createElement('canvas');out.width=out.height=size;const p=out.getContext('2d');p.fillStyle='white';p.fillRect(0,0,size,size);p.globalCompositeOperation='destination-out';
  p.drawImage(layer,rect.x*750,rect.y*1400,rect.w*750,rect.h*1400,0,0,size,size);
  const pixels=p.getImageData(0,0,size,size).data;let covered=false;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<255){covered=true;break;}
  return covered?out.toDataURL():null;
 }
 function drawSlot(ctx,im,key,variant=0){
  if(key==='left'){const [x,y,w,h]=slots[key].box,X=x*7.5,Y=y*14,W=w*7.5,H=h*14;
   // Reuse the existing wood platform's pixels; legs and ladder stay in front.
   const strip=[[.425,.052],[.37,.06],[.45,.05]][variant];
   ctx.drawImage(im,im.width*.02,im.height*strip[0],im.width*.79,im.height*strip[1],X+W*.02,Y+H*.77,W*.79,H*.055);
   ctx.drawImage(im,X,Y,W,H);return;}
  const box=slots[key].box;if(key!=='sofa'){contain(ctx,im,box,750,1400,key==='back'?'center':'bottom');return;}
  const [x,y,w,h]=box.map((v,i)=>v*(i%2?14:7.5)),scale=Math.max(w/im.width,h/im.height);
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(im,x,y+h-im.height*scale,im.width*scale,im.height*scale);ctx.restore();
 }
 async function decorLayer(ctx,state,layer,t,w,field){
  const c=canvas();
  for(const p of state.decor){
   if(RoomDecor.get(p.name)?.layer!==layer)continue;
   await RoomDecor.draw(c.getContext('2d'),p,{load:image,time:t,weather:w,light:'none'});
  }
  ctx.drawImage(illuminate(c,field),0,0);
 }
 async function compose(state,t,w){
  const c=canvas(),ctx=c.getContext('2d'),field=await lighting(t,w);ctx.drawImage(illuminate(await rawBackdrop(state),field,true),0,0);
  for(const layer of ['floor','back','wall'])await decorLayer(ctx,state,layer,visualTime(t,w),w,field);
  const selected=changed(state),original=await image(background());
  const intersects=(a,b)=>a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1];
  const backDecor=state.decor.some(p=>RoomDecor.get(p.name)?.layer!=='front');
  for(const k of slotOrder){
   if(selected.includes(k)){const layer=canvas();drawSlot(layer.getContext('2d'),await image(art(k,state.slots[k])),k,state.slots[k]);ctx.drawImage(illuminate(layer,field),0,0);}
   else if(backDecor||selected.some(q=>slotOrder.indexOf(q)<slotOrder.indexOf(k)&&intersects(slots[q].box,slots[k].box))){const layer=canvas(),p=layer.getContext('2d');p.drawImage(original,0,0,750,1400);p.globalCompositeOperation='destination-in';p.drawImage(originalMask(k,selected),0,0);ctx.drawImage(illuminate(layer,field,true),0,0);}
  }
  // The cushion stays in its original position in home, editor and PNG export.
  if(backDecor||selected.length){const layer=canvas(),p=layer.getContext('2d');p.drawImage(original,0,0,750,1400);p.globalCompositeOperation='destination-in';p.drawImage(originalMask('pad',selected),0,0);ctx.drawImage(illuminate(layer,field),0,0);}
  await decorLayer(ctx,state,'front',visualTime(t,w),w,field);return c;
 }
 function preview(){
  if(previewQueued)return;previewQueued=true;
  requestAnimationFrame(async()=>{previewQueued=false;const layer=$('house-scene-preview');if(!layer||!draft)return;const token=++previewRevision,state=clone(draft);try{const scene=await compose(state,curTime,curWeather);if(token!==previewRevision||!layer.isConnected)return;const ctx=layer.getContext('2d');ctx.clearRect(0,0,750,1400);ctx.drawImage(scene,0,0);layer.style.opacity='1';}catch(e){status(e.message);}});
 }
 function status(text){const el=$('house-status');if(el)el.textContent=text;}
 async function sync(){const token=++revision;try{const src=(await compose(saved,curTime,curWeather)).toDataURL('image/png');if(token!==revision)return;$('living-room-bg').src=src;syncScenePreviews();}catch(e){status(e.message);toast('小屋素材尚未读取完成，请稍后重试');}}
 function ensureDraft(){if(!draft){draft=clone(saved);dirty=false;}return draft;}
 function render(){
  const s=ensureDraft(),stage=$('dress-stage');$('house-time').value=curTime;$('house-weather').value=curWeather;
  stage.classList.add('house-stage');stage.innerHTML='';const bg=document.createElement('img');bg.src=background(s,curTime,curWeather);bg.alt='完整客厅场景';stage.append(bg);
  const scene=canvas();scene.id='house-scene-preview';scene.className='house-scene-preview';scene.style.opacity='0';scene.setAttribute('aria-label','物件按前后遮挡排列的完整场景');stage.append(scene);
  const dec=document.createElement('div');dec.id='placed-layer';Object.assign(dec.style,{position:'absolute',inset:'0',zIndex:'5'});stage.append(dec);renderDecor();
  const zones=document.createElement('div');zones.className='house-zones';for(const k in slots){const b=document.createElement('button');b.className='house-zone';b.type='button';b.setAttribute('aria-label','更换'+slots[k].name);b.setAttribute('aria-pressed',String(k===selected));const [x,y,w,h]=slots[k].box;Object.assign(b.style,{left:x+'%',top:y+'%',width:w+'%',height:h+'%'});b.innerHTML='<span>'+slots[k].name+' · 换样式</span>';b.onclick=()=>{selected=k;render();$('house-picker').scrollIntoView({block:'nearest',behavior:'smooth'});};zones.append(b);}stage.append(zones);renderPicker();renderTray();preview();
 }
 function renderPicker(){
  const root=$('house-picker');root.replaceChildren();const h=document.createElement('h3');h.textContent=slots[selected].name+' · 整体更换';root.append(h);
  const row=document.createElement('div');row.className='house-variants';
  for(let v=0;v<3;v++){
   const b=document.createElement('button');b.className='house-variant';b.type='button';b.dataset.variant=String(v);
   b.setAttribute('aria-pressed',String(changed(draft).includes(selected)&&draft.slots[selected]===v));
   const im=document.createElement('img');im.src=art(selected,v);im.alt=names[selected][v];b.append(im,document.createTextNode(names[selected][v]));
   b.onclick=()=>{const s=ensureDraft(),active=changed(s);s.replaced=[...new Set([...active,selected])];s.enabled=true;s.slots[selected]=v;dirty=true;render();status('预览中，点“确定布置”同步到首页。');};row.append(b);
  }
  const originalButton=document.createElement('button');originalButton.id='house-original-slot';originalButton.className='house-variant house-original-variant';originalButton.type='button';originalButton.dataset.variant='original';
  originalButton.setAttribute('aria-pressed',String(!changed(draft).includes(selected)));
  const thumb=document.createElement('span'),[x,y,w,hgt]=slots[selected].box;thumb.className='house-original-preview';thumb.setAttribute('aria-hidden','true');
  Object.assign(thumb.style,{backgroundImage:'url("'+background()+'")',backgroundSize:(10000/w)+'% '+(10000/hgt)+'%',backgroundPosition:(x/(100-w)*100)+'% '+(y/(100-hgt)*100)+'%'});
  originalButton.append(thumb,document.createTextNode('原型款'));
  originalButton.onclick=()=>{const s=ensureDraft();s.replaced=changed(s).filter(k=>k!==selected);s.enabled=s.replaced.length>0;dirty=true;render();status('原型款预览 · 确定后仅恢复这一处。');};row.append(originalButton);root.append(row);
 }
 function renderDecor(){
  const layer=$('placed-layer');if(!layer||!draft)return;layer.style.filter='none';layer.replaceChildren();
  for(const p of draft.decor){const d=RoomDecor.get(p.name);if(!d)continue;const el=document.createElement('div');el.className='house-decor';el.title=p.name+' · 拖动摆放';el.dataset.material=d.id;
   Object.assign(el.style,{left:p.x+'%',top:p.y+'%',width:p.w+'%',height:p.h+'%'});
   const rm=document.createElement('button');rm.type='button';rm.textContent='×';rm.setAttribute('aria-label','移除'+p.name);rm.onclick=()=>{draft.decor=draft.decor.filter(q=>q!==p);dirty=true;renderDecor();};el.append(rm);
   let drag=null;el.onpointerdown=e=>{if(e.target.closest('button'))return;e.preventDefault();e.stopPropagation();const r=$('dress-stage').getBoundingClientRect();drag={x:e.clientX,y:e.clientY,px:p.x,py:p.y,r};el.setPointerCapture(e.pointerId);};
   el.onpointermove=e=>{if(!drag)return;const q=RoomDecor.normalize({...p,x:drag.px+(e.clientX-drag.x)/drag.r.width*100,y:drag.py+(e.clientY-drag.y)/drag.r.height*100});Object.assign(p,q);el.style.left=p.x+'%';el.style.top=p.y+'%';dirty=true;preview();};el.onpointerup=el.onpointercancel=()=>{drag=null;};layer.append(el);
  }preview();
 }
 renderTray=function(){const g=$('item-tray');g.replaceChildren();catalog().filter(d=>curDressTab===1?d.cat===1:d.cat!==1).forEach(d=>{const locked=window.RewardAccess?!RewardAccess.owns(d.name):!!d.lock;const b=document.createElement('button');b.className='tray-item'+(locked?' locked':'');b.type='button';b.innerHTML='<img src="'+RoomDecor.source(d.name)+'" alt=""><span>'+d.name+'</span>'+(locked?'<span class="lk">查看解锁方式</span>':'');b.onclick=()=>{if(locked){if(window.RewardAccess)RewardAccess.open(d.name);else toast('您暂时没有拥有这件装饰');return;}const s=ensureDraft();if(s.decor.length>=50){toast('最多放置50件玩具和装饰');return;}const box=RoomDecor.get(d.name).box;s.decor.push({id:Date.now(),name:d.name,x:box[0],y:box[1],w:box[2],h:box[3]});dirty=true;renderDecor();status('拖动调整位置，× 移除；确定后保存。');};g.append(b);});};
 setDressTab=function(t){curDressTab=t===1?1:2;document.querySelectorAll('#dress-tabs [data-tab]').forEach(b=>b.classList.toggle('active',+b.dataset.tab===curDressTab));renderTray();};
 renderPlaced=()=>renderDecor();bindDressDrag=()=>{};
 const oldTime=setTime,oldWeather=setWeather;setTime=function(t){RoomDecor.reset();oldTime(t);if(draft)render();};setWeather=function(w){RoomDecor.reset();oldWeather(w);if(draft)render();};
 const oldMode=setDressMode;setDressMode=function(m){oldMode(m);if(m===0)enter();};
 const oldSwitch=switchTo;switchTo=function(v,b){oldSwitch(v,b);if(v==='dress'&&curDressMode===0)enter();};
 function enter(){ensureDraft();render();status(draft.enabled?'局部替换预览 · 确认后同步首页':'原型布置 · 原有背景与家具均保留，点击款式进行替换');}
 function original(){draft=defaults();dirty=true;render();status('原型布置预览 · 点击确定后恢复原图，取消可回到上次布置。');}
 async function confirm(){if(!draft)return;const button=$('house-confirm');button.disabled=true;status('正在保存完整场景…');try{await compose(draft,curTime,curWeather);const previous=saved;RoomDecor.reset();saved=clone(draft);if(window.AccountManager&&!AccountManager.persist()){saved=previous;throw new Error('保存失败，请保留当前编辑并重试。');}draft=null;dirty=false;await sync();render();status('已同步首页与场景总览');toast('小屋布置已保存');}catch(e){status(e.message);}finally{button.disabled=false;}}
 function cancel(){draft=null;dirty=false;enter();dirty=false;status('已恢复上次保存的布置');}
 exportWallpaper=async function(){const b=$('house-export');if(b)b.disabled=true;status('正在生成 PNG 壁纸…');try{const state=clone(draft||saved),c=await compose(state,curTime,curWeather);const blob=await new Promise((res,rej)=>c.toBlob(v=>v?res(v):rej(new Error('PNG生成失败')),'image/png'));const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='轻陪伴小屋-'+['早晨','午后','夜晚'][curTime]+'-'+['晴天','雨天','雪天'][curWeather]+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('PNG 壁纸已导出（750 × 1400，无编辑虚框）');return blob;}catch(e){status('导出失败：'+e.message);throw e;}finally{if(b)b.disabled=false;}};
 function getLayout(key,variant){
  if(!slots[key])return null;
  const result={box:[...slots[key].box],fit:key==='sofa'?'cover':key==='left'?'fill':'contain',position:key==='sofa'?'0% 100%':'50% 100%'};
  if(key==='back'){
   // These belong to the original stand. New stands use their own silhouette,
   // never the two old shelves that used to extend across the window.
   result.occluders=variant===undefined&&!changed(saved).includes('back')?[[39,41.2,30.2,2.9],[40.5,52.1,28.7,2.9]]:[];
  }
  if(key==='left'){
   const state=saved,v=variant??state.slots.left,replaced=variant!==undefined||changed(state).includes('left');
   result.platforms=replaced?[...(v===0?[{x:3.2,y:40.7,w:26}]:[]),{x:.72,y:[54.025,52.21,54.85][v],w:28.44},{x:.72,y:65.41,w:28.44}]:[{x:0,y:40.6,w:17},{x:0,y:50.6,w:25},{x:0,y:69.7,w:19}];
   result.feet={x:0,y:73,w:36};result.ladder={x:29,y:replaced?[54.025,52.21,54.85][v]:59.5,bottomY:73};
  }
  if(key==='sofa'){
   const replaced=variant!==undefined||changed(saved).includes(key),v=variant??saved.slots.sofa;
   result.frontPaths=replaced?[[
    'M73 74 Q79 72.8 87 73.2 L100 74 L100 85 L73 85Z'
   ],[
    'M83.2 70 Q83.2 67.2 89 66.8 L100 66.4 L100 85 L83.2 85Z'
   ],[
    'M83.8 68 L83.8 66 Q84.2 63.8 88 63.5 L100 63.1 L100 85 L83.8 85Z'
   ]][v]:['M87.2 66 Q87.2 63.2 91.5 63.1 L100 63.1 L100 85 L87.2 85Z'];
  }
  return result;
 }
 function getAnchors(key,variant){
  if(key!=='left'&&key!=='sofa')return null;
  const replaced=variant!==undefined||changed(saved).includes(key),v=variant??saved.slots[key];
  if(!Number.isInteger(v)||v<0||v>2)return null;
  let surface,exit;
  if(key==='left'){
   const layout=getLayout(key,replaced?v:undefined),main=layout.platforms.find(p=>p.y>=49&&p.y<60)||layout.platforms[0];
   surface={...main,dy:0};
   exit=replaced?[{x:26,y:main.y},{x:33,y:69},{x:35,y:76}]:[{x:23,y:main.y},{x:25.5,y:59.5},{x:34,y:70},{x:35,y:76}];
  }else{
   // Feet stand on the exposed seat, before the large near-side arm.
   surface=replaced?[
    {x:75.4,y:72.25,w:11.4,dy:-.55},
    {x:74.2,y:69.8,w:7.8,dy:.45},
    {x:74.2,y:69.3,w:6.8,dy:.7}
   ][v]:{x:74.3,y:61.8,w:11.2,dy:3.1};
   exit=[{x:surface.x+.8,y:surface.y+1.2},{x:71,y:replaced?81:76},{x:67,y:82}];
  }
  const home={x:surface.x+surface.w*.5,y:surface.y+surface.dy*.5};
  return Object.freeze({slot:key,variant:replaced?v:'original',surface:Object.freeze(surface),home:Object.freeze(home),exit:Object.freeze(exit.map(point=>Object.freeze(point)))});
 }
 window.HouseEditor={getSaved:()=>clone(saved),restore(state){RoomDecor.reset();previewRevision++;fullscreen(false);saved=normalize(state);draft=null;dirty=false;sync();if($('view-dress').classList.contains('active')&&curDressMode===0)enter();},isEditing:()=>dirty,enter,confirm,cancel,compose,sync,fullscreen,original,backdrop,light,getLayout,getAnchors,occlusion,getDraft:()=>draft&&clone(draft)};
 $('house-original').onclick=original;$('house-confirm').onclick=confirm;$('house-cancel').onclick=cancel;$('house-export').onclick=()=>exportWallpaper().catch(()=>{});
 $('house-time').onchange=e=>setTime(+e.target.value);$('house-weather').onchange=e=>setWeather(+e.target.value);
 RoomDecor.connect({read:()=>clone(saved),compose,refresh:sync,light:()=>light(curTime,curWeather),move(id,x){const p=saved.decor.find(p=>p.id===id);if(p){p.x=x;if(window.AppProfileBridge)AppProfileBridge.persist();}}});
 curDressTab=1;placed=[];sync();renderTray();
})();
