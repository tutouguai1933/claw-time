/* Complete, gentle visits between the left stand, its ladder and the floor. */
(()=>{
 'use strict';
 const toys=new Set(['wand','yarn','bowl','mouse','cushion','rug']);
 let nextZone='floor',heroShift=0,idleEpoch=0;
 const cadence={idleMinMs:4000,idleMaxMs:7000,heroMinMs:6000,heroMaxMs:9000,meetingMinMs:6500,meetingMaxMs:10000,
  idleChance:.7,heroChance:.72,meetingChance:.95,stepOutMs:1450,stepBackMs:1450};
 const settings={random:()=>Math.random()},clocks=new Map(),idleSteps=new Map(),pending=new Set(),supportLayouts=new WeakMap();
 const random=()=>Math.max(0,Math.min(.999999,Number(settings.random())||0));
 const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const between=(min,max)=>min+random()*(max-min);
 function later(fn,ms){const id=setTimeout(()=>{pending.delete(id);fn();},ms);pending.add(id);return id;}
 function cancel(id){clearTimeout(id);pending.delete(id);}
 function roomActive(container){
  if(!container?.isConnected||document.hidden||focusing||!document.getElementById('view-home')?.classList.contains('active'))return false;
  const overview=document.getElementById('overview')?.classList.contains('show');
  return container.id==='ov-crowd'?overview:curScene===0&&!overview;
 }
 function stopIdle(host){
  const trip=idleSteps.get(host);if(!trip)return false;
  trip.timers.forEach(cancel);idleSteps.delete(host);
  if(host.isConnected){host.style.transition='';host.style.transform=trip.hero?'':'translateX(0px)';
   ['petIdle','petWalking','petFacing'].forEach(key=>delete host.dataset[key]);}
  return true;
 }
 function smallStep(host,dx,hero=false,dy=0){
  stopIdle(host);
  const token=idleEpoch,trip={hero,timers:[]};idleSteps.set(host,trip);
  const current=()=>token===idleEpoch&&host.isConnected&&idleSteps.get(host)===trip&&!host.dataset.petEncounter;
  host.dataset.petIdle='true';host.dataset.petWalking='true';host.dataset.petFacing=random()<.25?'left':'right';
  host.style.setProperty('--pet-step-period',between(.48,.65)+'s');
  host.style.transition='transform '+cadence.stepOutMs+'ms ease-in-out';host.style.transform='translateX('+dx.toFixed(2)+'px)'+(dy?' translateY('+dy.toFixed(2)+'px)':'');
  trip.timers.push(later(()=>{
   if(!current()){stopIdle(host);return;}
   host.style.transition='transform '+cadence.stepBackMs+'ms ease-in-out';host.style.transform='translateX(0px)';
   trip.timers.push(later(()=>{if(current())stopIdle(host);},cadence.stepBackMs));
  },cadence.stepOutMs));
  return trip;
 }
 function startCadence(container){
  if(!container)return;
  const previous=clocks.get(container);if(previous)previous.timers.forEach(cancel);
  const clock={timers:new Set()};clocks.set(container,clock);
  function repeat(fn,min,max,phase=0){
   const tick=()=>{
    const delay=between(min,Math.max(min,max-900))+Math.min(phase,Math.max(0,max-min));
    const id=later(()=>{clock.timers.delete(id);if(clocks.get(container)!==clock||!container.isConnected)return;
     if(roomActive(container))fn();tick();
    },delay);clock.timers.add(id);
   };tick();
  }
  (sceneCrowds.get(container)||[]).forEach((c,i)=>repeat(()=>idle(c),cadence.idleMinMs,cadence.idleMaxMs,i*300));
  if(container.id==='pet-crowd')repeat(()=>wanderHero(),cadence.heroMinMs,cadence.heroMaxMs);
  repeat(()=>{if(random()<cadence.meetingChance)step(container);},cadence.meetingMinMs,cadence.meetingMaxMs);
 }
 function footOffset(pid,size=60){
  const pet=typeof getPet==='function'?getPet(pid):null;
  const source=window.BreedCreator?.shape(pet)?.id;
  if(Number.isInteger(source)&&source!==pid)return footOffset(source,size);
  if(pet?.catalogCat)return size*276/288;
  if(pid>=0&&pid<6){const [w,h]=[[260,242],[260,253],[259,253],[237,283],[252,265],[256,258]][pid];return size*(1+Math.min(1,h/w))/2;}
  return size*.95;
 }
 function worldPoint(container,point,size=60,foot=size){
  const background=container.id==='ov-crowd'?document.getElementById('overview-bg'):document.getElementById('living-room-bg');
  const cr=container.getBoundingClientRect(),br=background?.getBoundingClientRect();
  if(!br||!br.width||!cr.width)return {x:point.x*100-7,y:point.y*100-8};
  const s=Math.max(br.width/750,br.height/1400);
  return {x:Math.max(0,Math.min(100-size/cr.width*100,((br.left-cr.left)+(br.width-750*s)/2+point.x*750*s-size/2)/cr.width*100)),
   y:Math.max(0,Math.min(92,((br.top-cr.top)+(br.height-1400*s)/2+point.y*1400*s-foot)/cr.height*100))};
 }
 const actorPoint=(container,c,point)=>worldPoint(container,point,60,footOffset(c.dogIdx));
 function positionCrowd(container,force=false){
  if(!container?.isConnected||!window.HouseEditor?.getAnchors)return false;
  const crowd=sceneCrowds.get(container)||[],cr=container.getBoundingClientRect();if(!crowd.length||!cr.width||!cr.height)return false;
  const background=document.getElementById(container.id==='ov-crowd'?'overview-bg':'living-room-bg'),br=background?.getBoundingClientRect();
  if(!br?.width||!br.height)return false;
  const supports=['left','sofa'].map(key=>HouseEditor.getAnchors(key)),scale=Math.max(br.width/750,br.height/1400);
  const signature=JSON.stringify([supports,cr.width,cr.height,br.width,br.height,br.left-cr.left,br.top-cr.top]);
  if(!force&&supportLayouts.get(container)===signature)return false;
  if(crowd.some(c=>c.el.dataset.petEncounter||c.el.dataset.petIdle))PetInteractions.reset();
  crowd.forEach((c,i)=>{
   const anchor=supports[i]||{slot:'floor',surface:{x:18,y:84,w:38,dy:0},home:{x:37,y:84},exit:[]};if(!anchor)return;
   const foot={x:anchor.home.x/100,y:anchor.home.y/100},at=actorPoint(container,c,foot),surface=anchor.surface,halfFoot=60*.35/2;
   c.homeSlot=anchor.slot||['left','sofa'][i]||'floor';c.homeWorld={...foot};c.home={...at};
   c.support={minDx:Math.min(0,(surface.x-anchor.home.x)*7.5*scale+halfFoot),maxDx:Math.max(0,(surface.x+surface.w-anchor.home.x)*7.5*scale-halfFoot),slope:(surface.dy||0)*14/(surface.w*7.5)};
   c.el.dataset.petSupport=c.homeSlot;c.el.style.transition='none';c.el.style.transform='translateX(0px)';c.el.style.left=at.x+'%';c.el.style.top=at.y+'%';
   const dressed=c.el.querySelector?.('.dressed');if(dressed)dressed.style.maskImage='';
   if(c.homeSlot==='sofa'&&HouseEditor.occlusion){
    const rect={x:foot.x-30/(750*scale),y:foot.y-footOffset(c.dogIdx)/(1400*scale),w:60/(750*scale),h:60/(1400*scale)};
    HouseEditor.occlusion('sofa',rect,60).then(mask=>{
     if(!c.el.isConnected||supportLayouts.get(container)!==signature)return;
     const current=c.el.querySelector('.dressed');if(current){current.style.maskImage=mask?'url("'+mask+'")':'';current.style.maskSize='100% 100%';current.style.maskRepeat='no-repeat';}
    }).catch(()=>{});
   }
  });
  supportLayouts.set(container,signature);return true;
 }
 function syncSupports(force=false){
  let changed=false;['pet-crowd','ov-crowd'].forEach(id=>{if(positionCrowd(document.getElementById(id),force))changed=true;});
  if(changed){const id=document.getElementById('overview')?.classList.contains('show')?'ov-crowd':'pet-crowd',container=document.getElementById(id);if(roomActive(container))startCadence(container);}
 }
 function access(c){
  const anchor=c.homeSlot&&window.HouseEditor?.getAnchors(c.homeSlot);
  return anchor?anchor.exit.map(p=>({x:p.x/100,y:p.y/100})):c.homeSlot?[]:c.home.y<59?[{x:.27,y:.69}]:[];
 }
 function meet(actors,container,settings={}){
  actors=actors.filter(c=>c.el?.isConnected&&!c.el.dataset.petEncounter).slice(0,3);
  if(actors.length<2)return null;
  const state=window.HouseEditor?.getSaved(),available=(state?.decor||[]).filter(p=>toys.has(RoomDecor.get(p.name)?.id));
  const zone=settings.zone||nextZone;nextZone=zone==='floor'?'stand':'floor';
  const toy=zone!=='floor'?null:settings.toyId!==undefined?available.find(p=>p.id===settings.toyId):available.length?available[Math.floor(Math.random()*available.length)]:null;
  let points;
  if(zone==='stand'){
   const platforms=window.HouseEditor?.getLayout('left').platforms||[{x:0,y:50.6,w:25},{x:0,y:69.7,w:25}];
   const main=platforms.find(p=>p.y>=49&&p.y<60)||platforms[0],low=platforms.find(p=>p.y>60)||main;
   points=[{x:(main.x+main.w*.24)/100,y:main.y/100},{x:(main.x+main.w*.78)/100,y:main.y/100},{x:(low.x+low.w*.5)/100,y:low.y/100}];
  }
  else {
   const center=toy?Math.max(.07,Math.min(.93,(toy.x+toy.w/2)/100)):.25;
   const y=toy?Math.max(.75,Math.min(.84,(toy.y+toy.h/2)/100)):.80;
   const spread=actors.length===2?[-.08,.08]:[-.16,0,.16];
   points=spread.map((offset,i)=>{const x=Math.max(.085,Math.min(.915,center+offset));return {x,y:Math.max(y+(i%2)*.008,x>.7?.89:.75)};});
  }
  const destinations=actors.map((c,i)=>actorPoint(container,c,points[i]));
  const routes=actors.map((c,i)=>{
   const to=destinations[i],samePlatform=zone==='stand'&&c.homeSlot==='left'&&Math.abs(c.homeWorld.y-points[i].y)<.015;
   if(samePlatform)return [{x:(c.home.x+to.x)/2,y:to.y},to];
   const exits=access(c),left=zone==='stand'&&window.HouseEditor?.getAnchors('left');
   const entry=left?left.exit.filter(p=>p.y>=points[i].y*100-.01).slice().reverse().map(p=>({x:p.x/100,y:p.y/100})):zone==='stand'?[{x:.27,y:.69},{x:.22,y:.54}]:[];
   const route=[...exits,...entry].map(point=>actorPoint(container,c,point));
   return route.length?[...route,to]:[{x:(c.home.x+to.x)/2,y:(c.home.y+to.y)/2},to];
  });
  // Equal leg counts synchronize the three arrivals while avoiding a diagonal leap through the cat house.
  const count=Math.max(...routes.map(r=>r.length));routes.forEach(r=>{while(r.length<count)r.unshift({...r[0]});});
  return PetInteractions.group(actors,container,{routes,destinations,worldDestinations:points,travelMs:4200,stayMs:3600,toyId:toy?.id,
   onMeet(){if(toy)actors.forEach(c=>{c.el.dataset.petToy=RoomDecor.get(toy.name).id;});}});
 }
 function step(container){
  if(container.id==='pet-crowd'&&curScene!==0)return;
  const crowd=sceneCrowds.get(container)||[],free=crowd.filter(c=>c.el.isConnected&&!c.el.dataset.petEncounter);
  if(container.id==='pet-crowd'&&free.length&&(free.length<2||Math.random()<.24))return visitHero(free[Math.floor(Math.random()*free.length)],container);
  if(free.length<2)return null;
  const actors=[...free].sort(()=>Math.random()-.5).slice(0,free.length>=3&&Math.random()<.45?3:2);
  return meet(actors,container);
 }
 function visitHero(visitor,container){
  const host=document.getElementById('home-sprite-wrap'),shell=container.closest('.scene-shell');
  if(!shell||host.dataset.petEncounter||visitor.el.dataset.petEncounter)return null;
  const r=host.getBoundingClientRect(),cr=container.getBoundingClientRect(),right=visitor.home.x>50;
  const destination={x:Math.max(0,Math.min(100-60/cr.width*100,((right?r.right+5:r.left-65)-cr.left)/cr.width*100)),y:(r.bottom-cr.top-60)/cr.height*100};
  const exits=access(visitor).map(point=>actorPoint(container,visitor,point));
  const route=exits.length?[...exits,destination]:[{x:(visitor.home.x+destination.x)/2,y:(visitor.home.y+destination.y)/2},destination];
  const hero={dogIdx:curPet,el:host,expr:0,home:{x:0,y:0},bubble:document.getElementById('home-bubble'),stationary:true};
  return PetInteractions.group([visitor,hero],shell,{routes:[route,[{x:0,y:0}]],destinations:[destination,{x:0,y:0}],travelMs:4400,stayMs:3200});
 }
 function wanderHero(force=false){
  const host=document.getElementById('home-sprite-wrap');
  if(!host||host.dataset.petEncounter||host.dataset.petMood||!force&&host.dataset.petIdle||reduced()||!force&&random()>cadence.heroChance)return null;
  heroShift=Math.max(-18,Math.min(18,heroShift+(random()<.5?-1:1)*between(7,13)));
  return smallStep(host,heroShift,true);
 }
 function idle(c){
  if(!c?.el?.isConnected||c.el.dataset.petEncounter||c.el.dataset.petMood||c.el.dataset.petIdle||focusing||document.hidden||!document.getElementById('view-home')?.classList.contains('active')||reduced()||random()>cadence.idleChance)return null;
  let dx=(random()<.5?-1:1)*between(5,9);
  if(c.support){dx=Math.max(c.support.minDx,Math.min(c.support.maxDx,dx));if(Math.abs(dx)<.5)dx=Math.max(c.support.minDx,Math.min(c.support.maxDx,-dx));if(Math.abs(dx)<.5)return null;}
  return smallStep(c.el,dx,false,dx*(c.support?.slope||0));
 }
 function syncRoomLighting(){
  if(window.HouseEditor?.light){const filter=HouseEditor.light(curTime,curWeather);document.querySelectorAll('.pet-crowd .cr,#home-sprite-wrap').forEach(el=>el.style.setProperty('--pet-room-light',filter));}
 }
 window.PetRoom={meet,step,visitHero,wanderHero,idle,stopIdle,startCadence,syncRoomLighting,worldPoint,positionCrowd,footOffset,cadence,
  configure(next={}){if(typeof next.random==='function')settings.random=next.random;Object.keys(cadence).forEach(key=>{if(Number.isFinite(next.cadence?.[key])&&next.cadence[key]>=0)cadence[key]=next.cadence[key];});},
  reset(){nextZone='floor';idleEpoch++;heroShift=0;idleSteps.forEach((_,host)=>stopIdle(host));pending.forEach(clearTimeout);pending.clear();clocks.clear();const host=document.getElementById('home-sprite-wrap');if(host){host.style.transform='';host.style.transition='';}if(window.RoomDecor)RoomDecor.reset();}};
 if(typeof renderCrowdInto==='function'){const oldCrowd=renderCrowdInto;renderCrowdInto=function(container){const result=oldCrowd.apply(this,arguments);positionCrowd(container,true);return result;};}
 const oldHome=renderHome;renderHome=function(){PetInteractions.reset();oldHome.apply(this,arguments);positionCrowd(document.getElementById('pet-crowd'),true);syncRoomLighting();startCadence(document.getElementById('pet-crowd'));};
 const oldOverview=openOverview;openOverview=function(){oldOverview.apply(this,arguments);syncRoomLighting();startCadence(document.getElementById('ov-crowd'));};
 const oldPreview=syncScenePreviews;syncScenePreviews=function(){oldPreview.apply(this,arguments);syncSupports();syncRoomLighting();};
 const oldScene=goScene;goScene=function(index){if(index!==curScene)PetInteractions.reset();const result=oldScene.apply(this,arguments);if(curScene===0)startCadence(document.getElementById('pet-crowd'));return result;};
 const oldScroll=updateDotsFromScroll;updateDotsFromScroll=function(){const before=curScene;oldScroll.apply(this,arguments);if(curScene!==before){PetInteractions.reset();if(curScene===0)startCadence(document.getElementById('pet-crowd'));}};
 const track=document.getElementById('scene-track');track.removeEventListener('scroll',oldScroll);track.addEventListener('scroll',updateDotsFromScroll);
 const oldSwitch=switchTo;switchTo=function(view,back){if(view!=='home')PetInteractions.reset();const result=oldSwitch.apply(this,arguments);if(view==='home'){positionCrowd(document.getElementById('pet-crowd'));startCadence(document.getElementById('pet-crowd'));}return result;};
 window.addEventListener('resize',()=>{syncSupports(true);syncRoomLighting();});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){PetInteractions.reset();return;}
  if(!document.getElementById('view-home')?.classList.contains('active'))return;
  if(document.getElementById('overview')?.classList.contains('show'))startCadence(document.getElementById('ov-crowd'));
  else if(curScene===0)startCadence(document.getElementById('pet-crowd'));
 });
 syncSupports();syncRoomLighting();startCadence(document.getElementById('pet-crowd'));
})();
