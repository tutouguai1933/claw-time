// Mechanical extraction/compositing only. The supplied artwork is never generated,
// recolored, scaled, inpainted, or redrawn. All expressions share row 0's subject.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {PNG} = require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root = path.resolve(__dirname,'..');
const dest = path.join(root,'assets/cats-v3');
const sourceFile = process.argv[2] || path.join(dest,'sources/original-user.png');
fs.mkdirSync(path.join(dest,'sources'),{recursive:true});
const original = fs.readFileSync(sourceFile);
fs.writeFileSync(path.join(dest,'sources/original-user.png'),original);
const atlas = PNG.sync.read(original);
if(atlas.width!==1728||atlas.height!==864) throw Error('Expected supplied 1728 × 864 atlas');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceSha256 = hash(original);
const names = ['耳朵','年糕','煤球','芝麻','布丁','团子'];
const breeds = ['三花猫','白猫','黑猫','奶牛猫','暹罗猫','橘猫'];
// Local coordinates in each original 288px cell. These polygons remain well
// inside the FIRST row's head. Ears, head outline, whiskers and body stay fixed.
const faces = [
 [[84,104],[177,104],[205,139],[201,193],[170,213],[104,213],[65,192],[61,146]],
 [[76,88],[207,88],[223,133],[215,208],[189,215],[102,215],[78,207],[68,136]],
 [[92,78],[188,78],[214,119],[213,176],[177,187],[106,187],[72,174],[65,120]],
 [[91,77],[190,77],[198,110],[219,129],[211,184],[174,198],[109,198],[68,183],[61,124]],
 [[70,77],[220,77],[227,114],[222,176],[177,192],[105,192],[64,170],[60,117]],
 [[72,84],[207,84],[224,119],[222,179],[185,200],[106,201],[69,183],[61,127]]
];
const align = [
 [[0,0],[-1,0],[0,-2]],
 [[0,0],[-1,-3],[-1,0]],
 [[0,0],[0,7],[0,-1]],
 [[0,0],[0,4],[-2,2]],
 [[0,0],[0,1],[-2,1]],
 [[0,0],[0,-5],[0,-2]]
];
const bodyTop = [218,225,199,209,203,209];
// Independent representative feature coordinates: native brow, nose, eye pixels.
const featureLocal = [
 [[[98,123],[158,123],[129,188]],[[98,125],[158,123],[130,188]],[[98,124],[158,123],[128,190]]],
 [[[111,109],[179,106],[146,174]],[[112,111],[180,108],[147,177]],[[112,109],[180,107],[147,174]]],
 [[[113,96],[168,91],[141,161]],[[113,88],[168,86],[141,154]],[[113,94],[168,92],[141,162]]],
 [[[105,98],[167,98],[135,169]],[[105,98],[167,98],[135,165]],[[107,98],[169,98],[137,167]]],
 [[[99,94],[160,94],[132,162]],[[99,94],[161,94],[132,161]],[[101,94],[162,94],[134,161]]],
 [[[111,105],[171,104],[138,160]],[[111,108],[171,108],[138,165]],[[111,105],[171,105],[138,162]]]
];
function extract(pet,expr){
 const cell = new PNG({width:288,height:288});
 PNG.bitblt(atlas,cell,pet*288,expr*288,288,288,0,0);
 // Flood only the cream exterior. Enclosed cream/white face/body/eye pixels
 // remain opaque even when their color is identical to the exterior.
 const exterior=new Uint8Array(288*288), queue=[];
 const isCream=i=>Math.abs(cell.data[i*4]-255)<=22&&Math.abs(cell.data[i*4+1]-249)<=22&&Math.abs(cell.data[i*4+2]-238)<=22;
 for(let y=0;y<288;y++)for(let x=0;x<288;x++)if(x===0||x===287||y===0||y===287){const i=y*288+x;if(!exterior[i]&&isCream(i)){exterior[i]=1;queue.push(i);}}
 for(let h=0;h<queue.length;h++){
  const i=queue[h],x=i%288,y=Math.floor(i/288);
  for(const n of [x?i-1:-1,x<287?i+1:-1,y?i-288:-1,y<287?i+288:-1]) if(n>=0&&!exterior[n]&&isCream(n)){exterior[n]=1;queue.push(n);}
 }
 for(let i=0;i<exterior.length;i++)if(exterior[i])cell.data.fill(0,i*4,i*4+4);
 return cell;
}
function bounds(p){
 let l=288,t=288,r=0,b=0;
 for(let y=0;y<288;y++)for(let x=0;x<288;x++)if(p.data[(y*288+x)*4+3]){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
 return [l,t,r-l+1,b-t+1];
}
function inside(x,y,poly){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))hit=!hit;
 }
 return hit;
}
function edgeDistance(x,y,poly){
 let nearest=Infinity;
 for(let i=0;i<poly.length;i++){
  const [ax,ay]=poly[i],[bx,by]=poly[(i+1)%poly.length],vx=bx-ax,vy=by-ay;
  const t=Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy)));
  nearest=Math.min(nearest,Math.hypot(x-ax-t*vx,y-ay-t*vy));
 }
 return nearest;
}
const preview = new PNG({width:1728,height:864});
const manifest=[];
for(let pet=0;pet<6;pet++){
 const raw=extract(pet,0),[left,top,width,height]=bounds(raw);
 const dx=Math.floor((288-width)/2)-left,dy=276-(top+height);
 const base=new PNG({width:288,height:288});
 PNG.bitblt(raw,base,left,top,width,height,left+dx,top+dy);
 const baseBytes=PNG.sync.write(base),baseSha256=hash(baseBytes);
 fs.writeFileSync(path.join(dest,`cat-${pet}-base.png`),baseBytes);
 const poly=faces[pet].map(([x,y])=>[x+dx,y+dy]);
 const faceBounds=[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[0]))+1,Math.max(...poly.map(p=>p[1]))+1];
 const protectedMask=new Uint8Array(288*288);
 for(let y=faceBounds[1];y<faceBounds[3];y++)for(let x=faceBounds[0];x<faceBounds[2];x++){
  if(!inside(x+.5,y+.5,poly))continue;
  let safe=true;
  for(let oy=-6;oy<=6&&safe;oy++)for(let ox=-6;ox<=6;ox++)if(base.data[((y+oy)*288+x+ox)*4+3]!==255){safe=false;break;}
  // A short native alpha feather blends only interior fur at crop joins.
  // Feature centers are copied losslessly; no color correction or generated paint.
  if(safe)protectedMask[y*288+x]=Math.round(255*Math.min(1,edgeDistance(x+.5,y+.5,poly)/5));
 }
 for(let expr=0;expr<3;expr++){
  const out=PNG.sync.read(baseBytes);
  const donor=expr?extract(pet,expr):raw;
  const [ax,ay]=align[pet][expr];
  const mask=new PNG({width:288,height:288});
  if(expr)for(let y=faceBounds[1];y<faceBounds[3];y++){
   for(let x=faceBounds[0];x<=faceBounds[2];x++){
    const sx=x-dx-ax,sy=y-dy-ay,i=(y*288+x)*4,si=(sy*288+sx)*4;
    const yes=x<faceBounds[2]&&protectedMask[y*288+x]&&donor.data[si+3]===255;
    if(yes){
     const opacity=protectedMask[y*288+x],a=opacity/255;
     for(let channel=0;channel<3;channel++)out.data[i+channel]=Math.round(donor.data[si+channel]*a+base.data[i+channel]*(1-a));
     mask.data.set([255,255,255,opacity],i);
    }
   }
  }
  const basename=`cat-${pet}-${expr}`,bytes=PNG.sync.write(out);
  fs.writeFileSync(path.join(dest,basename+'.png'),bytes);
  // SVGs explicitly compose the common base and a clipped original face crop.
  // Self-contained data URIs also work when the SVG itself is loaded via <img>.
  const donorCanvas=new PNG({width:288,height:288});
  for(let y=0;y<288;y++)for(let x=0;x<288;x++){
   const sx=x-dx-ax,sy=y-dy-ay;
   if(sx>=0&&sx<288&&sy>=0&&sy<288)donor.data.copy(donorCanvas.data,(y*288+x)*4,(sy*288+sx)*4,(sy*288+sx)*4+4);
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288"><!-- shared-first-row-base-sha256:${baseSha256} --><image width="288" height="288" href="data:image/png;base64,${baseBytes.toString('base64')}"/>${expr?`<defs><mask id="face" x="0" y="0" width="288" height="288" maskUnits="userSpaceOnUse"><image width="288" height="288" href="data:image/png;base64,${PNG.sync.write(mask).toString('base64')}"/></mask></defs><image width="288" height="288" mask="url(#face)" href="data:image/png;base64,${PNG.sync.write(donorCanvas).toString('base64')}"/>`:''}</svg>\n`;
  fs.writeFileSync(path.join(dest,basename+'.svg'),svg);
  PNG.bitblt(out,preview,0,0,288,288,pet*288,expr*288);
  manifest.push({pet,expr,name:names[pet],breed:breeds[pet],png:basename+'.png',svg:basename+'.svg',width:288,height:288,baseline:276,bounds:[left+dx,top+dy,width,height],base:`cat-${pet}-base.png`,baseSha256,sourceSha256,source:'sources/original-user.png',atlasBounds:[pet*288+left,top,width,height],atlasOffset:[pet*288-dx-ax,expr*288-dy-ay],faceBounds,facePolygon:poly,bodyTop:bodyTop[pet]+dy,featureSamples:featureLocal[pet][expr].map(([x,y])=>[pet*288+x,expr*288+y]),sha256:hash(bytes)});
 }
}
fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(dest,'preview.png'),PNG.sync.write(preview));
for(let i=0;i<preview.width*preview.height;i++){
 const a=preview.data[i*4+3]/255;
 for(let c=0;c<3;c++)preview.data[i*4+c]=Math.round(preview.data[i*4+c]*a+[255,249,238][c]*(1-a));
 preview.data[i*4+3]=255;
}
fs.writeFileSync(path.join(dest,'preview-cream.png'),PNG.sync.write(preview));
console.log('Prepared 18 cats directly from supplied original; each column shares first-row body and contour.');
