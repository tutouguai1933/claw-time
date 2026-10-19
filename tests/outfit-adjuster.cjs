const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=path.resolve(__dirname,'../assets/outfit-adjuster.js');
assert.ok(fs.existsSync(source),'outfit adjustment module must exist');
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const listeners={};let persisted=null,fail=false;
 const document={getElementById:()=>null,addEventListener:(name,fn)=>{(listeners[name]||=[]).push(fn);},querySelectorAll:()=>[]};
 const s={console,document,dressPet:0,tempDress:['帽子','围巾'],petOutfits:{0:['帽子','围巾']},getPet:id=>Number.isInteger(id)&&id>=0?{name:'伙伴'}:null,petUnlocked:()=>true,
  renderPetDress(){},pickDressPet(id){this.dressPet=id;this.tempDress=[...(this.petOutfits[id]||[])];},resetDress(){this.tempDress=[];},setDressMode(){},
  AppProfileBridge:{getState:()=>({petOutfits:clone(s.petOutfits)}),setState(state){s.petOutfits=clone(state.petOutfits||{});s.tempDress=null;},createDefaultState:()=>({petOutfits:{}}),canSwitch:()=>true,shiftPetReferences(){},persist(){persisted=clone(this.getState());return !fail;}},
  commitDress(){if(fail)return false;this.petOutfits[this.dressPet]=[...(this.tempDress||this.petOutfits[this.dressPet]||[])];this.AppProfileBridge.persist();this.tempDress=null;this.renderPetDress();return true;}
 };s.window=s;s.AccountManager={ready:Promise.resolve()};vm.createContext(s);vm.runInContext(fs.readFileSync(source,'utf8'),s,{filename:source});return {s,listeners,persisted:()=>persisted,fail:value=>fail=value};
}
const f=fixture(),s=f.s,a=s.OutfitAdjuster;
assert.equal(typeof a.style,'function');
assert.equal(a.style('帽子',0,100,false),'--outfit-dx:0px;--outfit-dy:0px;--outfit-scale:1;');
a.begin('帽子');a.update({x:10,y:-5,scale:1.4});
assert.match(a.style('帽子',0,132,true),/--outfit-dx:13\.2px;--outfit-dy:-6\.6px;--outfit-scale:1\.4;/,'preview scales normalized positions to its frame');
assert.equal(a.style('帽子',0,132,false),'--outfit-dx:0px;--outfit-dy:0px;--outfit-scale:1;','home and focus never read a draft');
assert.deepEqual(clone(s.AppProfileBridge.getState().outfitTransforms),{},'automatic snapshot saves must exclude unconfirmed adjustments');
assert.equal(s.AppProfileBridge.canSwitch(),false,'changed placement is unsaved work');
assert.equal(s.commitDress([]),true);
assert.deepEqual(f.persisted().outfitTransforms,{'0':{'帽子':{x:10,y:-5,scale:1.4}}},'placement is included in the same clothing transaction');
assert.match(a.style('帽子',0,50,false),/--outfit-dx:5px;--outfit-dy:-2\.5px;--outfit-scale:1\.4;/);
assert.equal(s.AppProfileBridge.canSwitch(),true);
a.begin('帽子');a.update({x:30,scale:1.7});f.fail(true);assert.equal(s.commitDress([]),false);
assert.deepEqual(clone(s.AppProfileBridge.getState().outfitTransforms),{'0':{'帽子':{x:10,y:-5,scale:1.4}}},'failed persistence rolls saved transforms back');
assert.match(a.style('帽子',0,100,true),/--outfit-dx:30px/,'failed confirmation preserves retryable trial');
f.fail(false);s.pickDressPet(1);assert.equal(s.AppProfileBridge.canSwitch(),true);assert.match(a.style('帽子',0,100,true),/--outfit-dx:10px/,'changing a pet discards its unconfirmed placement');
s.pickDressPet(0);a.begin('帽子');a.reset();assert.match(a.style('帽子',0,100,true),/--outfit-scale:1;/);s.commitDress([]);assert.deepEqual(clone(s.AppProfileBridge.getState().outfitTransforms),{},'restore default remains a draft until confirmed');
s.AppProfileBridge.setState({petOutfits:{0:['帽子']},outfitTransforms:{0:{'帽子':{x:999,y:-999,scale:99},'围巾':{x:'bad',y:NaN,scale:null}},bad:{'帽子':{x:5}},__proto__:{bad:1}}});
assert.deepEqual(clone(s.AppProfileBridge.getState().outfitTransforms),{'0':{'帽子':{x:50,y:-50,scale:1.8}}},'damaged data is ignored and finite numbers are clamped');
assert.deepEqual(clone(s.AppProfileBridge.createDefaultState().outfitTransforms),{});
s.AppProfileBridge.setState({petOutfits:{0:['帽子']}});assert.deepEqual(clone(s.AppProfileBridge.getState().outfitTransforms),{},'old profiles start with default placement');
s.AppProfileBridge.setState({outfitTransforms:{16:{'帽子':{x:5,y:2,scale:1.2}},18:{'围巾':{x:3,y:0,scale:1}}}});s.AppProfileBridge.shiftPetReferences(16,1);
assert.deepEqual(clone(s.AppProfileBridge.getState().outfitTransforms),{'17':{'帽子':{x:5,y:2,scale:1.2}},'19':{'围巾':{x:3,y:0,scale:1}}},'new drawings shift each custom pet placement once');
s.AppProfileBridge.setState({petOutfits:{0:['帽子']}});s.tempDress=['帽子'];a.begin('帽子');a.update({x:9});s.resetDress();s.tempDress=['帽子'];assert.match(a.style('帽子',0,100,true),/--outfit-dx:0px/,'resetting trial clears its unconfirmed transforms');
console.log('PASS placement drafts, atomic clothing save/rollback, normalized frame sizes, legacy/corrupt snapshots, account restore and custom pet ID shifts');
