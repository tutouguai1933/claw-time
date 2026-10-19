const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PNG}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root=path.resolve(__dirname,'..'),context={TRAITS:['开朗','害羞','偷偷摸摸','暴躁','装酷耍帅','贪吃'],getPet:()=>null,renderPetArt:()=>'',renderPetPortrait:()=>''};context.window=context;
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/breed-creator.js'),'utf8'),context);const api=context.BreedCreator,contact=new PNG({width:1728,height:864});
const earRoots=[[71,68,191,68],[62,116,198,116],[61,145,198,145],[75,94,171,94],[76,90,177,90],[75,75,184,75],[87,88,202,94],[74,132,214,132],[94,102,199,104],[88,104,203,105],[87,98,204,100],[86,92,205,94]];
function interiorDistance(image){const {width:w,height:h,data}=image,n=w*h,d=new Int16Array(n).fill(30000),queue=new Int32Array(n);let start=0,end=0;for(let p=0;p<n;p++)if(data[p*4+3]<200){d[p]=0;queue[end++]=p;}while(start<end){const p=queue[start++],x=p%w;for(const q of [x?p-1:-1,x<w-1?p+1:-1,p>=w?p-w:-1,p<n-w?p+w:-1])if(q>=0&&d[q]>d[p]+1){d[q]=d[p]+1;queue[end++]=q;}}return d;}
for(const [column,b] of api.catalog.entries()){
 const src=b.id<6?'pets-v2/dog-'+b.id+'-0.png':'cats-v4/cat-'+(b.id-9)+'-0.png',original=PNG.sync.read(fs.readFileSync(path.join(root,'assets',src))),distance=interiorDistance(original),alphas=[];
 for(let trait=0;trait<6;trait++){
  const warped=api.deform(original,b.id,trait);let gaps=0;
  const joint=earRoots[column];for(let p=0;p<distance.length;p++){const x=p%original.width,y=Math.floor(p/original.width),movingEar=(x<joint[0]&&y<joint[1]-12)||(x>joint[2]&&y<joint[3]-12),movingTail=x>original.width*.78&&y>original.height*.65;if(!movingEar&&!movingTail&&distance[p]>=7&&warped.data[p*4+3]<180)gaps++;}
  assert.equal(gaps,0,'shape '+b.id+' trait '+trait+' must not cut transparent wedges into the solid head/body');
  require('./sprite-integrity.cjs')(warped,'shape '+b.id+' trait '+trait+' remains one connected figure');
  alphas.push(Buffer.from(warped.data.filter((_,i)=>i%4===3)));
  const scale=144/Math.max(warped.width,warped.height),ox=(144-warped.width*scale)/2,oy=(144-warped.height*scale)/2;
  for(let y=0;y<144;y++)for(let x=0;x<144;x++){
   const sx=Math.floor((x-ox)/scale),sy=Math.floor((y-oy)/scale),target=((trait*144+y)*contact.width+column*144+x)*4;
   if(sx<0||sy<0||sx>=warped.width||sy>=warped.height){contact.data.set([255,249,238,255],target);continue;}
   const i=(sy*warped.width+sx)*4,a=warped.data[i+3]/255;contact.data.set([0,1,2].map(c=>Math.round(warped.data[i+c]*a+[255,249,238][c]*(1-a))).concat(255),target);
  }
 }
 for(let a=0;a<6;a++)for(let z=a+1;z<6;z++)assert.notDeepEqual(alphas[a],alphas[z],'personality still changes ear/tail outline '+b.id+' '+a+'/'+z);
}
const out=path.join(root,'docs/research/breed-creator');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'72-continuous-pose-original-colors.png'),PNG.sync.write(contact));
console.log('PASS 72 continuous original-art poses: no transparent cuts in solid interiors, connected silhouettes, distinct personality ears/tails; original-color contact sheet generated');
