/* A complete clickable roster, including cats and creations, for mouse and touch. */
(()=>{
 'use strict';
 let dialog=null,filter='all',trigger=null;
 const groups=[['all','全部'],['dog','小狗'],['cat','小猫'],['other','其他'],['created','自创']];
 function kind(p,pid){return p.custom||p.kind==='drawn'?'created':pid<6?'dog':p.catalogCat?'cat':'other';}
 function close(){if(dialog){dialog.close();dialog.remove();dialog=null;}trigger?.focus();}
 function render(){if(!dialog)return;const grid=dialog.querySelector('.wardrobe-roster');grid.replaceChildren();dialog.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===filter)));const pets=allPets().map((p,pid)=>({p,pid})).filter(({p,pid})=>getPet(pid)&&(filter==='all'||kind(p,pid)===filter));
  if(!pets.length){const empty=document.createElement('p');empty.textContent='这里还没有伙伴，画一只或捏一只就能加入。';grid.append(empty);}
  for(const {p,pid}of pets){const b=document.createElement('button');b.type='button';b.className='wardrobe-partner'+(petUnlocked(pid)?'':' locked');b.dataset.dressPet=pid;b.setAttribute('aria-pressed',String(pid===dressPet));const art=document.createElement('span');art.innerHTML=renderPetPortrait(pid,58);const name=document.createElement('b');name.textContent=p.name;const note=document.createElement('small');note.textContent=petUnlocked(pid)?p.breed||'专属伙伴':PartnerAccess.label(pid);b.append(art,name,note);b.onclick=()=>{close();pickDressPet(pid);};grid.append(b);}
 }
 function open(){close();trigger=document.getElementById('wardrobe-all-pets');filter='all';dialog=document.createElement('dialog');dialog.id='wardrobe-pet-dialog';dialog.className='community-dialog';const header=document.createElement('header'),title=document.createElement('h2'),done=document.createElement('button');title.textContent='选择装扮伙伴';done.type='button';done.textContent='×';done.className='community-close';done.setAttribute('aria-label','关闭伙伴选择');done.onclick=close;header.append(title,done);const note=document.createElement('p');note.textContent='猫狗、其他动物和自创伙伴都在这里。切换会重置当前未确认的试穿。';const tabs=document.createElement('div');tabs.className='wardrobe-roster-tabs';for(const [key,text]of groups){const b=document.createElement('button');b.type='button';b.dataset.group=key;b.textContent=text;b.onclick=()=>{filter=key;render();};tabs.append(b);}const grid=document.createElement('div');grid.className='wardrobe-roster';dialog.append(header,note,tabs,grid);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);render();dialog.showModal();}
 function mount(){if(document.getElementById('wardrobe-all-pets'))return;const toolbar=document.createElement('div');toolbar.className='wardrobe-roster-toolbar';const label=document.createElement('b');label.id='wardrobe-current-partner';const show=document.createElement('button');show.type='button';show.className='btn ghost';show.id='wardrobe-all-pets';show.textContent='全部伙伴 ▾';show.onclick=open;toolbar.append(label,show);document.getElementById('pet-pick').before(toolbar);}
 function refresh(){mount();document.getElementById('wardrobe-current-partner').textContent='正在装扮：'+(getPet(dressPet)?.name||'伙伴');}
 const original=renderPetPick;window.renderPetPick=function(){const result=original.apply(this,arguments);refresh();return result;};
 const restore=AppProfileBridge.setState;AppProfileBridge.setState=function(){close();return restore.apply(this,arguments);};
 window.WardrobePartners={open,close};AccountManager.ready.then(refresh);
})();
