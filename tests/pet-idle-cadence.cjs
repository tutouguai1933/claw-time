const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let now=0,serial=0,reduced=false,random=.2;
const timers=new Map(),sceneCrowds=new WeakMap(),listeners={};let meetings=0;
function element(id=''){
 const classes=new Set(['active']);
 return {id,isConnected:true,dataset:{},style:{transform:'',transition:'',setProperty(k,v){this[k]=v;}},classList:{contains:k=>classes.has(k)},getBoundingClientRect:()=>({width:390,height:650,left:0,top:0,right:390,bottom:650}),closest:()=>null};
}
const host=element('home-sprite-wrap'),crowd=element('pet-crowd'),view=element('view-home'),overview=element('overview');
overview.classList.contains=()=>false;
const nodes={'home-sprite-wrap':host,'pet-crowd':crowd,'view-home':view,overview};
const actors=Array.from({length:3},(_,i)=>({dogIdx:i+1,home:{x:16+i*20,y:50+i*12},el:element()}));
sceneCrowds.set(crowd,actors);
const context={window:{addEventListener(){},matchMedia:()=>({matches:reduced})},matchMedia:()=>({matches:reduced}),
 document:{hidden:false,getElementById:id=>id==='scene-track'?{removeEventListener(){},addEventListener(){}}:nodes[id],querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn},
 sceneCrowds,curPet:0,curScene:0,curTime:0,curWeather:0,focusing:false,homePicks:[],getPet:()=>({kind:'dog'}),allPets:()=>[],
 renderHome(){},openOverview(){},syncScenePreviews(){},goScene(){},updateDotsFromScroll(){},switchTo(){},
 setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),
 Math:Object.assign(Object.create(Math),{random:()=>random}),console};
context.PetInteractions=context.window.PetInteractions={reset(){context.window.PetRoom.reset();},group(actors,container,plan){meetings++;return {actors,plan};}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/pet-room.js'),'utf8'),context);
const api=context.window.PetRoom;
assert.ok(api.cadence,'cadence is exposed for verification and tuning');
assert.deepEqual(JSON.parse(JSON.stringify(api.cadence)),{
 idleMinMs:4000,idleMaxMs:7000,heroMinMs:6000,heroMaxMs:9000,meetingMinMs:6500,meetingMaxMs:10000,
 idleChance:.7,heroChance:.72,meetingChance:.95,stepOutMs:1450,stepBackMs:1450
});
function advance(ms){const until=now+ms;let count=0;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>until)break;assert.ok(++count<10000);now=next[1].at;timers.delete(next[0]);next[1].fn();}now=until;}
api.configure({random:()=>random});api.startCadence(crowd);
const scheduled=[...timers.values()].map(t=>t.at-now);
assert.equal(scheduled.filter(ms=>ms>=4000&&ms<=6500).length,4,'three independent small steps and one hero timer');
assert.equal(new Set(scheduled.filter(ms=>ms<6000)).size,3,'companions are staggered even with constant randomness');
assert.ok(scheduled.some(ms=>ms>=6500&&ms<=10000),'meeting starts within 6.5–10 seconds');
advance(4500);
assert.equal(actors[0].el.dataset.petIdle,'true','first companion walks before ten seconds');
assert.equal(actors[1].el.dataset.petIdle,undefined,'second companion has not started in sync');
assert.match(actors[0].el.style.transform,/translateX\(/);assert.equal(actors[0].el.dataset.petWalking,'true');
assert.ok(Math.abs(Number(actors[0].el.style.transform.match(/[-\d.]+/)[0]))>=5,'small left/right travel is visible');
advance(3500);
assert.equal(actors[0].el.style.transform,'translateX(0px)','small steps return to original spot');
assert.equal(actors[0].el.dataset.petIdle,undefined);
api.reset();assert.equal(timers.size,0,'reset cancels all cadence and movement callbacks');
assert.equal(host.style.transform,'');
actors.forEach(c=>{assert.equal(c.el.dataset.petWalking,undefined);assert.equal(c.el.dataset.petIdle,undefined);});
reduced=true;assert.equal(api.idle(actors[0]),null);api.wanderHero(true);
assert.equal(actors[0].el.style.transform,'translateX(0px)');assert.equal(host.style.transform,'');
assert.equal(timers.size,0,'reduced motion starts no movement timer');
reduced=false;random=.95;assert.equal(api.idle(actors[0]),null,'not every idle turn makes a pet move');
random=.2;actors[0].el.dataset.petEncounter='true';assert.equal(api.idle(actors[0]),null,'meeting owns its movement');
delete actors[0].el.dataset.petEncounter;actors[0].el.dataset.petMood='play';assert.equal(api.idle(actors[0]),null,'dialogue animation owns its movement');
delete actors[0].el.dataset.petMood;context.focusing=true;assert.equal(api.idle(actors[0]),null,'focus pauses room movement');
context.focusing=false;api.idle(actors[0]);assert.equal(actors[0].el.dataset.petWalking,'true');
api.stopIdle(actors[0].el);assert.equal(actors[0].el.dataset.petWalking,undefined,'a greeting can take over without competing animation');
assert.equal(timers.size,0);
api.startCadence(crowd);view.classList.contains=()=>false;advance(30000);
assert.ok(actors.every(c=>!c.el.dataset.petIdle),'hidden home cannot start movement');api.reset();
view.classList.contains=()=>true;random=.5;api.startCadence(crowd);advance(6499);
assert.equal(meetings,0,'automatic encounters do not start before 6.5 seconds');advance(3501);
assert.equal(meetings,1,'a first automatic encounter can be discovered within ten seconds');api.reset();
random=.99;api.startCadence(crowd);advance(10000);
assert.equal(meetings,1,'a quiet turn may skip both talking and walking');assert.ok(actors.every(c=>!c.el.dataset.petIdle));api.reset();
assert.equal(typeof listeners.visibilitychange,'function','room listens for background and foreground lifecycle');
api.startCadence(crowd);api.idle(actors[0]);context.document.hidden=true;listeners.visibilitychange();
assert.equal(timers.size,0,'background transition releases all room timers');assert.equal(actors[0].el.dataset.petWalking,undefined);
context.document.hidden=false;listeners.visibilitychange();assert.equal(timers.size,5,'foreground restores the current room cadence');
listeners.visibilitychange();assert.equal(timers.size,5,'repeated foreground events do not multiply clocks');api.reset();
view.classList.contains=()=>false;listeners.visibilitychange();assert.equal(timers.size,0,'foreground does not start a room on another page');view.classList.contains=()=>true;
api.configure({cadence:{idleMinMs:10,idleMaxMs:20}});random=.5;api.startCadence(crowd);
assert.equal([...timers.values()].filter(t=>t.at-now>=10&&t.at-now<=20).length,3,'custom small timer ranges remain valid despite staggering');api.reset();
console.log('PASS pet idle cadence: prototype pacing, staggered visible steps, origin return, reduced motion, busy guards and timer cancellation');
