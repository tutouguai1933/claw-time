// Pack the approved proposal, then compose only internal facial expressions.
// Every character's silhouette, ears, whisker tips, body and tail share one base.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root=path.resolve(__dirname,'..'),dest=path.join(root,'assets/cats-v4');fs.mkdirSync(path.join(dest,'sources'),{recursive:true});
const source=fs.readFileSync(path.join(root,'assets/previews/cat-proposals/cats-proposal-v2.png')),sheet=PNG.sync.read(source),parts=require('./sprite-components.cjs').figures(sheet,6,3),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.writeFileSync(path.join(dest,'sources/approved-sheet.png'),source);fs.copyFileSync(path.join(root,'assets/previews/cat-proposals/prompts.json'),path.join(dest,'sources/prompts.json'));
const names=['耳朵','年糕','煤球','芝麻','布丁','团子'],breeds=['三花猫','白猫','黑猫','奶牛猫','暹罗猫','橘猫'];
const faces=[
 [[65,83],[198,83],[236,125],[228,189],[182,213],[94,211],[48,187],[45,132]],
 [[65,92],[199,92],[222,125],[222,189],[186,218],[95,218],[59,185],[57,130]],
 [[59,88],[211,88],[236,126],[227,193],[187,213],[92,213],[48,184],[47,129]],
 [[70,90],[225,90],[240,126],[219,197],[184,216],[98,216],[61,187],[60,129]],
 [[62,89],[231,89],[244,132],[226,183],[194,210],[91,210],[52,183],[55,123]],
 [[60,81],[212,81],[234,121],[229,190],[189,211],[97,211],[48,183],[48,124]]
];
function inside(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
function distance(x,y,poly){let n=Infinity;for(let i=0;i<poly.length;i++){const [a,b]=poly[i],[c,d]=poly[(i+1)%poly.length],vx=c-a,vy=d-b,t=Math.max(0,Math.min(1,((x-a)*vx+(y-b)*vy)/(vx*vx+vy*vy)));n=Math.min(n,Math.hypot(x-a-vx*t,y-b-vy*t));}return n;}
function pack(part,target){
 const [l,t,w,h]=part.bounds,[ox,oy,dw,dh]=target,out=new PNG({width:288,height:288});
 for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
  const sx=Math.max(l,Math.min(l+w-1,l+(x+.5)*w/dw-.5)),sy=Math.max(t,Math.min(t+h-1,t+(y+.5)*h/dh-.5)),xx=Math.floor(sx),yy=Math.floor(sy),fx=sx-xx,fy=sy-yy;
  let a=0,r=0,g=0,b=0;for(const [u,v,k]of [[xx,yy,(1-fx)*(1-fy)],[Math.min(l+w-1,xx+1),yy,fx*(1-fy)],[xx,Math.min(t+h-1,yy+1),(1-fx)*fy],[Math.min(l+w-1,xx+1),Math.min(t+h-1,yy+1),fx*fy]]){if(!part.indices.has(v*sheet.width+u))continue;const i=(v*sheet.width+u)*4,z=sheet.data[i+3]/255*k;a+=z;r+=sheet.data[i]*z;g+=sheet.data[i+1]*z;b+=sheet.data[i+2]*z;}
  const i=((y+oy)*288+x+ox)*4;out.data.set([a?r/a:0,a?g/a:0,a?b/a:0,a*255],i);
 }return out;
}
const manifest=[],preview=new PNG({width:1728,height:864});
for(let pet=0;pet<6;pet++){
 const rect=parts[pet].bounds,scale=Math.min(260/rect[2],252/rect[3]),w=Math.round(rect[2]*scale),h=Math.round(rect[3]*scale),target=[Math.round((288-w)/2),276-h,w,h],base=pack(parts[pet],target),bytes=PNG.sync.write(base),poly=faces[pet],mask=new Uint8Array(288*288);
 fs.writeFileSync(path.join(dest,'cat-'+pet+'-base.png'),bytes);
 for(let y=0;y<288;y++)for(let x=0;x<288;x++){
  if(y>=208||!inside(x+.5,y+.5,poly))continue;
  // Expression crops must never paint cream/grey fur across the fixed whiskers.
  const at=(y*288+x)*4;
  if(pet===3&&((x<=92&&y>=174)||(x>=205&&y>=173))&&base.data[at]<110&&base.data[at+1]<110&&base.data[at+2]<110)continue;
  let safe=true;
  for(let dy=-6;dy<=6&&safe;dy++)for(let dx=-6;dx<=6;dx++)if(x+dx<0||x+dx>=288||y+dy<0||y+dy>=288||base.data[((y+dy)*288+x+dx)*4+3]<245){safe=false;break;}
  if(safe)mask[y*288+x]=Math.round(255*Math.min(1,distance(x+.5,y+.5,poly)/5,(208-y)/5));
 }
 for(let expr=0;expr<3;expr++){
  const out=PNG.sync.read(bytes),donor=pack(parts[expr*6+pet],target);
  if(expr)for(let p=0;p<mask.length;p++){const i=p*4;if(!mask[p]||donor.data[i+3]<245)continue;const a=mask[p]/255;for(let c=0;c<3;c++)out.data[i+c]=Math.round(base.data[i+c]*(1-a)+donor.data[i+c]*a);}
  const basename='cat-'+pet+'-'+expr,frame=PNG.sync.write(out);fs.writeFileSync(path.join(dest,basename+'.png'),frame);
  fs.writeFileSync(path.join(dest,basename+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 288" width="288" height="288"><!-- stable-base:'+hash(bytes)+' --><image width="288" height="288" href="data:image/png;base64,'+frame.toString('base64')+'"/></svg>');
  PNG.bitblt(out,preview,0,0,288,288,pet*288,expr*288);
  manifest.push({pet,expr,name:names[pet],breed:breeds[pet],png:basename+'.png',svg:basename+'.svg',width:288,height:288,baseline:276,bodyTop:208,bounds:target,faceBounds:[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[0]))+1,Math.max(...poly.map(p=>p[1]))+1],facePolygon:poly,source:'sources/approved-sheet.png',sourceBounds:parts[expr*6+pet].bounds,sourceSha256:hash(source),base:'cat-'+pet+'-base.png',baseSha256:hash(bytes),sha256:hash(frame)});
 }
}
fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(dest,'preview.png'),PNG.sync.write(preview));
for(let i=0;i<preview.data.length;i+=4){const a=preview.data[i+3]/255;for(let c=0;c<3;c++)preview.data[i+c]=Math.round(preview.data[i+c]*a+[255,249,238][c]*(1-a));preview.data[i+3]=255;}
fs.writeFileSync(path.join(dest,'preview-cream.png'),PNG.sync.write(preview));console.log('Packed 18 approved cats with six distinct fixed outlines and shared bodies.');
