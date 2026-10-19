const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let now=0,serial=0,reduced=false;const timers=new Map(),listeners={};
function element(tag='div'){
 const classes=new Set();return {tag,isConnected:true,dataset:{},style:{},children:[],textContent:'',
  classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},
  setAttribute(k,v){this[k]=v;},append(...nodes){nodes.forEach(n=>{n.parent=this;this.children.push(n);});},
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.isConnected=false;},
  querySelector(selector){return selector==='.cb'?this.bubble:null;}};
}
const document={hidden:false,createElement:element,addEventListener:(name,fn)=>listeners[name]=fn};
const pets=Array.from({length:6},(_,trait)=>({trait}));
const context={window:{matchMedia:()=>({matches:reduced})},document,getPet:pid=>pets[pid],
 setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),Math,console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/pet-interactions.js'),'utf8'),context);
const api=context.window.PetInteractions;
function advance(ms){const until=now+ms;while(true){const item=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>until)break;now=item[1].at;timers.delete(item[0]);item[1].fn();}now=until;}
assert.equal(typeof api.emote,'function','home and PK share the emotion-line lifecycle');
const host=element();host.bubble=element('span');
api.emote(host,'bicker');assert.equal(host.children.length,1);assert.equal(host.children[0].children.length,3,'only three brief strokes per animal');
assert.equal(host.children[0]['aria-hidden'],'true','decoration stays out of screen-reader dialogue');
advance(1500);assert.equal(host.children.length,0,'emotion strokes disappear promptly');assert.equal(timers.size,0);
api.emote(host,'grumble');api.emote(host,'bicker');assert.equal(host.children.length,1,'new mood replaces the previous strokes');assert.equal(timers.size,1);
api.emote(host,'reconcile');assert.equal(host.children.length,0,'reconciliation clears strokes immediately');assert.equal(timers.size,0);
reduced=true;api.emote(host,'bicker');assert.equal(host.children.length,1,'reduced motion preserves a static emotion cue');advance(1500);assert.equal(host.children.length,0);reduced=false;
api.emote(host,'bicker');document.hidden=true;listeners.visibilitychange();assert.equal(host.children.length,0,'background tabs clear emotion decorations');assert.equal(timers.size,0);
assert.equal(api.emote(host,'bicker'),null,'background tabs cannot create more decorations');document.hidden=false;
api.emote(host,'bicker');api.reset();assert.equal(host.children.length,0,'account reset clears effects');assert.equal(timers.size,0,'account reset cancels effect timers');
host.isConnected=false;assert.equal(api.emote(host,'bicker'),null,'detached animals cannot receive decorations');host.isConnected=true;
const a={dogIdx:3,el:host,home:{x:0,y:0}},b={dogIdx:1,el:element(),home:{x:40,y:40}},container={contains:n=>n===a.el||n===b.el};b.el.bubble=element('span');
host.dataset.petMood='cling';assert.equal(api.encounter(a,b,container),null,'automatic encounter leaves active speech alone');
assert.equal(api.group([a,b],container,{routes:[[],[]]}),null,'automatic group also preserves active speech');delete host.dataset.petMood;
document.hidden=true;assert.equal(api.pair(a,b,container),null,'hidden home cannot start dialogue');document.hidden=false;
api.configure({random:()=>0});let disagreement;
for(let i=0;i<7;i++){const reaction=api.pair(a,b,container);if(reaction.kind==='bicker'){disagreement=reaction;break;}}
assert.ok(disagreement);assert.equal(host.children.length,1,'home disagreements use the same strokes');assert.equal(b.el.children.length,1);
advance(2300);assert.equal(host.dataset.petMood,'reconcile');assert.equal(host.children.length,0);assert.equal(b.el.children.length,0);
api.reset();reduced=true;host.dataset.petMood='idle';b.el.dataset.petMood='idle';
assert.ok(api.encounter(a,b,container),'neutral idle mood may join a meeting');api.reset();
console.log('PASS emotion lines: sparse temporary strokes, replacement, reconciliation, reduced motion, hidden page, reset and busy guards');
