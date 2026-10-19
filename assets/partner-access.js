/* Unlock cards use the same per-account ownership as every character picker. */
(()=>{
 'use strict';
 const dogs=[{type:'free'},{type:'signin',days:2},{type:'fish',price:100},{type:'fish',price:100},{type:'fish',price:200},{type:'signin',days:3}];
 const cats=[{type:'fish',price:100},{type:'free'},{type:'signin',days:3},{type:'fish',price:100},{type:'signin',days:5},{type:'fish',price:100}];
 function policy(pid){const p=getPet(pid);return {...(pid<6?dogs[pid]:p?.catalogCat?cats[p.catIndex]:{type:'free'})};}
 function label(pid){const rule=policy(pid);return rule.type==='fish'?rule.price+'鱼币兑换':rule.type==='signin'?'累计签到'+rule.days+'天领取':'免费领取';}
 function days(){return new Set(window.AppProfileBridge?.getState().community?.checkinDays||[]).size;}
 function close(){document.getElementById('partner-acquire')?.remove();}
 function claim(pid){
  if(!getPet(pid))return false;if(petUnlocked(pid)){close();return true;}
  const rule=policy(pid);if(rule.type==='fish'&&coins<rule.price||rule.type==='signin'&&days()<rule.days)return false;
  const list=pid<6?ROLE_UNLOCK:EXTRA_UNLOCK,index=pid<6?pid:pid-PETS.length,before=list[index],balance=coins;
  list[index]=1;if(rule.type==='fish')coins-=rule.price;
  try{if(window.AppProfileBridge&&!AppProfileBridge.persist())throw new Error('storage');}
  catch(_){list[index]=before;coins=balance;toast('保存失败，没有扣除鱼币，请重试');return false;}
  close();renderRoles();renderHomePick();renderPetPick();renderSwap();renderFriends();toast(getPet(pid).name+'加入你的伙伴啦');return true;
 }
 function open(pid){
  const p=getPet(pid);if(!p)return;close();const rule=policy(pid),owned=petUnlocked(pid),count=days();
  const root=document.createElement('div');root.id='partner-acquire';root.className='role-detail show';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',p.name+'的获取方式');const sheet=document.createElement('div');sheet.className='sheet';
  const art=document.createElement('div');art.className='partner-unlock-art'+(owned?'':' locked');art.innerHTML=renderPetPortrait(pid,100);const h=document.createElement('h3');h.textContent=p.name+' · '+p.breed;const text=document.createElement('p');text.textContent=label(pid);sheet.append(art,h,text);
  const status=document.createElement('p');status.className='partner-acquire-note';status.textContent=owned?'已经是你的伙伴啦':rule.type==='signin'?'已累计签到'+count+'天 · '+Math.min(count,rule.days)+'/'+rule.days:rule.type==='fish'?'当前有'+coins+'鱼币'+(coins<rule.price?'，还差'+(rule.price-coins)+'鱼币':''):'领取后就能一起陪伴啦';sheet.append(status);
  const claimButton=document.createElement('button');claimButton.type='button';claimButton.className='btn';claimButton.textContent=owned?'已拥有':rule.type==='fish'?rule.price+'鱼币兑换':rule.type==='signin'?'签到领取':'免费领取';claimButton.disabled=owned||rule.type==='fish'&&coins<rule.price||rule.type==='signin'&&count<rule.days;claimButton.onclick=()=>claim(pid);sheet.append(claimButton);
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='btn ghost';dismiss.textContent='关闭';dismiss.onclick=close;sheet.append(dismiss);root.append(sheet);root.onclick=e=>{if(e.target===root)close();};document.body.append(root);dismiss.focus();
 }
 window.PartnerAccess={policy,label,open,close,claim};
})();
