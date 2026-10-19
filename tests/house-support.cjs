const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class Element{
 constructor(){this.children=[];this.style={};this.dataset={};this.className='';this.isConnected=true;this.classList={add(){},remove(){},contains:()=>false,toggle(){}};}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(k,v){this[k]=v;}scrollIntoView(){}getContext(){return {};}
 set innerHTML(value){this.children=[];this.html=value;}get innerHTML(){return this.html||'';}
}
const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const context={window:null,$:node,document:{body:{classList:{toggle(){},remove(){}}},head:new Element(),createElement:()=>new Element(),createTextNode:text=>({textContent:text}),addEventListener(){},querySelectorAll:()=>[]},
 location:{protocol:'https:'},Image:class{},DECOR:[{cat:1,name:'毛线球'}],RoomDecor:{reset(){},normalize:p=>p,get:()=>({id:'yarn',box:[40,80,10,10]}),connect(){},source:()=>''},
 curTime:2,curWeather:1,curDressTab:1,curDressMode:0,placed:[],requestAnimationFrame(){},setTime(){},setWeather(){},setDressMode(){},switchTo(){},renderTray(){},renderPlaced(){},bindDressDrag(){},syncScenePreviews(){},toast(){},setTimeout(){},console};context.window=context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/house-editor.js'),'utf8'),context);
const api=context.HouseEditor;
assert.equal(typeof api.getAnchors,'function','current furniture exposes its actual pet support geometry');
const defaults=api.getAnchors('left');assert.equal(defaults.variant,'original');assert.equal(defaults.surface.y,50.6);
const baseline={enabled:true,replaced:['back','left','sofa'],slots:{back:2,left:1,sofa:2},decor:[{id:0,name:'毛线球',x:45,y:80,w:12,h:8}]};
api.restore(baseline);
for(const key of ['left','sofa'])for(let variant=0;variant<3;variant++){
 const anchor=api.getAnchors(key,variant);assert.equal(anchor.variant,variant);assert.ok(anchor.surface.w>0);assert.ok(anchor.home.x>anchor.surface.x&&anchor.home.x<anchor.surface.x+anchor.surface.w);
 assert.ok(Math.abs(anchor.home.y-anchor.surface.y)<6);assert.ok(anchor.exit.length>=2);assert.ok(anchor.exit.at(-1).y>=74,'paths leave furniture onto the floor');
 assert.ok(anchor.exit.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
}
assert.equal(new Set([0,1,2].map(v=>api.getAnchors('left',v).surface.y)).size,3,'each left style uses its own platform height');
assert.equal(new Set([0,1,2].map(v=>api.getAnchors('sofa',v).surface.y)).size,3,'each sofa uses its exposed seat height');
const immutable=api.getAnchors('left');immutable.surface.y=99;assert.notEqual(api.getAnchors('left').surface.y,99,'reading geometry cannot mutate saved supports');
api.enter();const zones=node('dress-stage').children.find(n=>n.className==='house-zones');zones.children[1].onclick();
let picker=node('house-picker'),row=picker.children.find(n=>n.className==='house-variants');
assert.equal(row.children.length,4,'each slot offers three variants plus the prototype card');
const original=row.children.find(n=>n.dataset.variant==='original');assert.ok(original,'prototype is a clear selectable style');assert.equal(original['aria-pressed'],'false');
original.onclick();assert.deepEqual(Array.from(api.getDraft().replaced),['back','sofa']);assert.deepEqual(Array.from(api.getSaved().replaced),['back','left','sofa'],'choosing a prototype remains a draft');
assert.equal(api.getDraft().slots.sofa,2);assert.equal(api.getDraft().decor[0].name,'毛线球');assert.equal(context.curTime,2);assert.equal(context.curWeather,1);
row=node('house-picker').children.find(n=>n.className==='house-variants');assert.equal(row.children.find(n=>n.dataset.variant==='original')['aria-pressed'],'true');
api.cancel();assert.deepEqual(Array.from(api.getDraft().replaced),['back','left','sofa'],'cancel restores the confirmed furniture');
console.log('PASS per-furniture supports and prototype cards: all styles, read-only anchors, per-slot draft, decor/weather preservation and cancel');
