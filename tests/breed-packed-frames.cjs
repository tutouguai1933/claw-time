const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PNG}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root=path.resolve(__dirname,'..'),js=fs.readFileSync(path.join(root,'assets/breed-creator.js'),'utf8'),match=js.match(/const packedFrames=\/\* ORIGINAL_FRAME_DATA \*\/(\{[^\r\n]*\});/);
assert.ok(match,'embedded frames remain a valid complete single JSON object');const data=JSON.parse(match[1]);assert.equal(Object.keys(data).length,36);
for(const id of [0,1,2,3,4,5,9,10,11,12,13,14])for(let frame=0;frame<3;frame++){
 const file=id<6?'pets-v2/dog-'+id+'-'+frame+'.png':'cats-v4/cat-'+(id-9)+'-'+frame+'.png',original=PNG.sync.read(fs.readFileSync(path.join(root,'assets',file))),packed=PNG.sync.read(Buffer.from(data[id+'-'+frame].split(',')[1],'base64'));
 assert.equal(packed.width,original.width);assert.equal(packed.height,original.height);
 for(let i=0;i<original.data.length;i+=4){assert.equal(packed.data[i+3],original.data[i+3],file+' alpha remains unchanged');for(let c=0;c<3;c++)assert.equal(packed.data[i+c],Math.round(original.data[i+c]/17)*17,file+' comes from the current source frame');}
}
console.log('PASS all 36 embedded frames use the current originals, quantize RGB only and preserve exact source alpha');
