/* Real per-account rewards, shared by achievements, gift previews and room editing. */
(()=>{
 'use strict';
 const rules=[{id:'first-hour',label:'第一小时的陪伴',hours:1,coins:20},
  {id:'decor-mouse',label:'玩具鼠',decor:['玩具鼠'],hours:5,days:7,price:1},
  {id:'decor-rainbow',label:'彩虹挂画',decor:['彩虹挂画'],hours:15,days:14,price:1},
  ...CompanionProgress.titles.filter(t=>t.hours).map(t=>({id:t.id,label:t.name,hours:t.hours,coins:Math.min(250,t.hours/2),outfits:({100:['小红帽'],200:['耳暖'],300:['帅气披风'],500:['雨衣'],700:['今天我生日'],1000:['圣诞帽']})[t.hours]||[]}))];
 let dialog=null;
 const state=()=>AppProfileBridge.getState();
 function stats(s=state()){return {hours:(s.focusRecords||[]).reduce((sum,r)=>sum+(Number.isFinite(r.minutes)&&r.minutes>0?r.minutes:0),0)/60,days:new Set(s.visitDays||[]).size};}
 function eligible(r,s=state()){const v=stats(s);return v.hours>=r.hours||!!r.days&&v.days>=r.days;}
 function details(name){return rules.find(r=>r.decor?.includes(name));}
 function owns(name){const rule=details(name);if(!rule)return !DECOR.find(d=>d.name===name)?.lock;const s=state();return s.community.decorOwned.includes(name)||(s.house?.decor||[]).some(p=>p.name===name);}
 function rewardText(r){return [...(r.coins?[r.coins+'鱼币']:[]),...(r.outfits||[]),...(r.decor||[])].join(' + ');}
 function requirement(r){return '专注'+r.hours+'小时'+(r.days?'或累计登录'+r.days+'天':'');}
 function claim(id){const r=rules.find(r=>r.id===id);if(!r||!eligible(r)||state().community.rewardClaims.includes(id))return false;
  const ok=AppProfileBridge.updateCommunity(d=>{if(d.community.rewardClaims.includes(id))return false;d.community.rewardClaims.push(id);d.coins+=r.coins||0;for(const name of r.decor||[])if(!d.community.decorOwned.includes(name))d.community.decorOwned.push(name);for(const name of r.outfits||[]){const i=OUTFITS.findIndex(o=>o.name===name);if(i>=0&&!d.ownedOutfits.includes(i))d.ownedOutfits.push(i);}});
  if(!ok){toast('保存失败，奖励未领取，请重试');return false;}renderTray();renderPetDress();renderFriends();toast('奖励已领取：'+rewardText(r));return true;
 }
 function button(text,fn){const b=document.createElement('button');b.type='button';b.className='btn ghost';b.textContent=text;b.onclick=fn;return b;}
 function close(){if(dialog){dialog.close();dialog.remove();dialog=null;}}
 function open(name){const r=details(name);if(!r)return;close();dialog=document.createElement('dialog');dialog.className='community-dialog reward-dialog';dialog.id='reward-unlock';const h=document.createElement('h2');h.textContent=name+' · 解锁方式';const img=document.createElement('img');img.src=RoomDecor.source(name);img.alt=name;img.className='reward-art';const s=stats(),note=document.createElement('p');note.textContent='免费路径：'+requirement(r)+'。当前专注'+Number(s.hours.toFixed(2))+'小时，累计登录'+s.days+'天。';const free=button(owns(name)?'已拥有':eligible(r)?'免费领取':'继续积累即可免费领取',()=>{if(claim(r.id))close();});free.disabled=owns(name)||!eligible(r);const pay=button('¥'+r.price+'购买 · 支付暂未开放',()=>{});pay.disabled=true;const why=document.createElement('p');why.textContent='免费领取与购买获得同一件物品，已有权益不会重复扣费。';dialog.append(h,img,note,free,pay,why,button('关闭',close));dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);dialog.showModal();}
 function decorateAchievements(root){
  const list=root.querySelector('.achievement-list');if(!list)return;const section=document.createElement('section');section.className='earned-early';const heading=document.createElement('h3');heading.textContent='陪伴也会收到小礼物';section.append(heading);
  for(const r of rules.filter(r=>!r.id.startsWith('hours-'))){const row=document.createElement('div');row.className='earned-reward-row';const text=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');b.textContent=r.label;small.textContent=requirement(r)+' · '+rewardText(r);text.append(b,small);const claimed=state().community.rewardClaims.includes(r.id),take=button(claimed?'已领取':'领取奖励',()=>{if(claim(r.id))CommunityUI.openAchievements();});take.disabled=claimed||!eligible(r);row.append(text,take);section.append(row);}root.insertBefore(section,list);
  for(const row of list.querySelectorAll('[data-title]')){const r=rules.find(r=>r.id===row.dataset.title);if(!r)continue;const note=document.createElement('small');note.textContent='奖励：'+rewardText(r);row.firstChild.append(note);if(!eligible(r))continue;const claimed=state().community.rewardClaims.includes(r.id),take=button(claimed?'奖励已领':'领取奖励',()=>{if(claim(r.id))CommunityUI.openAchievements();});take.disabled=claimed;take.setAttribute('aria-label','领取'+r.hours+'小时奖励');row.append(take);}
 }
 window.RewardAccess={rules,claim,owns,details,open,close,eligible,rewardText,requirement,decorateAchievements,restored:close};
 AccountManager.ready.then(()=>renderTray());
})();
