// Pack the already-coloured transparent sheet; preserve its pixels and alpha.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root=path.resolve(__dirname,'../assets/companion-art/v2'),source=fs.readFileSync(path.join(root,'sources/colored-sheet.png')),sheet=PNG.sync.read(source),manifest=[],parts=require('./sprite-components.cjs').figures(sheet,2,3);
for(let row=0;row<3;row++)for(let col=0;col<2;col++){
 const [l,t,sw,sh]=parts[row*2+col].bounds,r=l+sw-1,b=t+sh-1;
 if(r<l||b<t)throw Error('Missing figure '+row+'/'+col);const w=r-l+1,h=b-t+1,scale=Math.min(260/w,252/h),dw=Math.round(w*scale),dh=Math.round(h*scale),ox=Math.round((288-dw)/2),oy=276-dh,out=new PNG({width:288,height:288});
 for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
  const sx=Math.max(l,Math.min(r,l+(x+.5)/scale-.5)),sy=Math.max(t,Math.min(b,t+(y+.5)/scale-.5)),x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;
  const samples=[[x0,y0,(1-fx)*(1-fy)],[Math.min(r,x0+1),y0,fx*(1-fy)],[x0,Math.min(b,y0+1),(1-fx)*fy],[Math.min(r,x0+1),Math.min(b,y0+1),fx*fy]];let alpha=0,red=0,green=0,blue=0;for(const [xx,yy,weight]of samples){if(!parts[row*2+col].indices.has(yy*sheet.width+xx))continue;const i=(yy*sheet.width+xx)*4,a=sheet.data[i+3]/255*weight;alpha+=a;red+=sheet.data[i]*a;green+=sheet.data[i+1]*a;blue+=sheet.data[i+2]*a;}const i=((oy+y)*288+ox+x)*4;out.data[i]=alpha?red/alpha:0;out.data[i+1]=alpha?green/alpha:0;out.data[i+2]=alpha?blue/alpha:0;out.data[i+3]=alpha*255;
 }
 const species=col===0?'snake':'lizard',png=species+'-'+row+'.png',svg=species+'-'+row+'.svg',bytes=PNG.sync.write(out);fs.writeFileSync(path.join(root,png),bytes);fs.writeFileSync(path.join(root,svg),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 288" width="288" height="288"><image width="288" height="288" href="data:image/png;base64,'+bytes.toString('base64')+'"/></svg>');manifest.push({species,expr:row,png,svg,width:288,height:288,baseline:276,sourceBounds:[l,t,w,h],sourceSha256:crypto.createHash('sha256').update(source).digest('hex')});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));console.log('Packed six transparent corn-snake/gecko expression frames');
