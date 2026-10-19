/* Material, depth and slow toy movement use the same world coordinates as the room. */
(()=>{
 'use strict';
 const items={
  '逗猫棒':{id:'wand',layer:'front',box:[24,78,17,11]},
  '毛线球':{id:'yarn',layer:'front',box:[58,80,12,8]},
  '小鱼干碗':{id:'bowl',layer:'front',box:[43,81,17,8]},
  '玩具鼠':{id:'mouse',layer:'front',box:[26,84,13,7]},
  '暖橘抱枕':{id:'cushion',layer:'front',box:[35,78,18,10]},
  '绿植':{id:'plant',layer:'back',box:[80,45,16,18]},
  '圆地毯':{id:'rug',layer:'floor',box:[17,76,34,11]},
  '月亮挂饰':{id:'moon',layer:'wall',box:[82,6,11,17]},
  '星星串':{id:'stars',layer:'wall',box:[56,6,21,13]},
  '雨滴挂饰':{id:'raindrop',layer:'wall',box:[67,9,10,15]},
  '彩虹挂画':{id:'rainbow',layer:'wall',box:[6,23,21,13]}
 };
 const get=name=>items[name];
 const source=name=>'assets/decor-art/'+get(name).id+'.png';
 function normalize(p){
  const d=get(p.name);if(!d)return null;const box=d.box;
  const w=Math.max(7,Math.min(38,Number(p.w)||box[2])),h=Math.max(4,Math.min(22,Number(p.h)||box[3]));
  let x=Math.max(0,Math.min(100-w,Number.isFinite(Number(p.x))?Number(p.x):box[0]));
  let y=Math.max(0,Math.min(100-h,Number.isFinite(Number(p.y))?Number(p.y):box[1]));
  if(d.layer==='floor')y=Math.max(72,y);
  if(d.layer==='wall')y=Math.min(60-h,y);
  return {...p,x,y,w,h};
 }
 async function draw(ctx,p,options){
  const d=get(p.name);if(!d)return;const im=await options.load(source(p.name));
  const q=normalize(p),x=q.x*7.5,y=q.y*14,w=q.w*7.5,h=q.h*14,scale=Math.min(w/im.width,h/im.height);
  ctx.save();
  // Leaves on the sill remain behind both the wooden window frame and furniture.
  if(d.id==='plant'&&q.x+q.w>51&&q.y<59){ctx.beginPath();ctx.rect(51*7.5,0,27*7.5,58.5*14);ctx.rect(81*7.5,0,19*7.5,58.5*14);ctx.clip();}
  ctx.filter=options.light;
  if(d.layer==='wall'){
   const direction=options.time===2?-1:1;
   ctx.shadowColor=options.time===2?'#fff1c127':'#73573d29';ctx.shadowBlur=options.time===2?7:3;ctx.shadowOffsetX=direction*4;ctx.shadowOffsetY=3;
  }
  ctx.drawImage(im,x+(w-im.width*scale)/2,y+(h-im.height*scale)/2,im.width*scale,im.height*scale);ctx.restore();
 }
 let bridge,epoch=0,cleanup=null,busy=false,needsRestore=false;
 function reset(){epoch++;busy=false;if(cleanup)cleanup();cleanup=null;if(needsRestore&&bridge){needsRestore=false;bridge.refresh();}}
 function placement(host,background,p){
  const r=background.getBoundingClientRect(),hr=host.getBoundingClientRect(),s=Math.max(r.width/750,r.height/1400);
  return {left:r.left-hr.left+(r.width-750*s)/2+p.x*7.5*s,top:r.top-hr.top+(r.height-1400*s)/2+p.y*14*s,width:p.w*7.5*s,height:p.h*14*s};
 }
 async function interact(a,b,session){
  if(!bridge||busy||curScene!==0||!document.getElementById('view-home').classList.contains('active'))return false;
  const state=bridge.read(),p=state.decor.find(q=>session.toyId!==undefined?q.id===session.toyId:get(q.name)?.id==='cushion');if(!p)return false;
  const material=get(p.name)?.id;if(!['wand','yarn','bowl','mouse','cushion','rug'].includes(material))return false;
  const actors=(session.actors||[a,b]).map((c,i)=>({c,at:session.worldDestinations?.[i]?{x:session.worldDestinations[i].x*100-7,y:session.worldDestinations[i].y*100-7}:session.destinations[i]})).filter(({c,at})=>getPet(c.dogIdx)?.kind!=='fish'&&at&&c.el?.closest('#pet-crowd'));
  const target={x:p.x+p.w/2,y:p.y+p.h/2};
  const near=actors.map(({c,at})=>({c,x:at.x+7,y:at.y+7})).find(q=>Math.abs(q.x-target.x)<15&&Math.abs(q.y-target.y)<14);
  if(!near)return false;
  const token=epoch;busy=true;
  await new Promise(resolve=>setTimeout(resolve,session.arrivalMs===undefined?1200:session.arrivalMs+30));
  if(token!==epoch||!session.isCurrent()){if(token===epoch)busy=false;return false;}
  const movable=material==='cushion'||material==='yarn',distance=material==='cushion'?3.4:1.8;
  const endX=movable?Math.max(0,Math.min(100-p.w,p.x+(near.x<=target.x?1:-1)*distance)):p.x;
  const bg=document.getElementById('living-room-bg'),host=bg.parentElement,overlay=document.createElement('img');
  overlay.className='room-toy-motion'+(material==='cushion'?' room-cushion-motion':'');overlay.dataset.material=material;overlay.alt='正在和伙伴互动的'+p.name;overlay.src=source(p.name);
  const base={...state,decor:state.decor.filter(q=>q.id!==p.id)};
  try{
   const c=await bridge.compose(base,curTime,curWeather);if(token!==epoch)return false;
   needsRestore=true;bg.src=c.toDataURL('image/png');await bg.decode();if(token!==epoch)return false;
   const start=placement(host,bg,p);Object.assign(overlay.style,{position:'absolute',zIndex:'3',pointerEvents:'none',objectFit:'contain',left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px',filter:bridge.light()});
   host.append(overlay);cleanup=()=>overlay.remove();
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(token!==epoch)return false;
   const duration=material==='cushion'?5800:material==='yarn'?3000:2400;
   overlay.style.transition='left '+duration+'ms cubic-bezier(.25,.1,.3,1), rotate '+duration+'ms ease-in-out';overlay.style.left=placement(host,bg,{...p,x:endX}).left+'px';
   if(material==='yarn')overlay.style.rotate=(endX>p.x?'28':'-28')+'deg';
   if(!movable)overlay.animate(material==='rug'?[{filter:bridge.light()},{filter:bridge.light(),transform:'scale(1.015)'},{filter:bridge.light()}]:[{rotate:'0deg'},{rotate:material==='wand'?'5deg':'-3deg'},{rotate:'0deg'}],{duration,iterations:1,easing:'ease-in-out'});
   await new Promise(resolve=>setTimeout(resolve,duration+50));
   if(token!==epoch)return false;
   if(movable)bridge.move(p.id,endX);await bridge.refresh();await bg.decode();overlay.remove();cleanup=null;busy=false;needsRestore=false;return true;
  }catch(_){if(token===epoch){overlay.remove();cleanup=null;busy=false;needsRestore=false;bridge.refresh();}return false;}
 }
 window.RoomDecor={get,source,normalize,draw,reset,interact,
  connect(value){bridge=value;PetInteractions.configure({onEncounter:(a,b,session)=>{interact(a,b,session);}});}
 };
})();
