const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),sharp=require(path.join(runtime,'sharp'));
const root=path.resolve(__dirname,'..'),canvas=require('./breed-node-canvas.cjs'),context={...canvas,TRAITS:['开朗','害羞','偷偷摸摸','暴躁','装酷耍帅','贪吃'],getPet:()=>null,renderPetArt:()=>'',renderPetPortrait:()=>''};context.window=context;
(async()=>{vm.runInNewContext(fs.readFileSync(path.join(root,'assets/breed-creator.js'),'utf8'),context);await context.BreedCreator.ready;const api=context.BreedCreator,tiles=[];
for(let trait=0;trait<6;trait++)for(const [column,b]of api.catalog.entries()){
 const p=api.create(b.id,trait,b.id,''),svg=api.render(p,144,true),tile=await sharp(Buffer.from(svg)).png().toBuffer();
 assert.ok(!svg.includes('mask="url(#breed-body'),'original head is not cut apart into rigid ear wedges');tiles.push({input:tile,left:column*144,top:trait*144});
}
const out=path.join(root,'docs/research/breed-creator');fs.mkdirSync(out,{recursive:true});await sharp({create:{width:1728,height:864,channels:4,background:'#fff9ee'}}).composite(tiles).png().toFile(path.join(out,'72-continuous-pose-full-render.png'));
console.log('PASS real creator SVG rendered with PNG Canvas adapter and sharp; complete 72-face/color/pose preview generated without Chrome');
})().catch(e=>{console.error(e);process.exitCode=1;});
