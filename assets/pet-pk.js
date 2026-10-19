/* Local experience matches. Remote player snapshots can replace the opponent adapter later. */
(()=>{
 'use strict';
 const P=CompanionProgress,$id=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let next=null,ending=null,animating=false,lastMode='',sceneEpoch=0,remainingModes=[],restoring=false,legacyDay=CompanionProgress.dayKey();
 const selected=()=>AppProfileBridge.getState().community.pk;
 const me=()=>{const p=selected();return (pkState===1||pkDone&&p?.day===P.dayKey())&&getPet(p?.mePet)?p.mePet:curPet;};
 const visible=()=>!document.hidden&&$id('view-buddies')?.classList.contains('active')&&buddyTab===1;
 const validOpp=()=>getPet(appliedPK)?appliedPK:0;
 function clearEmotions(stage){stage?.querySelectorAll('.pk-animal').forEach(host=>PetInteractions.emote(host,'idle'));}
 function stop(){sceneEpoch++;clearTimeout(next);clearTimeout(ending);next=ending=null;animating=false;const stage=$id('pk-pet-stage');if(stage){clearEmotions(stage);stage.dataset.scene='idle';stage.querySelectorAll('.pk-bubble').forEach(n=>n.textContent='');}}
 function schedule(){clearTimeout(next);next=null;const token=sceneEpoch;if(visible())next=setTimeout(()=>{next=null;if(token!==sceneEpoch||!visible())return;if(!interact())schedule();},7500+Math.random()*3000);}
 function animal(pid,expr,ours){const host=el('div');host.className='pk-animal '+(ours?'pk-animal-me':'pk-animal-opp');host.dataset.petId=pid;const speech=el('span');speech.className='pk-bubble';const art=el('div');art.className='pk-animal-art';art.innerHTML=ours?petDressedExpr(pid,90,false,expr):renderPetArt(pid,90,false,expr);host.append(speech,art,el('small',getPet(pid)?.name||'伙伴'));return host;}
 function showScene(stage,mode,own,opp){
  clearEmotions(stage);
  const reaction=PetInteractions.choose(getPet(own),'pk:'+mode,getPet(opp));
  stage.replaceChildren(animal(own,reaction.expression,true),animal(opp,reaction.otherExpression,false));
  const animals=stage.querySelectorAll('.pk-animal'),bubbles=stage.querySelectorAll('.pk-bubble');
  [reaction.text,reaction.otherText].forEach((text,i)=>{bubbles[i].textContent=Array.from(text||'').slice(0,10).join('');});
  stage.dataset.scene=mode;
  if(mode==='bicker')animals.forEach(host=>PetInteractions.emote(host,'bicker'));
 }
 function interact(requested){
  if(!visible()||animating||typeof focusing!=='undefined'&&focusing)return false;
  const stage=$id('pk-pet-stage');if(!stage||!stage.isConnected)return false;
  clearTimeout(next);next=null;
  if(!remainingModes.length)remainingModes=['play','bicker','eat'];
  const modes=remainingModes.filter(mode=>mode!==lastMode),available=modes.length?modes:remainingModes;
  const mode=['play','bicker','eat'].includes(requested)?requested:available[Math.floor(Math.random()*available.length)];
  remainingModes=remainingModes.filter(item=>item!==mode);lastMode=mode;
  const own=me(),opp=validOpp(),token=++sceneEpoch;
  const current=()=>token===sceneEpoch&&visible()&&stage.isConnected&&stage===$id('pk-pet-stage');
  showScene(stage,mode,own,opp);animating=true;
  const finish=()=>{ending=null;if(!current()){if(token===sceneEpoch)stop();return;}clearEmotions(stage);animating=false;stage.dataset.scene='idle';stage.querySelectorAll('.pk-bubble').forEach(n=>n.textContent='');schedule();};
  ending=setTimeout(()=>{ending=null;if(!current()){if(token===sceneEpoch)stop();return;}if(mode==='bicker'){showScene(stage,'reconcile',own,opp);ending=setTimeout(finish,3400);}else finish();},mode==='bicker'?2600:4200);
  return true;
 }
 function mount(){const pkCard=$id('pk-me').closest('.card'),rankCard=$id('rank-list').closest('.card');if(pkCard.previousElementSibling!==document.querySelector('#buddies-friends .coin-card'))rankCard.before(pkCard);const rankAvatar=$id('rank-list').querySelector('.me')?.closest('.rank-row')?.querySelector('.rk-pet');if(rankAvatar&&window.CommunityUI)rankAvatar.replaceChildren(CommunityUI.portrait(AppProfileBridge.getState().community.avatar,28));document.querySelector('#buddies-friends .page-title .sub').textContent='本地体验 · 陪伴 PK';document.querySelectorAll('.pk-play').forEach(button=>button.remove());let stage=$id('pk-pet-stage');if(!stage){stage=el('div');stage.id='pk-pet-stage';stage.className='pk-pet-stage';stage.setAttribute('aria-label','双方陪饭伙伴自动互动');$id('pk-react').before(stage);const label=el('label','体验对手的陪饭伙伴'),choice=el('select');choice.id='pk-opponent-choice';label.className='pk-opponent-picker';label.append(choice);$id('pk-me').closest('.pk-row').before(label);choice.onchange=()=>{if(pkState===1)return;appliedPK=+choice.value;AppProfileBridge.persist();render();interact();};}
  const choice=$id('pk-opponent-choice');choice.replaceChildren();const options=new Map(PLAZA.map(p=>[getPet(p.pet)?p.pet:14,p.name]));options.set(validOpp(),options.get(validOpp())||'体验搭子');for(const [pid,name]of options){const o=el('option',name+' · '+getPet(pid).name);o.value=pid;choice.append(o);}choice.value=validOpp();choice.disabled=pkState===1;
  const current=me(),opponent=validOpp();for(const [id,pid,ours]of [['pk-me',current,true],['pk-opp',opponent,false]]){const host=el('span');host.dataset.pkPet=pid;host.innerHTML=ours?petDressed(pid,44,false):renderPetArt(pid,44,false);$id(id).replaceChildren(host);}
  $id('pk-name').textContent=getPet(opponent).name;$id('pk-note').textContent='体验对局 · 双方陪饭伙伴，暂未联网';$id('pk-settle-btn').textContent='结束本次体验';$id('pk-settle-btn').style.display=pkState===1?'block':'none';$id('pk-btn').textContent=pkState===1?'体验进行中 · 今天一起专注':pkDone&&selected()?.day===P.dayKey()?'今日体验已结束':'发起今日体验 PK';
  $id('pk-react').classList.remove('show');stage.replaceChildren(animal(current,0,true),animal(opponent,0,false));stage.dataset.scene='idle';bar();if(pkState!==1)$id('pk-count').textContent='比较今日专注分钟 · 体验结果不发放奖励';
 }
 function render(){stop();mount();schedule();}
 function commit(work){const before={pkState,pkDone,pkMyMin,pkOppMin};if(AppProfileBridge.updateCommunity(work))return true;({pkState,pkDone,pkMyMin,pkOppMin}=before);toast('保存失败，对局状态已保留');render();return false;}
 function start(){const today=P.dayKey();if(pkState===1){toast('今天的体验正在进行中');return false;}if(pkDone&&selected()?.day===today){toast('今日体验已结束，明天再一起加油');return false;}if(!petUnlocked(curPet)){toast('先选一位已拥有的陪饭伙伴');return false;}
  if(!commit(d=>{d.community.pk={day:today,mePet:curPet};pkState=1;pkDone=false;pkMyMin=0;pkOppMin=25+validOpp()%4*10;}))return false;render();interact('play');clearInterval(pkTimer);pkTimer=setInterval(countdown,1000);countdown();toast('两位伙伴来陪你专注啦 · 当前为体验对局');return true;
 }
 function settle(){if(pkState!==1)return false;const win=pkMyMin>=pkOppMin;if(!commit(()=>{pkState=0;pkDone=true;}))return false;clearInterval(pkTimer);pkTimer=null;render();interact('eat');$id('pk-count').textContent=win?'体验完成 · 这次你更专注！':'体验完成 · 明天一起加油';toast('体验结束，伙伴们一起开饭啦');return true;}
 function countdown(){if(pkState!==1)return;const day=selected()?.day||legacyDay,end=new Date(day+'T00:00:00');end.setDate(end.getDate()+1);const diff=end.getTime()-Date.now();if(diff<=0){settle();return;}const h=String(Math.floor(diff/3600000)).padStart(2,'0'),m=String(Math.floor(diff/60000)%60).padStart(2,'0'),s=String(Math.floor(diff/1000)%60).padStart(2,'0');$id('pk-count').textContent='体验对局 · 距今日结束 '+h+':'+m+':'+s;}
 function bar(){const total=Math.max(pkMyMin,pkOppMin,1);$id('pk-bar-me').style.width=pkMyMin/total*50+'%';$id('pk-bar-opp').style.width=pkOppMin/total*50+'%';$id('pk-tag-me').textContent=getPet(me())?.name+' '+pkMyMin+' 分钟';$id('pk-tag-opp').textContent=getPet(validOpp()).name+' '+pkOppMin+' 分钟（体验）';}
 function restored(){legacyDay=P.dayKey();lastMode='';remainingModes=[];stop();clearInterval(pkTimer);pkTimer=null;render();if(pkState===1&&!restoring){restoring=true;queueMicrotask(()=>{restoring=false;if(pkState===1&&!selected()?.day)AppProfileBridge.updateCommunity(d=>{d.community.pk={day:legacyDay,mePet:curPet};});countdown();if(pkState===1)pkTimer=setInterval(countdown,1000);});}}
 const oldRender=renderFriends;window.renderFriends=function(){oldRender.apply(this,arguments);render();};window.startPK=start;window.settlePK=settle;window.pkCountdown=countdown;window.renderPKBar=bar;
 const oldGo=go;window.go=function(){const result=oldGo.apply(this,arguments);if(visible()){render();interact('play');}else stop();return result;};const oldTab=setBuddyTab;window.setBuddyTab=function(){const result=oldTab.apply(this,arguments);if(visible()){render();interact();}else stop();return result;};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{countdown();if(visible()){render();interact();}}});
 window.PetPK={interact,restored,isAnimating:()=>animating};AccountManager.ready.then(()=>{if(pkState===1&&!selected()?.day)AppProfileBridge.updateCommunity(d=>{d.community.pk={day:legacyDay,mePet:curPet};});restored();});
})();
