// Package local rasters as lazy script payloads so file:// canvas export stays origin-clean.
// No dependencies; rerun whenever scene PNGs are replaced.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'assets/scene-cache');fs.mkdirSync(dest,{recursive:true});
let count=0;
for(const folder of ['scenes','scene-clean','house-art','decor-art','window-repair']){
 if(!fs.existsSync(path.join(root,'assets',folder)))continue;
 for(const name of fs.readdirSync(path.join(root,'assets',folder))){
  if(!/\.png$/i.test(name)||name==='atlas.png')continue;
  const key='assets/'+folder+'/'+name;
  const data='data:image/png;base64,'+fs.readFileSync(path.join(root,key)).toString('base64');
  fs.writeFileSync(path.join(dest,folder+'--'+name+'.js'),'window.HouseRasterSources=window.HouseRasterSources||{};window.HouseRasterSources['+JSON.stringify(key)+']='+JSON.stringify(data)+';\n');count++;
 }
}
console.log('Packaged '+count+' local scene rasters for file:// canvas export.');
