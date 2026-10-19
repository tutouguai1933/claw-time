/* Supplied art and species anchors are independent of the current character list. */
(()=>{
 'use strict';
 const catalog=[
  {name:'小红帽',id:'red-cap',slot:'head',x:45,y:5,w:78,price:100},
  {name:'三好学生围巾',id:'student-scarf',slot:'neck',x:52,y:75,w:48,price:50},
  {name:'伞',id:'umbrella',slot:'hand',x:64,y:28,w:111,price:100},
  {name:'耳暖',id:'earmuffs',slot:'head',x:50,y:29,w:106,price:100},
  {name:'帅气披风',id:'cape',slot:'neck',x:55,y:74,w:52,price:200},
  {name:'毛绒围巾',id:'fluffy-scarf',slot:'neck',x:51,y:78,w:53,price:100},
  {name:'雨衣',id:'raincoat',slot:'outer',covers:['head','neck','outer'],x:50,y:43,w:76,price:1,currency:'cash'},
  {name:'今天我生日',id:'birthday',slot:'head',x:50,y:-7,w:43,price:1,currency:'cash'},
  {name:'圣诞帽',id:'santa',slot:'head',x:52,y:0,w:77,price:1,currency:'cash'}
 ].map(o=>({currency:'fish',...o,img:'assets/outfits/'+o.id+'.svg',supplied:true}));
 // Transform the dog reference frame into the visible animal's head/body frame.
 const profiles={dog:{x:50,y:0,s:1},cat:{x:50,y:7,s:.76},lizard:{x:48,y:17,s:.75},snake:{x:44,y:12,s:.62},fish:{x:29,y:24,s:.55},drawn:{x:50,y:6,s:.86}};
 function sourceId(pid){const p=getPet(pid);return window.BreedCreator?.shape(p)?.id??(p?.custom&&Number.isInteger(p.breedSource)?p.breedSource:pid);}
 function anchor(pid){pid=sourceId(pid);const p=getPet(pid);if(pid<6||p?.catalogCat)return profiles.dog;if(p?.custom&&['cat','dog'].includes(p.kind))return profiles.cat;return profiles[p?.kind]||profiles.cat;}
 // Approved v4 bases have matching chin baselines; each expression keeps that base.
 const catNeckY=[0,.5,0,.5,0,0];
 function neckOffset(pid){const p=getPet(sourceId(pid));return p?.catalogCat?catNeckY[p.catIndex]||0:0;}
 function legacyOffset(name,pid){const p=getPet(sourceId(pid));if(p?.catalogCat){if(name==='胡砸')return 15;if(name==='圣诞袜')return 5;if(name==='懒羊羊口水巾')return 7;if(name==='左眼是为了…')return 7;if(name==='俺是外星人')return [3,4].includes(p.catIndex)?11:9;if(name==='321跪')return 8;}if(p?.kind==='lizard')return ({'俺是外星人':5,'圣诞袜':5,'左眼是为了…':5,'321跪':4})[name]||0;if(p?.kind==='snake'&&name==='321跪')return 3;return 0;}
 function legacyX(name,pid){return getPet(sourceId(pid))?.kind==='snake'&&name==='321跪'?-3:0;}
 function fitting(id,pid){const p=getPet(sourceId(pid));if(p?.catalogCat){const fit=({'red-cap':{y:5},'student-scarf':{y:5},umbrella:{y:4},earmuffs:{y:5},cape:{y:6},'fluffy-scarf':{y:p.catIndex>=2?4.5:3},birthday:{y:14,s:.78},santa:{y:10,s:.8}})[id];return {x:0,y:0,s:1,...fit};}if(p?.kind==='snake')return {x:0,y:0,s:1,...({'red-cap':{x:-3},'student-scarf':{y:9,s:1.45},'fluffy-scarf':{y:9,s:1.4},cape:{y:9,s:1.45},earmuffs:{x:-4,s:1.2},umbrella:{s:1.25},raincoat:{y:-3,s:1.45}})[id]};if(p?.kind==='lizard'&&id==='earmuffs')return {x:0,y:-2,s:1.15};return {x:0,y:0,s:1};}
 function layer(o,pid,size,editable,color){
  const a=anchor(pid),f=fitting(o.id,pid),x=a.x+(o.x-50)*a.s+f.x,y=a.y+o.y*a.s+(o.slot==='neck'?neckOffset(pid):0)+f.y,w=size*o.w/100*a.s*f.s;
  const blue=o.id==='raincoat'&&color==='blue',click=editable?' onclick="event.stopPropagation();removeOutfitFromPreview(\''+o.name+'\')"':'';
  const imageStyle='display:block;width:100%;height:auto;pointer-events:none;'+(blue?'filter:hue-rotate(151deg) saturate(.85);':'');
  let image='<img src="'+o.img+'" alt="" style="'+imageStyle+'">';
  if(o.id==='raincoat'){
   const source=sourceId(pid),p=getPet(source),jacketY=p?.catalogCat?[0,0,2,2,2,2][p.catIndex]:[2,5].includes(source)?-4:0,hoodY=p?.catalogCat?[5,8,7,7,7,7][p.catIndex]:0;
   // The source's transparent gap separates hood (588–1029) and jacket (1413–1717).
   // Clip each part from the same untouched image; move only the relevant part.
   image='<img data-raincoat-part="hood" src="'+o.img+'" alt="" style="'+imageStyle+'clip-path:inset(0 0 50% 0);transform:translateY('+(size*hoodY/100)+'px);">'+
    '<img data-raincoat-part="jacket" src="'+o.img+'" alt="" style="'+imageStyle+'position:absolute;inset:0;clip-path:inset(50% 0 0 0);transform:translateY('+(size*jacketY/100)+'px);">';
  }
  return '<span class="supplied-outfit" data-outfit="'+o.id+'" data-outfit-name="'+o.name+'" data-color="'+(blue?'blue':'yellow')+'" style="position:absolute;left:'+x+'%;top:'+y+'%;width:'+w+'px;transform:translate(-50%,-50%) translate(var(--outfit-dx,0px),var(--outfit-dy,0px)) scale(var(--outfit-scale,1));'+(window.OutfitAdjuster?.style(o.name,pid,size,editable)||'')+(editable?'cursor:pointer;':'pointer-events:none;')+'"'+click+'>'+image+(editable?'<span class="outfit-x">×</span>':'')+'</span>';
 }
 function clashes(a,b){return (a.covers||[a.slot]).some(slot=>(b.covers||[b.slot]).includes(slot));}
 window.SuppliedOutfits={catalog,profiles,anchor,layer,clashes,legacyOffset,legacyX};
})();
