const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let variant=0,serial=0;const timers=new Map(),sceneCrowds=new WeakMap();
const surface=()=>({left:{surface:{x:1,y:[54.025,52.21,54.85][variant],w:28,dy:0},home:{x:15,y:[54.025,52.21,54.85][variant]},exit:[{x:26,y:54},{x:33,y:69},{x:35,y:76}]},sofa:{surface:{x:74.2,y:[72.25,69.8,69.3][variant],w:8,dy:.4},home:{x:78.2,y:[72.45,70,69.5][variant]},exit:[{x:75,y:73},{x:71,y:81},{x:67,y:82}]}});
function element(id=''){return {id,isConnected:true,dataset:{},style:{setProperty(k,v){this[k]=v;}},classList:{contains:k=>k==='active'},getBoundingClientRect:()=>({left:0,top:0,width:375,height:700,right:375,bottom:700}),closest:()=>null};}
const crowd=element('pet-crowd'),ov=element('ov-crowd'),hero=element('home-sprite-wrap'),view=element('view-home'),background=element('living-room-bg');
const nodes={'pet-crowd':crowd,'ov-crowd':ov,'home-sprite-wrap':hero,'view-home':view,'living-room-bg':background,'overview-bg':background,overview:{classList:{contains:()=>false}},'scene-track':{addEventListener(){},removeEventListener(){}}};
const actors=Array.from({length:3},(_,i)=>({dogIdx:9+i,home:{x:16+i*20,y:50+i*12},el:element()}));sceneCrowds.set(crowd,actors);sceneCrowds.set(ov,actors.map(c=>({...c,home:{...c.home},el:element()})));
let lastPlan=null;
const context={window:null,document:{hidden:false,getElementById:id=>nodes[id],querySelectorAll:()=>[],addEventListener(){}},sceneCrowds,
 HouseEditor:{getAnchors:key=>surface()[key],getSaved:()=>({decor:[]}),getLayout:()=>({platforms:[{x:1,y:surface().left.surface.y,w:28},{x:1,y:65.41,w:28}]})},
 PetInteractions:{reset(){context.PetRoom.reset();},group(actors,container,plan){lastPlan=plan;return {actors,...plan};}},RoomDecor:{reset(){},get(){}},
 curPet:0,curScene:0,curTime:0,curWeather:0,focusing:false,renderHome(){},renderCrowdInto(){},openOverview(){},syncScenePreviews(){},goScene(){},updateDotsFromScroll(){},switchTo(){},getPet:()=>({catalogCat:true}),
 setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),Math,matchMedia:()=>({matches:false}),addEventListener(){},console};context.window=context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/pet-room.js'),'utf8'),context);
const api=context.PetRoom;
assert.equal(typeof api.positionCrowd,'function','room positions companions on their current furniture');
const originalGet=context.getPet;context.getPet=id=>id===15?{custom:true,shapeSource:3}:{kind:'dog'};context.BreedCreator={shape:p=>p.custom?{id:p.shapeSource}:null};assert.equal(api.footOffset(15),api.footOffset(3),'a custom coat cannot change the chosen shape foot baseline');context.getPet=originalGet;delete context.BreedCreator;
api.positionCrowd(crowd,true);
for(const [index,key]of [[0,'left'],[1,'sofa']]){
 const a=actors[index],expected=surface()[key].home;
 assert.equal(a.homeSlot,key);assert.ok(Math.abs((a.home.x*3.75+30)/375*100-expected.x)<.001,'feet horizontally match support');
 assert.ok(Math.abs((a.home.y*7+api.footOffset(a.dogIdx))/700*100-expected.y)<.001,'actual sprite feet meet the support plane');
 assert.equal(a.el.style.left,a.home.x+'%');assert.equal(a.el.style.top,a.home.y+'%');
}
assert.equal(actors[2].homeSlot,'floor');const oldY=actors[0].home.y;variant=1;context.syncScenePreviews();assert.notEqual(actors[0].home.y,oldY,'confirmed furniture changes re-anchor the current room');
api.configure({random:()=>.2});const right=actors[1];
for(const value of [0,.999]){api.configure({random:()=>value,cadence:{idleChance:1}});api.idle(right);const dx=Number(right.el.style.transform.match(/translateX\(([-.\d]+)/)?.[1]||0);assert.ok(dx>=right.support.minDx-.001&&dx<=right.support.maxDx+.001,'sideways steps stay inside seat support');api.stopIdle(right.el);}
api.meet([actors[0],actors[1]],crowd,{zone:'floor'});
assert.ok(lastPlan.routes[0].length>=4,'left companion leaves via ladder waypoints');assert.ok(lastPlan.routes[1].length>=4,'right companion leaves via seat edge and floor');
assert.ok(lastPlan.worldDestinations.every(p=>p.y>=.75),'ground meeting stays below the wall line');
api.meet([actors[2],actors[1]],crowd,{zone:'stand'});
assert.ok(lastPlan.routes[0].length>=4,'climbing back uses the same access route');
assert.ok(lastPlan.worldDestinations.every(p=>p.x<=.3),'stand targets stay on the real platforms');
api.positionCrowd(ov,true);assert.equal(sceneCrowds.get(ov)[0].home.y,actors[0].home.y,'overview uses the same world geometry');
api.reset();assert.equal(timers.size,0);
console.log('PASS furniture placement: actual sprite baseline, per-style re-anchor, bounded seat walking, ladder/seat access, floor safety and overview agreement');
