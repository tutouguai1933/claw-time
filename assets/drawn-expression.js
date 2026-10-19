(function(global){
 'use strict';
 const SIZE=280;
 const prepared=new WeakMap();let preparedId=0;
 function canvas(){const c=document.createElement('canvas');c.width=c.height=SIZE;return c;}
 // Remove only white paper connected to an outside edge. White enclosed by the pet stays intact.
 function cleanPaper(source){
  const out=canvas(),ctx=out.getContext('2d');ctx.drawImage(source,0,0,SIZE,SIZE);
  const image=ctx.getImageData(0,0,SIZE,SIZE),d=image.data,seen=new Uint8Array(SIZE*SIZE),queue=[];
  const visit=i=>{if(seen[i])return;seen[i]=1;const p=i*4;if(d[p+3]===0||(d[p]>245&&d[p+1]>245&&d[p+2]>245)){queue.push(i);d[p+3]=0;}};
  for(let i=0;i<SIZE;i++){visit(i);visit((SIZE-1)*SIZE+i);visit(i*SIZE);visit(i*SIZE+SIZE-1);}
  for(let n=0;n<queue.length;n++){const i=queue[n],x=i%SIZE,y=Math.floor(i/SIZE);if(x)visit(i-1);if(x<SIZE-1)visit(i+1);if(y)visit(i-SIZE);if(y<SIZE-1)visit(i+SIZE);}
  ctx.putImageData(image,0,0);return out;
 }
 function inkBounds(source){
  const d=source.getContext('2d').getImageData(0,0,SIZE,SIZE).data;let left=SIZE,top=SIZE,right=-1,bottom=-1;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(d[(y*SIZE+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  return right<0?null:{x:Math.max(0,left-7),y:Math.max(0,top-7),w:Math.min(SIZE,right+8)-Math.max(0,left-7),h:Math.min(SIZE,bottom+8)-Math.max(0,top-7)};
 }
 function expression(base,ink,markedEyes){
  const bounds=inkBounds(ink);if(!bounds)return null;
  const out=canvas(),ctx=out.getContext('2d');ctx.drawImage(base,0,0);
  const q=markedEyes||bounds,x=Math.max(0,Math.floor(q.x)),y=Math.max(0,Math.floor(q.y)),w=Math.min(SIZE-x,Math.ceil(q.w)),h=Math.min(SIZE-y,Math.ceil(q.h));
  // The eye box is repainted from its surrounding face colour before adding the new eyes.
  // Transparent line drawings retain transparency instead of receiving a white rectangle.
  const pixels=ctx.getImageData(0,0,SIZE,SIZE).data,colors=new Map();let count=0,opaque=0;
  function sample(a,b){if(a<0||b<0||a>=SIZE||b>=SIZE)return;count++;const i=(b*SIZE+a)*4;if(pixels[i+3]<220)return;opaque++;const key=[pixels[i],pixels[i+1],pixels[i+2]].map(v=>Math.round(v/8)*8).join(',');const entry=colors.get(key)||{n:0,color:[pixels[i],pixels[i+1],pixels[i+2]]};entry.n++;colors.set(key,entry);}
  for(let a=x;a<x+w;a++){sample(a,y-2);sample(a,y+h+1);}for(let b=y;b<y+h;b++){sample(x-2,b);sample(x+w+1,b);}
  ctx.clearRect(x,y,w,h);
  if(count&&opaque/count>.55&&colors.size){const most=[...colors.values()].sort((a,b)=>b.n-a.n)[0];ctx.fillStyle='rgb('+most.color.join(',')+')';ctx.fillRect(x,y,w,h);}
  ctx.drawImage(ink,0,0);return out.toDataURL('image/png');
 }
 function render(p,size){
  let key='';
  if(!p.frameBounds||(p.expressionVersion!==2&&(p.blinkURL||p.moeURL))){
   let state=prepared.get(p);
   if(!state){
    state={id:++preparedId,frames:null};prepared.set(p,state);
    const load=async url=>{if(!url)return null;const img=new Image();img.src=url;await img.decode();const c=canvas();c.getContext('2d').drawImage(img,0,0,SIZE,SIZE);return c;};
    Promise.all([load(p.dataURL),load(p.blinkURL),load(p.moeURL)]).then(([original,blink,cute])=>{
     const base=cleanPaper(original),eye=p.parts&&p.parts.eye,isLegacy=p.expressionVersion!==2;
     state.frames={...p,expressionVersion:2,frameBounds:inkBounds(base)||{x:0,y:0,w:SIZE,h:SIZE},dataURL:base.toDataURL('image/png'),blinkURL:isLegacy&&blink?expression(base,blink,eye):p.blinkURL,moeURL:isLegacy&&cute?expression(base,cute,eye):p.moeURL};
     document.querySelectorAll('[data-drawn-key="'+state.id+'"]').forEach(el=>{el.outerHTML=render(state.frames,Number(el.dataset.drawnSize)||size);});
    }).catch(()=>{});
   }
   if(state.frames)return render(state.frames,size);
   key=' data-drawn-key="'+state.id+'" data-drawn-size="'+size+'"';
   if(p.expressionVersion!==2)p={...p,blinkURL:null,moeURL:null};
  }
  // All expression frames share the body's bounds, so small/off-centre drawings
  // fill the pet slot without moving the eyes or cropping each expression differently.
  const b=p.frameBounds||{x:0,y:0,w:SIZE,h:SIZE},scale=size/Math.max(b.w,b.h);
  const sheet='left:'+((size-b.w*scale)/2-b.x*scale)+'px;top:'+((size-b.h*scale)/2-b.y*scale)+'px;width:'+(SIZE*scale)+'px;height:'+(SIZE*scale)+'px;';
  const normal='<img class="da-frame da-open" data-drawn-frame="normal" src="'+p.dataURL+'" alt="'+String(p.name||'画中伙伴').replace(/[&<>"']/g,'')+'">';
  const blink=p.blinkURL?'<img class="da-frame da-closed" data-drawn-frame="blink" src="'+p.blinkURL+'" alt="">':'';
  const cute=p.moeURL?'<img class="da-frame da-cute" data-drawn-frame="cute" src="'+p.moeURL+'" alt="">':'';
  return '<span class="drawn-anim da-drawing'+(blink?' has-blink':'')+(cute?' has-cute':'')+'"'+key+' style="width:'+size+'px;height:'+size+'px;"><span class="da-sheet" style="'+sheet+'"><span class="da-rest">'+normal+blink+'</span>'+cute+'</span></span>';
 }
 global.DrawnExpressions={cleanPaper,expression,render,bounds:inkBounds};
})(window);
