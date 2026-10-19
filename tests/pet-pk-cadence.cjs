const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let now=0,serial=0;const timers=new Map(),listeners={};
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.style={};this.className='';this.textContent='';this.isConnected=true;this.classList={contains:k=>this.className.split(' ').includes(k),add:k=>this.className+=' '+k,remove:k=>this.className=this.className.split(' ').filter(c=>c!==k).join(' ')};}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children.forEach(n=>{n.isConnected=false;});this.children=[];this.append(...nodes);}
 before(node){this.parent.append(node);}
 after(node){this.parent.append(node);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.isConnected=false;}
 setAttribute(k,v){this[k]=v;}
 closest(selector){for(let n=this;n;n=n.parent)if(n.matches(selector))return n;return null;}
 matches(selector){return selector[0]==='.'?this.classList.contains(selector.slice(1)):selector[0]==='#'?this.id===selector.slice(1):false;}
 querySelectorAll(selector){return this.children.flatMap(n=>[...(n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const root=new Element(),nodes={};
function add(id,parent=root,cls=''){const node=new Element();node.id=id;node.className=cls;nodes[id]=node;parent.append(node);return node;}
const view=add('view-buddies',root,'active'),card=add('card',view,'card'),coin=add('coin-card'),rank=add('rank-card',view,'card'),row=add('pk-row',card,'pk-row');card.previousElementSibling=coin;
for(const id of ['pk-me','pk-opp','pk-name'])add(id,row);
for(const id of ['pk-react','pk-note','pk-settle-btn','pk-btn','pk-count','pk-bar-me','pk-bar-opp','pk-tag-me','pk-tag-opp'])add(id,card);
add('rank-list',rank);const sub=add('sub');
const document={hidden:false,createElement:tag=>new Element(tag),getElementById:id=>nodes[id]||root.querySelector('#'+id),querySelector:selector=>selector.includes('coin-card')?coin:selector.includes('.sub')?sub:root.querySelector(selector),querySelectorAll:selector=>root.querySelectorAll(selector),addEventListener:(name,fn)=>{(listeners[name]||=[]).push(fn);}};
let state={community:{pk:null,avatar:{}}};const pets=Array.from({length:15},(_,id)=>({name:'伙伴'+id,trait:(id>=9?id-9:id)%6}));
const context={document,Math:Object.assign(Object.create(Math),{random:()=>0}),console,Date,Promise,queueMicrotask,
 setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>999,clearInterval(){},
 CompanionProgress:{dayKey:()=> '2026-10-19'},AppProfileBridge:{getState:()=>state,persist(){},updateCommunity(fn){fn(state);return true;}},AccountManager:{ready:Promise.resolve()},
 curPet:10,appliedPK:3,buddyTab:1,pkState:0,pkDone:false,pkMyMin:0,pkOppMin:0,pkTimer:null,focusing:false,
 getPet:pid=>pets[pid],petDressedExpr:()=>'<art>',renderPetArt:()=>'<art>',petDressed:()=>'<art>',petUnlocked:()=>true,
 PLAZA:[{pet:3,name:'搭子'}],renderFriends(){},go(){},setBuddyTab(tab){context.buddyTab=tab;},toast(){},matchMedia:()=>({matches:false})};context.window=context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/pet-interactions.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/pet-pk.js'),'utf8'),context);
function advance(ms){const until=now+ms;let iterations=0;while(true){const item=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>until)break;assert.ok(++iterations<1000);now=item[1].at;timers.delete(item[0]);item[1].fn();}now=until;}
(async()=>{
 await Promise.resolve();await Promise.resolve();
 const api=context.PetPK,stage=()=>document.getElementById('pk-pet-stage');
 assert.equal(document.querySelectorAll('.pk-play').length,0,'PK has no manual interaction button');
 assert.equal(stage().dataset.scene,'idle');advance(7500);assert.equal(stage().dataset.scene,'play','two pets interact on their own');
 assert.equal(api.interact('bicker'),false,'busy animals finish the current scene');assert.equal(stage().dataset.scene,'play');
 advance(4200);assert.equal(api.isAnimating(),false);advance(7500);assert.equal(stage().dataset.scene,'bicker','automatic scenes vary without consecutive repeat');
 assert.equal(stage().querySelectorAll('.pet-emotion-lines').length,2,'each bickering pet has three emotion lines');
 advance(1500);assert.equal(stage().querySelectorAll('.pet-emotion-lines').length,0,'PK emotion strokes are brief');
 advance(1100);assert.equal(stage().dataset.scene,'reconcile','bickering visibly becomes reconciliation');assert.ok(stage().querySelectorAll('.pk-bubble').every(n=>n.textContent));
 advance(3400);assert.equal(stage().dataset.scene,'idle');assert.ok(stage().querySelectorAll('.pk-bubble').every(n=>!n.textContent),'reconciliation dialogue also clears');
 assert.equal(api.interact('eat'),true);assert.equal(stage().dataset.scene,'eat');assert.equal(stage().querySelectorAll('.pk-bubble')[0].textContent,'你先吃呀','shy pet uses its own dining voice');
 document.hidden=true;listeners.visibilitychange.forEach(fn=>fn());assert.equal(api.isAnimating(),false);assert.equal(timers.size,0,'hidden page clears all interaction timers');advance(60000);assert.equal(stage().dataset.scene,'idle');
 document.hidden=false;listeners.visibilitychange.forEach(fn=>fn());assert.equal(api.isAnimating(),true,'returning to PK starts a fresh visible scene');
 context.buddyTab=0;context.setBuddyTab(0);assert.equal(api.isAnimating(),false);assert.equal(timers.size,0,'tab switch cancels scene and next-turn timers');
 context.buddyTab=1;context.setBuddyTab(1);advance(4200);api.restored();assert.equal(api.isAnimating(),false);assert.equal(stage().dataset.scene,'idle','account restoration clears stale scenes');
 context.focusing=true;advance(7500);assert.equal(api.isAnimating(),false,'focus work is never interrupted by automatic PK');
 context.focusing=false;advance(7500);assert.equal(api.isAnimating(),true,'loop resumes after busy work');
 view.className='';context.go('home');assert.equal(timers.size,0,'leaving the page releases the loop');
 console.log('PASS PK cadence: automatic varied scenes, six-trait dining voice, busy guard, brief lines, visible reconciliation, hidden/tab/account cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
