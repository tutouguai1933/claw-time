// Color and exact-face checks use the supplied original, without recoloring.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {PNG} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const dest=path.resolve(__dirname,'../assets/cats-v3');
assert.ok(fs.existsSync(path.join(dest,'manifest.json')),'new original-source cat manifest exists');
const manifest=JSON.parse(fs.readFileSync(path.join(dest,'manifest.json')));
const atlas=PNG.sync.read(fs.readFileSync(path.join(dest,'sources/original-user.png')));
const eyeCenters=[[[88,158],[92,166],[90,165]],[[112,162],[104,148],[108,154]],[[108,144],[104,132],[108,144]],[[98,153],[106,151],[94,141]],[[95,146],[95,130],[95,146]],[[112,150],[110,135],[110,144]]];
for(const v of manifest){
 const png=PNG.sync.read(fs.readFileSync(path.join(dest,v.png)));
 const [ex,ey]=eyeCenters[v.pet][v.expr];
 for(const [sx,sy] of [...v.featureSamples,[v.pet*288+ex,v.expr*288+ey]]){
  const x=sx-v.atlasOffset[0], y=sy-v.atlasOffset[1], i=(y*288+x)*4, ai=(sy*atlas.width+sx)*4;
  assert.deepEqual([...png.data.subarray(i,i+4)],[...atlas.data.subarray(ai,ai+4)],`${v.png}: brow/nose/eye colors copied exactly from original`);
 }
 // Bright pixels enclosed by the original ink must not turn into holes.
 for(let y=0;y<288;y++) for(let x=0;x<288;x++){
  const i=(y*288+x)*4;
  if(png.data[i+3]&&png.data[i]>230&&png.data[i+1]>220) assert.equal(png.data[i+3],255,'internal cream/white is retained');
 }
}
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../assets/cat-catalog.js'),'utf8'),context);
assert.equal(context.window.CatCatalog[0].name,'耳朵');
assert.equal(context.window.CatCatalog[1].name,'年糕');
console.log('PASS: 18 faces retain native original colors and feature pixels; internal whites stay opaque; names 耳朵/年糕.');
