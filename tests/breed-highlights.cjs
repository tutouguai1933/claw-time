const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),sharp=require(path.join(runtime,'sharp')),{PNG}=require(path.join(runtime,'pngjs'));
const root=path.resolve(__dirname,'..'),context={...require('./breed-node-canvas.cjs'),TRAITS:['开朗','害羞','偷偷摸摸','暴躁','装酷耍帅','贪吃'],getPet:()=>null,renderPetArt:()=>'',renderPetPortrait:()=>''};context.window=context;
function samples(image,windows){const {width:w,height:h,data}=image,seen=new Uint8Array(w*h),result=[];const white=p=>data[p*4+3]>245&&Math.min(data[p*4],data[p*4+1],data[p*4+2])>240;
 for(let p=0;p<w*h;p++)if(!seen[p]&&white(p)){const q=[p];seen[p]=1;for(let z=0;z<q.length;z++){const i=q[z],x=i%w;for(const next of[x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<w*(h-1)?i+w:-1])if(next>=0&&!seen[next]&&white(next)){seen[next]=1;q.push(next);}}
 if(q.length<5||q.length>200)continue;const candidates=q.filter(i=>windows.some(([l,t,r,b])=>i%w>=l&&i%w<=r&&Math.floor(i/w)>=t&&Math.floor(i/w)<=b));if(!candidates.length)continue;
 candidates.sort((a,b)=>{const count=i=>[-w,-1,1,w].filter(offset=>i+offset>=0&&i+offset<w*h&&white(i+offset)).length;return count(b)-count(a);});result.push([candidates[0]%w,Math.floor(candidates[0]/w)]);
 }return result;}
(async()=>{vm.runInNewContext(fs.readFileSync(path.join(root,'assets/breed-creator.js'),'utf8'),context);await context.BreedCreator.ready;let checked=0;const preview=[];
 for(const [id,trait,frame,windows]of [[9,1,2,[[90,125,116,153],[160,131,186,159]]],[11,0,0,[[105,132,126,156],[169,130,190,152]]],[13,0,0,[[80,140,109,171],[170,133,196,163]]]]){
  const original=PNG.sync.read(fs.readFileSync(path.join(root,'assets/cats-v4/cat-'+(id-9)+'-'+frame+'.png'))),points=samples(original,windows);assert.ok(points.length>=2,'original shape '+id+' supplies independently enclosed white eye highlights');
  const svg=context.BreedCreator.render(context.BreedCreator.create(id,trait,11,''),288,true),png=await sharp(Buffer.from(svg)).png().toBuffer(),rendered=PNG.sync.read(png);
  for(const[x,y]of points){const i=(y*rendered.width+x)*4;assert.ok(rendered.data[i+3]>=245&&Math.min(rendered.data[i],rendered.data[i+1],rendered.data[i+2])>=235,'black coat preserves white opaque eye highlight for shape '+id+' at '+x+','+y);checked++;}
  let pink=0;for(let y=25;y<105;y++)for(let x=30;x<105;x++){const i=(y*rendered.width+x)*4,r=rendered.data[i],g=rendered.data[i+1],b=rendered.data[i+2];if(rendered.data[i+3]>230&&r>190&&g>75&&b>65&&r>g*1.15&&r>b*1.12&&b>g*.7)pink++;}assert.ok(pink>20,'black coat preserves original pink inner-ear skin for shape '+id);
  if(id===9){let golden=0;for(let y=134;y<164;y++)for(let x=72;x<88;x++){const i=(y*rendered.width+x)*4;if(rendered.data[i]>140&&rendered.data[i+1]>80&&rendered.data[i]>rendered.data[i+1]*1.2&&rendered.data[i+2]<110)golden++;}assert.ok(golden>30,'black coat preserves the original golden iris instead of repainting eyes as fur');const chest=(224*rendered.width+140)*4;assert.ok(Math.max(rendered.data[chest],rendered.data[chest+1],rendered.data[chest+2])<130,'white fur patches do not masquerade as highlights');}
  preview.push({input:png,left:(id===9?0:id===11?1:2)*288,top:0});
 }
 await sharp({create:{width:864,height:288,channels:4,background:'#fff9ee'}}).composite(preview).png().toFile(path.join(root,'docs/research/breed-creator/black-coat-white-highlights.png'));
 console.log('PASS '+checked+' original enclosed eye highlights stay opaque white with black coat; real SVG preview generated');
})().catch(e=>{console.error(e);process.exitCode=1;});
