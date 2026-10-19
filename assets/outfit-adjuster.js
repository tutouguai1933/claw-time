/* Single garment placement drafts. Clothing confirmation owns the persistence transaction. */
(function (global) {
 'use strict';
 if(global.OutfitAdjuster)return;
 const bridge=global.AppProfileBridge;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const dictionary=()=>Object.create(null),copy=value=>JSON.parse(JSON.stringify(value));
 const identity=()=>({x:0,y:0,scale:1});
 const number=(value,fallback,min,max)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
 const normalize=value=>({x:number(value?.x,0,-50,50),y:number(value?.y,0,-50,50),scale:number(value?.scale,1,.5,1.8)});
 const isDefault=t=>t.x===0&&t.y===0&&t.scale===1;
 const validObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
 function cleanItems(value){
  const result=dictionary();if(!validObject(value))return result;
  for(const name of Object.keys(value).slice(0,256)){
   if(!name||name.length>128||!validObject(value[name]))continue;
   const item=normalize(value[name]);if(!isDefault(item))result[name]=item;
  }return result;
 }
 function cleanMap(value){
  const result=dictionary();if(!validObject(value))return result;
  for(const id of Object.keys(value).slice(0,4096)){
   if(!/^(0|[1-9]\d*)$/.test(id)||!Number.isSafeInteger(Number(id)))continue;
   const items=cleanItems(value[id]);if(Object.keys(items).length)result[id]=items;
  }return result;
 }
 let saved=cleanMap(bridge?.getState().outfitTransforms),draft=null,draftPet=null,active=false,selected='',panel=null,gesture=null;
 const pointers=new Map();
 const petId=()=>typeof dressPet==='number'?dressPet:0;
 function worn(){const id=petId();return [...new Set(typeof tempDress!=='undefined'&&Array.isArray(tempDress)?tempDress:typeof petOutfits!=='undefined'&&Array.isArray(petOutfits[id])?petOutfits[id]:[])];}
 function draftForPet(){const id=petId();if(draftPet!==id||!draft){draftPet=id;draft=cleanItems(saved[id]);}return draft;}
 function current(){return normalize(draftPet===petId()&&draft?draft[selected]:saved[petId()]?.[selected]);}
 function stopPointers(){pointers.clear();gesture=null;}
 function discard(){active=false;draft=null;draftPet=null;selected='';stopPointers();}
 function style(name,id,size,editable){
  const items=editable&&draftPet===id&&draft?draft:saved[id];
  const t=normalize(items?.[name]),frame=number(size,0,0,10000);
  const px=value=>Math.round(value*frame*1000/100)/1000;
  return '--outfit-dx:'+px(t.x)+'px;--outfit-dy:'+px(t.y)+'px;--outfit-scale:'+t.scale+';';
 }
 function begin(name){
  draftForPet();active=true;const names=worn();selected=names.includes(name)?name:names.includes(selected)?selected:names[0]||'';stopPointers();refresh();return !!selected;
 }
 function finish(){active=false;stopPointers();refresh();}
 function select(name){if(!worn().includes(name))return false;draftForPet();selected=name;stopPointers();refresh();return true;}
 function update(change){
  if(!selected||!worn().includes(selected))return false;
  const items=draftForPet(),next=normalize({...current(),...change});
  if(isDefault(next))delete items[selected];else items[selected]=next;
  applyPreview();updateControls();return true;
 }
 function reset(){if(!selected)return;delete draftForPet()[selected];stopPointers();applyPreview();updateControls();}
 function changed(){
  if(draftPet===null||!draft)return false;
  const previous=cleanItems(saved[draftPet]),keys=new Set([...Object.keys(previous),...Object.keys(draft)]);
  for(const name of keys){const a=normalize(previous[name]),b=normalize(draft[name]);if(a.x!==b.x||a.y!==b.y||a.scale!==b.scale)return true;}return false;
 }
 function applyPreview(){
  const host=document.getElementById('pet-show');if(!host)return;
  host.classList.toggle('outfit-adjusting',active);
  for(const node of host.querySelectorAll('[data-outfit-name]')){
   const name=node.dataset.outfitName,frame=node.closest('.dressed');
   const size=Number.parseFloat(frame?.style.width)||frame?.getBoundingClientRect().width||132;
   const t=normalize(draftPet===petId()&&draft?draft[name]:saved[petId()]?.[name]);
   node.style.setProperty('--outfit-dx',(Math.round(t.x*size*10)/1000)+'px');
   node.style.setProperty('--outfit-dy',(Math.round(t.y*size*10)/1000)+'px');
   node.style.setProperty('--outfit-scale',String(t.scale));
   node.classList.toggle('outfit-adjust-selected',active&&name===selected);
  }
 }
 function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
 function mount(){
  if(panel?.isConnected)return panel;
  const host=document.getElementById('pet-show');if(!host)return null;
  panel=element('section','outfit-adjust-panel');panel.id='outfit-adjust-panel';panel.setAttribute('aria-label','装扮位置微调');
  const top=element('div','outfit-adjust-toolbar'),toggle=element('button','btn ghost','微调位置');toggle.type='button';toggle.id='outfit-adjust-toggle';toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>active?finish():begin();
  const hint=element('span','outfit-adjust-hint','默认位置已自动搭配');hint.id='outfit-adjust-hint';top.append(toggle,hint);
  const controls=element('div','outfit-adjust-controls');controls.id='outfit-adjust-controls';controls.hidden=true;
  const choiceLabel=element('label','outfit-adjust-choice','选择单件'),choice=element('select');choice.id='outfit-adjust-item';choice.onchange=()=>select(choice.value);choiceLabel.append(choice);
  const scaleLabel=element('label','outfit-adjust-scale'),caption=element('span');caption.textContent='大小 ';const output=element('output');output.id='outfit-adjust-percent';output.htmlFor='outfit-adjust-size';caption.append(output);
  const scale=element('input');scale.id='outfit-adjust-size';scale.type='range';scale.min='50';scale.max='180';scale.step='1';scale.value='100';scale.setAttribute('aria-label','装扮大小百分比');scale.oninput=()=>update({scale:Number(scale.value)/100});scaleLabel.append(caption,scale);
  const footer=element('div','outfit-adjust-footer'),resetButton=element('button','outfit-adjust-reset','恢复这件默认');resetButton.type='button';resetButton.id='outfit-adjust-reset';resetButton.onclick=reset;
  const note=element('small',null,'拖动单件 · 双指缩放，点“确定装扮”保存');footer.append(resetButton,note);controls.append(choiceLabel,scaleLabel,footer);panel.append(top,controls);
  const preview=host.closest('.wardrobe-preview')||host;preview.after(panel);return panel;
 }
 function updateControls(){
  if(!panel)return;const enabled=!!selected,t=current();
  const output=panel.querySelector('#outfit-adjust-percent'),slider=panel.querySelector('#outfit-adjust-size');
  output.value=Math.round(t.scale*100)+'%';output.textContent=output.value;slider.value=String(Math.round(t.scale*100));slider.disabled=!enabled;
  panel.querySelector('#outfit-adjust-reset').disabled=!enabled;
 }
 function refresh(){
  if(!mount())return;const names=worn();if(!names.includes(selected))selected=names[0]||'';
  const toggle=panel.querySelector('#outfit-adjust-toggle');toggle.textContent=active?'完成微调':'微调位置';toggle.setAttribute('aria-expanded',String(active));toggle.disabled=!names.length;
  panel.querySelector('#outfit-adjust-hint').textContent=!names.length?'先试穿一件装扮':active?'点选单件，再拖动或缩放':'默认位置已自动搭配';
  panel.querySelector('#outfit-adjust-controls').hidden=!active;
  const choice=panel.querySelector('#outfit-adjust-item');choice.replaceChildren();
  for(const name of names){const option=element('option',null,name);option.value=name;option.selected=name===selected;choice.append(option);}
  choice.disabled=!names.length;applyPreview();updateControls();
 }
 function block(event){event.preventDefault();event.stopImmediatePropagation();}
 function itemFromEvent(event){const target=event.target?.closest?.('[data-outfit-name]');return target?.closest('#pet-show')?target:null;}
 function rebase(){
  const points=[...pointers.values()];if(!points.length){gesture=null;return;}
  const midpoint=points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}:points[0];
  gesture={...midpoint,t:current(),distance:points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0};
 }
 document.addEventListener('pointerdown',event=>{
  if(!active)return;const item=itemFromEvent(event)||(event.pointerType==='touch'&&event.target?.closest?.('#pet-show')?[...document.querySelectorAll('#pet-show [data-outfit-name]')].find(node=>node.dataset.outfitName===selected):null);if(!item||event.button>0)return;
  const name=item.dataset.outfitName;if(pointers.size&&(name!==selected||pointers.size>=2))return;
  block(event);if(!pointers.size){selected=name;applyPreview();updateControls();if(panel)panel.querySelector('#outfit-adjust-item').value=name;}
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,node:item});
  try{item.setPointerCapture(event.pointerId);}catch(_){/* Synthetic pointer events may have no active pointer. */}rebase();
 },true);
 document.addEventListener('pointermove',event=>{
  if(!active||!pointers.has(event.pointerId)||!gesture)return;block(event);
  const point=pointers.get(event.pointerId);point.x=event.clientX;point.y=event.clientY;
  const points=[...pointers.values()],frame=point.node.closest('.dressed')?.getBoundingClientRect();if(!frame?.width||!frame?.height)return;
  const middle=points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}:points[0];
  const distance=points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0;
  update({x:gesture.t.x+(middle.x-gesture.x)/frame.width*100,y:gesture.t.y+(middle.y-gesture.y)/frame.height*100,scale:gesture.distance>0?gesture.t.scale*distance/gesture.distance:gesture.t.scale});
 },true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,event=>{
  if(!pointers.has(event.pointerId))return;if(type!=='lostpointercapture')block(event);pointers.delete(event.pointerId);rebase();
 },true);
 document.addEventListener('click',event=>{if(active&&itemFromEvent(event))block(event);},true);
 const api=global.OutfitAdjuster={style,begin,finish,select,update,reset};
 if(bridge){
  const read=bridge.getState;bridge.getState=function(){return {...read.apply(this,arguments),outfitTransforms:copy(saved)};};
  const defaults=bridge.createDefaultState;bridge.createDefaultState=function(){return {...defaults.apply(this,arguments),outfitTransforms:{}};};
  const restore=bridge.setState;bridge.setState=function(snapshot){
   const before=saved;saved=cleanMap(snapshot?.outfitTransforms);discard();
   try{return restore.apply(this,arguments);}catch(error){saved=before;throw error;}finally{refresh();}
  };
  const canSwitch=bridge.canSwitch;bridge.canSwitch=function(){return !changed()&&canSwitch.apply(this,arguments);};
  const shift=bridge.shiftPetReferences;bridge.shiftPetReferences=function(start,offset){
   const result=shift.apply(this,arguments),next=dictionary();
   for(const id of Object.keys(saved)){const target=Number(id)>=start?Number(id)+offset:Number(id);if(Number.isSafeInteger(target)&&target>=0)next[target]=saved[id];}
   saved=next;if(draftPet!==null&&draftPet>=start)draftPet+=offset;return result;
  };
 }
 function wrap(name,handler){const original=global[name];if(typeof original==='function')global[name]=function(){return handler.call(this,original,arguments);};}
 wrap('renderPetDress',function(original,args){const result=original.apply(this,args);stopPointers();refresh();return result;});
 wrap('pickDressPet',function(original,args){if(typeof getPet==='function'&&getPet(args[0])&&(typeof petUnlocked!=='function'||petUnlocked(args[0])))discard();return original.apply(this,args);});
 wrap('setDressMode',function(original,args){discard();return original.apply(this,args);});
 wrap('resetDress',function(original,args){discard();return original.apply(this,args);});
 wrap('commitDress',function(original,args){
  const previous=saved;
  if(draftPet===petId()&&draft){saved=cleanMap(saved);const next=cleanItems(draft);if(Object.keys(next).length)saved[draftPet]=next;else delete saved[draftPet];}
  try{const result=original.apply(this,args);if(result===true)discard();else saved=previous;refresh();return result;}catch(error){saved=previous;refresh();throw error;}
 });
 if(global.AccountManager?.ready)global.AccountManager.ready.then(refresh);
})(window);
