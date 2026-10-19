/* Price display and checkout; cash items stay locked until real payment is connected. */
(()=>{
 'use strict';
 function label(o){return o.currency==='cash'?'¥'+o.price:o.price?o.price+'鱼币':'免费';}
 function missing(names){return [...new Set(names)].map(n=>OUTFITS.findIndex(o=>o.name===n)).filter(i=>i>=0&&!outfitOwned(i));}
 function close(){document.getElementById('wardrobe-checkout')?.remove();}
 function open(ids,wear=true){
  close();const unique=[...new Set(ids)].filter(i=>OUTFITS[i]&&!outfitOwned(i));if(!unique.length)return;
  const items=unique.map(i=>OUTFITS[i]),cash=items.some(o=>o.currency==='cash'),fish=items.filter(o=>o.currency!=='cash').reduce((sum,o)=>sum+o.price,0);
  const root=document.createElement('div');root.id='wardrobe-checkout';root.className='role-detail sheet-mask show';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','解锁装扮');
  const sheet=document.createElement('div');sheet.className='sheet wardrobe-checkout-sheet';const title=document.createElement('h3');title.textContent=wear?'解锁后就能穿上啦':'解锁装扮';sheet.append(title);
  for(const o of items){const row=document.createElement('div');row.className='wardrobe-checkout-row';const name=document.createElement('span'),price=document.createElement('b');name.textContent=o.name;price.textContent=label(o);row.append(name,price);sheet.append(row);}
  const note=document.createElement('p');note.className='wardrobe-checkout-note';note.textContent=cash?'1元装扮的支付暂未开通，可以继续试穿。':coins<fish?'还差'+(fish-coins)+'鱼币；当前有'+coins+'鱼币。':'当前有'+coins+'鱼币，确认后兑换并保存在当前账号。';sheet.append(note);
  const confirm=document.createElement('button');confirm.type='button';confirm.className='btn';confirm.textContent=cash?'支付暂未开通':fish+'鱼币兑换'+(wear?'并穿上':'');confirm.disabled=cash||coins<fish;
  confirm.onclick=()=>{if(cash||coins<fish)return;if(wear)commitDress(unique);else purchaseOutfits(unique);};sheet.append(confirm);
  const cancel=document.createElement('button');cancel.type='button';cancel.className='btn ghost';cancel.textContent='继续试穿';cancel.onclick=close;sheet.append(cancel);root.append(sheet);root.onclick=e=>{if(e.target===root)close();};document.body.append(root);cancel.focus();
 }
 window.WardrobeCommerce={label,missing,open,close};
})();
