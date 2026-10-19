const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=path.resolve(__dirname,'../assets/breed-creator.js');
assert.ok(fs.existsSync(source),'breed creator module exists');
const pets=Array.from({length:15},(_,i)=>({name:'原伙伴'+i,breed:i<6?['柯基','比熊','泰迪','柴犬','萨摩耶','博美'][i]:['三花猫','白猫','黑猫','奶牛猫','暹罗猫','橘猫'][i-9],...(i>=9?{kind:'cat',catalogCat:true,catIndex:i-9}:{})}));
const sandbox={console,TRAITS:['开朗','害羞','偷偷摸摸','暴躁','装酷耍帅','贪吃'],getPet:id=>pets[id],renderPetArt:()=>'<old-art/>',renderPetPortrait:()=>'<old-portrait/>'};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync(source,'utf8'),sandbox,{filename:source});
const api=sandbox.BreedCreator;
assert.equal(typeof api.shape,'function','shape source is independent from coat source');
assert.deepEqual(Array.from(api.catalog,p=>p.id),[0,1,2,3,4,5,9,10,11,12,13,14]);
for(const id of [6,7,8,-1,15,'0',null])assert.equal(api.source({custom:true,breedSource:id}),null,'only original twelve breed IDs are valid');
assert.equal(api.source({breedSource:0}),null,'an arbitrary source field does not replace legacy pets');
for(const id of api.catalog.map(p=>p.id)){
 const variants=[],earPoses=[],tailPoses=[];
 for(let trait=0;trait<6;trait++){
  const coat=id<6?(id+1)%6:9+(id-8)%6,pet=api.create(id,trait,coat,'我的伙伴'),html=api.render(pet,180,true);
  assert.equal(pet.shapeSource,id);assert.equal(pet.coatSource,coat);assert.equal(api.shape(pet).id,id);assert.equal(api.source(pet).id,coat);
  assert.equal(pet.breedSource,coat);assert.equal(pet.trait,trait);assert.equal(pet.breed,pets[coat].breed);assert.equal(pet.custom,true);
  assert.equal(pet.catalogCat,undefined,'custom cats stay separate from the twelve built-in roster');
  assert.equal(pet.kind,id<6?'dog':'cat');assert.equal(pet.color,undefined);assert.equal(pet.acc,undefined);
  assert.ok(html.includes('data-breed-base="'+id+'"'));assert.ok(html.includes('data-face-layer="'+trait+'"'));
  assert.ok(html.includes('data-ear-layer="left"'));assert.ok(html.includes('data-tail-layer="true"'));
  earPoses.push(html.match(/data-ear-layer="left" data-pose-degrees="([^"]+)"/)[1]+'|'+html.match(/data-ear-layer="right" data-pose-degrees="([^"]+)"/)[1]);tailPoses.push(html.match(/data-tail-layer="true" data-pose-degrees="([^"]+)"/)[1]);
  assert.ok(html.includes('clip-path="url(#breed-face-'),'facial changes have a bounded clip');
  assert.ok(!html.includes('data-custom-body'),'uses original breed artwork');
  variants.push(html.replace(/breed-face-\d+/g,'breed-face-id').replace(/data-personality="\d+"|data-face-layer="\d+"|aria-label="[^"]*"/g,''));
 }
 assert.equal(new Set(variants).size,6,'every personality has a visually distinct face composition for source '+id);
 assert.equal(new Set(earPoses).size,6,'six actual ear poses for shape '+id);assert.equal(new Set(tailPoses).size,6,'six actual tail poses for shape '+id);
}
assert.throws(()=>api.create(6,0,''),/品种/);assert.throws(()=>api.create(0,6,''),/性格/);
assert.throws(()=>api.create(0,0,9,''),/同一物种/,'coat mixing stays within species');
assert.ok(api.render({...api.create(9,0,14,''),coatSource:null,breedSource:null},100).includes('data-coat-source="none"'),'draft renders uncolored linework before coat selection');
assert.equal(sandbox.renderPetArt(0,100,true),'<old-art/>','original artwork path is unchanged');
pets.push({custom:true,kind:'cat',color:'#abc',face:0});assert.equal(sandbox.renderPetArt(15,100,true),'<old-art/>','legacy handmade pets keep their renderer');
pets.push(api.create(9,3,'新猫'));assert.ok(sandbox.renderPetArt(16,100,true).includes('data-breed-source="9"'));
assert.ok(sandbox.renderPetPortrait(16,50).includes('breed-portrait'),'created pets use head portraits from the same artwork');
console.log('PASS independent shape/coat sources, twelve allowed palettes, six distinct face/ear/tail poses, uncolored drafts and legacy render fallback');
