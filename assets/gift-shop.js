/* Optional cash gifts never change the free companion/focus experience. */
(()=>{
 'use strict';
 const catalog=[
  {id:'first',name:'首充伙伴礼包 · 煤球',price:.1,type:'companion',petId:11,items:['煤球']},
  {id:'starter',name:'暖屋新手装扮包',price:1,type:'decor',items:['暖橘抱枕','毛线球','绿植','圆地毯']},
  {id:'window',name:'窗边小确幸装扮包',price:1,type:'decor',items:['月亮挂饰','星星串','雨滴挂饰','彩虹挂画','玩具鼠']}
 ];
 function close(){document.getElementById('gift-shop')?.remove();}
 function button(label,click,ghost=false){const b=document.createElement('button');b.type='button';b.className='btn'+(ghost?' ghost':'');b.textContent=label;b.onclick=click;return b;}
 function preview(id){
  const gift=catalog.find(g=>g.id===id);if(!gift)return;const panel=document.getElementById('gift-preview');panel.replaceChildren();panel.hidden=false;
  const title=document.createElement('h3');title.textContent=gift.name;panel.append(title);const items=document.createElement('div');items.className='gift-items';
  for(const name of gift.items){const item=document.createElement('div');if(gift.type==='companion')item.innerHTML=renderPetArt(gift.petId,90,true);else{const img=document.createElement('img');img.src=RoomDecor.source(name);img.alt=name;item.append(img);}const label=document.createElement('span');label.textContent=name;item.append(label);items.append(item);}panel.append(items);for(const name of gift.items){const rule=window.RewardAccess?.details(name);if(!rule)continue;const row=document.createElement('div');row.className='gift-free-path';row.textContent=name+'也可免费获得：'+RewardAccess.requirement(rule);row.append(button(RewardAccess.owns(name)?'已拥有':'查看免费解锁',()=>RewardAccess.open(name),true));panel.append(row);}
  const owned=gift.type==='companion'&&petUnlocked(gift.petId),note=document.createElement('p');note.textContent=owned?'煤球已经是你的伙伴啦，无需再次购买。':'可以先看看，支付开放后再购买。';panel.append(note);
  const pay=button(owned?'已拥有':'支付暂未开放',()=>{});pay.disabled=true;panel.append(pay);
  panel.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 function open(){
  close();document.getElementById('home-menu')?.classList.remove('show');const root=document.createElement('div');root.id='gift-shop';root.className='role-detail show';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','装扮小铺');const sheet=document.createElement('div');sheet.className='sheet';
  const h=document.createElement('h2');h.textContent='装扮小铺';const note=document.createElement('p');note.textContent='免费玩儿 · 专注、陪伴与日常玩法永久免费';sheet.append(h,note);
  for(const gift of catalog){const card=document.createElement('div');card.className='gift-card';const title=document.createElement('h3');title.textContent=gift.name;const description=document.createElement('p');description.textContent=gift.type==='companion'?'可免费通过累计签到领取，也可选择首充解锁':gift.items.length+'件玩具与装饰 · '+gift.items.join('、');const price=document.createElement('strong');price.textContent='¥'+gift.price.toFixed(2);const show=button('查看礼包',()=>preview(gift.id),true);show.dataset.preview=gift.id;card.append(title,description,price,show);sheet.append(card);}
  const panel=document.createElement('div');panel.id='gift-preview';panel.hidden=true;sheet.append(panel,button('收起小铺',close,true));root.append(sheet);root.onclick=e=>{if(e.target===root)close();};document.body.append(root);
 }
 window.GiftShop={catalog,open,close,preview};window.openGiftShop=open;
})();
